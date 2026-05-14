import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type Stripe from "stripe";
import { stripe, priceIdFor, PLANS, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { runMainPipeline, runUpsellPipeline, type UpsellSku } from "@/lib/ai/pipeline";

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
  const email = pm.billing_details?.email ?? pi.receipt_email ?? undefined;
  console.log(`[invoice.paid] email=${email ?? "(none)"}`);
  if (!email) {
    console.error(`[invoice.paid] no email in billing_details`);
    return;
  }

  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  // 2. Find or create the Supabase user.
  let userId: string | undefined;
  const { data: list } = await db.auth.admin.listUsers();
  const existing = list?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    userId = existing.id;
  } else {
    const { data: created } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (created?.user) userId = created.user.id;
  }
  if (!userId) {
    console.error(`[invoice.paid] failed to provision Supabase user for ${email}`);
    return;
  }
  console.log(`[invoice.paid] userId=${userId}`);

  // 3. Backfill email + supabase id on the customer.
  await stripe.customers.update(customerId, {
    email,
    metadata: { source: "facelineage_checkout", supabase_user_id: userId },
  });

  // 4. Persist the live subscription row.
  await db.from("subscriptions").upsert({
    user_id: userId,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    product_sku: plan,
    status: subscription.status as
      | "trialing"
      | "active"
      | "past_due"
      | "canceled"
      | "incomplete",
    current_period_start: epochToIso(subscription.current_period_start),
    current_period_end: epochToIso(subscription.current_period_end),
  });

  // 5. Record the intro purchase.
  await recordPurchase(db, {
    user_id: userId,
    analysis_id: analysisId ?? null,
    product_sku: plan,
    stripe_payment_intent: pi.id,
    amount_cents: invoice.amount_paid,
    currency: invoice.currency,
  });

  // 6. Cancel the sibling subscription(s) — the customer has up to one
  // other incomplete sub with the same analysis_id (the flow the user
  // didn't pick). Look it up by listing the customer's subs instead of
  // relying on cross-linked metadata (saves a round-trip at checkout time).
  try {
    const otherSubs = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 10,
    });
    for (const other of otherSubs.data) {
      if (other.id === subscription.id) continue;
      if (other.metadata?.analysis_id !== analysisId) continue;
      try {
        await stripe.subscriptions.cancel(other.id);
      } catch {
        // already canceled / already gone — fine
      }
    }
  } catch (err) {
    console.error("Sibling-cancel lookup failed:", err);
  }
  // siblingSubId from metadata is now unused but kept for backward
  // compatibility if any older subs still carry it.
  void siblingSubId;

  // 7. Mark analysis paid + fire the AI pipeline asynchronously.
  if (analysisId) {
    const { error: updErr } = await db
      .from("analyses")
      .update({ is_paid: true, generation_status: "queued" })
      .eq("id", analysisId);
    if (updErr) {
      console.error(`[invoice.paid] failed to mark analysis paid:`, updErr);
    } else {
      console.log(`[invoice.paid] analysis ${analysisId} marked paid + queued`);
    }

    after(async () => {
      console.log(`[after] Starting main pipeline for analysis=${analysisId}`);
      try {
        await runMainPipeline(analysisId);
        console.log(`[after] Main pipeline complete for analysis=${analysisId}`);
      } catch (err) {
        console.error(`[after] Main pipeline failed for analysis=${analysisId}:`, err);
      }
    });
  } else {
    console.log(`[invoice.paid] no analysisId in metadata — skipping pipeline`);
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
 * Insert a purchase row, idempotent on stripe_payment_intent. Works without
 * a unique index — we look up first, then insert if missing.
 */
async function recordPurchase(
  db: ReturnType<typeof createServiceClient>,
  fields: {
    user_id: string | null;
    analysis_id: string | null;
    product_sku: string;
    stripe_payment_intent: string;
    amount_cents: number | null;
    currency: string | null;
  },
): Promise<string | null> {
  const { data: existing } = await db
    .from("purchases")
    .select("id")
    .eq("stripe_payment_intent", fields.stripe_payment_intent)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: inserted, error } = await db
    .from("purchases")
    .insert({
      ...fields,
      status: "paid",
      fulfilled_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("recordPurchase insert failed:", error);
    return null;
  }
  return inserted.id;
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
