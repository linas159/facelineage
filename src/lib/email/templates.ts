/**
 * HTML email templates. Plain strings with inline styles — email clients
 * (especially Outlook, Apple Mail, Gmail mobile) ignore most CSS, so we
 * stick to tables and inline `style="..."` everywhere.
 */

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
  trialEnds: string;      // "May 17, 2026"
  recurringAmount: string; // "$24.99/week"
}

export function renderReportReadyEmail(v: ReportReadyEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const hello = v.firstName ? `Hi ${escape(v.firstName)},` : "Hello,";

  const subject = "Your Facelineage report is ready ✨";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    Your AI heritage report is ready to view. Tap below to see your full ancestry breakdown.
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
                      Your report is ready
                    </div>
                    <div style="margin-top:12px;font-size:15px;line-height:1.45;color:rgba(255,255,255,0.92);max-width:420px;margin-left:auto;margin-right:auto;">
                      We've finished composing your heritage breakdown, ancestor portrait, and story.
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
                Your personalized Facelineage report is ready. We mapped your features to ancestral regions and rendered a portrait of one of your possible ancestors.
              </p>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="padding:8px 0 28px 0;">
                    <a href="${escape(v.reportUrl)}" style="display:inline-block;padding:16px 32px;background:${BRAND.violet};color:#ffffff;font-size:16px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 16px rgba(124,92,255,0.35);">
                      View my report →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- What's inside -->
              <div style="margin:8px 0 24px 0;padding:20px;background:${BRAND.pale};border-radius:16px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.violetDeep};margin-bottom:12px;">Inside your report</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  ${row("🌍", "Heritage breakdown", "Percentage match across 94 ancestral regions.")}
                  ${row("🗺️", "Migration map", "The routes your ancestors likely traveled.")}
                  ${row("✨", "Ancestor portrait", "A painted impression from eight generations back.")}
                  ${row("📖", "Heritage story", "A narrative tying your features to history.")}
                </table>
              </div>

              <!-- Receipt -->
              <div style="margin:0 0 4px 0;padding:18px 20px;border:1px solid ${BRAND.border};border-radius:14px;">
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.inkMuted};margin-bottom:10px;">Receipt</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:${BRAND.inkSoft};">
                  <tr>
                    <td style="padding:4px 0;">Charged today</td>
                    <td align="right" style="padding:4px 0;font-weight:700;color:${BRAND.ink};">${escape(v.amountPaid)}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">Date</td>
                    <td align="right" style="padding:4px 0;color:${BRAND.ink};">${escape(v.paymentDate)}</td>
                  </tr>
                  ${
                    v.cardLast4
                      ? `<tr><td style="padding:4px 0;">Card</td><td align="right" style="padding:4px 0;color:${BRAND.ink};">●●●● ${escape(v.cardLast4)}</td></tr>`
                      : ""
                  }
                </table>
              </div>

              <!-- Subscription notice -->
              <p style="margin:18px 0 0 0;font-size:12px;line-height:1.6;color:${BRAND.inkMuted};">
                Your trial covers full access until <strong style="color:${BRAND.inkSoft};">${escape(v.trialEnds)}</strong>. If you don't cancel before then, your subscription renews at <strong style="color:${BRAND.inkSoft};">${escape(v.recurringAmount)}</strong>. You can cancel anytime from your <a href="https://facelineage.com/account" style="color:${BRAND.violet};text-decoration:none;font-weight:600;">account page</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px 0 16px;text-align:center;font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">
              Questions? Reply to this email or write to <a href="mailto:support@facelineage.com" style="color:${BRAND.violet};text-decoration:none;font-weight:600;">support@facelineage.com</a>.<br />
              <span style="display:inline-block;margin-top:10px;">
                <a href="https://facelineage.com/privacy" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Privacy</a>
                <a href="https://facelineage.com/terms" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Terms</a>
                <a href="https://facelineage.com/refunds" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Refunds</a>
                <a href="https://facelineage.com/contact" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Contact</a>
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
    `${hello.replace(",", "")}`,
    "",
    "Your Facelineage report is ready.",
    "",
    `View your report: ${v.reportUrl}`,
    "",
    `Charged today: ${v.amountPaid} on ${v.paymentDate}` +
      (v.cardLast4 ? ` (card ending ${v.cardLast4})` : ""),
    `Trial ends: ${v.trialEnds} — renews at ${v.recurringAmount} unless you cancel.`,
    "Cancel anytime: https://facelineage.com/account",
    "",
    "Questions? support@facelineage.com",
    "",
    "— Facelineage",
  ].join("\n");

  return { subject, html, text };
}

// ────────────────────────────────────────────────────────────────────────────
// Upcoming-charge reminder — sent ~1 day before any subscription charge.
// Covers both the first charge after the free trial AND every recurring
// renewal afterwards. Same template, copy adapts via `isFirstCharge`.
// ────────────────────────────────────────────────────────────────────────────

export interface UpcomingChargeEmailVars {
  firstName?: string;
  /** true = first charge as the free trial ends; false = recurring renewal. */
  isFirstCharge: boolean;
  chargeAmount: string;   // "$24.99"
  interval?: string;      // "week" | "month"
  chargeDate: string;     // "June 15, 2026"
  cardLast4?: string;     // "4242"
  manageUrl: string;      // https://facelineage.com/account
}

export function renderUpcomingChargeEmail(v: UpcomingChargeEmailVars): {
  subject: string;
  html: string;
  text: string;
} {
  const hello = v.firstName ? `Hi ${escape(v.firstName)},` : "Hello,";
  const everyInterval = v.interval ? `every ${escape(v.interval)}` : "on a recurring basis";

  const subject = v.isFirstCharge
    ? `Your Facelineage trial ends tomorrow — ${v.chargeAmount} on ${v.chargeDate}`
    : `Reminder: your Facelineage subscription renews tomorrow — ${v.chargeAmount}`;

  const headline = v.isFirstCharge ? "Your trial ends tomorrow" : "Your subscription renews tomorrow";

  const lead = v.isFirstCharge
    ? `Your free trial of Facelineage ends on <strong style="color:${BRAND.ink};">${escape(v.chargeDate)}</strong>. Tomorrow we&rsquo;ll start your subscription and charge the payment method on file. After that you&rsquo;ll be billed ${everyInterval} until you cancel.`
    : `This is a friendly reminder that your Facelineage subscription renews on <strong style="color:${BRAND.ink};">${escape(v.chargeDate)}</strong>. Tomorrow we&rsquo;ll charge the payment method on file for another ${v.interval ? escape(v.interval) : "period"}.`;

  const cardLine = v.cardLast4
    ? `<tr><td style="padding:4px 0;">Payment method</td><td align="right" style="padding:4px 0;color:${BRAND.ink};">Card ending ●●●● ${escape(v.cardLast4)}</td></tr>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND.ink};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    You&rsquo;ll be charged ${escape(v.chargeAmount)} tomorrow. Cancel or request a refund anytime from your dashboard.
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
                      You&rsquo;ll be charged <strong style="color:#ffffff;">${escape(v.chargeAmount)}</strong> tomorrow.
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
                <div style="font-size:12px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:${BRAND.violetDeep};margin-bottom:12px;">Upcoming charge</div>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="font-size:14px;color:${BRAND.inkSoft};">
                  <tr>
                    <td style="padding:4px 0;">Amount</td>
                    <td align="right" style="padding:4px 0;font-weight:700;color:${BRAND.ink};">${escape(v.chargeAmount)}${v.interval ? ` / ${escape(v.interval)}` : ""}</td>
                  </tr>
                  <tr>
                    <td style="padding:4px 0;">Charge date</td>
                    <td align="right" style="padding:4px 0;color:${BRAND.ink};">${escape(v.chargeDate)} (tomorrow)</td>
                  </tr>
                  ${cardLine}
                </table>
              </div>

              <!-- Cancel / refund — the important, clearly visible block -->
              <div style="margin:0 0 24px 0;padding:22px 22px 8px 22px;border:2px solid ${BRAND.violet};border-radius:16px;background:#ffffff;">
                <div style="font-size:16px;font-weight:800;color:${BRAND.ink};margin-bottom:6px;">You&rsquo;re in control</div>
                <p style="margin:0 0 16px 0;font-size:14px;line-height:1.6;color:${BRAND.inkSoft};">
                  Don&rsquo;t want to be charged? You can <strong style="color:${BRAND.ink};">cancel</strong> or <strong style="color:${BRAND.ink};">request a refund</strong> yourself, right now, from your Facelineage dashboard — no need to wait and no questions asked. Cancel before ${escape(v.chargeDate)} and you won&rsquo;t be charged.
                </p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td align="center" style="padding:0 0 16px 0;">
                      <a href="${escape(v.manageUrl)}" style="display:inline-block;padding:15px 30px;background:${BRAND.violet};color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:14px;box-shadow:0 4px 16px rgba(124,92,255,0.32);">
                        Manage, cancel or refund →
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:0 0 14px 0;font-size:13px;line-height:1.6;color:${BRAND.inkMuted};text-align:center;">
                  Prefer a hand? Email <a href="mailto:support@facelineage.com" style="color:${BRAND.violet};text-decoration:none;font-weight:700;">support@facelineage.com</a> and we&rsquo;ll sort it out for you.
                </p>
              </div>

              <p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.inkSoft};">
                Happy to keep exploring your heritage? No action needed — your subscription continues automatically and you&rsquo;ll keep full access.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 16px 0 16px;text-align:center;font-size:12px;color:${BRAND.inkMuted};line-height:1.6;">
              Questions? Reply to this email or write to <a href="mailto:support@facelineage.com" style="color:${BRAND.violet};text-decoration:none;font-weight:600;">support@facelineage.com</a>.<br />
              <span style="display:inline-block;margin-top:10px;">
                <a href="${escape(v.manageUrl)}" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Manage subscription</a>
                <a href="https://facelineage.com/refunds" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Refund policy</a>
                <a href="https://facelineage.com/terms" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Terms</a>
                <a href="https://facelineage.com/privacy" style="color:${BRAND.inkMuted};text-decoration:underline;margin:0 6px;">Privacy</a>
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
    hello.replace(",", ""),
    "",
    v.isFirstCharge
      ? `Your free Facelineage trial ends on ${v.chargeDate}.`
      : `Your Facelineage subscription renews on ${v.chargeDate}.`,
    `Tomorrow you'll be charged ${v.chargeAmount}${v.interval ? `/${v.interval}` : ""}` +
      (v.cardLast4 ? ` to your card ending ${v.cardLast4}.` : "."),
    "",
    "YOU'RE IN CONTROL",
    `You can cancel or request a refund yourself, anytime, from your Facelineage dashboard: ${v.manageUrl}`,
    `Cancel before ${v.chargeDate} and you won't be charged.`,
    "Prefer help? Email support@facelineage.com and we'll sort it out.",
    "",
    "Happy to continue? No action needed — your subscription renews automatically.",
    "",
    "— Facelineage",
  ].join("\n");

  return { subject, html, text };
}

function row(icon: string, title: string, desc: string): string {
  return `<tr>
    <td valign="top" style="padding:6px 0;width:36px;font-size:20px;">${icon}</td>
    <td valign="top" style="padding:6px 0 6px 4px;">
      <div style="font-size:14px;font-weight:700;color:${BRAND.ink};">${title}</div>
      <div style="font-size:13px;color:${BRAND.inkSoft};line-height:1.45;">${desc}</div>
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
