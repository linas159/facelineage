import "server-only";
import type Stripe from "stripe";
import { createServiceClient } from "@/lib/supabase/server";

type DB = ReturnType<typeof createServiceClient>;

function seconds(ts: number | null | undefined): string | null {
  return ts ? new Date(ts * 1000).toISOString() : null;
}

/**
 * Mirror a Stripe dispute into our own ledger.
 *
 * The point is not bookkeeping — Stripe already does that. It is being able
 * to answer, without opening a dashboard, whether the dispute-prevention
 * integration is doing anything. A dispute row carries the number of Prevent
 * lookups we had already answered for the same purchase, which separates
 * "the schemes never asked us" (enrollment not live) from "we answered and it
 * escalated anyway" (our response was not convincing). Those two look
 * identical from the outside and have completely different fixes.
 *
 * Idempotent — Stripe redelivers webhooks, and the same dispute arrives again
 * on every status change. Non-fatal: a failure here must never 500 the
 * webhook and trigger a retry storm over a reporting table.
 */
export async function recordDispute(opts: {
  db?: DB;
  dispute: Stripe.Dispute;
}): Promise<void> {
  const db = opts.db ?? createServiceClient();
  const d = opts.dispute;

  try {
    const chargeId = typeof d.charge === "string" ? d.charge : d.charge?.id;
    const piRef = d.payment_intent;
    const piId = typeof piRef === "string" ? piRef : piRef?.id;

    // Link back to the purchase. The PaymentIntent id is the join key we
    // already index; the charge id is not stored on purchases.
    let purchaseId: string | null = null;
    let cardBrand: string | null = null;
    if (piId) {
      const { data } = await db
        .from("purchases")
        .select("id, card_brand")
        .eq("stripe_payment_intent", piId)
        .maybeSingle();
      purchaseId = data?.id ?? null;
      cardBrand = data?.card_brand ?? null;
    }

    // How many lookups did we answer for this purchase before it got here?
    let lookupCount = 0;
    if (purchaseId) {
      const { count } = await db
        .from("prevent_lookups")
        .select("id", { count: "exact", head: true })
        .eq("matched_purchase_id", purchaseId);
      lookupCount = count ?? 0;
    }

    const closed = d.status === "won" || d.status === "lost" || d.status === "warning_closed";

    await db.from("disputes").upsert(
      {
        stripe_dispute_id: d.id,
        stripe_charge_id: chargeId ?? null,
        stripe_payment_intent: piId ?? null,
        purchase_id: purchaseId,
        card_brand: cardBrand,
        amount_cents: d.amount ?? null,
        currency: d.currency ?? null,
        reason: d.reason ?? null,
        status: d.status ?? null,
        network_reason_code: d.payment_method_details?.card?.network_reason_code ?? null,
        prevent_lookup_count: lookupCount,
        opened_at: seconds(d.created),
        evidence_due_at: seconds(d.evidence_details?.due_by),
        closed_at: closed ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "stripe_dispute_id" },
    );

    // Worth a loud line either way: a dispute on a purchase we were never
    // asked about means the prevention path never ran.
    console.log(
      `[prevent] dispute ${d.id} status=${d.status} reason=${d.reason} brand=${cardBrand ?? "unknown"} ` +
        `purchase=${purchaseId ?? "unmatched"} preventLookupsAnswered=${lookupCount}`,
    );
    if (purchaseId && lookupCount === 0) {
      console.warn(
        `[prevent] dispute ${d.id} arrived with no preceding Order Insight / Clarity lookup — ` +
          `the schemes did not query us before this escalated`,
      );
    }
  } catch (err) {
    console.error(`[prevent] recordDispute failed for ${d.id}:`, err);
  }
}
