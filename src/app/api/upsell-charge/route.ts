import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  priceIdFor,
  pickCurrency,
  priceAmountFor,
  UPSELL_SKU_BY_UI_ID,
} from "@/lib/stripe";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recordPurchase } from "@/lib/purchases";
import { runUpsellPipeline, type UpsellSku } from "@/lib/ai/pipeline";

export const maxDuration = 300;

/**
 * POST /api/upsell-charge
 * Body: { upsell, analysisId }
 *
 * Off-session charge: uses the customer's saved default payment method (set
 * during the initial subscription checkout) to charge the upsell amount
 * without re-prompting for card details.
 *
 * Returns one of:
 *   { success: true }                                — payment captured
 *   { requiresAction: true, clientSecret, publishableKey } — 3DS challenge needed
 *   { requiresCheckout: true }                       — no saved PM, fall back to /checkout
 *   { error: string }                                — declined / failed
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { upsell, analysisId, locale: bodyLocale } = (await req.json()) as {
    upsell: keyof typeof UPSELL_SKU_BY_UI_ID;
    analysisId?: string;
    locale?: string;
  };

  const sku = UPSELL_SKU_BY_UI_ID[upsell];
  if (!sku) return NextResponse.json({ error: "Invalid upsell" }, { status: 400 });
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }

  const locale = isLocale(bodyLocale) ? bodyLocale : DEFAULT_LOCALE;
  const currency = pickCurrency(locale);

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Verify the analysis belongs to this user (RLS would catch this too).
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Upsells are once-per-user. Don't allow a re-purchase regardless of which
  // analysis they originally bought it against.
  const { data: ownedAnalyses } = await supabase.from("analyses").select("id");
  const ownedIds = (ownedAnalyses ?? []).map((a) => a.id);
  if (ownedIds.length > 0) {
    const { data: existingArt } = await supabase
      .from("upsell_artifacts")
      .select("id")
      .eq("product_sku", sku)
      .in("analysis_id", ownedIds)
      .limit(1);
    if (existingArt && existingArt.length > 0) {
      return NextResponse.json({
        alreadyOwned: true,
        message: "You already own this add-on.",
      });
    }
  }

  // Find the Stripe customer that was created during subscription checkout.
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id, stripe_subscription_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!subRow?.stripe_customer_id) {
    return NextResponse.json({ requiresCheckout: true });
  }

  const customer = (await stripe.customers.retrieve(subRow.stripe_customer_id)) as Stripe.Customer;
  let defaultPm =
    typeof customer.invoice_settings?.default_payment_method === "string"
      ? customer.invoice_settings.default_payment_method
      : customer.invoice_settings?.default_payment_method?.id;

  // Fallback for users who paid before the webhook started mirroring the PM
  // onto the customer: look at the subscription's default_payment_method.
  if (!defaultPm && subRow.stripe_subscription_id) {
    try {
      const sub = await stripe.subscriptions.retrieve(subRow.stripe_subscription_id);
      const subPm =
        typeof sub.default_payment_method === "string"
          ? sub.default_payment_method
          : sub.default_payment_method?.id;
      if (subPm) {
        defaultPm = subPm;
        // Mirror it onto the customer so future upsells skip this lookup.
        await stripe.customers.update(customer.id, {
          invoice_settings: { default_payment_method: subPm },
        });
      }
    } catch {
      // ignore — fall through to requiresCheckout
    }
  }

  if (!defaultPm) {
    return NextResponse.json({ requiresCheckout: true });
  }

  const price = await stripe.prices.retrieve(priceIdFor(sku));
  const amount = priceAmountFor(price, currency);
  if (!amount) {
    return NextResponse.json({ error: "Price misconfigured" }, { status: 500 });
  }

  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customer.id,
      payment_method: defaultPm,
      off_session: true,
      confirm: true,
      description: sku,
      metadata: {
        kind: "upsell",
        product_sku: sku,
        analysis_id: analysisId,
        supabase_user_id: user.id,
      },
    });

    if (pi.status === "succeeded") {
      // Belt-and-suspenders: record + fire pipeline here too. The webhook
      // does the same in production, but on localhost (no `stripe listen`)
      // it never fires and the user would see "success" with no artifacts.
      // Both writes are idempotent (recordPurchase dedupes by PI id, and
      // runUpsellPipeline skips when artifacts already exist).
      const svc = createServiceClient();
      const purchaseId = await recordPurchase(svc, {
        user_id: user.id,
        analysis_id: analysisId,
        product_sku: sku,
        stripe_payment_intent: pi.id,
        amount_cents: pi.amount,
        currency: pi.currency,
      });
      if (purchaseId) {
        after(async () => {
          console.log(`[upsell-charge] firing pipeline sku=${sku} analysis=${analysisId}`);
          try {
            await runUpsellPipeline({
              sku: sku as UpsellSku,
              analysisId,
              purchaseId,
            });
            console.log(`[upsell-charge] pipeline done sku=${sku} analysis=${analysisId}`);
          } catch (err) {
            console.error(`[upsell-charge] pipeline failed sku=${sku}:`, err);
          }
        });
      }
      return NextResponse.json({ success: true });
    }
    if (pi.status === "requires_action") {
      return NextResponse.json({
        requiresAction: true,
        clientSecret: pi.client_secret,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      });
    }
    return NextResponse.json(
      { error: `Payment status: ${pi.status}` },
      { status: 400 },
    );
  } catch (err) {
    // Off-session charges raise an error with code 'authentication_required'
    // when 3DS is required; the PI is attached.
    const stripeErr = err as Stripe.errors.StripeError & {
      payment_intent?: Stripe.PaymentIntent;
    };
    if (stripeErr.code === "authentication_required" && stripeErr.payment_intent) {
      return NextResponse.json({
        requiresAction: true,
        clientSecret: stripeErr.payment_intent.client_secret,
        publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      });
    }
    return NextResponse.json(
      { error: stripeErr.message ?? "Payment failed" },
      { status: 400 },
    );
  }
}
