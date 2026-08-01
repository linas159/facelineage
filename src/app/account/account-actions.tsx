"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

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
