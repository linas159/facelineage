import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import type { LegalUi } from "@/lib/i18n/legal/types";

interface LegalShellProps {
  title: string;
  lastUpdated: string;
  /** Locale-aware home URL (e.g. "/" or "/pl"). */
  homeHref: string;
  ui: LegalUi;
  children: React.ReactNode;
}

export function LegalShell({
  title,
  lastUpdated,
  homeHref,
  ui,
  children,
}: LegalShellProps) {
  return (
    <main className="min-h-[100dvh] bg-[var(--color-bg-base)]">
      <header className="bg-[var(--color-bg-base)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-5 py-4">
          <Link href={homeHref}>
            <Logo className="h-10" />
          </Link>
          <Link
            href={homeHref}
            className="text-sm text-[var(--color-ink-soft)] hover:text-[var(--color-orange)]"
          >
            {ui.home}
          </Link>
        </div>
      </header>

      <article className="mx-auto w-full max-w-2xl px-5 pb-16 pt-4">
        <h1 className="mb-1 font-display text-3xl font-bold text-[var(--color-ink)]">
          {title}
        </h1>
        <p className="mb-8 text-xs text-[var(--color-ink-muted)]">
          {ui.lastUpdated} {lastUpdated}
        </p>

        <div className="legal-prose space-y-6 text-[15px] leading-relaxed text-[var(--color-ink-soft)]">
          {children}
        </div>

        <hr className="mt-12 border-[var(--color-line)]" />
        <p className="mt-4 text-xs text-[var(--color-ink-muted)]">
          {ui.questions}{" "}
          <a
            href="mailto:support@facelineage.com"
            className="font-semibold text-[var(--color-orange)] hover:underline"
          >
            support@facelineage.com
          </a>
          .
        </p>
      </article>
    </main>
  );
}
