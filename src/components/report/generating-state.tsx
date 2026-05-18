"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";

interface Props {
  analysisId: string;
  initialStatus: "queued" | "running" | "failed";
  initialError?: string;
  /** Optional: when provided, called the first time polling sees the
   *  status flip to `ready`. The parent decides when to actually refresh.
   *  When omitted, falls back to router.refresh() so callers that don't
   *  need a gate still work. */
  onReady?: () => void;
}

/**
 * Shown on the report page while the post-payment AI pipeline is still
 * running. Polls /api/report-status/[id] every 4s. When status flips to
 * `ready`, calls `onReady` if provided, otherwise refreshes the page
 * directly.
 */
export function GeneratingState({ analysisId, initialStatus, initialError, onReady }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const PHASES = [
    t.report.phaseReading,
    t.report.phaseMapping,
    t.report.phaseStory,
    t.report.phasePainting,
    t.report.phaseRendering,
  ];
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
          if (onReady) onReady();
          else router.refresh();
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
  }, [analysisId, status, router, onReady]);

  if (status === "failed") {
    return (
      <Card className="mt-8 text-center">
        <CardTitle className="mb-2">{t.report.failedTitle}</CardTitle>
        <CardDescription>
          {error ?? t.report.failedBody}
        </CardDescription>
      </Card>
    );
  }

  return (
    <Card className="mt-8 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-orange-pale)]">
        <span className="block h-8 w-8 animate-spin rounded-full border-4 border-[var(--color-orange)] border-t-transparent" />
      </div>
      <CardTitle className="mb-2">{t.report.composing}</CardTitle>
      <CardDescription className="mb-4">
        {PHASES[phaseIdx]}…
      </CardDescription>
      <p className="text-xs text-[var(--color-ink-muted)]">
        {t.report.usuallyMinute}
      </p>
    </Card>
  );
}
