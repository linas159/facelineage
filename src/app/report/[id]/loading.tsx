import { FunnelShell } from "@/components/funnel-shell";

export default function ReportLoading() {
  return (
    <FunnelShell>
      <div className="flex h-[60vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[var(--color-orange-pale)] border-t-[var(--color-orange)]" />
      </div>
    </FunnelShell>
  );
}
