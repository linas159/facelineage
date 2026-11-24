import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

/**
 * Half-amount retry for customers who are short on funds.
 *
 * When a recurring charge (the first post-trial charge or any renewal) is
 * declined with `insufficient_funds` (or `card_velocity_exceeded` — the
 * card's spending limit is hit, same "can't afford it right now"), we
 * forgive half of the invoice with a credit note. The invoice stays open on the same subscription, so Stripe's
 * very next Smart Retry (the 2nd attempt) charges the smaller amount — and
 * `invoice.paid` runs exactly as for any renewal.
 *
 * Applied at most once per invoice: if the half-amount retry also fails,
 * Stripe keeps retrying the half amount on its normal schedule.
 *
 * All state lives on Stripe (charge history, credit note, invoice metadata),
 * so out-of-order or duplicate webhook deliveries are safe.
 *
 * Effectively card-only: PayPal/BLIK failures don't report these codes.
 */

const ELIGIBLE_DECLINES = new Set(["insufficient_funds", "card_velocity_exceeded"]);
const APPLIED_KEY = "half_retry_applied_at";

// Stripe's minimum charge per currency (minor units), with headroom for the
// FX-converted ones (RON/UAH settle in another currency).
const MIN_CHARGE: Record<string, number> = {
  usd: 50,
  eur: 50,
  gbp: 30,
  pln: 200,
  ron: 200,
  uah: 2500,
};

export async function maybeHalveAfterInsufficientFunds(event: Stripe.Invoice): Promise<void> {
  const tag = `[half-retry] invoice=${event.id}`;
  if (!event.id) return;

  // Re-fetch through our pinned SDK: the webhook endpoint runs a newer API
  // version whose invoice payload has no `payment_intent`, and a fresh copy
  // also reflects any metadata written by a concurrent delivery.
  const invoice = await stripe.invoices.retrieve(event.id);

  if (invoice.billing_reason !== "subscription_cycle") return;
  if (invoice.status !== "open") return;
  if (invoice.metadata?.[APPLIED_KEY]) {
    console.log(`${tag} already applied — skipping`);
    return;
  }
  if (!invoice.next_payment_attempt) {
    console.log(`${tag} no further retry scheduled — skipping`);
    return;
  }

  const piId =
    typeof invoice.payment_intent === "string"
      ? invoice.payment_intent
      : invoice.payment_intent?.id;
  if (!piId) {
    console.log(`${tag} no PaymentIntent — skipping`);
    return;
  }

  // Read declines from the PI's charge history (newest first) rather than
  // `invoice.attempt_count`, which doesn't tick for every decline.
  const charges = await stripe.charges.list({ payment_intent: piId, limit: 100 });
  const failed = charges.data.filter((c) => c.status === "failed");
  const latest = failed[0];
  if (!latest || !isEligibleDecline(latest)) {
    console.log(
      `${tag} failures=${failed.map(declineReason).join(",") || "(none)"} — latest decline not eligible, skipping`,
    );
    return;
  }

  const existing = await stripe.creditNotes.list({ invoice: invoice.id, limit: 1 });
  if (existing.data.length > 0) {
    console.log(`${tag} invoice already has a credit note — skipping`);
    return;
  }

  const original = invoice.amount_remaining;
  const credit = Math.floor(original / 2);
  const remaining = original - credit;
  const min = MIN_CHARGE[invoice.currency] ?? 50;
  if (credit <= 0 || remaining < min) {
    console.log(`${tag} half amount ${remaining} ${invoice.currency} below minimum — skipping`);
    return;
  }

  await stripe.creditNotes.create(
    {
      invoice: invoice.id,
      amount: credit,
      memo: "50% courtesy discount after the payment was declined for insufficient funds or card limit.",
      metadata: { kind: "half_retry", original_amount: String(original) },
    },
    { idempotencyKey: `half-retry-${invoice.id}` },
  );
  await stripe.invoices.update(invoice.id, {
    metadata: {
      [APPLIED_KEY]: new Date().toISOString(),
      half_retry_original_amount: String(original),
    },
  });

  console.log(
    `${tag} halved ${original} → ${remaining} ${invoice.currency}; next retry at ${new Date(
      invoice.next_payment_attempt * 1000,
    ).toISOString()}`,
  );
}

function declineReason(c: Stripe.Charge): string {
  return c.outcome?.reason ?? c.failure_code ?? "unknown";
}

function isEligibleDecline(c: Stripe.Charge): boolean {
  return (
    ELIGIBLE_DECLINES.has(c.outcome?.reason ?? "") || ELIGIBLE_DECLINES.has(c.failure_code ?? "")
  );
}
