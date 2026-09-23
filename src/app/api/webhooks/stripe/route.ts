import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  PLANS,
  resolveCustomerEmail,
  priceAmountFor,
  isCurrency,
  formatPrice,
  type Currency,
  type PlanKey,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { runUpsellPipeline, type UpsellSku } from "@/lib/ai/pipeline";
import { recordPurchase } from "@/lib/purchases";
import { capturePaymentEvidence, captureRefund } from "@/lib/prevent/evidence";
import { recordDispute } from "@/lib/prevent/disputes";
import { provisionIntroPayment } from "@/lib/provisioning";
import { getOrCreateAuthUser } from "@/lib/auth-user";
import { sendSubscriptionCanceledEmail } from "@/lib/email/send";
import { formatChargeMoment } from "@/lib/email/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keep the function alive after the response is sent so the `after()`
// callbacks below (AI pipelines) can finish. Pro plan allows up to 300s;
// keep at 60s if you're still on Hobby (and expect timeouts).
export const maxDuration = 300;

/**
 * POST /api/webhooks/stripe
 *
 * Handles:
 *  - payment_intent.succeeded
 *      ↳ kind=intro_fee   → start subscription w/ trial, fire main AI pipeline
 *      ↳ kind=upsell      → record purchase, fire upsell pipeline
 *  - customer.subscription.updated/created/deleted → mirror state, and email
 *    the customer a cancellation confirmation when they cancel it themselves
 *  - invoice.payment_failed → past_due
 *  - charge.refunded → mirror refund onto the purchase (dispute-prevention
 *    lookups read it back; see @/lib/prevent)
 *  - charge.dispute.* → mirror the dispute into our own ledger, stamped with
 *    how many Prevent lookups preceded it (see @/lib/prevent/disputes)
 */
export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "Bad signature config" }, { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: `Webhook Error: ${msg}` }, { status: 400 });
  }

  const db = createServiceClient();
  console.log(`[webhook] received event: type=${event.type} id=${event.id}`);

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const kind = pi.metadata?.kind;
        // Intro-fee PIs now belong to subscription invoices (see
        // /api/checkout). Skip them here — invoice.paid handles that flow.
        // Upsell PIs are still standalone and processed here.
        if (kind === "upsell" && !pi.invoice) {
          await handleUpsellPaid(pi, db);
        }
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice, db);
        break;
      }
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub, db);
        break;
      }
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub, db);
        // A Portal cancellation arrives here, not on `.deleted`: the sub keeps
        // running until the period ends. Confirm it the moment they ask, not
        // days later when it lapses.
        const prev = event.data.previous_attributes as
          | Partial<Stripe.Subscription>
          | undefined;
        if (justScheduledCancellation(sub, prev)) {
          await confirmCancellation({
            sub,
            db,
            endsAt: sub.cancel_at ?? sub.current_period_end ?? null,
          });
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
        // Immediate cancellations only ever surface here. One that was
        // scheduled earlier also lands here when it finally lapses — already
        // confirmed then, and the send-once claim inside keeps it to one email.
        await confirmCancellation({ sub, db, endsAt: null });
        break;
      }
      case "charge.refunded": {
        // Keep the purchase row honest for Visa OI / MC Clarity lookups: a
        // response that still advertises the order as refundable after we
        // already refunded it reads as a merchant contradicting itself, which
        // is exactly what makes an issuer distrust the rest of the payload.
        const charge = event.data.object as Stripe.Charge;
        const piRef = charge.payment_intent;
        const piId = typeof piRef === "string" ? piRef : piRef?.id;
        if (piId) {
          await captureRefund({
            db,
            paymentIntentId: piId,
            amountRefundedCents: charge.amount_refunded ?? 0,
          });
        }
        break;
      }
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
      case "charge.dispute.funds_withdrawn":
      case "charge.dispute.funds_reinstated": {
        // The whole point of the Prevent integration is that these stop
        // arriving. Recording them is how we find out whether it works —
        // and, when one does arrive, whether the schemes ever asked us about
        // the purchase first.
        const dispute = event.data.object as Stripe.Dispute;
        await recordDispute({ db, dispute });
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await db
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", invoice.subscription as string);
        }
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler failed:", err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ────────────────────────────────────────────────────────────────────────────
// Intro fee paid → the subscription is already created by /api/checkout.
// This handler just provisions the user, persists the subscription row,
// cancels the sibling subscription (the other flow the user didn't pick),
// and fires the AI pipeline.
// ────────────────────────────────────────────────────────────────────────────

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  db: ReturnType<typeof createServiceClient>,
) {
  // Resolve subscription id from either the legacy top-level field
  // (`invoice.subscription`) OR the new `invoice.parent.subscription_details.subscription`
  // location introduced in API 2024-12-18.acacia. The new flow with
  // `add_invoice_items` + `default_incomplete` populates only the latter.
  const legacyRef = invoice.subscription;
  // Cast through unknown — TypeScript types for older SDK builds don't
  // know about `parent.subscription_details` yet.
  const parent = (invoice as unknown as {
    parent?: {
      subscription_details?: { subscription?: string | { id: string } | null };
    };
  }).parent;
  const newRef = parent?.subscription_details?.subscription ?? null;

  let subscriptionId: string | undefined;
  if (typeof legacyRef === "string") subscriptionId = legacyRef;
  else if (legacyRef && typeof legacyRef === "object") subscriptionId = legacyRef.id;
  if (!subscriptionId) {
    if (typeof newRef === "string") subscriptionId = newRef;
    else if (newRef && typeof newRef === "object") subscriptionId = newRef.id;
  }

  console.log(
    `[invoice.paid] invoice=${invoice.id} subscription=${subscriptionId ?? "(none)"} amount_paid=${invoice.amount_paid}`,
  );

  if (!subscriptionId) {
    console.log(`[invoice.paid] no subscription on invoice (checked legacy + parent) — skipping`);
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const md = subscription.metadata ?? {};
  console.log(`[invoice.paid] sub=${subscription.id} metadata.kind=${md.kind} metadata.flow=${md.flow}`);
  if (md.kind !== "intro_fee") {
    console.log(`[invoice.paid] not intro_fee — skipping`);
    return;
  }

  const plan = md.plan as PlanKey | undefined;
  const analysisId = md.analysis_id;
  const siblingSubId = md.sibling_subscription_id;
  if (!plan || !PLANS[plan]) {
    console.log(`[invoice.paid] missing/invalid plan in metadata — skipping`);
    return;
  }
  console.log(`[invoice.paid] plan=${plan} analysisId=${analysisId}`);

  // 1. Get the PaymentMethod + email from the invoice's PaymentIntent.
  // API 2024-12-18.acacia moved this — try legacy then new `payments[*]`.
  let piId: string | undefined;
  const legacyPi = invoice.payment_intent;
  if (typeof legacyPi === "string") piId = legacyPi;
  else if (legacyPi && typeof legacyPi === "object") piId = legacyPi.id;

  if (!piId) {
    // Re-fetch the subscription with latest_invoice.payment_intent expanded —
    // the most reliable place to get the PI id under API 2024-12-18.acacia.
    const subExpanded = (await stripe.subscriptions.retrieve(subscriptionId, {
      expand: ["latest_invoice.payment_intent"],
    })) as unknown as {
      latest_invoice?: {
        payment_intent?: string | { id: string } | null;
      };
    };
    const expandedPi = subExpanded.latest_invoice?.payment_intent;
    if (typeof expandedPi === "string") piId = expandedPi;
    else if (expandedPi && typeof expandedPi === "object") piId = expandedPi.id;
  }

  if (!piId) {
    // Last-resort fallback — list PaymentIntents for this customer and find
    // the most recent one tied to this invoice.
    const piList = await stripe.paymentIntents.list({
      customer: customerIdFromSubscription(subscription),
      limit: 5,
    });
    for (const candidate of piList.data) {
      if (candidate.invoice && (typeof candidate.invoice === "string"
        ? candidate.invoice
        : candidate.invoice.id) === invoice.id) {
        piId = candidate.id;
        break;
      }
    }
  }

  console.log(`[invoice.paid] piId=${piId ?? "(none)"}`);
  if (!piId) {
    console.error(`[invoice.paid] no PaymentIntent found on invoice ${invoice.id}`);
    return;
  }

  const pi = await stripe.paymentIntents.retrieve(piId);
  const pmId =
    typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (!pmId) {
    console.error(`[invoice.paid] no payment_method on PI ${piId}`);
    return;
  }
  console.log(`[invoice.paid] pmId=${pmId}`);

  const pm = await stripe.paymentMethods.retrieve(pmId);
  // Prefer the email we collected on /email pre-paywall — it's the most
  // reliable source. Fall back to PM/PI for any legacy flow.
  let email: string | undefined;
  if (analysisId) {
    const { data: row } = await db
      .from("analyses")
      .select("email")
      .eq("id", analysisId)
      .maybeSingle();
    email = row?.email ?? undefined;
  }
  if (!email) email = resolveCustomerEmail(pm, pi);
  console.log(`[invoice.paid] pmType=${pm.type} email=${email ?? "(none)"}`);
  if (!email) {
    console.error(`[invoice.paid] no email in billing_details`);
    return;
  }

  if (!analysisId) {
    console.log(`[invoice.paid] no analysisId in metadata — skipping`);
    return;
  }

  // 2. Find or create the Supabase user. Race-safe — /payment-complete
  // may be calling this exact path concurrently for the same email.
  const user = await getOrCreateAuthUser(db, email);
  if (!user) {
    console.error(`[invoice.paid] failed to provision Supabase user for ${email}`);
    return;
  }
  const userId = user.id;
  console.log(`[invoice.paid] userId=${userId}`);

  // Belt-and-suspenders: this exact flow also runs from /payment-complete
  // and /api/intro-charge. Each call is fully idempotent — race-safe.
  // The metadata.flow=card sibling is unused; legacy field still in
  // metadata for older subs is intentionally ignored.
  void siblingSubId;
  // Fire the CAPI Purchase for the intro charge, but NOT for renewals.
  // Guard fail-OPEN: a renewal is unambiguously `subscription_cycle`, so we
  // suppress ONLY that. Every other reason — `subscription_create` and any
  // first-charge variant (payment retries, off-session/saved-PM, wallet
  // finalizations, live-mode API quirks) — still counts as an acquisition.
  //
  // (A prior fail-CLOSED version whitelisted only `subscription_create` and
  // silently dropped real intro purchases whose first invoice happened to
  // carry a different billing_reason — exactly the regression this fixes.)
  const isRenewal = invoice.billing_reason === "subscription_cycle";
  console.log(
    `[invoice.paid] billing_reason=${invoice.billing_reason} renewal=${isRenewal} fireMetaPurchase=${!isRenewal}`,
  );
  await provisionIntroPayment({
    pi,
    pm,
    subscription,
    email,
    userId,
    analysisId,
    plan,
    db,
    fireMetaPurchase: !isRenewal,
  });
  // Stamp invoice.amount_paid on the purchase record (PI.amount may be 0
  // on subscription invoices in some Stripe API states). Idempotent: the
  // shared recordPurchase already inserted; this just normalizes amount
  // if the recorded value is 0 but the invoice says otherwise.
  if (invoice.amount_paid && invoice.amount_paid !== pi.amount) {
    await db
      .from("purchases")
      .update({ amount_cents: invoice.amount_paid })
      .eq("stripe_payment_intent", pi.id);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Upsell PaymentIntent succeeded → record + fire that upsell's pipeline.
// ────────────────────────────────────────────────────────────────────────────

async function handleUpsellPaid(
  pi: Stripe.PaymentIntent,
  db: ReturnType<typeof createServiceClient>,
) {
  const md = pi.metadata ?? {};
  const sku = md.product_sku as UpsellSku | undefined;
  const analysisId = md.analysis_id;
  const userId = md.supabase_user_id;
  if (!sku || !analysisId) return;

  const purchaseId = await recordPurchase(db, {
    user_id: userId ?? null,
    analysis_id: analysisId,
    product_sku: sku,
    stripe_payment_intent: pi.id,
    amount_cents: pi.amount,
    currency: pi.currency,
  });
  if (!purchaseId) {
    console.error("Failed to record upsell purchase for PI:", pi.id);
    return;
  }

  // Card-network identifiers + Compelling Evidence data for Visa OI / MC
  // Clarity lookups. The browser context was stashed on the PI's metadata at
  // /api/upsell-charge time; the email comes off the Stripe customer, since
  // an upsell has no analysis email of its own to prefer.
  await capturePaymentEvidence({
    db,
    pi,
    email: await customerEmailFor(pi),
    metadata: md,
  });

  // Upsells are intentionally NOT sent to Meta as Purchase events. Only the
  // intro subscription charge counts as a website Purchase — counting upsells
  // double-fires Purchase for an already-acquired customer and muddies the
  // ad-optimization signal.

  console.log(`Firing upsell pipeline: sku=${sku} analysis=${analysisId} purchase=${purchaseId}`);
  after(async () => {
    try {
      await runUpsellPipeline({ sku, analysisId, purchaseId });
      console.log(`[after] Upsell pipeline complete sku=${sku} analysis=${analysisId}`);
    } catch (err) {
      console.error(`[after] Upsell pipeline failed for ${sku} on analysis ${analysisId}:`, err);
    }
  });
}

/**
 * Best-effort email for a standalone (upsell) PaymentIntent. Used as the
 * Compelling Evidence `accountId` — the cardholder has to recognize it, so
 * the account email is the right value, not an internal user id.
 */
async function customerEmailFor(pi: Stripe.PaymentIntent): Promise<string | undefined> {
  if (pi.receipt_email) return pi.receipt_email;
  const customerRef = pi.customer;
  const customerId = typeof customerRef === "string" ? customerRef : customerRef?.id;
  if (!customerId) return undefined;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) return undefined;
    return customer.email ?? undefined;
  } catch {
    return undefined;
  }
}

function customerIdFromSubscription(sub: Stripe.Subscription): string {
  return typeof sub.customer === "string" ? sub.customer : sub.customer.id;
}

function epochToIso(secs: number | null | undefined): string | null {
  if (!secs || !Number.isFinite(secs)) return null;
  return new Date(secs * 1000).toISOString();
}

async function upsertSubscription(
  sub: Stripe.Subscription,
  db: ReturnType<typeof createServiceClient>,
) {
  await db
    .from("subscriptions")
    .update({
      status: sub.status as "trialing" | "active" | "past_due" | "canceled" | "incomplete",
      current_period_start: epochToIso(sub.current_period_start),
      current_period_end: epochToIso(sub.current_period_end),
      cancel_at: epochToIso(sub.cancel_at),
      // Back to a plain running subscription (the customer reactivated in the
      // Portal) → drop the send-once stamp, so if they cancel again later they
      // get confirmed again.
      ...(isCanceling(sub) ? {} : { cancel_email_sent_at: null }),
    })
    .eq("stripe_subscription_id", sub.id);
}

// ────────────────────────────────────────────────────────────────────────────
// Cancellation confirmation
//
// A customer who cancels and hears nothing back can't tell whether it worked.
// The cheap outcome of that doubt is a support email; the expensive one is a
// chargeback. So every self-serve cancellation gets a receipt naming the exact
// moment access ends and stating that nothing more will be charged.
// ────────────────────────────────────────────────────────────────────────────

/** Scheduled to stop — either Portal's "cancel at period end" or a hard date. */
function isCanceling(sub: Stripe.Subscription): boolean {
  return sub.cancel_at_period_end === true || sub.cancel_at != null;
}

/**
 * True only for the update that FLIPPED the subscription into canceling.
 * `customer.subscription.updated` fires for every billing-cycle tick and
 * payment-method change too, and each one carries `cancel_at_period_end: true`
 * once it's set — so the state alone can't tell us a cancellation just
 * happened. Stripe's `previous_attributes` diff can.
 */
function justScheduledCancellation(
  sub: Stripe.Subscription,
  prev: Partial<Stripe.Subscription> | undefined,
): boolean {
  if (!isCanceling(sub) || !prev) return false;
  return prev.cancel_at_period_end === false || ("cancel_at" in prev && prev.cancel_at == null);
}

async function confirmCancellation(opts: {
  sub: Stripe.Subscription;
  db: ReturnType<typeof createServiceClient>;
  /** When access ends (unix). null = already over. */
  endsAt: number | null;
}) {
  const { sub, db, endsAt } = opts;

  // Only cancellations the CUSTOMER asked for. Stripe also cancels
  // subscriptions on our behalf — dunning failures (`payment_failed`) and
  // disputes (`payment_disputed`) — and telling someone whose card just
  // bounced that their cancellation is confirmed is both wrong and the kind of
  // contradiction an issuer reads badly.
  if (sub.cancellation_details?.reason !== "cancellation_requested") {
    console.log(
      `[cancel-email] sub=${sub.id} reason=${sub.cancellation_details?.reason ?? "(none)"} — not customer-initiated, skipping`,
    );
    return;
  }

  // Atomic claim, and the paid-customer guard in one query: a `subscriptions`
  // row exists only for a subscription we actually charged (written by
  // provisionIntroPayment on invoice.paid). That excludes the abandoned
  // dual-checkout sibling we cancel ourselves in provisioning — which is a
  // `cancellation_requested` cancellation of a subscription the customer never
  // paid for and must never be emailed about.
  const { data: claimed } = await db
    .from("subscriptions")
    .update({ cancel_email_sent_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id)
    .is("cancel_email_sent_at", null)
    .select("user_id")
    .maybeSingle();
  if (!claimed) {
    console.log(`[cancel-email] sub=${sub.id} — no unclaimed paid subscription row, skipping`);
    return;
  }

  const release = async () => {
    await db
      .from("subscriptions")
      .update({ cancel_email_sent_at: null })
      .eq("stripe_subscription_id", sub.id);
  };

  const customer = await customerOf(sub);
  const email = customer?.email ?? (await profileEmail(db, claimed.user_id));
  if (!email) {
    console.error(`[cancel-email] no email for sub=${sub.id} — skipping`);
    await release();
    return;
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";
  const sent = await sendSubscriptionCanceledEmail(email, {
    firstName: customer?.name?.trim().split(/\s+/)[0] || undefined,
    // The moment, not the day — same reason the trial receipt names it: the
    // customer's record of when access ends can't be vague.
    accessUntil: endsAt && endsAt * 1000 > Date.now() ? formatChargeMoment(endsAt) : undefined,
    canceledAmount: recurringAmountOf(sub),
    manageUrl: `${baseUrl}/account`,
  });
  if (!sent) {
    // Let a webhook retry (or the later `.deleted` event) have another go.
    await release();
    return;
  }
  console.log(`[cancel-email] confirmed cancellation to=${email} sub=${sub.id} endsAt=${endsAt ?? "(now)"}`);
}

/** "$24.99/week" for the subscription's own price + currency, if resolvable. */
function recurringAmountOf(sub: Stripe.Subscription): string | undefined {
  const price = sub.items?.data[0]?.price;
  if (!price) return undefined;
  const currency: Currency = isCurrency(sub.currency) ? sub.currency : "usd";
  // `currency_options` isn't expanded on webhook payloads, so a subscription
  // billed in a non-default currency can only be priced from unit_amount —
  // which would be the wrong number. Quote nothing rather than the wrong sum.
  if (price.currency !== currency && !price.currency_options) return undefined;
  const cents = priceAmountFor(price, currency);
  if (!cents) return undefined;
  const interval = price.recurring?.interval;
  return `${formatPrice(cents, currency, "en")}${interval ? `/${interval}` : ""}`;
}

async function customerOf(sub: Stripe.Subscription): Promise<Stripe.Customer | null> {
  const id = typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
  if (!id) return null;
  try {
    const customer = await stripe.customers.retrieve(id);
    return customer.deleted ? null : customer;
  } catch (err) {
    console.error(`[cancel-email] customer retrieve failed for ${id}:`, err);
    return null;
  }
}

async function profileEmail(
  db: ReturnType<typeof createServiceClient>,
  userId: string | null,
): Promise<string | undefined> {
  if (!userId) return undefined;
  const { data } = await db
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  return data?.email ?? undefined;
}
