import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Contact Us — Facelineage",
  description: "Get in touch with the Facelineage team.",
};

export default function ContactPage() {
  return (
    <LegalShell title="Contact Us" lastUpdated="May 14, 2026">
      <p>
        We&apos;re a small team and we read every message. The fastest way to
        reach us is email — we usually reply within one business day.
      </p>

      <h2>Email</h2>
      <p>
        <a href="mailto:support@facelineage.com">support@facelineage.com</a>
      </p>

      <h2>What to include</h2>
      <ul>
        <li>The email address on your account, if you have one.</li>
        <li>A short description of what you need.</li>
        <li>Screenshots, if something looks off in your report.</li>
      </ul>

      <h2>Common requests</h2>
      <ul>
        <li>
          <strong>Refunds & cancellations</strong> — see our{" "}
          <a href="/refunds">Refund Policy</a>, then email us.
        </li>
        <li>
          <strong>Account or photo deletion</strong> — email from the address
          on file and we&apos;ll process within 30 days.
        </li>
        <li>
          <strong>Bug reports & feature ideas</strong> — always welcome. We
          ship fast based on real user feedback.
        </li>
        <li>
          <strong>Press & partnerships</strong> — same email, mention
          &quot;press&quot; or &quot;partnership&quot; in the subject line.
        </li>
      </ul>

      <h2>Response times</h2>
      <p>
        Monday–Friday, 9am–6pm. Weekend and holiday replies may take longer.
        For payment issues, please email us before opening a chargeback —
        direct contact almost always resolves things faster.
      </p>
    </LegalShell>
  );
}
