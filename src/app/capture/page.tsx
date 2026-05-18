import { FunnelShell } from "@/components/funnel-shell";
import { CaptureView } from "./capture-view";
import { getLocale, localized } from "@/lib/i18n/server";

/**
 * Photo capture — comes after the 6-question pre-quiz.
 * The CaptureView client component handles two layout states:
 *  - default: heading + selfie illustration + capture buttons + trust strip
 *  - preview: photo + "Looks good — analyze it" + "Try again"
 * Layout fills exactly one viewport (no scroll) on mobile.
 */
export default async function CapturePage() {
  const locale = await getLocale();
  return (
    <FunnelShell fillViewport showBack backHref={localized("/quiz/6", locale)}>
      <CaptureView />
    </FunnelShell>
  );
}
