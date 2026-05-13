import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

interface FunnelShellProps {
  children: React.ReactNode;
  step?: number;
  totalSteps?: number;
  showBack?: boolean;
  backHref?: string;
  /** When true, the shell takes exactly one viewport height (no scroll) and
   *  the content area becomes a flex column that distributes its children. */
  fillViewport?: boolean;
}

/**
 * Shared mobile-first chrome for funnel pages.
 * Phone-sized canvas with optional progress bar at top.
 */
export function FunnelShell({
  children,
  step,
  totalSteps,
  showBack = false,
  backHref,
  fillViewport = false,
}: FunnelShellProps) {
  return (
    <main
      className={cn(
        "relative bg-[var(--color-bg-base)]",
        fillViewport ? "flex h-[100dvh] flex-col overflow-hidden" : "min-h-[100dvh]",
      )}
    >
      <header className="z-30 bg-[var(--color-bg-base)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          {showBack ? (
            <Link
              href={backHref ?? "#"}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-[var(--shadow-chip)] text-[var(--color-ink-soft)]"
              aria-label="Back"
            >
              ←
            </Link>
          ) : (
            <Link href="/">
              <Logo className="h-10" />
            </Link>
          )}

          {step && totalSteps && (
            <div className="flex flex-1 items-center justify-end gap-3 pl-4">
              <div className="h-2 flex-1 max-w-[140px] overflow-hidden rounded-full bg-[var(--color-line)]">
                <div
                  className="h-full bg-[var(--color-orange)] transition-all duration-500"
                  style={{ width: `${(step / totalSteps) * 100}%` }}
                />
              </div>
              <span className="font-semibold text-xs text-[var(--color-ink-muted)] tabular">
                {step}/{totalSteps}
              </span>
            </div>
          )}
        </div>
      </header>

      <div
        className={cn(
          "mx-auto w-full max-w-md px-5",
          fillViewport
            ? "flex min-h-0 flex-1 flex-col pb-[max(env(safe-area-inset-bottom),16px)]"
            : "pb-12",
        )}
      >
        {children}
      </div>
    </main>
  );
}
