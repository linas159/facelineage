import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/checkout
 * Body: { plan, analysisId }
 *
 * Creates TWO PaymentIntents tied to the same customer:
 *   - walletsClientSecret → ExpressCheckoutElement (PayPal, Apple Pay,
 *     Google Pay, Link). Uses automatic_payment_methods so every wallet
 *     enabled on the account can render.
 *   - cardClientSecret    → PaymentElement (card form only, no tabs).
 *     Restricted via payment_method_types: ['card'].
 *
 * Whichever the user actually completes wins; the other is abandoned and
 * Stripe expires it. The webhook's intro-fee handler is identical for both.
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

  // One Stripe customer shared by both PIs — whichever PI is confirmed
  // attaches the PaymentMethod to this customer for the recurring charge.
  const customer = await stripe.customers.create({
    metadata: {
      source: "facelineage_checkout",
      analysis_id: analysisId,
    },
  });

  const sharedMetadata = {
    kind: "intro_fee",
    plan,
    analysis_id: analysisId,
  };

  const [piWallets, piCard] = await Promise.all([
    // Wallets PI — supports PayPal, Apple Pay, Google Pay, Link
    stripe.paymentIntents.create({
      amount: planMeta.introCents,
      currency: "usd",
      customer: customer.id,
      setup_future_usage: "off_session",
      automatic_payment_methods: { enabled: true },
      description: planMeta.label,
      metadata: { ...sharedMetadata, flow: "wallets" },
    }),
    // Card PI — restricted so PaymentElement renders the card form directly
    stripe.paymentIntents.create({
      amount: planMeta.introCents,
      currency: "usd",
      customer: customer.id,
      setup_future_usage: "off_session",
      payment_method_types: ["card"],
      description: planMeta.label,
      metadata: { ...sharedMetadata, flow: "card" },
    }),
  ]);

  return NextResponse.json({
    walletsClientSecret: piWallets.client_secret,
    cardClientSecret: piCard.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    amount: planMeta.introCents,
    currency: "usd",
    returnUrl: `${baseUrl}/payment-complete?analysis=${analysisId}`,
  });
}
