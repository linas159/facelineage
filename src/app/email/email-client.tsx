"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { useI18n, localizeHref } from "@/lib/i18n/client";
import { fbqTrack } from "@/lib/meta/pixel";
import { capture, identify } from "@/lib/posthog/client";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Mirrors metaEventId.lead() in /lib/meta/capi.ts — keep in sync. */
function leadEventId(analysisId: string) {
  return `lead_${analysisId}`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(/;\s*/)
    .find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

export function EmailClient({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError(t.email.invalid);
      return;
    }
    setBusy(true);
    try {
      // Read analysisId from the pre-auth cookie so the browser Pixel can
      // use the same deterministic event_id the server will use for CAPI.
      const analysisId = readCookie("fl_pending_analysis_id");
      if (analysisId) {
        fbqTrack("Lead", { content_name: "email_capture" }, leadEventId(analysisId));
      } else {
        fbqTrack("Lead", { content_name: "email_capture" });
      }
      // PostHog — identify by email so all prior anonymous events get
      // stitched to this person.
      identify(trimmed, { email: trimmed });
      capture("email_submitted", { analysis_id: analysisId ?? null });

      const res = await fetch("/api/save-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? t.email.saveFailed);
      }
      router.push(localizeHref("/paywall", locale));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.email.saveFailed);
      setBusy(false);
    }
  }

  // Build the "By continuing you agree…" line with embedded links.
  const termsParts = t.email.terms.split(/(\{terms\}|\{privacy\})/);

  return (
    <div className="pt-6">
      <div className="mb-6 text-center">
        <Chip color="green" className="mb-3">{t.email.chip}</Chip>
        <h1 className="mb-2 text-balance">{t.email.headline}</h1>
        <p className="mx-auto max-w-sm text-sm text-[var(--color-ink-soft)]">
          {t.email.body}
        </p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]"
            >
              {t.email.label}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              inputMode="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t.email.placeholder}
              className="h-12 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-orange)] focus:outline-none focus:ring-1 focus:ring-[var(--color-orange)]"
            />
          </div>

          {error && (
            <p className="rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
              {error}
            </p>
          )}

          <Button size="block" type="submit" disabled={busy}>
            {busy ? t.email.saving : t.email.button}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            {termsParts.map((part, i) => {
              if (part === "{terms}") {
                return (
                  <a key={i} href={localizeHref("/terms", locale)} className="underline">
                    {t.email.termsLink}
                  </a>
                );
              }
              if (part === "{privacy}") {
                return (
                  <a key={i} href={localizeHref("/privacy", locale)} className="underline">
                    {t.email.privacyLink}
                  </a>
                );
              }
              return <span key={i}>{part}</span>;
            })}
          </p>
        </form>
      </Card>
    </div>
  );
}
