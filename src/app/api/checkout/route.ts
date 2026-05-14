import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, PLANS, priceIdFor, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/checkout
 *
 * Creates TWO Stripe Subscriptions tied to the same customer:
 *   - subWallets → ExpressCheckoutElement (card + paypal + link allowed,
 *     so PayPal can render as a wallet *and* be saved for recurring).
 *   - subCard    → PaymentElement (card only, no tabs).
 *
 * Each subscription has `trial_period_days` for the intro window and an
 * `add_invoice_items` line for the $1.95 intro fee, with
 * `payment_behavior: "default_incomplete"` so the first invoice's
 * PaymentIntent must be paid to activate. After payment, Stripe auto-charges
 * the recurring price after the trial ends (PayPal billing agreement or
 * saved card — both work).
 *
 * Whichever subscription is paid wins; the webhook cancels the sibling.
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { plan, analysisId } = (await req.json()) as {
    plan: PlanKey;
    analysisId?: string;
  };
  const planMeta = PLANS[plan];
  if (!planMeta) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: analysis } = await db
    .from("analyses")
    .select("id, user_id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const customer = await stripe.customers.create({
    metadata: {
      source: "facelineage_checkout",
      analysis_id: analysisId,
    },
  });

  const recurringSku = planMeta.recurringInterval === "week" ? "recur_week" : "recur_month";
  const recurringPriceId = priceIdFor(recurringSku);

  // Stripe's `add_invoice_items.price_data` needs an existing Product ID.
  // Reuse the recurring price's product so the intro-fee line shows the
  // same name on the invoice as the subscription itself.
  const recurringPrice = await stripe.prices.retrieve(recurringPriceId, {
    expand: ["product"],
  });
  const introProductId =
    typeof recurringPrice.product === "string"
      ? recurringPrice.product
      : (recurringPrice.product as Stripe.Product).id;

  const baseMetadata = {
    kind: "intro_fee" as const,
    plan,
    analysis_id: analysisId,
  };

  const baseSubParams: Omit<Stripe.SubscriptionCreateParams, "payment_settings" | "metadata"> = {
    customer: customer.id,
    items: [{ price: recurringPriceId, quantity: 1 }],
    trial_period_days: planMeta.introDays,
    add_invoice_items: [
      {
        price_data: {
          currency: "usd",
          product: introProductId,
          unit_amount: planMeta.introCents,
        },
      },
    ],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  };

  const [subWallets, subCard] = await Promise.all([
    stripe.subscriptions.create({
      ...baseSubParams,
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card", "paypal", "link"],
      },
      metadata: { ...baseMetadata, flow: "wallets" },
    }),
    stripe.subscriptions.create({
      ...baseSubParams,
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: { ...baseMetadata, flow: "card" },
    }),
  ]);

  // Cross-link the two subs so the webhook can cancel the unused sibling
  // as soon as one is paid.
  await Promise.all([
    stripe.subscriptions.update(subWallets.id, {
      metadata: { ...subWallets.metadata, sibling_subscription_id: subCard.id },
    }),
    stripe.subscriptions.update(subCard.id, {
      metadata: { ...subCard.metadata, sibling_subscription_id: subWallets.id },
    }),
  ]);

  const walletsInvoice = subWallets.latest_invoice as Stripe.Invoice | null;
  const cardInvoice = subCard.latest_invoice as Stripe.Invoice | null;
  const walletsPI = walletsInvoice?.payment_intent as Stripe.PaymentIntent | null;
  const cardPI = cardInvoice?.payment_intent as Stripe.PaymentIntent | null;

  if (!walletsPI?.client_secret || !cardPI?.client_secret) {
    return NextResponse.json(
      { error: "Could not initialize checkout" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    walletsClientSecret: walletsPI.client_secret,
    cardClientSecret: cardPI.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    amount: planMeta.introCents,
    currency: "usd",
    returnUrl: `${baseUrl}/payment-complete?analysis=${analysisId}`,
  });
}
