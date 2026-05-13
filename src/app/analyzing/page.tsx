import { FunnelShell } from "@/components/funnel-shell";
import { AnalyzingClient } from "./analyzing-client";

export default async function AnalyzingPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  return (
    <FunnelShell fillViewport>
      <AnalyzingClient analysisId={id} />
    </FunnelShell>
  );
}
