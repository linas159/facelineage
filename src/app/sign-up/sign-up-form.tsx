"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

interface SignUpFormProps {
  /** Where to land the user after they verify the magic link. */
  next?: string;
}

export function SignUpForm({ next = "/dashboard" }: SignUpFormProps) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    setError(null);
    try {
      const sb = createClient();
      // shouldCreateUser: true — first-time sign-ins still work. The
      // email template must point at /auth/confirm?token_hash=…&type=magiclink
      // (see project README for the template snippet).
      const { error: err } = await sb.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        },
      });
      if (err) {
        setError(err.message);
      } else {
        setSent(true);
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="text-center">
        <h3 className="mb-2 font-display text-xl font-bold text-[var(--color-ink)]">
          Check your email
        </h3>
        <p className="text-sm text-[var(--color-ink-soft)]">
          We sent a magic link to <span className="font-semibold">{email}</span>. Tap it to
          finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form className="space-y-3" onSubmit={sendMagicLink}>
      {/* OAuth buttons (Google/Apple) intentionally hidden until we move
          Supabase auth to a custom domain — the default Supabase callback
          URL looks untrustworthy in the OAuth flow. */}

      <input
        type="email"
        required
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={busy}
        className="h-12 w-full rounded-[var(--radius-input)] border-2 border-[var(--color-line)] bg-white px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-orange)] focus:outline-none disabled:opacity-60"
      />
      {error && (
        <p className="rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
          {error}
        </p>
      )}
      <Button size="block" type="submit" disabled={busy || !email}>
        {busy ? "Sending…" : "Send magic link →"}
      </Button>
    </form>
  );
}
