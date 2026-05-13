import { NextRequest, NextResponse } from "next/server";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * POST /api/checkout
 * Body: { plan, analysisId, email }
 *
 * Guest-checkout-friendly: no Supabase auth required. We capture the email,
 * use it to create (or reuse) a Stripe customer, and create a one-time
 * PaymentIntent for the intro fee. After payment, /payment-complete
 * provisions the Supabase user and signs them in automatically.
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { plan, analysisId, email } = (await req.json()) as {
    plan: PlanKey;
    analysisId?: string;
    email?: string;
  };
  const planMeta = PLANS[plan];
  if (!planMeta) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
    return NextResponse.json({ error: "Valid email is required" }, { status: 400 });
  }

  // Service client — we don't have a logged-in user yet.
  const db = createServiceClient();

  // Verify the analysis row exists (don't enforce ownership here; user may
  // be unauthenticated at this point. The pending cookie is the only link.)
  const { data: analysis } = await db
    .from("analyses")
    .select("id, user_id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  // Find an existing Stripe customer by email (idempotent across attempts
  // for the same email), or create one.
  const existing = await stripe.customers.list({ email, limit: 1 });
  const customer =
    existing.data[0] ??
    (await stripe.customers.create({
      email,
      metadata: { source: "facelineage_checkout" },
    }));

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const pi = await stripe.paymentIntents.create({
    amount: planMeta.introCents,
    currency: "usd",
    customer: customer.id,
    receipt_email: email,
    setup_future_usage: "off_session",
    automatic_payment_methods: { enabled: true },
    description: planMeta.label,
    metadata: {
      kind: "intro_fee",
      plan,
      analysis_id: analysisId,
      email,
    },
  });

  return NextResponse.json({
    clientSecret: pi.client_secret,
    paymentIntentId: pi.id,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    amount: planMeta.introCents,
    currency: "usd",
    returnUrl: `${baseUrl}/payment-complete?analysis=${analysisId}`,
  });
}
