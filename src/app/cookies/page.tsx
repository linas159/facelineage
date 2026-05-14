import type { Metadata } from "next";
import { LegalShell } from "@/components/legal-shell";

export const metadata: Metadata = {
  title: "Cookie Policy — Facelineage",
  description: "How Facelineage uses cookies and similar technologies.",
};

export default function CookiesPage() {
  return (
    <LegalShell title="Cookie Policy" lastUpdated="May 14, 2026">
      <p>
        This page explains what cookies and similar technologies Facelineage
        uses, and why.
      </p>

      <h2>1. What is a cookie?</h2>
      <p>
        A cookie is a small text file stored on your device by your browser.
        Similar technologies (local storage, session storage) work the same
        way but are scoped to your browser session or the site origin.
      </p>

      <h2>2. Cookies we use</h2>

      <h3>Strictly necessary</h3>
      <p>
        Required for the Service to function. You cannot turn these off.
      </p>
      <ul>
        <li>
          <strong>Authentication</strong> — Supabase session cookies keep you
          signed in.
        </li>
        <li>
          <strong>Funnel state</strong> — short-lived cookies and
          sessionStorage track which quiz step / paywall / checkout you are
          on so refreshes don&apos;t lose your place.
        </li>
        <li>
          <strong>Stripe</strong> — Stripe sets cookies to detect fraud and
          enable Apple Pay / Google Pay / PayPal flows.
        </li>
      </ul>

      <h3>Analytics</h3>
      <p>
        Aggregated, privacy-respecting metrics about usage (pages viewed,
        funnel conversion). We do not use cross-site advertising trackers.
      </p>

      <h2>3. Third parties</h2>
      <p>
        The following third parties may set cookies through our Service:
      </p>
      <ul>
        <li>Stripe (payments)</li>
        <li>Supabase (authentication)</li>
        <li>Vercel (hosting / edge functions)</li>
      </ul>

      <h2>4. Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings. Note that
        blocking strictly-necessary cookies will prevent you from signing in
        or completing purchases.
      </p>

      <h2>5. Changes</h2>
      <p>
        We may update this Cookie Policy from time to time. The latest
        version is always available at this URL.
      </p>

      <h2>6. Contact</h2>
      <p>
        Questions: <a href="mailto:support@facelineage.com">support@facelineage.com</a>.
      </p>
    </LegalShell>
  );
}
