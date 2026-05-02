import Link from "next/link";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PLANS = [
  {
    sku: "sub_intro_3d",
    label: "3-Day Access",
    intro: "$1.95",
    introPeriod: "for 3 days",
    recurring: "$24.99 / week",
    badge: null,
  },
  {
    sku: "sub_intro_7d",
    label: "7-Day Access",
    intro: "$6.99",
    introPeriod: "for 7 days",
    recurring: "$24.99 / week",
    badge: "Most popular",
  },
  {
    sku: "sub_intro_1m",
    label: "1-Month Access",
    intro: "$17.99",
    introPeriod: "for 1 month",
    recurring: "$47.99 / month",
    badge: "Best value",
  },
];

const INCLUDES = [
  "Full ethnicity report (5 regions)",
  "Heritage story (1,200+ words)",
  "Interactive migration map",
  "Cultural insights & traditions",
  "Shareable result card",
  "PDF download",
  "Cancel anytime",
];

export default function PaywallPage() {
  return (
    <FunnelShell>
      <div className="pt-12 text-center">
        <p className="mb-4 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">
          Choose your plan
        </p>
        <h1 className="mb-4 font-display text-4xl">Unlock your full ancestry</h1>
        <p className="mx-auto mb-12 max-w-md text-[var(--color-ivory-muted)]">
          One photo. 12,000 years of heritage. Cancel anytime in your account.
        </p>
      </div>

      <div className="mb-10 grid gap-4 md:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.sku}
            className={cn(
              "relative flex flex-col rounded-[var(--radius-xl)] border bg-[var(--color-bg-elevated)] p-6",
              p.badge === "Most popular"
                ? "border-[var(--color-gold)] shadow-[0_8px_40px_-16px_rgba(201,169,97,0.4)]"
                : "border-[var(--color-border-subtle)]",
            )}
          >
            {p.badge && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--color-gold)] px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-[var(--color-bg-base)]">
                {p.badge}
              </span>
            )}
            <p className="mb-2 font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]">
              {p.label}
            </p>
            <p className="font-display text-5xl text-[var(--color-gold)]">{p.intro}</p>
            <p className="mt-1 text-sm text-[var(--color-ivory-muted)]">{p.introPeriod}</p>
            <p className="mt-6 text-xs text-[var(--color-muted)]">
              Then {p.recurring}
            </p>
            <Link href="/report/demo" className="mt-6">
              <Button className="w-full" variant={p.badge === "Most popular" ? "primary" : "secondary"}>
                Choose
              </Button>
            </Link>
          </div>
        ))}
      </div>

      <div className="mx-auto max-w-md rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-6">
        <p className="mb-4 font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]">
          All plans include
        </p>
        <ul className="space-y-2">
          {INCLUDES.map((i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[var(--color-ivory-muted)]">
              <span className="text-[var(--color-gold)]">✓</span>
              {i}
            </li>
          ))}
        </ul>
      </div>

      <p className="mx-auto mt-8 max-w-md text-center text-[10px] leading-relaxed text-[var(--color-muted)]">
        Your introductory period converts to the recurring price shown.
        Cancel anytime in Account → Manage Subscription. We send a reminder
        email 24 hours before each charge during your first cycle.
      </p>
    </FunnelShell>
  );
}
