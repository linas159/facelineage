"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailClient({ initialEmail }: { initialEmail: string }) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/save-email", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(j.error ?? "Could not save email");
      }
      router.push("/paywall");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save email");
      setBusy(false);
    }
  }

  return (
    <div className="pt-6">
      <div className="mb-6 text-center">
        <Chip color="green" className="mb-3">Your analysis is ready</Chip>
        <h1 className="mb-2 text-balance">Where should we send your report?</h1>
        <p className="mx-auto max-w-sm text-sm text-[var(--color-ink-soft)]">
          We&rsquo;ll email your heritage breakdown, ancestor portrait, and a link to revisit anytime.
        </p>
      </div>

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="mb-1.5 block text-sm font-semibold text-[var(--color-ink)]"
            >
              Email address
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
              placeholder="you@example.com"
              className="h-12 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-orange)] focus:outline-none focus:ring-1 focus:ring-[var(--color-orange)]"
            />
          </div>

          {error && (
            <p className="rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
              {error}
            </p>
          )}

          <Button size="block" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </Button>

          <p className="text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
            We&rsquo;ll never share your email. By continuing you agree to our{" "}
            <a href="/terms" className="underline">Terms</a> and{" "}
            <a href="/privacy" className="underline">Privacy Policy</a>.
          </p>
        </form>
      </Card>
    </div>
  );
}
