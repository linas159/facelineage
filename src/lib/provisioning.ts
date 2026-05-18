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
import { runMainPipeline } from "@/lib/ai/pipeline";
import { recordPurchase } from "@/lib/purchases";
import { sendReportReadyEmail } from "@/lib/email/send";

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
  try {
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

  // 5. Mark analysis paid + queued (idempotent).
  await db
    .from("analyses")
    .update({
      user_id: opts.userId,
      is_paid: true,
      generation_status: "queued",
    })
    .eq("id", opts.analysisId);

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
    console.log(
      `[provisioning] firing pipeline analysis=${opts.analysisId}`,
    );
    try {
      await runMainPipeline(opts.analysisId);
    } catch (err) {
      console.error(
        `[provisioning] pipeline failed analysis=${opts.analysisId}:`,
        err,
      );
      return; // Don't email a broken report.
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
    // locale. Email is en-US formatted regardless of locale (template
    // copy is English only) — Intl.NumberFormat picks the right symbol
    // from the currency code.
    const currency: Currency = isCurrency(opts.pi.currency)
      ? (opts.pi.currency as Currency)
      : "usd";
    const recurringAmountCents = planMeta.recurring[currency];

    try {
      await sendReportReadyEmail(opts.email, {
        reportUrl: `${baseUrl}/report/${opts.analysisId}`,
        amountPaid: formatPrice(opts.pi.amount, currency, "en"),
        paymentDate: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
        cardLast4,
        trialEnds: trialEndsEpoch
          ? new Date(trialEndsEpoch * 1000).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : "the end of your trial",
        recurringAmount: `${formatPrice(recurringAmountCents, currency, "en")}/${planMeta.recurringPeriod}`,
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
