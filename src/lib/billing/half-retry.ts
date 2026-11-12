import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";

/**
 * Half-amount retry for customers who are short on funds.
 *
 * When a recurring charge (the first post-trial charge or any renewal) has
 * failed twice, and BOTH declines were `insufficient_funds`, we forgive half
 * of the invoice with a credit note. The invoice stays open on the same
 * subscription, so Stripe's next scheduled Smart Retry simply charges the
 * smaller amount — and `invoice.paid` runs exactly as for any renewal.
 *
 * Applied at most once per invoice: if the half-amount retry also fails,
 * Stripe keeps retrying the half amount on its normal schedule.
 *
 * All state lives on Stripe (charge history, credit note, invoice metadata),
 * so out-of-order or duplicate webhook deliveries are safe.
 *
 * Effectively card-only: PayPal/BLIK failures don't report
 * `insufficient_funds`.
 */

const INSUFFICIENT_FUNDS = "insufficient_funds";
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

export async function maybeHalveAfterInsufficientFunds(invoice: Stripe.Invoice): Promise<void> {
  const tag = `[half-retry] invoice=${invoice.id}`;

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

  // Count declines from the PI's charge history rather than
  // `invoice.attempt_count`, which doesn't tick for every decline.
  const charges = await stripe.charges.list({ payment_intent: piId, limit: 100 });
  const failed = charges.data.filter((c) => c.status === "failed");
  if (failed.length < 2 || !failed.every(isInsufficientFunds)) {
    console.log(
      `${tag} failures=${failed.map(declineReason).join(",") || "(none)"} — not 2× insufficient_funds, skipping`,
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
      memo: "50% courtesy discount after the payment was declined for insufficient funds.",
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

function isInsufficientFunds(c: Stripe.Charge): boolean {
  return c.outcome?.reason === INSUFFICIENT_FUNDS || c.failure_code === INSUFFICIENT_FUNDS;
}
