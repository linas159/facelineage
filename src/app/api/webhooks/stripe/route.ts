import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import type Stripe from "stripe";
import { stripe, priceIdFor, PLANS, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { runMainPipeline, runUpsellPipeline, type UpsellSku } from "@/lib/ai/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Keep the function alive for up to 60s after the response is sent so the
// `after()` callbacks below (AI pipelines) can finish. 60s is the max on
// Vercel Hobby; Pro allows up to 300s.
export const maxDuration = 60;

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

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object as Stripe.PaymentIntent;
        const kind = pi.metadata?.kind;
        if (kind === "intro_fee") {
          await handleIntroFeePaid(pi, db);
        } else if (kind === "upsell") {
          await handleUpsellPaid(pi, db);
        }
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
// Intro fee paid → create subscription on the recurring price with a trial
// that lasts the intro period, then fire the main AI pipeline.
// ────────────────────────────────────────────────────────────────────────────

async function handleIntroFeePaid(
  pi: Stripe.PaymentIntent,
  db: ReturnType<typeof createServiceClient>,
) {
  const md = pi.metadata ?? {};
  const plan = md.plan as PlanKey | undefined;
  const analysisId = md.analysis_id;
  const email = md.email ?? pi.receipt_email ?? undefined;
  if (!plan || !PLANS[plan]) return;

  // The user is created lazily — either by /payment-complete or here if the
  // browser never finished the redirect (closed tab, etc.). Either way we
  // claim the analysis and start the pipeline.
  let userId = md.supabase_user_id as string | undefined;
  if (!userId && email) {
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
  }
  if (!userId) return;

  const planMeta = PLANS[plan];
  const recurringSku = planMeta.recurringInterval === "week" ? "recur_week" : "recur_month";
  const recurringPriceId = priceIdFor(recurringSku);
  const customerId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
  if (!customerId) return;

  const paymentMethodId =
    typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;

  // Make the captured PM the default so the trial-end invoice charges it.
  if (paymentMethodId) {
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });
  }

  // Idempotency: if we already created a sub for this PI, do nothing.
  const { data: existing } = await db
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.stripe_subscription_id) {
    // Already provisioned by an earlier delivery of this event.
  } else {
    const newSub = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: recurringPriceId, quantity: 1 }],
      default_payment_method: paymentMethodId ?? undefined,
      trial_period_days: planMeta.introDays,
      // After trial, normal billing kicks in.
      proration_behavior: "none",
      metadata: {
        plan,
        analysis_id: analysisId ?? "",
        supabase_user_id: userId,
        intro_payment_intent: pi.id,
      },
    });

    await db.from("subscriptions").upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: newSub.id,
      product_sku: plan,
      status: newSub.status as "trialing" | "active" | "past_due" | "canceled" | "incomplete",
      current_period_start: epochToIso(newSub.current_period_start),
      current_period_end: epochToIso(newSub.current_period_end),
    });
  }

  // Record the intro purchase + fire AI pipeline (manual idempotency —
  // doesn't depend on a unique index existing).
  await recordPurchase(db, {
    user_id: userId,
    analysis_id: analysisId ?? null,
    product_sku: plan,
    stripe_payment_intent: pi.id,
    amount_cents: pi.amount,
    currency: pi.currency,
  });

  if (analysisId) {
    await db
      .from("analyses")
      .update({ is_paid: true, generation_status: "queued" })
      .eq("id", analysisId);

    // Run after the response is sent so Stripe doesn't time out on us,
    // but inside the same function invocation so Vercel doesn't kill us.
    after(async () => {
      console.log(`[after] Starting main pipeline for analysis=${analysisId}`);
      try {
        await runMainPipeline(analysisId);
        console.log(`[after] Main pipeline complete for analysis=${analysisId}`);
      } catch (err) {
        console.error(`[after] Main pipeline failed for analysis=${analysisId}:`, err);
      }
    });
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
