import { FunnelShell } from "@/components/funnel-shell";

export default function PaywallLoading() {
  return (
    <FunnelShell>
      <div className="flex h-[40vh] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-orange-pale)] border-t-[var(--color-orange)]" />
      </div>
    </FunnelShell>
  );
}
