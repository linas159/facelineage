import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type Stripe from "stripe";
import { stripe, PLANS, resolveCustomerEmail, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { runUpsellPipeline, type UpsellSku } from "@/lib/ai/pipeline";
import { recordPurchase } from "@/lib/purchases";
import { provisionIntroPayment } from "@/lib/provisioning";
import { getOrCreateAuthUser } from "@/lib/auth-user";

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
 *  - customer.subscription.updated/created/deleted → mirror state
 *  - invoice.payment_failed → past_due
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
      case "customer.subscription.updated":
      case "customer.subscription.created": {
        const sub = event.data.object as Stripe.Subscription;
        await upsertSubscription(sub, db);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .from("subscriptions")
          .update({ status: "canceled", canceled_at: new Date().toISOString() })
          .eq("stripe_subscription_id", sub.id);
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
    })
    .eq("stripe_subscription_id", sub.id);
}
