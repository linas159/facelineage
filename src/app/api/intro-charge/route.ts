import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  PLANS,
  priceIdFor,
  pickCurrency,
  type PlanKey,
} from "@/lib/stripe";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/intro-charge
 * Body: { plan, analysisId }
 *
 * For returning, signed-in users who already have a saved payment method
 * on file. Skips the /checkout page entirely:
 *
 *   1. Creates a subscription (default_incomplete) with the saved PM
 *      attached to the first invoice's PaymentIntent.
 *   2. Returns the PI's clientSecret. The client confirms on-session via
 *      stripe.confirmPayment so Stripe.js handles 3DS in a modal — EU
 *      cards almost always require SCA, so off-session confirm fails for
 *      them.
 *   3. After confirm succeeds, the client POSTs to /api/intro-finalize to
 *      run provisioning (record purchase, fire AI pipeline, send email).
 *
 * If the saved PM is missing/removed, returns { requiresCheckout: true }
 * and the client falls back to /checkout.
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { plan, analysisId, locale: bodyLocale } = (await req.json()) as {
    plan: PlanKey;
    analysisId?: string;
    locale?: string;
  };
  const planMeta = PLANS[plan];
  if (!planMeta) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }

  const locale = isLocale(bodyLocale) ? bodyLocale : DEFAULT_LOCALE;
  const currency = pickCurrency(locale);
  const introAmount = planMeta.intro[currency];

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Verify the analysis belongs to this user.
  const { data: analysis } = await supabase
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Resolve the Stripe customer + saved default payment method.
  const { data: subRow } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!subRow?.stripe_customer_id) {
    return NextResponse.json({ requiresCheckout: true });
  }
  const customer = (await stripe.customers.retrieve(
    subRow.stripe_customer_id,
  )) as Stripe.Customer;
  const pmRef = customer.invoice_settings?.default_payment_method;
  const savedPmId = typeof pmRef === "string" ? pmRef : pmRef?.id;
  if (!savedPmId) {
    return NextResponse.json({ requiresCheckout: true });
  }

  // Build the subscription. Same shape as /api/checkout's two-sub flow,
  // but with the saved PM attached so the first invoice gets paid
  // off-session.
  const recurringSku = planMeta.recurringInterval === "week" ? "recur_week" : "recur_month";
  const recurringPriceId = priceIdFor(recurringSku);
  const recurringPrice = await stripe.prices.retrieve(recurringPriceId, {
    expand: ["product"],
  });
  const introProductId =
    typeof recurringPrice.product === "string"
      ? recurringPrice.product
      : (recurringPrice.product as Stripe.Product).id;

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    currency,
    items: [{ price: recurringPriceId, quantity: 1 }],
    default_payment_method: savedPmId,
    trial_period_days: planMeta.introDays,
    add_invoice_items: [
      {
        price_data: {
          currency,
          product: introProductId,
          unit_amount: introAmount,
        },
      },
    ],
    // Important: incomplete so we can confirm the PI off-session ourselves.
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
    metadata: {
      kind: "intro_fee",
      plan,
      analysis_id: analysisId,
      supabase_user_id: user.id,
      flow: "off_session",
    },
  });

  const invoice = subscription.latest_invoice as Stripe.Invoice | null;
  const pi = invoice?.payment_intent as Stripe.PaymentIntent | null;
  if (!pi?.client_secret) {
    return NextResponse.json({ error: "No PaymentIntent on invoice" }, { status: 500 });
  }

  return NextResponse.json({
    clientSecret: pi.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    subscriptionId: subscription.id,
  });
}
