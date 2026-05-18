"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * "Manage in Stripe Portal" button. Hits /api/billing-portal which creates
 * a Customer Portal session, then redirects the browser to the returned URL.
 */
export function ManagePortalButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing-portal", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error ?? "Could not open billing portal");
    } catch {
      setError("Network error — please try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="block" variant="secondary" onClick={open} disabled={busy}>
        {busy ? "Opening…" : "Manage in Stripe Portal"}
      </Button>
      {error && (
        <p className="text-center text-xs text-[var(--color-coral)]">{error}</p>
      )}
    </>
  );
}

/**
 * "Delete all my data" button with a typed-confirmation modal. Calls
 * /api/delete-account which performs the GDPR cascade, then redirects
 * the user to the landing page (their session is gone server-side; the
 * cookie will fail-auth on the next request).
 */
export function DeleteDataButton() {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  async function confirmDelete() {
    if (confirmText.trim().toUpperCase() !== "DELETE") return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE" }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };
      if (!data.success) {
        setError(data.error ?? "Could not delete account");
        setBusy(false);
        return;
      }
      // Account is gone — bail to the landing page. The auth cookie will
      // fail-auth on next request automatically.
      window.location.href = "/?deleted=1";
    } catch {
      setError("Network error — please try again");
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        size="block"
        variant="ghost"
        onClick={() => setOpen(true)}
        disabled={busy}
      >
        Delete all my data
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-bg-overlay)] sm:items-center sm:p-4"
          onClick={() => !busy && setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-t-[28px] bg-white p-6 sm:rounded-[28px]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 font-display text-2xl font-bold text-[var(--color-ink)]">
              Delete your account?
            </h2>
            <p className="mb-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">
              This permanently removes your selfie, report, subscription, and
              payment history. We can&apos;t recover any of it after this.
            </p>
            <p className="mb-2 text-xs font-semibold text-[var(--color-ink)]">
              Type <span className="font-mono">DELETE</span> to confirm:
            </p>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={busy}
              className="mb-3 h-12 w-full rounded-[var(--radius-input)] border-2 border-[var(--color-line)] bg-white px-4 text-base text-[var(--color-ink)] focus:border-[var(--color-coral)] focus:outline-none disabled:opacity-60"
              autoFocus
            />
            {error && (
              <p className="mb-3 rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Button
                size="block"
                variant="primary"
                onClick={confirmDelete}
                disabled={
                  busy || confirmText.trim().toUpperCase() !== "DELETE"
                }
                className={cn(
                  "!bg-[var(--color-coral)] hover:!brightness-110",
                )}
              >
                {busy ? "Deleting…" : "Delete my account"}
              </Button>
              <Button
                size="block"
                variant="ghost"
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
