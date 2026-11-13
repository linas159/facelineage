import { after } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  PLANS,
  isCurrency,
  formatPrice,
  type PlanKey,
  type Currency,
} from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { runMainPipelineAndWait } from "@/lib/ai/pipeline";
import { recordPurchase } from "@/lib/purchases";
import { capturePaymentEvidence } from "@/lib/prevent/evidence";
import { sendReportReadyEmail } from "@/lib/email/send";
import { formatChargeDate, formatChargeMoment, perInterval } from "@/lib/email/templates";
import { metaEventId, sendMetaEvent } from "@/lib/meta/capi";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { emailCopy } from "@/lib/email/copy";
import { localized } from "@/lib/i18n/server";

type DB = ReturnType<typeof createServiceClient>;

/**
 * The post-payment provisioning steps for an intro-fee charge. Runs the
 * same logic regardless of which entry point fired:
 *   - Stripe webhook (`invoice.paid`)
 *   - `/payment-complete` page (after Stripe redirect)
 *   - `/api/intro-charge` (returning user with saved PM, off-session)
 *
 * Every write is idempotent — multiple entry points can race safely.
 */
export async function provisionIntroPayment(opts: {
  pi: Stripe.PaymentIntent;
  pm: Stripe.PaymentMethod;
  subscription: Stripe.Subscription;
  email: string;
  userId: string;
  analysisId: string;
  plan: PlanKey;
  db?: DB;
  /**
   * Fire the CAPI Purchase event to Meta. Defaults to true. The Stripe
   * `invoice.paid` webhook passes false for renewal invoices so that only
   * the first (intro) charge is counted as a website Purchase — renewals
   * must not pollute the ad-optimization signal.
   */
  fireMetaPurchase?: boolean;
}): Promise<void> {
  if (!stripe) return;
  const db = opts.db ?? createServiceClient();
  const planMeta = PLANS[opts.plan];
  const customerId =
    typeof opts.subscription.customer === "string"
      ? opts.subscription.customer
      : opts.subscription.customer.id;

  // 1. Mirror email + PM to the Stripe customer so off-session upsells work.
  try {
    await stripe.customers.update(customerId, {
      email: opts.email,
      invoice_settings: { default_payment_method: opts.pm.id },
      metadata: {
        source: "facelineage_checkout",
        supabase_user_id: opts.userId,
      },
    });
  } catch (err) {
    console.error("[provisioning] customer.update failed:", err);
  }

  // 2. Persist subscription row (PK = user_id, default upsert is correct).
  // The row holds one subscription per user. If it already tracks a
  // different running subscription, that one keeps billing untracked in the
  // DB. Cancellations still reach it (the webhook cascades by email), but
  // flag it so duplicates are visible.
  try {
    const { data: existing } = await db
      .from("subscriptions")
      .select("stripe_subscription_id, status")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (
      existing?.stripe_subscription_id &&
      existing.stripe_subscription_id !== opts.subscription.id &&
      (existing.status === "active" || existing.status === "trialing")
    ) {
      console.warn(
        `[provisioning] user=${opts.userId} gets a second running subscription: ` +
          `${opts.subscription.id} replaces tracked ${existing.stripe_subscription_id} (${existing.status})`,
      );
    }
    await db.from("subscriptions").upsert({
      user_id: opts.userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: opts.subscription.id,
      product_sku: opts.plan,
      status: opts.subscription.status,
      current_period_start: opts.subscription.current_period_start
        ? new Date(opts.subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: opts.subscription.current_period_end
        ? new Date(opts.subscription.current_period_end * 1000).toISOString()
        : null,
    });
  } catch (err) {
    console.error("[provisioning] subscriptions.upsert failed:", err);
  }

  // 3. Record purchase (idempotent — dedupes by stripe_payment_intent).
  await recordPurchase(db, {
    user_id: opts.userId,
    analysis_id: opts.analysisId,
    product_sku: opts.plan,
    stripe_payment_intent: opts.pi.id,
    amount_cents: opts.pi.amount,
    currency: opts.pi.currency,
  });

  // 3b. Stamp the card-network identifiers and Compelling Evidence data onto
  // that row, for Visa Order Insight / Mastercard Clarity lookups. Must run
  // after recordPurchase (it updates by PaymentIntent id) and before the
  // response, so a lookup arriving minutes later already has something to
  // match on. Never throws — see capturePaymentEvidence.
  await capturePaymentEvidence({
    db,
    pi: opts.pi,
    email: opts.email,
    // Browser context was stashed on the subscription at /api/checkout time.
    metadata: opts.subscription.metadata ?? undefined,
  });

  // CAPI Purchase. Multiple callers can race here (webhook + /payment-complete
  // + /api/intro-charge) — Meta dedupes by event_id, so identical fires
  // collapse into one conversion. fbp/fbc/ua/ip were stashed on the
  // subscription metadata at /api/checkout time (webhooks have no browser
  // cookies of their own). Only the intro charge fires this — renewals pass
  // fireMetaPurchase=false so they aren't counted as website Purchases.
  if (opts.fireMetaPurchase !== false) {
    const md = opts.subscription.metadata ?? {};
    const piAmount = opts.pi.amount ?? 0;
    void sendMetaEvent({
      eventName: "Purchase",
      eventId: metaEventId.purchase(opts.pi.id),
      userData: {
        email: opts.email,
        externalId: opts.userId,
        fbp: md.meta_fbp,
        fbc: md.meta_fbc,
        ipAddress: md.meta_ip,
        userAgent: md.meta_ua,
      },
      customData: {
        currency: opts.pi.currency.toUpperCase(),
        value: piAmount / 100,
        contentName: opts.plan,
        contentCategory: "subscription_intro",
        contentIds: [opts.plan],
        contentType: "product",
        numItems: 1,
      },
    });
  }

  // 4. Cancel sibling incomplete subs for this analysis (the wallets/card
  // sibling the user didn't choose). Ignore not-found errors.
  try {
    const others = await stripe.subscriptions.list({
      customer: customerId,
      status: "incomplete",
      limit: 10,
    });
    for (const other of others.data) {
      if (other.id === opts.subscription.id) continue;
      if (other.metadata?.analysis_id !== opts.analysisId) continue;
      try {
        await stripe.subscriptions.cancel(other.id);
      } catch {
        /* already gone */
      }
    }
  } catch (err) {
    console.error("[provisioning] sibling cancel failed:", err);
  }

  // 5. Mark analysis paid + owned, queue generation.
  await markAnalysisPaid(db, opts.analysisId, opts.userId);

  // 6. Fire the AI pipeline + the report-ready email post-response. Both
  // are individually deduped — runMainPipeline skips if status is
  // running/ready, and the email uses an update-where-null guard on
  // analyses.report_email_sent_at so only one caller actually sends.
  const trialEndsEpoch = opts.subscription.trial_end ?? null;
  const cardLast4 =
    opts.pm.type === "card" ? opts.pm.card?.last4 ?? undefined : undefined;
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";

  after(async () => {
    // Stamp the customer's language first, so billing emails (reminders,
    // cancellation) use it even if report generation below fails.
    const { data: localeRow } = await db
      .from("analyses")
      .select("locale")
      .eq("id", opts.analysisId)
      .maybeSingle();
    const reportLocale = isLocale(localeRow?.locale) ? localeRow.locale : DEFAULT_LOCALE;
    const { error: localeErr } = await db
      .from("profiles")
      .update({ locale: reportLocale })
      .eq("id", opts.userId);
    if (localeErr) console.error(`[provisioning] profiles.locale update failed:`, localeErr);

    console.log(
      `[provisioning] firing pipeline analysis=${opts.analysisId}`,
    );
    try {
      // If the other entry point (webhook vs /payment-complete) won the claim,
      // wait for its run rather than skipping the email.
      await runMainPipelineAndWait(opts.analysisId);
    } catch (err) {
      console.error(
        `[provisioning] pipeline failed analysis=${opts.analysisId}:`,
        err,
      );
      return; // Don't email a broken report.
    }

    // The pipeline also returns without throwing when it declines the run
    // (another invocation holds the claim, or the attempt budget is spent),
    // so confirm the report is actually ready before promising it by email.
    const { data: finished } = await db
      .from("analyses")
      .select("generation_status")
      .eq("id", opts.analysisId)
      .maybeSingle();
    if (finished?.generation_status !== "ready") {
      console.log(
        `[provisioning] report not ready (status=${finished?.generation_status ?? "unknown"}) — skipping email`,
      );
      return;
    }

    // Atomic check-and-set: only the first caller to claim the timestamp
    // actually sends. Whichever caller loses gets data=null and no-ops.
    const { data: claimed } = await db
      .from("analyses")
      .update({ report_email_sent_at: new Date().toISOString() })
      .eq("id", opts.analysisId)
      .is("report_email_sent_at", null)
      .select("id")
      .maybeSingle();
    if (!claimed) {
      console.log(
        `[provisioning] email already sent for analysis=${opts.analysisId} — skipping`,
      );
      return;
    }

    // Currency of the actual charge — the PI carries it from the
    // subscription's currency, which we set at checkout from the user's
    // locale. Amounts are formatted for the report's language;
    // Intl.NumberFormat picks the right symbol from the currency code.
    const currency: Currency = isCurrency(opts.pi.currency)
      ? (opts.pi.currency as Currency)
      : "usd";
    const recurringAmountCents = planMeta.recurring[currency];

    try {
      await sendReportReadyEmail(opts.email, {
        // Same locale (→ same currency) the customer paid in. Opened on a
        // device without a session, the report page sends them to sign-in
        // with this report as `next`, never back into the funnel.
        locale: reportLocale,
        reportUrl: `${baseUrl}${localized(`/report/${opts.analysisId}`, reportLocale)}`,
        amountPaid: formatPrice(opts.pi.amount, currency, reportLocale),
        paymentDate: formatChargeDate(Math.floor(Date.now() / 1000), reportLocale),
        cardLast4,
        // The instant, not just the day. This receipt is the customer's first
        // and most-kept record of when the trial converts, so it has to name
        // the exact moment their cancellation window closes — a bare date
        // reads as "any time on the 18th" and invites a disputed charge.
        trialEnds: trialEndsEpoch
          ? formatChargeMoment(trialEndsEpoch, reportLocale)
          : emailCopy(reportLocale).reportReady.trialEndFallback,
        recurringAmount: perInterval(
          formatPrice(recurringAmountCents, currency, reportLocale),
          planMeta.recurringInterval,
          reportLocale,
        ),
      });
    } catch (err) {
      console.error(`[provisioning] email failed:`, err);
      // Unclaim so a retry can send next time.
      await db
        .from("analyses")
        .update({ report_email_sent_at: null })
        .eq("id", opts.analysisId);
    }
  });
}

/**
 * Mark an analysis paid + owned and queue its generation. Idempotent.
 *
 * Generation is queued ONLY when there is nothing finished to protect.
 * provisionIntroPayment runs from several entry points (the `invoice.paid`
 * webhook, /payment-complete, /api/intro-charge) and Stripe retries webhooks,
 * so it runs many times per customer — including on every subscription
 * renewal. An unconditional reset to `queued` would take a finished report
 * away from the customer: the report page renders the "composing…" spinner
 * and report-loader returns a blank report for any status other than `ready`.
 */
async function markAnalysisPaid(db: DB, analysisId: string, userId: string): Promise<void> {
  await db
    .from("analyses")
    .update({ user_id: userId, is_paid: true })
    .eq("id", analysisId);

  await db
    .from("analyses")
    .update({ generation_status: "queued" })
    .eq("id", analysisId)
    // Null-safe allowlist: `.not(...in...)` would skip NULL rows, since
    // NOT (NULL IN (...)) is NULL rather than true.
    .or("generation_status.is.null,generation_status.in.(idle,queued,failed)");
}

/**
 * Unlock an extra analysis for a customer whose running subscription already
 * covers it — no charge, no new subscription, no receipt email (they are on
 * the page and watch it generate). Caller must verify ownership and the live
 * subscription first.
 */
export async function unlockIncludedAnalysis(opts: {
  analysisId: string;
  userId: string;
  db?: DB;
}): Promise<void> {
  const db = opts.db ?? createServiceClient();
  await markAnalysisPaid(db, opts.analysisId, opts.userId);
  console.log(
    `[provisioning] included-in-subscription unlock analysis=${opts.analysisId} user=${opts.userId}`,
  );
  after(async () => {
    try {
      await runMainPipelineAndWait(opts.analysisId);
    } catch (err) {
      console.error(`[provisioning] pipeline failed analysis=${opts.analysisId}:`, err);
    }
  });
}
