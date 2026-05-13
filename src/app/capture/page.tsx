import { FunnelShell } from "@/components/funnel-shell";
import { CaptureView } from "./capture-view";

/**
 * Photo capture — comes after the 5-question pre-quiz.
 * The CaptureView client component handles two layout states:
 *  - default: heading + selfie illustration + capture buttons + trust strip
 *  - preview: photo + "Looks good — analyze it" + "Try again"
 * Layout fills exactly one viewport (no scroll) on mobile.
 */
export default function CapturePage() {
  return (
    <FunnelShell fillViewport showBack backHref="/quiz/5">
      <CaptureView />
    </FunnelShell>
  );
}
