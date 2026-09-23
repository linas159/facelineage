import { Resend } from "resend";
import {
  renderReportReadyEmail,
  renderSubscriptionCanceledEmail,
  type ReportReadyEmailVars,
  type SubscriptionCanceledEmailVars,
} from "./templates";

let _resend: Resend | null = null;
function client(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!_resend) _resend = new Resend(key);
  return _resend;
}

const FROM = process.env.EMAIL_FROM ?? "Facelineage <reports@facelineage.com>";
const REPLY_TO = process.env.EMAIL_REPLY_TO ?? "support@facelineage.com";

/**
 * Sends the "your report is ready" email. Silent no-op when RESEND_API_KEY
 * isn't set (local dev without email creds). Errors are logged but never
 * thrown — a failed email must not break the post-payment pipeline.
 */
export async function sendReportReadyEmail(
  to: string,
  vars: ReportReadyEmailVars,
): Promise<void> {
  const resend = client();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY missing — skipping send to ${to}`);
    return;
  }

  const { subject, html, text } = renderReportReadyEmail(vars);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`[email] Resend error for ${to}:`, error);
      return;
    }
    console.log(`[email] sent report-ready id=${data?.id} to=${to}`);
  } catch (err) {
    console.error(`[email] send threw for ${to}:`, err);
  }
}

/**
 * Sends the "your subscription is canceled" confirmation. Returns whether the
 * mail actually went out, so the caller can release its send-once claim and
 * let a later webhook retry — unlike the report email, there is no second
 * trigger that would otherwise re-fire this one.
 *
 * A missing RESEND_API_KEY (local dev) counts as "not sent" but is not an
 * error; nothing here ever throws.
 */
export async function sendSubscriptionCanceledEmail(
  to: string,
  vars: SubscriptionCanceledEmailVars,
): Promise<boolean> {
  const resend = client();
  if (!resend) {
    console.log(`[email] RESEND_API_KEY missing — skipping cancel confirmation to ${to}`);
    return false;
  }

  const { subject, html, text } = renderSubscriptionCanceledEmail(vars);
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to,
      replyTo: REPLY_TO,
      subject,
      html,
      text,
    });
    if (error) {
      console.error(`[email] Resend error (cancel confirmation) for ${to}:`, error);
      return false;
    }
    console.log(`[email] sent cancel-confirmation id=${data?.id} to=${to}`);
    return true;
  } catch (err) {
    console.error(`[email] cancel confirmation threw for ${to}:`, err);
    return false;
  }
}
