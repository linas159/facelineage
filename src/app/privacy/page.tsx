import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Privacy Policy — Facelineage",
  description: "How Facelineage collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" lastUpdated="May 14, 2026">
      <p>
        This Privacy Policy explains how Facelineage (&quot;we&quot;, &quot;us&quot;,
        &quot;our&quot;) collects, uses, and protects your personal data when
        you use facelineage.com and related services (the &quot;Service&quot;).
      </p>

      <h2>1. Data we collect</h2>
      <ul>
        <li>
          <strong>Selfie photos</strong> you upload for analysis, plus any
          additional photos (e.g. parent photos) you submit for optional
          add-ons.
        </li>
        <li>
          <strong>Account information</strong>: your email address, used for
          authentication and report delivery.
        </li>
        <li>
          <strong>Quiz answers</strong> about heritage context you choose to
          share.
        </li>
        <li>
          <strong>Payment metadata</strong> (last 4 digits, brand, country)
          provided by our payment processor. We never see or store full card
          numbers.
        </li>
        <li>
          <strong>Technical data</strong>: IP address, browser, device type,
          and timezone, collected automatically for security and analytics.
        </li>
      </ul>

      <h2>2. How we use your data</h2>
      <ul>
        <li>To generate your personalized heritage report and add-ons.</li>
        <li>To process payments and prevent fraud.</li>
        <li>To send transactional emails (sign-in links, receipts, reports).</li>
        <li>To improve the accuracy and quality of our AI analysis.</li>
        <li>To comply with legal obligations.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        Your selfie is sent to third-party AI providers (Anthropic and Google)
        in order to produce your analysis. These providers process the image
        in transit; we do not authorize them to train on your data.
      </p>

      <h2>4. How long we keep your data</h2>
      <p>
        We retain your account, reports, and selfies for as long as your
        account is active. If you request deletion, we remove personal data
        within 30 days, except where retention is required by law (e.g.
        payment records).
      </p>

      <h2>5. Sharing</h2>
      <p>
        We do not sell your personal data. We share data only with:
      </p>
      <ul>
        <li>Stripe — payment processing.</li>
        <li>Supabase — authentication and storage.</li>
        <li>Anthropic and Google — AI inference.</li>
        <li>Vercel — hosting and content delivery.</li>
        <li>Authorities, if required by law.</li>
      </ul>

      <h2>6. Your rights</h2>
      <p>
        Depending on your jurisdiction (GDPR, CCPA, and similar), you may have
        the right to access, correct, delete, or export your personal data,
        and to object to certain processing. To exercise these rights, email{" "}
        <a href="mailto:support@facelineage.com">support@facelineage.com</a>.
      </p>

      <h2>7. Security</h2>
      <p>
        We use encryption in transit (HTTPS), encrypted storage at rest, and
        row-level security on user data. No system is perfectly secure, but
        we apply industry-standard safeguards.
      </p>

      <h2>8. Children</h2>
      <p>
        Facelineage is not directed to children under 16. We do not knowingly
        collect data from minors. If you believe a minor has provided us
        information, contact us and we will delete it.
      </p>

      <h2>9. Changes</h2>
      <p>
        We may update this policy from time to time. We will note the date of
        the last update at the top, and notify you for material changes.
      </p>

      <h2>10. Contact</h2>
      <p>
        Questions about this policy? Email{" "}
        <a href="mailto:support@facelineage.com">support@facelineage.com</a>.
      </p>
    </LegalShell>
  );
}
