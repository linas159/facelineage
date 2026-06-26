import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { recordPurchase } from "@/lib/purchases";
import { runUpsellPipeline, type UpsellSku } from "@/lib/ai/pipeline";

export const maxDuration = 300;

/**
 * POST /api/upsell-finalize
 * Body: { paymentIntentId }
 *
 * Called by the client after stripe.confirmPayment succeeds. Verifies the PI
 * succeeded + belongs to this user, then records the purchase and fires the
 * upsell pipeline + CAPI Purchase. Idempotent — the Stripe webhook runs the
 * same logic in parallel; both are safe (recordPurchase dedupes by PI id,
 * runUpsellPipeline skips when artifacts already exist, Meta dedupes by
 * event_id).
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const { paymentIntentId } = (await req.json()) as { paymentIntentId?: string };
  if (!paymentIntentId) {
    return NextResponse.json({ error: "Missing paymentIntentId" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  // Guard against cross-user PI claims — the metadata we set on the PI
  // when creating it in /api/upsell-charge must match this signed-in user.
  if (pi.metadata?.supabase_user_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (pi.metadata?.kind !== "upsell") {
    return NextResponse.json({ error: "Not an upsell PI" }, { status: 400 });
  }
  if (pi.status !== "succeeded") {
    return NextResponse.json(
      { error: `Payment not succeeded (status: ${pi.status})` },
      { status: 400 },
    );
  }

  const sku = pi.metadata.product_sku as UpsellSku | undefined;
  const analysisId = pi.metadata.analysis_id;
  if (!sku || !analysisId) {
    return NextResponse.json({ error: "PI missing required metadata" }, { status: 400 });
  }

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
      console.log(`[upsell-finalize] firing pipeline sku=${sku} analysis=${analysisId}`);
      try {
        await runUpsellPipeline({ sku, analysisId, purchaseId });
        console.log(`[upsell-finalize] pipeline done sku=${sku} analysis=${analysisId}`);
      } catch (err) {
        console.error(`[upsell-finalize] pipeline failed sku=${sku}:`, err);
      }
    });
  }

  // Upsells are intentionally NOT sent to Meta as Purchase events. Only the
  // intro subscription charge counts as a website Purchase — see
  // /lib/provisioning.ts. Counting upsells double-fires Purchase for an
  // already-acquired customer and muddies the ad-optimization signal.

  return NextResponse.json({ success: true });
}
