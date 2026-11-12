"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * "Manage in Stripe Portal" button. Hits /api/billing-portal which creates
 * a Customer Portal session, then redirects the browser to the returned URL.
 */
export function ManagePortalButton({
  labels,
}: {
  labels: { button: string; opening: string; error: string; network: string };
}) {
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
      if (data.error) console.warn("[billing-portal]", data.error);
      setError(labels.error);
    } catch {
      setError(labels.network);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button size="block" variant="secondary" onClick={open} disabled={busy}>
        {busy ? labels.opening : labels.button}
      </Button>
      {error && (
        <p className="text-center text-xs text-[var(--color-coral)]">{error}</p>
      )}
    </>
  );
}
