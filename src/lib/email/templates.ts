/**
 * HTML email templates. Plain strings with inline styles — email clients
 * (especially Outlook, Apple Mail, Gmail mobile) ignore most CSS, so we
 * stick to tables and inline `style="..."` everywhere.
 *
 * Copy lives in `./copy/{locale}.ts`; every template takes a `locale`
 * (default "en") and renders entirely in that language.
 */

import { DEFAULT_LOCALE, HTML_LANG, INTL_LOCALE, type Locale } from "@/lib/i18n/config";
import { emailCopy, type EmailCopy } from "./copy";

export { formatChargeMoment, formatChargeDate, perInterval } from "./copy";

const SITE = "https://facelineage.com";
const SUPPORT = "support@facelineage.com";

const BRAND = {
  violet: "#7c5cff",
  violetDeep: "#6b46c1",
  magenta: "#ec4899",
  ink: "#2a2540",
  inkSoft: "#4f4660",
  inkMuted: "#847ba0",
  bg: "#f4f0fc",
  cardBg: "#ffffff",
  pale: "#e9e0fc",
  border: "#e1d9f5",
};

export interface ReportReadyEmailVars {
  firstName?: string;
  reportUrl: string;
  amountPaid: string;     // "$1.95"
  paymentDate: string;    // "May 14, 2026"
  cardLast4?: string;     // "4242"
  trialEnds: string;      // "May 17, 2026 at 6:07 PM UTC"
  recurringAmount: string; // "$24.99/week"
  locale?: Locale;
}

export function renderReportReadyEmail(v: ReportReadyEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = v.locale ?? DEFAULT_LOCALE;
  const c = emailCopy(locale);
  const r = c.reportReady;
  const hello = greeting(c, v.firstName);
  const accountUrl = siteUrl("/account", locale);
  const strong = (s: string) => `<strong style="color:${BRAND.inkSoft};">${escape(s)}</strong>`;

  const subject = r.subject;

  const html = `<!DOCTYPE html>
<html lang="${HTML_LANG[locale]}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${escape(r.preheader)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header / hero -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,${BRAND.violet} 0%,${BRAND.magenta} 100%);border-radius:24px 24px 0 0;padding:40px 32px 56px 32px;text-align:center;">
                <tr>
                  <td align="center">
                    <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Facelineage</div>
                    <div style="margin-top:18px;font-size:30px;font-weight:800;line-height:1.15;color:#ffffff;letter-spacing:-0.01em;">
                      ${escape(r.headline)}
                    </div>
                    <div style="margin-top:12px;font-size:15px;line-height:1.45;color:rgba(255,255,255,0.92);max-width:420px;margin-left:auto;margin-right:auto;">
                      ${escape(r.subhead)}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:${BRAND.cardBg};border-radius:24px;padding:36px 28px;box-shadow:0 8px 32px rgba(124,92,255,0.08);">

              <p style="margin:0 0 12px 0;font-size:16px;color:${BRAND.ink};font-weight:600;">${hello}</p>
              <p style="margin:0 0 24px 0;font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">
                ${escape(r.lead)}
              </p>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px 0;">
                    <a href="${escape(v.reportUrl)}" style="display:inline-block;padding:16px 32px;background:${BRAND.violet};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 16px rgba(124,92,255,0.35);">
                      ${escape(r.cta)}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's inside -->
              <div style="margin:8px 0 24px 0;padding:20px;background:${BRAND.pale};border-radius:16px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.violetDeep};margin-bottom:12px;">${escape(r.insideTitle)}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${row("🌍", r.item1Title, r.item1Body)}
                  ${row("🗺️", r.item2Title, r.item2Body)}
                  ${row("✨", r.item3Title, r.item3Body)}
                  ${row("📖", r.item4Title, r.item4Body)}
                </table>
              </div>

              <!-- Receipt -->
              <div style="margin:0 0 4px 0;padding:18px 20px;border:1px solid ${BRAND.border};border-radius:14px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.inkMuted};margin-bottom:10px;">${escape(r.receiptTitle)}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:${BRAND.inkSoft};">
                  <tr>
                    <td style="padding:4px 0;">${escape(r.chargedToday)}</td>
                    <td align="right" style="padding:4px 0;font-weight:700;color:${BRAND.ink};">${escape(v.amountPaid)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">${escape(r.date)}</td>
                    <td align="right" style="padding:4px 0;color:${BRAND.ink};">${escape(v.paymentDate)}</td>
                  </tr>
                  ${
                    v.cardLast4
                      ? `<tr><td style="padding:4px 0;">${escape(r.card)}</td><td align="right" style="padding:4px 0;color:${BRAND.ink};">●●●● ${escape(v.cardLast4)}</td></tr>`
                      : ""
                  }
                </table>
              </div>

              <!-- Subscription notice -->
              <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:${BRAND.inkMuted};">
                ${fill(r.trialNotice, {
                  trialEnds: strong(v.trialEnds),
                  recurring: strong(v.recurringAmount),
                  account: `<a href="${escape(accountUrl)}" style="color:${BRAND.violet};text-decoration:none;font-weight:600;">${escape(r.accountLink)}</a>`,
                })}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px 0 16px;text-align:center;font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">
              ${fill(c.footerQuestions, { email: mailto(SUPPORT, 600) })}<br />
              <span style="display:inline-block;margin-top:10px;">
                ${footerLink(siteUrl("/privacy", locale), c.footerPrivacy)}
                ${footerLink(siteUrl("/terms", locale), c.footerTerms)}
                ${footerLink(siteUrl("/refunds", locale), c.footerRefunds)}
                ${footerLink(siteUrl("/contact", locale), c.footerContact)}
              </span>
              <div style="margin-top:14px;">© ${new Date().getFullYear()} Facelineage</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greetingText(c, v.firstName),
    "",
    r.textReady,
    "",
    fill(r.textView, { url: v.reportUrl }, false),
    "",
    fill(r.textCharged, { amount: v.amountPaid, date: v.paymentDate }, false) +
      (v.cardLast4 ? fill(r.textCard, { last4: v.cardLast4 }, false) : ""),
    fill(r.textTrial, { trialEnds: v.trialEnds, recurring: v.recurringAmount }, false),
    fill(r.textCancel, { url: accountUrl }, false),
    "",
    fill(r.textQuestions, { email: SUPPORT }, false),
    "",
    c.signature,
  ].join("\n");

  return { subject, html, text };
}

// ────────────────────────────────────────────────────────────────────────────
// Upcoming-charge reminder — sent a full day or more before any subscription
// charge. Covers both the first charge after the free trial AND every
// recurring renewal afterwards. Same template, copy adapts via
// `isFirstCharge`.
//
// Every "when" below is DERIVED from `daysUntilCharge` / `chargeMoment` and
// never hardcoded. A reminder that promises "tomorrow" while the card is
// charged the same afternoon is the most disputable thing we can put in a
// customer's inbox: it reads as a bait-and-switch to them, to their bank, and
// to a scheme reviewing the chargeback. The copy is only ever as confident as
// the timestamps allow.
// ────────────────────────────────────────────────────────────────────────────

export interface UpcomingChargeEmailVars {
  firstName?: string;
  /** true = first charge as the free trial ends; false = recurring renewal. */
  isFirstCharge: boolean;
  chargeAmount: string;   // "$24.99"
  interval?: string;      // "week" | "month"
  chargeDate: string;     // "June 15, 2026"
  /** The charge instant incl. time + zone: "June 15, 2026 at 6:07 PM UTC". */
  chargeMoment: string;
  /** Whole calendar days (UTC) from send to charge. 1 = tomorrow, 0 = today. */
  daysUntilCharge: number;
  cardLast4?: string;     // "4242"
  manageUrl: string;      // https://facelineage.com/account
  locale?: Locale;
}

export function renderUpcomingChargeEmail(v: UpcomingChargeEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = v.locale ?? DEFAULT_LOCALE;
  const c = emailCopy(locale);
  const u = c.upcomingCharge;
  const hello = greeting(c, v.firstName);
  const intervalKey = (v.interval ?? "other") as keyof typeof u.every;
  const every = u.every[intervalKey] ?? u.every.other;
  const another = u.another[intervalKey] ?? u.another.other;

  // "in 3 days" / "tomorrow" / "later today" — read off the clock, not
  // assumed. The last branch should only ever fire as a catch-up after a
  // missed cron run, but if it does the customer gets the truth.
  const when =
    v.daysUntilCharge >= 1
      ? new Intl.RelativeTimeFormat(INTL_LOCALE[locale], { numeric: "auto" }).format(v.daysUntilCharge, "day")
      : u.laterToday;
  const When = when.charAt(0).toLocaleUpperCase(INTL_LOCALE[locale]) + when.slice(1);
  const moment = escape(v.chargeMoment);
  const strongMoment = `<strong style="color:${BRAND.ink};">${moment}</strong>`;
  const amountPer = perIntervalOf(c, v.chargeAmount, v.interval);

  const subject = fill(
    v.isFirstCharge ? u.subjectFirst : u.subjectRenewal,
    { when, amount: v.chargeAmount, date: v.chargeDate },
    false,
  );

  const headline = fill(v.isFirstCharge ? u.headlineFirst : u.headlineRenewal, { when });

  const lead = v.isFirstCharge
    ? fill(u.leadFirst, { moment: strongMoment, When, every })
    : fill(u.leadRenewal, { moment: strongMoment, When, period: another });

  const cardLine = v.cardLast4
    ? `<tr><td style="padding:4px 0;">${escape(u.paymentMethod)}</td><td align="right" style="padding:4px 0;color:${BRAND.ink};">${fill(u.cardEnding, { last4: v.cardLast4 })}</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${HTML_LANG[locale]}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${fill(u.preheader, { amount: v.chargeAmount, when, moment: v.chargeMoment })}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header / hero -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,${BRAND.violet} 0%,${BRAND.magenta} 100%);border-radius:24px 24px 0 0;padding:40px 32px 48px 32px;text-align:center;">
                <tr>
                  <td align="center">
                    <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Facelineage</div>
                    <div style="margin-top:16px;font-size:28px;font-weight:800;line-height:1.18;color:#ffffff;letter-spacing:-0.01em;">
                      ${headline}
                    </div>
                    <div style="margin-top:12px;font-size:15px;line-height:1.45;color:rgba(255,255,255,0.92);">
                      ${fill(u.subhead, { amount: `<strong style="color:#ffffff;">${escape(v.chargeAmount)}</strong>`, when, moment })}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:${BRAND.cardBg};border-radius:24px;padding:36px 28px;box-shadow:0 8px 32px rgba(124,92,255,0.08);">

              <p style="margin:0 0 12px 0;font-size:16px;color:${BRAND.ink};font-weight:600;">${hello}</p>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">
                ${lead}
              </p>

              <!-- Charge summary -->
              <div style="margin:0 0 24px 0;padding:20px;background:${BRAND.pale};border-radius:16px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.violetDeep};margin-bottom:12px;">${escape(u.summaryTitle)}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:${BRAND.inkSoft};">
                  <tr>
                    <td style="padding:4px 0;">${escape(u.amount)}</td>
                    <td align="right" style="padding:4px 0;font-weight:700;color:${BRAND.ink};">${escape(amountPer)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">${escape(u.chargeDate)}</td>
                    <td align="right" style="padding:4px 0;color:${BRAND.ink};">${moment} (${escape(when)})</td>
                  </tr>
                  ${cardLine}
                </table>
              </div>

              <!-- Cancel / refund — the important, clearly visible block -->
              <div style="margin:0 0 24px 0;padding:22px 22px 8px 22px;border:2px solid ${BRAND.violet};border-radius:16px;background:#ffffff;">
                <div style="font-size:16px;font-weight:800;color:${BRAND.ink};margin-bottom:6px;">${escape(u.controlTitle)}</div>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">
                  ${fill(u.controlBody, {
                    cancel: `<strong style="color:${BRAND.ink};">${escape(u.controlCancel)}</strong>`,
                    refund: `<strong style="color:${BRAND.ink};">${escape(u.controlRefund)}</strong>`,
                    moment: strongMoment,
                  })}
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding:0 0 16px 0;">
                      <a href="${escape(v.manageUrl)}" style="display:inline-block;padding:15px 30px;background:${BRAND.violet};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 16px rgba(124,92,255,0.32);">
                        ${escape(u.controlCta)}
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:${BRAND.inkMuted};text-align:center;">
                  ${fill(u.controlHelp, { email: mailto(SUPPORT, 700) })}
                </p>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.inkSoft};">
                ${escape(u.keepGoing)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px 0 16px;text-align:center;font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">
              ${fill(c.footerQuestions, { email: mailto(SUPPORT, 600) })}<br />
              <span style="display:inline-block;margin-top:10px;">
                ${footerLink(v.manageUrl, c.footerManage)}
                ${footerLink(siteUrl("/refunds", locale), c.footerRefundPolicy)}
                ${footerLink(siteUrl("/terms", locale), c.footerTerms)}
                ${footerLink(siteUrl("/privacy", locale), c.footerPrivacy)}
              </span>
              <div style="margin-top:14px;">© ${new Date().getFullYear()} Facelineage</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greetingText(c, v.firstName),
    "",
    fill(v.isFirstCharge ? u.textEndsFirst : u.textEndsRenewal, { moment: v.chargeMoment }, false),
    fill(u.textCharge, { When, amount: amountPer }, false) +
      (v.cardLast4 ? fill(u.textCard, { last4: v.cardLast4 }, false) : "."),
    "",
    u.textControlTitle,
    fill(u.textControl1, { url: v.manageUrl }, false),
    fill(u.textControl2, { moment: v.chargeMoment }, false),
    fill(u.textHelp, { email: SUPPORT }, false),
    "",
    u.textKeepGoing,
    "",
    c.signature,
  ].join("\n");

  return { subject, html, text };
}

/** Whole calendar days (UTC) between two unix timestamps. 1 = tomorrow. */
export function calendarDaysUntil(toUnix: number, fromUnix: number): number {
  return Math.floor(toUnix / 86_400) - Math.floor(fromUnix / 86_400);
}

// ────────────────────────────────────────────────────────────────────────────
// Cancellation confirmation — sent when the customer cancels their own
// subscription (Stripe Customer Portal). Two shapes, one template:
//   • access continues until `accessUntil` (the usual "cancel at period end"),
//   • access already ended (an immediate cancellation).
//
// This email exists to be the receipt for a cancellation. A customer who
// cancels and hears nothing back has no way to know it worked, so they either
// email support or — the expensive outcome — call their bank. Everything in
// here is stated in the terms that make the cancellation verifiable: what was
// canceled, the exact moment access ends, and the plain promise that the card
// will not be charged again.
// ────────────────────────────────────────────────────────────────────────────

export interface SubscriptionCanceledEmailVars {
  firstName?: string;
  /**
   * The exact moment access ends: "June 15, 2026 at 6:07 PM UTC". Omitted when
   * the cancellation took effect immediately and access is already over.
   */
  accessUntil?: string;
  /** The charge that will no longer happen: "$24.99/week". Optional. */
  canceledAmount?: string;
  manageUrl: string;      // https://facelineage.com/account
  locale?: Locale;
}

export function renderSubscriptionCanceledEmail(v: SubscriptionCanceledEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const locale = v.locale ?? DEFAULT_LOCALE;
  const c = emailCopy(locale);
  const k = c.canceled;
  const hello = greeting(c, v.firstName);
  const until = v.accessUntil ? escape(v.accessUntil) : null;
  const amountParen = v.canceledAmount ? ` (${escape(v.canceledAmount)})` : "";

  const subject = k.subject;

  const headline = escape(k.headline);
  const subhead = until ? fill(k.subheadUntil, { until }) : escape(k.subheadNow);

  const lead = until
    ? fill(k.leadUntil, { amount: amountParen, until: `<strong style="color:${BRAND.ink};">${until}</strong>` })
    : fill(k.leadNow, { amount: amountParen });

  const amountRow = v.canceledAmount
    ? `<tr>
                    <td style="padding:4px 0;">${escape(k.recurringCharge)}</td>
                    <td align="right" style="padding:4px 0;color:${BRAND.ink};text-decoration:line-through;">${escape(v.canceledAmount)}</td>
                  </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${HTML_LANG[locale]}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escape(subject)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    ${until ? fill(k.preheaderUntil, { until }) : escape(k.preheaderNow)}
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

          <!-- Header / hero -->
          <tr>
            <td style="padding:0 0 16px 0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,${BRAND.violet} 0%,${BRAND.magenta} 100%);border-radius:24px 24px 0 0;padding:40px 32px 48px 32px;text-align:center;">
                <tr>
                  <td align="center">
                    <div style="font-size:13px;font-weight:700;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.85);">Facelineage</div>
                    <div style="margin-top:16px;font-size:28px;font-weight:800;line-height:1.18;color:#ffffff;letter-spacing:-0.01em;">
                      ${headline}
                    </div>
                    <div style="margin-top:12px;font-size:15px;line-height:1.45;color:rgba(255,255,255,0.92);">
                      ${subhead}
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:${BRAND.cardBg};border-radius:24px;padding:36px 28px;box-shadow:0 8px 32px rgba(124,92,255,0.08);">

              <p style="margin:0 0 12px 0;font-size:16px;color:${BRAND.ink};font-weight:600;">${hello}</p>
              <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:${BRAND.inkSoft};">
                ${lead}
              </p>

              <!-- Cancellation summary -->
              <div style="margin:0 0 24px 0;padding:20px;background:${BRAND.pale};border-radius:16px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.violetDeep};margin-bottom:12px;">${escape(k.summaryTitle)}</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:${BRAND.inkSoft};">
                  <tr>
                    <td style="padding:4px 0;">${escape(k.status)}</td>
                    <td align="right" style="padding:4px 0;font-weight:700;color:${BRAND.ink};">${escape(k.statusValue)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">${escape(until ? k.accessUntil : k.accessEnded)}</td>
                    <td align="right" style="padding:4px 0;color:${BRAND.ink};">${until ?? escape(k.now)}</td>
                  </tr>
                  ${amountRow}
                  <tr>
                    <td style="padding:4px 0;">${escape(k.futureCharges)}</td>
                    <td align="right" style="padding:4px 0;font-weight:700;color:${BRAND.ink};">${escape(k.none)}</td>
                  </tr>
                </table>
              </div>

              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">
                ${fill(k.refundPromise, { email: mailto(SUPPORT, 700) })}
              </p>

              <!-- Come back whenever -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:0 0 8px 0;">
                    <a href="${escape(v.manageUrl)}" style="display:inline-block;padding:15px 30px;background:${BRAND.violet};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 16px rgba(124,92,255,0.32);">
                      ${escape(k.cta)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:10px 0 0 0;font-size:13px;line-height:1.6;color:${BRAND.inkMuted};text-align:center;">
                ${escape(k.comeBack)}
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px 0 16px;text-align:center;font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">
              ${fill(c.footerQuestions, { email: mailto(SUPPORT, 600) })}<br />
              <span style="display:inline-block;margin-top:10px;">
                ${footerLink(v.manageUrl, c.footerAccount)}
                ${footerLink(siteUrl("/refunds", locale), c.footerRefundPolicy)}
                ${footerLink(siteUrl("/terms", locale), c.footerTerms)}
                ${footerLink(siteUrl("/privacy", locale), c.footerPrivacy)}
              </span>
              <div style="margin-top:14px;">© ${new Date().getFullYear()} Facelineage</div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = [
    greetingText(c, v.firstName),
    "",
    k.textCanceled,
    v.canceledAmount ? fill(k.textNoChargeAmount, { amount: v.canceledAmount }, false) : k.textNoCharge,
    v.accessUntil ? fill(k.textUntil, { until: v.accessUntil }, false) : k.textEnded,
    "",
    fill(k.textRefund, { email: SUPPORT }, false),
    "",
    fill(k.textComeBack, { url: v.manageUrl }, false),
    "",
    c.signature,
  ].join("\n");

  return { subject, html, text };
}

/**
 * Substitute `{key}` placeholders. With `html` (default) the template text is
 * escaped first and values are spliced in raw — callers escape/wrap values
 * themselves. With `html = false` everything stays plain text.
 */
function fill(tpl: string, vars: Record<string, string>, html = true): string {
  const base = html ? escape(tpl) : tpl;
  return base.replace(/\{(\w+)\}/g, (m, key: string) => (key in vars ? vars[key] : m));
}

function greeting(c: EmailCopy, firstName?: string): string {
  return firstName ? fill(c.helloName, { name: escape(firstName) }) : escape(c.hello);
}

/** Plain-text greeting without the trailing comma ("Hi Anna"). */
function greetingText(c: EmailCopy, firstName?: string): string {
  const g = firstName ? fill(c.helloName, { name: firstName }, false) : c.hello;
  return g.replace(/[,，]\s*$/, "");
}

function perIntervalOf(c: EmailCopy, amount: string, interval?: string): string {
  const tpl = interval ? (c.perInterval as Record<string, string>)[interval] : undefined;
  return tpl ? tpl.replace("{amount}", amount) : amount;
}

/** Absolute site URL with the locale prefix (en has none). */
function siteUrl(path: string, locale: Locale): string {
  return `${SITE}${locale === DEFAULT_LOCALE ? "" : `/${locale}`}${path}`;
}

function mailto(email: string, weight: number): string {
  return `<a href="mailto:${email}" style="color:${BRAND.violet};text-decoration:none;font-weight:${weight};">${email}</a>`;
}

function footerLink(href: string, label: string): string {
  return `<a href="${escape(href)}" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">${escape(label)}</a>`;
}

function row(icon: string, title: string, desc: string): string {
  return `<tr>
    <td valign="top" style="padding:6px 0;width:36px;font-size:20px;">${icon}</td>
    <td valign="top" style="padding:6px 0 6px 4px;">
      <div style="font-size:14px;font-weight:700;color:${BRAND.ink};">${escape(title)}</div>
      <div style="font-size:13px;color:${BRAND.inkSoft};line-height:1.45;">${escape(desc)}</div>
    </td>
  </tr>`;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
