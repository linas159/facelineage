import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, PLANS, type PlanKey } from "@/lib/stripe";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { provisionIntroPayment } from "@/lib/provisioning";

export const maxDuration = 300;

/**
 * POST /api/intro-finalize
 * Body: { subscriptionId }
 *
 * Called by the paywall after stripe.confirmPayment succeeds for the
 * returning-user (one-tap) flow. Verifies the subscription belongs to this
 * user + the first invoice's PI succeeded, then runs provisionIntroPayment.
 * Idempotent with the Stripe webhook — recordPurchase dedupes by PI id,
 * runMainPipeline skips if generation is already running/ready, the email
 * uses an update-where-null guard, and sibling-cancel ignores not-found.
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { subscriptionId } = (await req.json()) as { subscriptionId?: string };
  if (!subscriptionId) {
    return NextResponse.json({ error: "Missing subscriptionId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const subscription = (await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["latest_invoice.payment_intent"],
  })) as Stripe.Subscription & {
    latest_invoice?: Stripe.Invoice & { payment_intent?: Stripe.PaymentIntent | null };
  };

  // Guard against cross-user claims — metadata stamped by /api/intro-charge.
  if (subscription.metadata?.supabase_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (subscription.metadata?.kind !== "intro_fee") {
    return NextResponse.json({ error: "Not an intro fee subscription" }, { status: 400 });
  }

  const plan = subscription.metadata?.plan as PlanKey | undefined;
  const analysisId = subscription.metadata?.analysis_id;
  if (!plan || !PLANS[plan] || !analysisId) {
    return NextResponse.json({ error: "Subscription missing required metadata" }, { status: 400 });
  }

  const pi = subscription.latest_invoice?.payment_intent ?? null;
  if (!pi) {
    return NextResponse.json({ error: "No PaymentIntent on invoice" }, { status: 500 });
  }
  if (pi.status !== "succeeded") {
    return NextResponse.json(
      { error: `Payment not succeeded (status: ${pi.status})` },
      { status: 400 },
    );
  }

  const pmId =
    typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (!pmId) {
    return NextResponse.json({ error: "No payment method on PaymentIntent" }, { status: 500 });
  }
  const pm = await stripe.paymentMethods.retrieve(pmId);

  try {
    await provisionIntroPayment({
      pi,
      pm,
      subscription,
      email: user.email ?? "",
      userId: user.id,
      analysisId,
      plan,
      db: createServiceClient(),
    });
  } catch (err) {
    console.error("[intro-finalize] provisioning failed:", err);
    // Don't fail the response — webhook will reconcile. Client can still
    // proceed to the report; provisioning is idempotent.
  }

  return NextResponse.json({ success: true });
}
