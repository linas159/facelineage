import { NextResponse } from "next/server";
import { stripe, priceAmountFor, isCurrency } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { renderTrialEndingEmail } from "@/lib/email/templates";
import { Resend } from "resend";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * GET /api/cron/trial-reminders
 *
 * Vercel Cron hits this hourly. We find every active subscription whose
 * trial_end falls inside a 23–25h window from now and send a "your trial
 * ends tomorrow, you'll be charged $X" email. Idempotent: we tag the
 * subscription metadata so we never email the same trial twice.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}`. Without
 * a matching env, we 401 to keep the endpoint private.
 */
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

  // We run once a day on Hobby (Vercel restriction). Widen the window
  // to 0–30h so nothing falls through the gap between daily runs. The
  // per-subscription `trial_reminder_sent` metadata flag prevents
  // duplicate emails even though the window now overlaps days.
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now;
  const windowEnd = now + 30 * 3600;

  // Stripe lets us page subscriptions by trial_end range. We only want
  // trialing subs (not active / canceled).
  const subs = await stripe.subscriptions.list({
    status: "trialing",
    limit: 100,
  });

  const db = createServiceClient();
  let sent = 0;
  let skipped = 0;

  for (const sub of subs.data) {
    if (!sub.trial_end) continue;
    if (sub.trial_end < windowStart || sub.trial_end > windowEnd) {
      skipped++;
      continue;
    }
    if (sub.metadata?.trial_reminder_sent === "1") {
      skipped++;
      continue;
    }

    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
    const customer = await stripe.customers.retrieve(customerId);
    if (customer.deleted) continue;
    const email = (customer as { email?: string | null }).email;
    if (!email) continue;

    // Recurring price + amount for the email body. Use the subscription's
    // currency (set when the user signed up) — `price.unit_amount` is the
    // default-currency amount; the matching currency_options entry has the
    // user's amount.
    const item = sub.items.data[0];
    const price = item?.price;
    if (!price) continue;
    const subCurrency = isCurrency(sub.currency) ? sub.currency : "usd";
    const amount = priceAmountFor(price, subCurrency);
    if (!amount) continue;
    const recurringAmount = `${new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: subCurrency.toUpperCase(),
    }).format(amount / 100)}/${price.recurring?.interval ?? "period"}`;
    const chargeDate = new Date(sub.trial_end * 1000).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";
    const { subject, html, text } = renderTrialEndingEmail({
      chargeDate,
      recurringAmount,
      manageUrl: `${baseUrl}/account`,
    });

    try {
      await resend.emails.send({
        from: FROM,
        to: email,
        replyTo: REPLY_TO,
        subject,
        html,
        text,
      });
      await stripe.subscriptions.update(sub.id, {
        metadata: { ...(sub.metadata ?? {}), trial_reminder_sent: "1" },
      });
      console.log(`[cron] trial reminder sent to ${email} sub=${sub.id}`);
      sent++;
    } catch (err) {
      console.error(`[cron] reminder failed for ${email} sub=${sub.id}:`, err);
    }

    // Touch the user_id link in our DB if it exists (no-op if not).
    void db; // reserved for future logging if you want it
  }

  return NextResponse.json({ sent, skipped, scanned: subs.data.length });
}
