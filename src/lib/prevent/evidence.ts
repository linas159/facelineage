import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";

type DB = ReturnType<typeof createServiceClient>;

/**
 * Capture the card-network identifiers and Compelling Evidence data for a
 * completed payment onto its `purchases` row.
 *
 * Issuers look transactions up by things we never had a reason to store: the
 * network transaction id, the six-digit auth code, the card last4 and the
 * authorization timestamp. Our own PaymentIntent id is meaningless to them.
 * None of it is reconstructable later — Stripe keeps the Charge, but a lookup
 * arriving months from now has under a second to answer and cannot go fetch
 * it — so it is written once, here, right after the payment settles.
 *
 * Idempotent and non-fatal: this runs on a payment that has already
 * succeeded, and losing dispute evidence is much better than failing
 * provisioning. Every path logs and returns rather than throwing.
 */
export async function capturePaymentEvidence(opts: {
  db?: DB;
  /** The settled PaymentIntent. Passing the object avoids a re-fetch. */
  pi: Stripe.PaymentIntent;
  /** Customer email, used as the CE `accountId`. */
  email?: string | null;
  /**
   * Metadata carrying the browser context captured at checkout — `meta_ip`,
   * `meta_ua`, `device_id`, `device_fp`. On the subscription flow this lives
   * on the Subscription; on upsells it lives on the PaymentIntent.
   */
  metadata?: Record<string, string | undefined> | null;
}): Promise<void> {
  if (!stripe) return;
  const db = opts.db ?? createServiceClient();
  const pi = opts.pi;

  const update: Record<string, unknown> = {};

  try {
    // `latest_charge` is an id unless the caller expanded it; the Charge is
    // the only place the network identifiers live.
    const chargeRef = pi.latest_charge;
    const chargeId = typeof chargeRef === "string" ? chargeRef : chargeRef?.id;
    let charge: Stripe.Charge | null =
      chargeRef && typeof chargeRef !== "string" ? chargeRef : null;
    if (!charge && chargeId) {
      charge = await stripe.charges.retrieve(chargeId);
    }

    if (charge) {
      const card = charge.payment_method_details?.card;
      if (card) {
        update.card_brand = card.brand ?? null;
        update.card_last4 = card.last4 ?? null;
        // `iin` (the 6-digit BIN) is only present on accounts Stripe has
        // enabled it for; absent is normal and the cascade copes.
        update.card_bin = card.iin ?? null;
        update.card_country = card.country ?? null;
        update.auth_code = card.authorization_code ?? null;
        // Visa calls this the Transaction ID, Mastercard the Trace ID. It is
        // the single strongest matching key we can get out of Stripe.
        update.network_transaction_id = card.network_transaction_id ?? null;
      }
      update.statement_descriptor =
        charge.calculated_statement_descriptor ?? charge.statement_descriptor ?? null;
      // The authorization instant, not our row's creation time — the ±3 day
      // matching window is anchored on this.
      update.authorized_at = new Date(charge.created * 1000).toISOString();
    }
  } catch (err) {
    console.error(`[prevent] could not read charge for PI ${pi.id}:`, err);
  }

  if (opts.email) update.customer_email = opts.email;

  const md = opts.metadata ?? {};
  if (md.meta_ip) update.client_ip = md.meta_ip;
  if (md.meta_ua) update.client_user_agent = md.meta_ua;
  if (md.device_id) update.device_id = md.device_id;
  if (md.device_fp) update.device_fingerprint = md.device_fp;

  if (Object.keys(update).length === 0) return;

  try {
    const { error } = await db
      .from("purchases")
      .update(update)
      .eq("stripe_payment_intent", pi.id);
    if (error) {
      console.error(`[prevent] evidence update failed for PI ${pi.id}:`, error);
      return;
    }
    console.log(
      `[prevent] captured evidence for PI ${pi.id} ` +
        `(txnId=${update.network_transaction_id ?? "-"} auth=${update.auth_code ?? "-"} ` +
        `last4=${update.card_last4 ?? "-"} ip=${update.client_ip ? "yes" : "no"} ` +
        `device=${update.device_id ? "yes" : "no"})`,
    );
  } catch (err) {
    console.error(`[prevent] evidence update threw for PI ${pi.id}:`, err);
  }
}

/**
 * Mirror a Stripe refund onto the purchase row so lookup responses stop
 * telling the cardholder their money is still with us — a stale
 * `refundEligible: true` on an already-refunded order is exactly the kind of
 * mismatch that makes an issuer distrust the whole response.
 */
export async function captureRefund(opts: {
  db?: DB;
  paymentIntentId: string;
  amountRefundedCents: number;
  refundedAt?: Date;
}): Promise<void> {
  const db = opts.db ?? createServiceClient();
  try {
    await db
      .from("purchases")
      .update({
        refunded_amount_cents: opts.amountRefundedCents,
        refunded_at: (opts.refundedAt ?? new Date()).toISOString(),
        status: "refunded",
      })
      .eq("stripe_payment_intent", opts.paymentIntentId);
  } catch (err) {
    console.error(`[prevent] refund update failed for PI ${opts.paymentIntentId}:`, err);
  }
}
