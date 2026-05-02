import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const LOCKED = [
  "4 more regions detected",
  "Heritage story (1,200+ words)",
  "Migration map across 12,000 years",
  "Facial-feature ancestry decoded",
  "Uniqueness index",
  "Shareable card + PDF download",
];

export default function PreviewPage() {
  return (
    <FunnelShell>
      <div className="pt-12 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">
          Preview ready
        </p>
        <h1 className="mb-6 font-display text-4xl">Your strongest match</h1>
        <p className="mx-auto mb-12 max-w-md text-[var(--color-ivory-muted)]">
          We&apos;ve identified your top heritage region. Unlock the full report to see all 5 regions,
          your migration story, and personalized cultural insights.
        </p>
      </div>

      {/* Top region revealed */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]">
              Region 1 of 5
            </p>
            <p className="mt-2 font-display text-3xl text-[var(--color-ivory)]">
              Northern European
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-5xl tabular text-[var(--color-gold)]">72%</p>
            <p className="font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]">
              match
            </p>
          </div>
        </div>
        {/* Animated bar */}
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-[var(--color-border-subtle)]">
          <div className="h-full bg-gradient-to-r from-[var(--color-gold-deep)] to-[var(--color-gold-glow)]" style={{ width: "72%" }} />
        </div>
      </Card>

      {/* Locked sections */}
      <div className="space-y-3">
        {LOCKED.map((item) => (
          <div
            key={item}
            className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] px-6 py-4"
          >
            <span className="text-[var(--color-ivory-muted)] blur-[2px] select-none">
              {item}
            </span>
            <span className="font-mono text-xs text-[var(--color-gold)]">🔒</span>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="mt-12 text-center">
        <Link href="/sign-up">
          <Button size="xl">Unlock my full report</Button>
        </Link>
        <p className="mt-4 font-mono text-xs text-[var(--color-muted)]">
          Plans from $1.95
        </p>
      </div>
    </FunnelShell>
  );
}
