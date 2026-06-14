import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, priceAmountFor, isCurrency, formatPrice, type Currency } from "@/lib/stripe";
import { renderUpcomingChargeEmail } from "@/lib/email/templates";
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
  if (!stripe) return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return NextResponse.json({ error: "Resend not configured" }, { status: 500 });
  const resend = new Resend(resendKey);

  const FROM = process.env.EMAIL_FROM ?? "Facelineage <reports@facelineage.com>";
  const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "support@facelineage.com";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";
  const manageUrl = `${baseUrl}/account`;

  const now = Math.floor(Date.now() / 1000);
  const windowEnd = now + WINDOW_HOURS * 3600;

  let sent = 0;
  let skipped = 0;
  let scanned = 0;

  // Both states have an upcoming charge: trialing → first real charge at
  // trial_end; active → next renewal at current_period_end. We auto-paginate
  // each list (for-await on the Stripe ApiListPromise) so large accounts are
  // covered, not just the first 100.
  for (const status of ["trialing", "active"] as const) {
    for await (const sub of stripe.subscriptions.list({
      status,
      limit: 100,
      expand: [
        "data.items.data.price.currency_options",
        "data.default_payment_method",
      ],
    })) {
      scanned++;

      const chargeAt = status === "trialing" ? sub.trial_end : sub.current_period_end;
      // Outside the look-ahead window, or no charge coming → skip.
      if (!chargeAt || chargeAt < now || chargeAt > windowEnd) {
        skipped++;
        continue;
      }
      // The subscription is set to end at period end → no charge tomorrow.
      if (sub.cancel_at_period_end) {
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
      const price = item?.price;
      if (!price) {
        skipped++;
        continue;
      }
      const subCurrency: Currency = isCurrency(sub.currency) ? sub.currency : "usd";
      const amountCents = priceAmountFor(price, subCurrency);
      if (!amountCents) {
        skipped++;
        continue;
      }
      const chargeAmount = formatPrice(amountCents, subCurrency);
      const interval = price.recurring?.interval ?? undefined;

      // Card last-4: prefer the subscription's own default PM (expanded
      // above), else fall back to the customer's default PM.
      let cardLast4 = last4Of(sub.default_payment_method);

      const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
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
      if (!cardLast4) {
        cardLast4 = last4Of(customer.invoice_settings?.default_payment_method ?? null);
      }

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

      try {
        await resend.emails.send({ from: FROM, to: email, replyTo: REPLY_TO, subject, html, text });
        await stripe.subscriptions.update(sub.id, {
          metadata: { ...(sub.metadata ?? {}), charge_reminder_sent_for: String(chargeAt) },
        });
        console.log(`[cron] charge reminder sent to ${email} sub=${sub.id} at=${chargeAt}`);
        sent++;
      } catch (err) {
        console.error(`[cron] charge reminder failed for ${email} sub=${sub.id}:`, err);
        skipped++;
      }
    }
  }

  return NextResponse.json({ sent, skipped, scanned });
}

/** Pull the card last-4 off an expanded (or string/null) Stripe PaymentMethod. */
function last4Of(
  pm: string | Stripe.PaymentMethod | null | undefined,
): string | undefined {
  if (!pm || typeof pm === "string") return undefined;
  return pm.card?.last4 ?? undefined;
}
