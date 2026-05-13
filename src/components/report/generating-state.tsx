"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

const PHASES = [
  "Reading your selfie",
  "Mapping ancestral regions",
  "Composing your heritage story",
  "Painting your ancestor portrait",
  "Rendering cultural scenes",
];

interface Props {
  analysisId: string;
  initialStatus: "queued" | "running" | "failed";
  initialError?: string;
}

/**
 * Shown on the report page while the post-payment AI pipeline is still
 * running. Polls /api/report-status/[id] every 4s and refreshes the page
 * when the row flips to `ready`.
 */
export function GeneratingState({ analysisId, initialStatus, initialError }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<string>(initialStatus);
  const [error, setError] = useState<string | undefined>(initialError);
  const [phaseIdx, setPhaseIdx] = useState(0);

  useEffect(() => {
    if (status === "failed") return;
    const phaseTimer = setInterval(() => {
      setPhaseIdx((i) => (i + 1) % PHASES.length);
    }, 3000);

    let cancelled = false;
    const poll = async () => {
      try {
        const r = await fetch(`/api/report-status/${analysisId}`, { cache: "no-store" });
        if (!r.ok) return;
        const j = (await r.json()) as { status: string; error?: string };
        if (cancelled) return;
        setStatus(j.status);
        if (j.error) setError(j.error);
        if (j.status === "ready") {
          clearInterval(pollTimer);
          clearInterval(phaseTimer);
          router.refresh();
        }
      } catch {}
    };

    const pollTimer = setInterval(poll, 4000);
    poll();
    return () => {
      cancelled = true;
      clearInterval(pollTimer);
      clearInterval(phaseTimer);
    };
  }, [analysisId, status, router]);

  if (status === "failed") {
    return (
      <Card className="mt-8 text-center">
        <CardTitle className="mb-2">Something went wrong</CardTitle>
        <CardDescription>
          {error ?? "We couldn't finish your report. Please contact support — your purchase is on file."}
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card className="mt-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-orange-pale)]">
        <span className="block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-orange)] border-t-transparent" />
      </div>
      <CardTitle className="mb-2">Composing your report</CardTitle>
      <CardDescription className="mb-4">
        {PHASES[phaseIdx]}…
      </CardDescription>
      <p className="text-xs text-[var(--color-ink-muted)]">
        This usually takes a minute. Feel free to keep this tab open.
      </p>
    </Card>
  );
}
