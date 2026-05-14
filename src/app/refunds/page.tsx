import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Refund Policy — Facelineage",
  description: "Our refund and cancellation policy.",
};

export default function RefundsPage() {
  return (
    <LegalShell title="Refund Policy" lastUpdated="May 14, 2026">
      <p>
        We want you to feel good about your purchase. If your report
        didn&apos;t meet your expectations, we&apos;ll refund you — no forms,
        no questions.
      </p>

      <h2>1. Money-back window</h2>
      <p>
        You can request a full refund within <strong>30 days</strong> of your
        initial purchase. We process refunds within 5–10 business days back
        to the original payment method.
      </p>

      <h2>2. How to request a refund</h2>
      <p>
        Email <a href="mailto:support@facelineage.com">support@facelineage.com</a>{" "}
        from the address on your account. Include:
      </p>
      <ul>
        <li>The email used to sign up.</li>
        <li>The date of your purchase.</li>
        <li>Last 4 digits of the card used for purchase.</li>
        <li>A sentence on what didn&apos;t work for you.</li>
      </ul>

      <h2>3. Subscriptions</h2>
      <ul>
        <li>
          Your intro payment (e.g. $1.95 for 3 days) covers your trial
          window. Cancel before the trial ends to avoid being charged the
          recurring price.
        </li>
        <li>
          You can cancel anytime from your <a href="/account">account
          page</a>. Cancellation stops future charges; access continues
          until the end of the current period.
        </li>
        <li>
          If you forget to cancel and are charged for a renewal you
          didn&apos;t use, contact us within 7 days of the renewal and we
          will refund the most recent charge.
        </li>
      </ul>

      <h2>4. One-time add-ons</h2>
      <p>
        Add-ons (Mom + Dad breakdown, Heritage Mirror, Future Partner,
        Through The Ages, Heritage Book) are eligible for refund within 30
        days of purchase. If we have already generated the deliverable, the
        refund is at our discretion; we typically still refund first-time
        buyers.
      </p>

      <h2>5. Chargebacks</h2>
      <p>
        Please contact us before initiating a chargeback. Disputes through
        your bank can take 60–90 days and may result in your account being
        closed. Direct contact almost always resolves things in a day.
      </p>

      <h2>6. Exclusions</h2>
      <p>
        Refunds may be declined where there is evidence of abuse, such as:
        repeat-refund accounts, photos uploaded without consent of the
        subject, or attempts to extract content commercially.
      </p>

      <h2>7. Contact</h2>
      <p>
        <a href="mailto:support@facelineage.com">support@facelineage.com</a>{" "}
        — we usually reply within one business day.
      </p>
    </LegalShell>
  );
}
