import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";

const PHASES = [
  "Detecting 68 facial landmarks",
  "Mapping bone structure & skin tone",
  "Cross-referencing 94 global populations",
  "Tracing migration paths across millennia",
  "Composing your heritage story",
];

export default function AnalyzingPage() {
  return (
    <FunnelShell>
      <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
        {/* Pulsing scan ring (placeholder for Lottie) */}
        <div className="relative mb-12 h-48 w-48">
          <div className="absolute inset-0 animate-ping rounded-full border-2 border-[var(--color-gold)] opacity-30" />
          <div className="absolute inset-4 animate-pulse rounded-full border border-[var(--color-gold)] opacity-50" />
          <div className="absolute inset-8 rounded-full border border-[var(--color-gold-glow)]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="font-display text-5xl text-[var(--color-gold)]">F</span>
          </div>
        </div>

        <h2 className="mb-2 font-display text-3xl">Analyzing your ancestry</h2>
        <p className="mb-12 font-mono text-xs uppercase tracking-[0.2em] text-[var(--color-muted)]">
          ~20 seconds
        </p>

        <ul className="mx-auto max-w-md space-y-3 text-left">
          {PHASES.map((phase, i) => (
            <li key={phase} className="flex items-center gap-3 text-sm text-[var(--color-ivory-muted)]">
              <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[var(--color-gold)] font-mono text-[10px] text-[var(--color-gold)]">
                {i + 1}
              </span>
              {phase}
            </li>
          ))}
        </ul>

        <div className="mt-16">
          <Link href="/preview">
            <Button variant="outline">Skip to preview (placeholder)</Button>
          </Link>
        </div>
      </div>
    </FunnelShell>
  );
}
