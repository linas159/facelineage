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
export default async function CapturePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const locale = await getLocale();
  const { from } = await searchParams;
  // Capture is shared by both entry funnels. Send the back button to whichever
  // funnel the visitor actually came through (onboarding carousel vs. quiz).
  const back = from === "onboarding" ? "/onboarding/3" : "/quiz/6";
  return (
    <FunnelShell fillViewport showBack backHref={localized(back, locale)}>
      <CaptureView />
    </FunnelShell>
  );
}
