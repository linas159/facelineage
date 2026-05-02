import Link from "next/link";
import { Logo } from "@/components/brand/logo";

interface FunnelShellProps {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
}

/**
 * Shared layout chrome for funnel pages — minimal nav + optional progress.
 */
export function FunnelShell({ children, step, totalSteps }: FunnelShellProps) {
  return (
    <main className="relative min-h-screen bg-[var(--color-bg-base)]">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-6">
        <Link href="/">
          <Logo className="h-7" />
        </Link>
        {step && totalSteps && (
          <div className="flex items-center gap-3">
            <div className="h-1 w-32 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
              <div
                className="h-full bg-[var(--color-gold)] transition-all duration-500"
                style={{ width: `${(step / totalSteps) * 100}%` }}
              />
            </div>
            <span className="font-mono text-xs text-[var(--color-muted)]">
              {step} / {totalSteps}
            </span>
          </div>
        )}
      </header>
      <div className="mx-auto max-w-3xl px-6 pb-24">{children}</div>
    </main>
  );
}
