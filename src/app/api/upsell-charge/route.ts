import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  priceIdFor,
  pickCurrency,
  priceAmountFor,
  UPSELL_SKU_BY_UI_ID,
} from "@/lib/stripe";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";
import { readRequestContext } from "@/lib/meta/capi";

/**
 * POST /api/upsell-charge
 * Body: { upsell, analysisId }
 *
 * Creates a PaymentIntent with the customer's saved default payment method
 * attached but NOT confirmed. The client confirms on-session via
 * stripe.confirmPayment so Stripe.js handles 3DS in a modal when needed.
 * The client then POSTs to /api/upsell-finalize to record the purchase.
 *
 * Returns one of:
 *   { clientSecret, publishableKey, paymentIntentId } — client confirms next
 *   { alreadyOwned: true }                            — short-circuit success
 *   { requiresCheckout: true }                        — no saved PM, fall back to /checkout
 *   { error: string }                                 — failed
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

  // currency_options is NOT included by default — must expand it explicitly,
  // otherwise priceAmountFor falls back to unit_amount (USD value) and we
  // undercharge non-USD customers.
  const price = await stripe.prices.retrieve(priceIdFor(sku), {
    expand: ["currency_options"],
  });
  const amount = priceAmountFor(price, currency);
  if (!amount) {
    return NextResponse.json({ error: "Price misconfigured" }, { status: 500 });
  }

  // Capture Pixel context now and stash it on the PI metadata. The click
  // that started this PI is the most accurate signal — both /api/upsell-finalize
  // and the Stripe webhook read these back when firing the CAPI Purchase
  // event later, since they have no browser cookies of their own.
  const ctx = readRequestContext({
    headers: req.headers,
    url: req.headers.get("referer") ?? undefined,
  });
  const piMetadata: Record<string, string> = {
    kind: "upsell",
    product_sku: sku,
    analysis_id: analysisId,
    supabase_user_id: user.id,
  };
  if (ctx.fbp) piMetadata.meta_fbp = ctx.fbp;
  if (ctx.fbc) piMetadata.meta_fbc = ctx.fbc;
  if (ctx.userAgent) piMetadata.meta_ua = ctx.userAgent.slice(0, 500);
  if (ctx.ipAddress) piMetadata.meta_ip = ctx.ipAddress;

  // Create the PI with the saved PM attached but DON'T confirm it. The
  // client confirms on-session via stripe.confirmPayment so Stripe.js can
  // handle 3DS in a modal when the issuing bank requires SCA — without
  // this, EU cards (which almost always require 3DS) fail every upsell.
  try {
    const pi = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customer.id,
      payment_method: defaultPm,
      description: sku,
      metadata: piMetadata,
    });
    return NextResponse.json({
      clientSecret: pi.client_secret,
      publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
      paymentIntentId: pi.id,
    });
  } catch (err) {
    const stripeErr = err as Stripe.errors.StripeError;
    return NextResponse.json(
      { error: stripeErr.message ?? "Payment failed" },
      { status: 400 },
    );
  }
}
