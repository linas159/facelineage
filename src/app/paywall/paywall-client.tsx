"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, Chip } from "@/components/ui/card";
import { TestimonialsSection } from "@/components/testimonials";
import { Illustration } from "@/components/illustration";
import { cn } from "@/lib/utils";
import { preloadCheckoutInit } from "@/lib/preload-checkout";
import { useI18n, fmt, localizeHref } from "@/lib/i18n/client";

type PlanKey = "sub_intro_3d" | "sub_intro_7d" | "sub_intro_1m";

// Plan numbers + currency are locale-independent. Labels + period words
// come from the dictionary at render time.
type PlanStatic = {
  key: PlanKey;
  labelKey: "planLabel3d" | "planLabel7d" | "planLabel1m";
  periodKey: "period3d" | "period7d" | "period1m";
  recurringPattern: "recurringWeekly" | "recurringMonthly";
  intro: string;
  recurring: string;
  badged: boolean;
  original: string;
};

const PLAN_STATICS: PlanStatic[] = [
  { key: "sub_intro_3d", labelKey: "planLabel3d", periodKey: "period3d", recurringPattern: "recurringWeekly", intro: "$1.95",  recurring: "$24.99", badged: true,  original: "$9.95" },
  { key: "sub_intro_7d", labelKey: "planLabel7d", periodKey: "period7d", recurringPattern: "recurringWeekly", intro: "$6.99",  recurring: "$24.99", badged: false, original: "$19.99" },
  { key: "sub_intro_1m", labelKey: "planLabel1m", periodKey: "period1m", recurringPattern: "recurringMonthly", intro: "$17.99", recurring: "$47.99", badged: false, original: "$39.99" },
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

export type SavedPaymentMethod = {
  kind: "card" | "paypal" | "link";
  label: string; // e.g. "VISA ●●●● 4242" or "PayPal"
};

interface PaywallClientProps {
  analysisId: string;
  /** When provided, the paywall offers one-tap charge on this saved
   *  payment method instead of routing through /checkout. */
  savedPm?: SavedPaymentMethod | null;
}

export function PaywallClient({ analysisId, savedPm }: PaywallClientProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [selected, setSelected] = useState<PlanKey>("sub_intro_3d");
  const [busy, setBusy] = useState(false);
  const [chargeError, setChargeError] = useState<string | null>(null);
  const [selfieSrc, setSelfieSrc] = useState<string | null>(null);
  const [remainingMs, setRemainingMs] = useState(OFFER_WINDOW_MS);

  const planStatic = PLAN_STATICS.find((p) => p.key === selected)!;
  const planLabel = t.paywall[planStatic.labelKey];
  const planPeriod = t.paywall[planStatic.periodKey];
  const planRecurringText = fmt(t.paywall[planStatic.recurringPattern], { price: planStatic.recurring });

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("fl_selfie_preview");
      if (stored) setSelfieSrc(stored);
    } catch {}
    // Warm the /checkout route JS bundle so the click-to-render gap is
    // dominated by Stripe (which we preload in parallel), not by code.
    router.prefetch("/checkout");
  }, [router]);

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

  async function chargeSavedPm() {
    setBusy(true);
    setChargeError(null);
    try {
      const res = await fetch("/api/intro-charge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: selected, analysisId }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        requiresCheckout?: boolean;
        requiresAction?: boolean;
        clientSecret?: string;
        publishableKey?: string;
        error?: string;
      };
      if (data.success) {
        router.push(`/report/${analysisId}`);
        return;
      }
      if (data.requiresAction && data.clientSecret && data.publishableKey) {
        // 3DS challenge — Stripe.js handles the popup.
        const { loadStripe } = await import("@stripe/stripe-js");
        const stripe = await loadStripe(data.publishableKey);
        if (!stripe) throw new Error("Could not load Stripe.js");
        const result = await stripe.handleNextAction({ clientSecret: data.clientSecret });
        if (result.error) throw new Error(result.error.message ?? "Authentication failed");
        router.push(`/report/${analysisId}`);
        return;
      }
      if (data.requiresCheckout) {
        // Fallback — saved PM not usable, go to full checkout.
        router.push(`/checkout?plan=${selected}&analysis=${analysisId}`);
        return;
      }
      throw new Error(data.error ?? "Charge failed");
    } catch (err) {
      setChargeError(err instanceof Error ? err.message : "Charge failed");
      setBusy(false);
    }
  }

  function startCheckout() {
    setBusy(true);
    // Fire the checkout-init request *before* navigating. The /checkout
    // page reads the result from sessionStorage on mount, skipping the
    // ~5–10s Stripe round-trip. Stash by plan+analysis so a plan switch
    // mid-flight doesn't crosswire.
    void preloadCheckoutInit(selected, analysisId);
    router.push(`/checkout?plan=${selected}&analysis=${analysisId}`);
  }

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);
  const expired = remainingMs <= 0;
  const timeStr = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  const REPORT_FEATURES: { title: string; desc: string; src: string }[] = [
    { title: t.paywall.feat1Title, desc: t.paywall.feat1Desc, src: "/quiz/q2-globe.png" },
    { title: t.paywall.feat2Title, desc: t.paywall.feat2Desc, src: "/quiz/q4-pin.png" },
    { title: t.paywall.feat3Title, desc: t.paywall.feat3Desc, src: ICON.story },
    { title: t.paywall.feat4Title, desc: t.paywall.feat4Desc, src: ICON.family },
    { title: t.paywall.feat5Title, desc: t.paywall.feat5Desc, src: ICON.ancestor },
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
              <div className="font-bold">{t.paywall.offerBannerTitle}</div>
              <div className="text-[11px] opacity-90">
                {expired ? t.paywall.offerExpiring : t.paywall.offerBannerSub}
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-display text-2xl font-bold tabular leading-none">
              {timeStr}
            </span>
            <span className="text-[10px] uppercase tracking-wider opacity-90">{t.paywall.offerLeft}</span>
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
            {t.paywall.analyzedChip}
          </span>
        </div>
        <Chip color="green" className="mb-3">{t.paywall.statusReady}</Chip>
        <h1 className="text-balance">{t.paywall.mainHeadline}</h1>
        <p className="mx-auto mt-2 mb-5 max-w-sm text-sm text-[var(--color-ink-soft)]">
          {t.paywall.mainSubhead}
        </p>
        <Button size="block" onClick={scrollToPricing} className="mx-auto max-w-xs">
          {t.paywall.unlockCta}
        </Button>
      </div>

      {/* Blurred teaser */}
      <Card className="relative mb-6 overflow-hidden !p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
              {t.paywall.previewLabel}
            </p>
            <p className="font-display text-base font-bold text-[var(--color-ink)]">
              {t.paywall.previewTitle}
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-warm)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICON.locked} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
            {t.paywall.lockedLabel}
          </span>
        </div>

        <div
          aria-hidden
          className="select-none space-y-2.5"
          style={{ filter: "blur(6px)" }}
        >
          {[
            [t.paywall.sampleRegion1, "72%", "var(--color-orange)"],
            [t.paywall.sampleRegion2, "14%", "var(--color-green)"],
            [t.paywall.sampleRegion3, "8%", "var(--color-yellow)"],
            [t.paywall.sampleRegion4, "6%", "var(--color-violet)"],
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
            {t.paywall.unlockToReveal}
          </span>
        </div>
      </Card>

      {/* Ancestor portrait teaser — full-width strip, matches migration map height */}
      <Card className="relative mb-6 overflow-hidden !p-0">
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-warm)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.locked} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
          {t.paywall.lockedLabel}
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
            {t.paywall.previewLabel}
          </p>
          <p className="font-display text-base font-bold leading-tight text-[var(--color-ink)]">
            {t.paywall.ancestorTeaserTitle}
          </p>
          <p className="mt-1 text-xs leading-snug text-[var(--color-ink-soft)]">
            {t.paywall.ancestorTeaserSub}
          </p>
        </div>
      </Card>

      {/* Migration map teaser — full-width strip */}
      <Card className="relative mb-6 overflow-hidden !p-0">
        <span className="absolute right-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-bg-warm)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-soft)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.locked} alt="" aria-hidden className="h-3.5 w-3.5 object-contain" />
          {t.paywall.lockedLabel}
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
            {t.paywall.previewLabel}
          </p>
          <p className="font-display text-base font-bold leading-tight text-[var(--color-ink)]">
            {t.paywall.migrationTeaserTitle}
          </p>
          <p className="mt-1 text-xs leading-snug text-[var(--color-ink-soft)]">
            {t.paywall.migrationTeaserSub}
          </p>
        </div>
      </Card>

      {/* What you'll discover */}
      <section className="mb-6">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {t.paywall.discoverEyebrow}
        </p>
        <h2 className="mb-4 text-center text-2xl">{t.paywall.discoverHeading}</h2>
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
          {t.paywall.pickAccessLabel}
        </p>
      </div>
      <div className="mb-4 space-y-3">
        {PLAN_STATICS.map((p) => {
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
              {p.badged && (
                <span className="absolute -top-2.5 left-4 rounded-full bg-[var(--color-orange)] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {t.paywall.planBadgeMostPopular}
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
                      {t.paywall[p.labelKey]}
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

      {/* CTA — one-tap charge for returning users with a saved card */}
      {savedPm ? (
        <>
          <Button
            size="block"
            onClick={chargeSavedPm}
            disabled={busy}
            className="mb-2"
          >
            {busy
              ? t.paywall.chargingButton
              : fmt(t.paywall.chargeButton, { label: savedPm.label, price: planStatic.intro })}
          </Button>
          <button
            type="button"
            onClick={() => router.push(localizeHref(`/checkout?plan=${selected}&analysis=${analysisId}`, locale))}
            className="mb-3 w-full text-center text-xs text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
          >
            {t.paywall.useDifferentCard}
          </button>
          {chargeError && (
            <p className="mb-3 rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
              {chargeError}
            </p>
          )}
        </>
      ) : (
        <Button size="block" onClick={startCheckout} disabled={busy} className="mb-3">
          {busy ? t.paywall.loading : fmt(t.paywall.unlockMyReportPriced, { price: planStatic.intro })}
        </Button>
      )}

      <p className="mb-6 text-center text-[11px] leading-relaxed text-[var(--color-ink-muted)]">
        {fmt(t.paywall.autoRenew, {
          period: planPeriod,
          introPrice: planStatic.intro,
          recurring: planRecurringText,
        })}
      </p>

      {/* Money-back inline reassurance */}
      <Card className="mb-8 flex items-center gap-4 border-2 border-[var(--color-green)]/30 bg-[#e8f5dc] !p-4">
        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-white shadow-[var(--shadow-chip)] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={ICON.guaranteeSmall} alt="" aria-hidden className="h-9 w-9 object-contain" />
        </div>
        <div>
          <p className="font-display text-base font-bold text-[var(--color-ink)]">
            {t.paywall.refundTitle}
          </p>
          <p className="text-xs leading-snug text-[var(--color-ink-soft)]">
            {t.paywall.refundBody}
          </p>
        </div>
      </Card>

      {/* Testimonials — same as landing page (with group photo) */}
      <div className="-mx-5">
        <TestimonialsSection
          heading={t.paywall.testimonialsHeading}
          count={3}
          bigNumber={t.landing.trustBigNumber}
          bigNumberSub={t.landing.trustBigNumberSub}
          rating={t.landing.trustRating}
          ratingSub={t.landing.trustRatingSub}
          outOf5Label={t.landing.trustOutOf5}
          verifiedOnLabel={t.landing.trustVerifiedOn}
          starsAlt={t.landing.trust5Stars}
          groupImageAlt={t.landing.testimonialsImageAlt}
          quoteOverrides={{
            "Maya R.": t.testimonialQuotes.mayaR,
            "Daniel K.": t.testimonialQuotes.danielK,
            "Priya S.": t.testimonialQuotes.priyaS,
            "Carlos M.": t.testimonialQuotes.carlosM,
            "Aiko T.": t.testimonialQuotes.aikoT,
          }}
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
            {t.paywall.bigTrustGuaranteeTitle}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {t.paywall.bigTrustGuaranteeP1}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {t.paywall.bigTrustGuaranteeP2}
          </p>
        </Card>

        <Card className="border border-[var(--color-green)]/25 bg-[#eef7e0] !p-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={ICON.privacyBig} alt="" aria-hidden className="h-full w-full object-contain" />
          </div>
          <h3 className="mb-3 font-display text-xl font-bold text-[var(--color-ink)]">
            {t.paywall.bigTrustPrivacyTitle}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {t.paywall.bigTrustPrivacyP1}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {t.paywall.bigTrustPrivacyP2}
          </p>
        </Card>
      </div>

      {/* Final reassurance CTA */}
      <Card className="mt-6 bg-[var(--color-orange-pale)] text-center !p-5">
        <h3 className="mb-1 font-display text-xl">{t.paywall.finalCtaTitle}</h3>
        <p className="mb-4 text-xs text-[var(--color-ink-soft)]">
          {t.paywall.finalCtaSub}
        </p>
        <Button size="block" onClick={startCheckout} disabled={busy}>
          {busy ? t.paywall.loading : fmt(t.paywall.finalCtaButton, { price: planStatic.intro })}
        </Button>
      </Card>
    </div>
  );
}
