import { NextRequest, NextResponse } from "next/server";
import {
  stripe,
  priceIdFor,
  pickCurrency,
  priceAmountFor,
  UPSELL_SKU_BY_UI_ID,
} from "@/lib/stripe";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/upsell-checkout
 * Body: { upsell: "parents" | "ethnicity" | "ages" | "partner" | "book", analysisId: string }
 *
 * Creates a one-time PaymentIntent for the upsell amount. The frontend renders
 * the same custom checkout (Payment Element + Express Checkout). The webhook
 * picks up `payment_intent.succeeded` (kind=upsell) and fires the matching
 * generation pipeline.
 *
 * Returns: { clientSecret, paymentIntentId, publishableKey, amount, currency }
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

  const { data: analysis } = await supabase
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Resolve / create Stripe customer.
  let customerId: string | undefined;
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (sub?.stripe_customer_id) {
    customerId = sub.stripe_customer_id;
  } else {
    const customer = await stripe.customers.create({
      email: user.email,
      metadata: { supabase_user_id: user.id },
    });
    customerId = customer.id;
  }

  // Look up the price → get its amount in the requested currency. Stripe
  // Prices created by `setup-stripe.mjs` hold all supported currencies
  // under `currency_options`; we pick the matching amount here so we don't
  // trust the client and so PaymentIntent.amount matches PaymentIntent.currency.
  // currency_options is NOT included by default — must expand it explicitly.
  const priceId = priceIdFor(sku);
  const price = await stripe.prices.retrieve(priceId, {
    expand: ["currency_options"],
  });
  const amount = priceAmountFor(price, currency);
  if (!amount) {
    return NextResponse.json({ error: "Price misconfigured" }, { status: 500 });
  }

  const pi = await stripe.paymentIntents.create({
    amount,
    currency,
    customer: customerId,
    payment_method_types: ["card"],
    description: sku,
    metadata: {
      kind: "upsell",
      product_sku: sku,
      analysis_id: analysisId,
      supabase_user_id: user.id,
    },
  });

  return NextResponse.json({
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    amount,
    currency,
  });
}
