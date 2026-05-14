import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Terms of Service — Facelineage",
  description: "The terms governing use of Facelineage.",
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" lastUpdated="May 14, 2026">
      <p>
        By using Facelineage (the &quot;Service&quot;), you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <h2>1. The Service</h2>
      <p>
        Facelineage provides AI-generated heritage and ancestry impressions
        based on a user-submitted selfie and optional context. Reports are
        <strong> entertainment and inspiration</strong>, not scientific,
        medical, genealogical, or legal advice.
      </p>

      <h2>2. Account & eligibility</h2>
      <ul>
        <li>You must be at least 16 years old to use the Service.</li>
        <li>You must provide a valid email address.</li>
        <li>You are responsible for activity on your account.</li>
      </ul>

      <h2>3. Photo content & rights</h2>
      <p>
        By uploading a photo, you confirm that you have the right to do so —
        i.e. it is a photo of yourself, or you have explicit permission from
        the subject (this applies to parents&apos; photos for the Mom + Dad
        breakdown). You grant us a limited license to process the photo to
        deliver the Service. We do not claim ownership of your photos.
      </p>

      <h2>4. Subscriptions & billing</h2>
      <ul>
        <li>
          Most plans start with a paid intro period (e.g. $1.95 for 3 days)
          and then auto-renew at the regular price (e.g. $24.99/week) until
          you cancel.
        </li>
        <li>
          You can cancel anytime from your account page; cancellation stops
          future charges and takes effect at the end of the current period.
        </li>
        <li>
          Add-on purchases (e.g. Heritage Mirror, Future Partner) are
          one-time charges, billed immediately.
        </li>
      </ul>

      <h2>5. Refunds</h2>
      <p>
        See our <a href="/refunds">Refund Policy</a>.
      </p>

      <h2>6. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>
          Upload photos of anyone without their consent (this includes
          minors).
        </li>
        <li>Use the Service for surveillance, harassment, or doxxing.</li>
        <li>Reverse-engineer, scrape, or abuse the Service.</li>
        <li>Use Facelineage outputs to make consequential decisions about
          another person (hiring, lending, immigration, etc.).</li>
      </ul>

      <h2>7. AI limitations</h2>
      <p>
        Heritage and ancestor renderings are statistical impressions generated
        by AI from a photo. They are not DNA tests and cannot establish
        biological ancestry. Cultural references in reports are generalized
        and may be inexact.
      </p>

      <h2>8. Intellectual property</h2>
      <p>
        The Facelineage name, logo, and Service interface are our property.
        Reports we generate for you (text, images) are yours to use for
        personal, non-commercial purposes; you may not redistribute them as a
        competing product.
      </p>

      <h2>9. Termination</h2>
      <p>
        We may suspend or terminate accounts that violate these Terms. You may
        delete your account at any time by emailing us.
      </p>

      <h2>10. Disclaimers</h2>
      <p>
        The Service is provided &quot;as is&quot; without warranties of any
        kind, express or implied. We disclaim warranties of merchantability,
        fitness for a particular purpose, and non-infringement.
      </p>

      <h2>11. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, our total liability to you
        for any claim arising out of the Service is limited to the amount
        you paid us in the 12 months before the claim.
      </p>

      <h2>12. Governing law</h2>
      <p>
        These Terms are governed by the laws of the jurisdiction in which
        Facelineage is established, without regard to conflict-of-law rules.
      </p>

      <h2>13. Changes</h2>
      <p>
        We may update these Terms occasionally. Material changes will be
        announced in-app or by email.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions: <a href="mailto:support@facelineage.com">support@facelineage.com</a>.
      </p>
    </LegalShell>
  );
}
