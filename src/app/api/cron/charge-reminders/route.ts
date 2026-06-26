import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, priceAmountFor, isCurrency, formatPrice, type Currency } from "@/lib/stripe";
import { renderUpcomingChargeEmail } from "@/lib/email/templates";
import { createServiceClient } from "@/lib/supabase/server";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/charge-reminders
 *
 * Vercel Cron hits this once a day. We email every subscriber ~1 day before
 * money leaves their account — for BOTH:
 *   • the first charge as a free trial ends (status `trialing`, charge at
 *     `trial_end`), and
 *   • every recurring renewal afterwards (status `active`, charge at
 *     `current_period_end`).
 *
 * The email states the amount + date and makes it clearly visible that the
 * customer can cancel or request a refund themselves from the dashboard, or
 * reach support@facelineage.com.
 *
 * Idempotency: we stamp each subscription's metadata with
 * `charge_reminder_sent_for=<charge unix ts>`. Because that timestamp changes
 * every billing period, the flag naturally resets for the next charge while
 * still guaranteeing we never email the same charge twice.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Without a
 * matching env, we 401 to keep the endpoint private.
 */

// Daily cron, so the look-ahead window must exceed the 24h cadence or a
// charge could slip between runs. 28h gives a small safety margin while
// keeping the reminder close to "one day before".
const WINDOW_HOURS = 28;

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Operational/test affordances (still require the CRON_SECRET above):
  //   ?dryRun=1        → scan + render but never send or stamp metadata.
  //   ?windowHours=N   → widen the look-ahead, honored ONLY in dry-run so a
  //                      real run can never email customers far ahead of time.
  const params = new URL(req.url).searchParams;
  const dryRun = params.get("dryRun") === "1";
  const windowHours =
    dryRun && params.get("windowHours")
      ? Number(params.get("windowHours")) || WINDOW_HOURS
      : WINDOW_HOURS;
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  const resend = new Resend(resendKey);

  const FROM = process.env.EMAIL_FROM ?? "Facelineage <reports@facelineage.com>";
  const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "support@facelineage.com";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";
  const manageUrl = `${baseUrl}/account`;

  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + windowHours * 3600;

  let sent = 0;
  let skipped = 0;
  let scanned = 0;
  let errors = 0;

  // Each checkout creates TWO subscriptions (a wallets/PayPal flow and a card
  // flow) and only the one the customer actually pays is kept — the other is
  // an abandoned sibling that still sits in `trialing`. Track customers we've
  // already emailed this run so a customer can never receive two copies.
  const emailedCustomers = new Set<string>();

  // Source of truth for "the customer was ACTUALLY charged". Our own
  // `subscriptions` table gets a row only when an intro payment succeeds
  // (provisionIntroPayment, on invoice.paid), and the row is keyed by user_id
  // so only the real paid sibling's id is ever stored. So a checkout that was
  // never charged, AND the abandoned PayPal/card sibling, are both absent —
  // letting us email strictly the subscriptions we have a paid record for.
  // We scope to currently-billable statuses (a charge can only come from one
  // of these) and paginate so accounts with >1k subscribers aren't truncated.
  const db = createServiceClient();
  const chargedSubIds = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from("subscriptions")
      .select("stripe_subscription_id")
      .in("status", ["trialing", "active", "past_due"])
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("[cron] failed to load subscriptions from DB:", error);
      return NextResponse.json({ error: "DB read failed" }, { status: 500 });
    }
    for (const row of data ?? []) {
      if (row.stripe_subscription_id) chargedSubIds.add(row.stripe_subscription_id);
    }
    if (!data || data.length < PAGE) break;
  }

  // Prices carry their alt-currency amounts in `currency_options`, which is
  // only populated when expanded. We can't expand it on the list call —
  // `data.items.data.price.currency_options` is 5 levels deep and Stripe caps
  // expansion at 4, which throws and 500s the whole run. So we fetch each
  // unique price once (cached by id) with a shallow `currency_options` expand.
  const priceCache = new Map<string, Stripe.Price>();
  const priceWithCurrencyOptions = async (p: Stripe.Price): Promise<Stripe.Price> => {
    if (p.currency_options) return p;
    const cached = priceCache.get(p.id);
    if (cached) return cached;
    const full = await stripe.prices.retrieve(p.id, { expand: ["currency_options"] });
    priceCache.set(p.id, full);
    return full;
  };

  // Both states have an upcoming charge: trialing → first real charge at
  // trial_end; active → next renewal at current_period_end. We auto-paginate
  // each list (for-await on the Stripe ApiListPromise) so large accounts are
  // covered, not just the first 100. `default_payment_method` is expanded for
  // the card last-4 (only 2 levels deep — safe).
  for (const status of ["trialing", "active"] as const) {
    for await (const sub of stripe.subscriptions.list({
      status,
      limit: 100,
      expand: ["data.default_payment_method"],
    })) {
      scanned++;
      // One malformed subscription (or a transient Stripe error mid-loop)
      // must not abort the whole run and starve everyone else.
      try {
        const chargeAt = status === "trialing" ? sub.trial_end : sub.current_period_end;
        // Outside the look-ahead window, or no charge coming → skip.
        if (!chargeAt || chargeAt < now || chargeAt > windowEnd) {
          skipped++;
          continue;
        }
        // The subscription is scheduled to cancel before/at the upcoming charge
        // → no charge is coming, so don't send a "you'll be charged" reminder.
        // We check BOTH signals because a cancellation can show up either way:
        //   • `cancel_at_period_end` — the classic Portal "cancel at period end".
        //   • `cancel_at` — an explicit stop timestamp (e.g. set by the
        //     intro→recurring subscription schedule), which can be present while
        //     `cancel_at_period_end` stays false. This is the field our webhook
        //     mirrors into the DB, so it's the cancellation signal we trust.
        // Only `cancel_at` strictly AFTER the charge still bills (e.g. cancel in
        // 3 months on a weekly plan) → those should still get the reminder.
        if (sub.cancel_at_period_end || (sub.cancel_at && sub.cancel_at <= chargeAt)) {
          skipped++;
          continue;
        }
        // Already reminded for this exact charge (covers the legacy
        // `trial_reminder_sent` flag from the old trial-only cron too).
        if (
          sub.metadata?.charge_reminder_sent_for === String(chargeAt) ||
          (status === "trialing" && sub.metadata?.trial_reminder_sent === "1")
        ) {
          skipped++;
          continue;
        }

        // Amount + interval for the charge, in the subscription's own currency.
        const item = sub.items.data[0];
        let price = item?.price;
        if (!price) {
          skipped++;
          continue;
        }
        const subCurrency: Currency = isCurrency(sub.currency) ? sub.currency : "usd";
        // Non-default currency → pull the price's currency_options so we email
        // the right amount (e.g. PLN 99.99, not the USD default).
        if (price.currency !== subCurrency) {
          price = await priceWithCurrencyOptions(price);
        }
        const amountCents = priceAmountFor(price, subCurrency);
        if (!amountCents) {
          skipped++;
          continue;
        }
        const chargeAmount = formatPrice(amountCents, subCurrency);
        const interval = price.recurring?.interval ?? undefined;

        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

        // Only email subscriptions the customer was ACTUALLY charged for.
        // Anything absent from our paid-subscriptions set is either a checkout
        // that never paid or the abandoned dual-flow sibling — skip it. This
        // is the fix for emails going to never-charged customers and for the
        // duplicate-per-customer sends (only one sibling is ever recorded).
        if (!chargedSubIds.has(sub.id)) {
          skipped++;
          continue;
        }

        // Belt-and-suspenders against the dual-subscription setup: never email
        // the same customer twice in one run.
        if (emailedCustomers.has(customerId)) {
          skipped++;
          continue;
        }

        const customer = await stripe.customers.retrieve(customerId, {
          expand: ["invoice_settings.default_payment_method"],
        });
        if (customer.deleted) {
          skipped++;
          continue;
        }
        const email = customer.email;
        if (!email) {
          skipped++;
          continue;
        }

        // Card last-4 for the email: prefer the subscription's own default PM,
        // else the customer's default PM.
        const cardLast4 =
          last4Of(sub.default_payment_method) ??
          last4Of(customer.invoice_settings?.default_payment_method ?? null);

        const firstName = customer.name?.trim().split(/\s+/)[0] || undefined;
        const chargeDate = new Date(chargeAt * 1000).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const { subject, html, text } = renderUpcomingChargeEmail({
          firstName,
          isFirstCharge: status === "trialing",
          chargeAmount,
          interval,
          chargeDate,
          cardLast4,
          manageUrl,
        });

        if (dryRun) {
          console.log(
            `[cron][dry-run] would send to ${email} sub=${sub.id} at=${chargeAt} amount=${chargeAmount} subject="${subject}"`,
          );
          emailedCustomers.add(customerId);
          sent++;
          continue;
        }

        try {
          await resend.emails.send({ from: FROM, to: email, replyTo: REPLY_TO, subject, html, text });
          await stripe.subscriptions.update(sub.id, {
            metadata: { ...(sub.metadata ?? {}), charge_reminder_sent_for: String(chargeAt) },
          });
          emailedCustomers.add(customerId);
          console.log(`[cron] charge reminder sent to ${email} sub=${sub.id} at=${chargeAt}`);
          sent++;
        } catch (err) {
          console.error(`[cron] charge reminder send failed for ${email} sub=${sub.id}:`, err);
          errors++;
        }
      } catch (err) {
        // Per-subscription failure (bad data, transient Stripe error) — log,
        // count, and keep going so the rest of the run still completes.
        console.error(`[cron] charge reminder error sub=${sub.id}:`, err);
        errors++;
      }
    }
  }

  const summary = { sent, skipped, scanned, errors, dryRun, windowHours };
  console.log(`[cron] charge-reminders run complete`, summary);
  return NextResponse.json(summary);
}

/** Pull the card last-4 off an expanded (or string/null) Stripe PaymentMethod. */
function last4Of(
  pm: string | Stripe.PaymentMethod | null | undefined,
): string | undefined {
  if (!pm || typeof pm === "string") return undefined;
  return pm.card?.last4 ?? undefined;
}
