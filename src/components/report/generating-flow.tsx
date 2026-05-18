"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GeneratingState } from "@/components/report/generating-state";
import { UpsellPopupSequence, type UpsellId } from "@/components/upsell-sections";

interface Props {
  analysisId: string;
  initialStatus: "queued" | "running" | "failed";
  initialError?: string;
  /** Upsell IDs the user hasn't purchased yet. Empty array → skip the
   *  popup sequence entirely and refresh as soon as the pipeline is ready. */
  upsellIds: UpsellId[];
}

/**
 * Coordinates the "report is being composed" screen. Renders both the
 * pipeline-status spinner and the upsell popup sequence, and only refreshes
 * the page (which swaps to the full report UI) once BOTH conditions hold:
 *   - Pipeline status flipped to `ready`
 *   - User has dismissed the last upsell modal
 *
 * If the upsell list is empty (e.g. user already owns everything), we
 * treat the sequence as done immediately.
 */
export function GeneratingFlow({ analysisId, initialStatus, initialError, upsellIds }: Props) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [upsellsDone, setUpsellsDone] = useState(upsellIds.length === 0);

  useEffect(() => {
    if (ready && upsellsDone) {
      router.refresh();
    }
  }, [ready, upsellsDone, router]);

  return (
    <>
      <GeneratingState
        analysisId={analysisId}
        initialStatus={initialStatus}
        initialError={initialError}
        onReady={() => setReady(true)}
      />
      {upsellIds.length > 0 && (
        <UpsellPopupSequence
          analysisId={analysisId}
          ids={upsellIds}
          triggerOnMount
          onAllDone={() => setUpsellsDone(true)}
        />
      )}
    </>
  );
}
