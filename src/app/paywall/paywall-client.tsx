"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { TestimonialsSection } from "@/components/testimonials";
import { Illustration } from "@/components/illustration";
import { cn } from "@/lib/utils";

type PlanKey = "sub_intro_3d" | "sub_intro_7d" | "sub_intro_1m";

const PLANS: { key: PlanKey; label: string; intro: string; introPeriod: string; recurring: string; recurringPeriod: string; badge?: string; introCents: string; recurringCents: string; original: string }[] = [
  {
    key: "sub_intro_3d",
    label: "3-Day",
    intro: "$1.95",
    introPeriod: "for 3 days",
    recurring: "$24.99",
    recurringPeriod: "week",
    badge: "Most popular",
    introCents: "$1.95",
    recurringCents: "$24.99 every week",
    original: "$9.95",
  },
  {
    key: "sub_intro_7d",
    label: "7-Day",
    intro: "$6.99",
    introPeriod: "for 7 days",
    recurring: "$24.99",
    recurringPeriod: "week",
    introCents: "$6.99",
    recurringCents: "$24.99 every week",
    original: "$19.99",
  },
  {
    key: "sub_intro_1m",
    label: "1-Month",
    intro: "$17.99",
    introPeriod: "for 1 month",
    recurring: "$47.99",
    recurringPeriod: "month",
    introCents: "$17.99",
    recurringCents: "$47.99 every month",
    original: "$39.99",
  },
];

const OFFER_WINDOW_MS = 15 * 60 * 1000;

// Image paths for every illustrated slot on the page. Drop the asset at the
// path shown — see the response message for what each picture should depict.
const ICON = {
  timer: "/paywall/timer.png",
  locked: "/paywall/locked.png",
  story: "/paywall/scroll.png",
  family: "/paywall/family.png",
  card: "/paywall/card.png",
  ancestor: "/paywall/ancestor.png",
  guaranteeSmall: "/paywall/guarantee-small.png",
  guaranteeBig: "/paywall/guarantee.png",
  privacyBig: "/paywall/privacy.png",
};

interface PaywallClientProps {
  analysisId: string;
}

export function PaywallClient({ analysisId }: PaywallClientProps) {
  const router = useRouter();
  const [selected, setSelected] = useState<PlanKey>("sub_intro_3d");
  const [busy, setBusy] = useState(false);
  const [selfieSrc, setSelfieSrc] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(OFFER_WINDOW_MS);

  const plan = PLANS.find((p) => p.key === selected)!;
  const introPeriod = plan.introPeriod.replace("for ", "");

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("fl_selfie_preview");
      if (stored) setSelfieSrc(stored);
    } catch {}
  }, []);

  useEffect(() => {
    let deadline: number;
    try {
      const raw = sessionStorage.getItem("fl_offer_deadline");
      const parsed = raw ? parseInt(raw, 10) : NaN;
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        deadline = parsed;
      } else {
        deadline = Date.now() + OFFER_WINDOW_MS;
        sessionStorage.setItem("fl_offer_deadline", String(deadline));
      }
    } catch {
      deadline = Date.now() + OFFER_WINDOW_MS;
    }

    const tick = () => setRemainingMs(Math.max(0, deadline - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function scrollToPricing() {
    document
      .getElementById("paywall-pricing")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startCheckout() {
    setBusy(true);
    router.push(`/checkout?plan=${selected}&analysis=${analysisId}`);
  }

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const expired = remainingMs <= 0;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const REPORT_FEATURES: { title: string; desc: string; src: string }[] = [
    {
      title: "Heritage breakdown",
      desc: "Percentage match across 94 ancestral regions.",
      src: "/quiz/q2-globe.png",
    },
    {
      title: "Migration map",
      desc: "Animated routes your ancestors likely traveled.",
      src: "/quiz/q4-pin.png",
    },
    {
      title: "Personalized story",
      desc: "A written narrative tying your features to history.",
      src: ICON.story,
    },
    {
      title: "Family resemblance hints",
      desc: "Which traits typically pass down — and from which side.",
      src: ICON.family,
    },
    {
      title: "Your ancestor portrait",
      desc: "A painted portrait built from your strongest matches — what an ancestor eight generations back may have looked like.",
      src: ICON.ancestor,
    },
  ];

  return (
    <div>
      {/* Limited offer banner with countdown */}
      <div className="-mx-5 mb-5 bg-gradient-to-r from-[var(--color-orange)] to-[var(--color-violet)] px-5 py-3 text-white shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICON.timer} alt="" aria-hidden className="h-6 w-6 object-contain" />
            <div className="text-[13px] leading-tight">
              <div className="font-bold">Special offer reserved for you</div>
              <div className="text-[11px] opacity-90">
                {expired ? "Offer about to expire" : "Lock in your discounted price"}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-display text-2xl font-bold tabular leading-none">
              {timeStr}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-90">left</span>
          </div>
        </div>
      </div>

      {/* Selfie + headline */}
      <div className="mb-6 text-center">
        <div className="relative mx-auto mb-4 h-32 w-32">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[var(--color-orange)] to-[var(--color-violet)] p-[3px]">
            <div className="h-full w-full overflow-hidden rounded-full bg-white">
              {selfieSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={selfieSrc}
                  alt="Your selfie"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Illustration id="scan-face" className="h-full w-full" />
              )}
            </div>
          </div>
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-[var(--color-green)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-[var(--shadow-chip)]">
            Analyzed
          </span>
        </div>
        <Chip color="green" className="mb-3">Your analysis is ready</Chip>
        <h1 className="text-balance">Unlock your full report</h1>
        <p className="mx-auto mt-2 mb-5 max-w-sm text-sm text-[var(--color-ink-soft)]">
          Heritage breakdown · Migration map · Personalized story · Shareable card
        </p>
        <Button size="block" onClick={scrollToPricing} className="mx-auto max-w-xs">
          Unlock my report
        </Button>
      </div>

      {/* Blurred teaser */}
      <Card className="relative mb-6 overflow-hidden !p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
              Preview
            </p>
            <p className="font-display text-base font-bold text-[var(--color-ink)]">
              Your top heritage matches
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-warm)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICON.locked} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
            Locked
          </span>
        </div>

        <div
          aria-hidden
          className="select-none space-y-2.5"
          style={{ filter: "blur(6px)" }}
        >
          {[
            ["Northern European", "72%", "var(--color-orange)"],
            ["Iberian Peninsula", "14%", "var(--color-green)"],
            ["Mediterranean", "8%", "var(--color-yellow)"],
            ["West African", "6%", "var(--color-violet)"],
          ].map(([region, pct, color]) => (
            <div key={region} className="flex items-center gap-3">
              <span className="w-32 text-sm font-semibold text-[var(--color-ink)]">
                {region}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                <div
                  className="h-full rounded-full"
                  style={{ width: pct, background: color }}
                />
              </div>
              <span className="w-10 text-right font-display text-sm font-bold text-[var(--color-ink)] tabular">
                {pct}
              </span>
            </div>
          ))}
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-white to-transparent" />
        <div className="pointer-events-none absolute inset-0 flex items-end justify-center pb-4">
          <span className="rounded-full bg-[var(--color-ink)] px-3 py-1.5 text-[11px] font-bold text-white shadow-[var(--shadow-card)]">
            Unlock to reveal real percentages
          </span>
        </div>
      </Card>

      {/* Ancestor portrait teaser — full-width strip, matches migration map height */}
      <Card className="relative mb-6 overflow-hidden !p-0">
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-warm)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.locked} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
          Locked
        </span>
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--color-bg-warm)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/report/ancestor-portrait.png"
            alt=""
            aria-hidden
            className="h-full w-full select-none object-cover"
            style={{ filter: "blur(14px)", transform: "scale(1.08)" }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>
        <div className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
            Preview
          </p>
          <p className="font-display text-base font-bold leading-tight text-[var(--color-ink)]">
            Your ancestor portrait
          </p>
          <p className="mt-1 text-xs leading-snug text-[var(--color-ink-soft)]">
            A painted face, eight generations back.
          </p>
        </div>
      </Card>

      {/* Migration map teaser — full-width strip */}
      <Card className="relative mb-6 overflow-hidden !p-0">
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-warm)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.locked} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
          Locked
        </span>
        <div className="relative aspect-[2/1] w-full overflow-hidden bg-[var(--color-bg-warm)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/world-map.svg"
            alt=""
            aria-hidden
            className="h-full w-full select-none object-cover opacity-70"
            style={{ filter: "blur(8px)", transform: "scale(1.08)", color: "var(--color-orange)" }}
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--color-orange)]/10 via-transparent to-[var(--color-violet)]/10" />
        </div>
        <div className="p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
            Preview
          </p>
          <p className="font-display text-base font-bold leading-tight text-[var(--color-ink)]">
            Your migration map
          </p>
          <p className="mt-1 text-xs leading-snug text-[var(--color-ink-soft)]">
            The routes your ancestors likely walked, sailed, and traded across.
          </p>
        </div>
      </Card>

      {/* What you'll discover */}
      <section className="mb-6">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          What you&apos;ll discover
        </p>
        <h2 className="mb-4 text-center text-2xl">Inside your full report</h2>
        <ul className="space-y-2.5">
          {REPORT_FEATURES.map((f) => (
            <li
              key={f.title}
              className="flex items-start gap-3 rounded-[var(--radius-card)] bg-white p-3.5 shadow-[var(--shadow-chip)]"
            >
              <span className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-orange-pale)] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.src}
                  alt=""
                  aria-hidden
                  className="h-7 w-7 object-contain"
                />
              </span>
              <div>
                <p className="font-bold text-[var(--color-ink)]">{f.title}</p>
                <p className="text-xs leading-snug text-[var(--color-ink-soft)]">{f.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Tier picker */}
      <div id="paywall-pricing" className="mb-2 scroll-mt-24 text-center">
        <p className="text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Pick your access
        </p>
      </div>
      <div className="mb-4 space-y-3">
        {PLANS.map((p) => {
          const active = p.key === selected;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setSelected(p.key)}
              className={cn(
                "relative w-full rounded-[var(--radius-card)] bg-white p-4 text-left shadow-[var(--shadow-card)] transition-all",
                active
                  ? "ring-3 ring-[var(--color-orange)] -translate-y-0.5"
                  : "ring-1 ring-[var(--color-line)] opacity-90 hover:opacity-100",
              )}
            >
              {p.badge && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-[var(--color-orange)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {p.badge}
                </span>
              )}
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2",
                    active ? "border-[var(--color-orange)] bg-[var(--color-orange)]" : "border-[var(--color-line-strong)] bg-white",
                  )}
                >
                  {active && <span className="text-xs text-white">✓</span>}
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-lg font-bold text-[var(--color-ink)]">
                      {p.label}
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-[var(--color-ink-muted)] line-through tabular">
                        {p.original}
                      </span>
                      <span className="font-display text-2xl font-bold text-[var(--color-orange)] tabular">
                        {p.intro}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* CTA */}
      <Button size="block" onClick={startCheckout} disabled={busy} className="mb-3">
        {busy ? "Loading…" : `Unlock my report — ${plan.intro}`}
      </Button>

      <p className="mb-6 text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
        Your {introPeriod} trial will cost only {plan.introCents}.
        Without cancellation before the selected discounted intro plan ends, I accept that
        Facelineage will automatically charge {plan.recurringCents} until I cancel.
      </p>

      {/* Money-back inline reassurance */}
      <Card className="mb-8 flex items-center gap-4 border-2 border-[var(--color-green)]/30 bg-[#e8f5dc] !p-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-[var(--shadow-chip)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.guaranteeSmall} alt="" aria-hidden className="h-9 w-9 object-contain" />
        </div>
        <div>
          <p className="font-display text-base font-bold text-[var(--color-ink)]">
            30-day money-back guarantee
          </p>
          <p className="text-xs leading-snug text-[var(--color-ink-soft)]">
            Not loving your report? Email us and we&apos;ll refund you. No hoops, no questions.
          </p>
        </div>
      </Card>

      {/* Testimonials — same as landing page (with group photo) */}
      <div className="-mx-5">
        <TestimonialsSection
          heading="Loved by 12,000+ explorers"
          count={3}
        />
      </div>

      {/* Big trust cards — Origene-style */}
      <div className="mt-8 space-y-4">
        <Card className="border border-[var(--color-green)]/25 bg-[#eef7e0] !p-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICON.guaranteeBig} alt="" aria-hidden className="h-full w-full object-contain" />
          </div>
          <h3 className="mb-3 font-display text-xl font-bold text-[var(--color-ink)]">
            Loved it, or your money back
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Reading the story written into your face is something we take seriously. Every
            report is built to feel personal, surprising, and worth keeping — not a generic
            algorithm output dressed up with stock copy.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            If yours doesn&apos;t hit that bar — or you simply change your mind — send us a
            line within 30 days. We&apos;ll refund the full amount. No forms, no reasons to
            explain, no awkward follow-ups.
          </p>
        </Card>

        <Card className="border border-[var(--color-green)]/25 bg-[#eef7e0] !p-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICON.privacyBig} alt="" aria-hidden className="h-full w-full object-contain" />
          </div>
          <h3 className="mb-3 font-display text-xl font-bold text-[var(--color-ink)]">
            Your selfie stays yours
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            Your photo does one job: powering your single heritage analysis. It travels over
            an encrypted connection, sits on our servers only as long as we need it, and
            auto-deletes after 30 days.
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            We never sell it, never hand it to advertisers, and never feed it back into a
            training set. Want it gone sooner? Wipe it from your account in one tap.
          </p>
        </Card>
      </div>

      {/* Final reassurance CTA */}
      <Card className="mt-6 bg-[var(--color-orange-pale)] text-center !p-5">
        <h3 className="mb-1 font-display text-xl">Your story is one tap away</h3>
        <p className="mb-4 text-xs text-[var(--color-ink-soft)]">
          Cancel anytime · Refund within 30 days · Photo deleted in 30 days
        </p>
        <Button size="block" onClick={startCheckout} disabled={busy}>
          {busy ? "Loading…" : `Unlock for ${plan.intro}`}
        </Button>
      </Card>
    </div>
  );
}
