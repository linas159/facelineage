"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useI18n, fmt, localizeHref } from "@/lib/i18n/client";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";
import {
  UPSELL_SKU_BY_UI_ID,
  UPSELL_ORIGINAL,
  formatPrice,
  pickCurrency,
  type Currency,
} from "@/lib/stripe";
import { capture } from "@/lib/posthog/client";

export type UpsellId =
  | "parents"
  | "ethnicity"
  | "ages"
  | "partner"
  | "book";

/**
 * Per-upsell static data — the parts that don't change per locale or
 * currency: id, image, dictionary keys, accent color. Per-locale prices
 * are computed at render time from the Stripe Price catalog (mirrored in
 * lib/stripe.ts via UPSELL_PRICE / UPSELL_ORIGINAL).
 */
type UpsellStatic = {
  id: UpsellId;
  titleKey: "parentsTitle" | "ethnicityTitle" | "agesTitle" | "partnerTitle" | "bookTitle";
  subtitleKey: "parentsSubtitle" | "ethnicitySubtitle" | "agesSubtitle" | "partnerSubtitle" | "bookSubtitle";
  bodyKey: "parentsBody" | "ethnicityBody" | "agesBody" | "partnerBody" | "bookBody";
  ctaKey: "parentsCta" | "ethnicityCta" | "agesCta" | "partnerCta" | "bookCta";
  imageSrc: string;
  accent: string;
};

const UPSELL_STATICS: UpsellStatic[] = [
  { id: "parents",   titleKey: "parentsTitle",   subtitleKey: "parentsSubtitle",   bodyKey: "parentsBody",   ctaKey: "parentsCta",   imageSrc: "/upsell/parents.png",   accent: "var(--color-orange)" },
  { id: "ethnicity", titleKey: "ethnicityTitle", subtitleKey: "ethnicitySubtitle", bodyKey: "ethnicityBody", ctaKey: "ethnicityCta", imageSrc: "/upsell/ethnicity.png", accent: "var(--color-violet)" },
  { id: "ages",      titleKey: "agesTitle",      subtitleKey: "agesSubtitle",      bodyKey: "agesBody",      ctaKey: "agesCta",      imageSrc: "/upsell/ages.png",      accent: "var(--color-yellow)" },
  { id: "partner",   titleKey: "partnerTitle",   subtitleKey: "partnerSubtitle",   bodyKey: "partnerBody",   ctaKey: "partnerCta",   imageSrc: "/upsell/partner.png",   accent: "var(--color-coral)" },
  { id: "book",      titleKey: "bookTitle",      subtitleKey: "bookSubtitle",      bodyKey: "bookBody",      ctaKey: "bookCta",      imageSrc: "/upsell/book.png",      accent: "var(--color-green)" },
];

// Per-locale display prices (mirrors what's in Stripe + UPSELL_ORIGINAL).
const UPSELL_PRICE: Record<UpsellId, Record<Currency, number>> = {
  parents:   { usd: 499, eur: 499, ron: 1900 },
  ethnicity: { usd: 699, eur: 699, ron: 2700 },
  ages:      { usd: 699, eur: 699, ron: 2700 },
  partner:   { usd: 699, eur: 699, ron: 2700 },
  book:      { usd: 999, eur: 999, ron: 3900 },
};

/** Runtime upsell shape after dictionary keys are resolved. */
export type Upsell = {
  id: UpsellId;
  title: string;
  subtitle: string;
  body: string;
  price: string;
  originalPrice: string;
  imageSrc: string;
  cta: string;
  accent: string;
};

function resolveUpsell(
  s: UpsellStatic,
  dict: Dictionary["upsells"],
  currency: Currency,
  locale: string,
): Upsell {
  const skuKey = UPSELL_SKU_BY_UI_ID[s.id];
  const original = UPSELL_ORIGINAL[skuKey];
  return {
    id: s.id,
    title: dict[s.titleKey],
    subtitle: dict[s.subtitleKey],
    body: dict[s.bodyKey],
    price: formatPrice(UPSELL_PRICE[s.id][currency], currency, locale),
    originalPrice: original
      ? formatPrice(original[currency], currency, locale)
      : "",
    imageSrc: s.imageSrc,
    cta: dict[s.ctaKey],
    accent: s.accent,
  };
}

/** Locale-independent UPSELLS data — kept exported for components that need IDs only. */
export const UPSELLS_STATIC = UPSELL_STATICS;

interface UpsellCardProps {
  upsell: Upsell;
  busy: boolean;
  purchased?: boolean;
  error?: string;
  onAccept: (id: UpsellId) => void;
}

function UpsellCard({ upsell, busy, purchased, error, onAccept }: UpsellCardProps) {
  const { t } = useI18n();
  return (
    <Card className="overflow-hidden !p-0">
      <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-warm)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={upsell.imageSrc}
          alt={upsell.title}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="p-5">
        <p
          className="mb-1 text-[11px] font-bold uppercase tracking-wider"
          style={{ color: upsell.accent }}
        >
          {upsell.subtitle}
        </p>
        <CardTitle className="mb-2">{upsell.title}</CardTitle>
        <CardDescription className="mb-4">{upsell.body}</CardDescription>

        <div className="mb-3 flex items-baseline justify-between rounded-[var(--radius-input)] bg-[var(--color-bg-warm)] px-4 py-3">
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              {t.upsells.oneTime}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-coral)]">
              {t.upsells.saleBadge}
            </span>
          </span>
          <span className="flex items-baseline gap-2">
            <span className="font-display text-base font-bold tabular text-[var(--color-ink-muted)] line-through decoration-[var(--color-coral)] decoration-2">
              {upsell.originalPrice}
            </span>
            <span
              className="font-display text-3xl font-extrabold tabular"
              style={{ color: upsell.accent }}
            >
              {upsell.price}
            </span>
          </span>
        </div>

        {purchased ? (
          <div
            className="rounded-[var(--radius-input)] bg-[var(--color-green)]/10 p-3 text-center text-sm font-semibold text-[var(--color-green)]"
          >
            {t.upsells.purchasedGenerating}
          </div>
        ) : (
          <Button
            size="block"
            disabled={busy}
            onClick={() => onAccept(upsell.id)}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t.upsells.processing}
              </span>
            ) : (
              upsell.cta
            )}
          </Button>
        )}

        {error && (
          <p className="mt-2 text-center text-xs text-[var(--color-coral)]">
            {error}
          </p>
        )}
      </div>
    </Card>
  );
}

interface UpsellSectionsProps {
  heading?: string;
  subhead?: string;
  ids?: UpsellId[];
  /** Required to charge — every upsell attaches to a specific analysis. */
  analysisId?: string;
  className?: string;
}

export function UpsellSections({
  heading,
  subhead,
  ids,
  analysisId,
  className,
}: UpsellSectionsProps) {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [busy, setBusy] = useState<UpsellId | null>(null);
  const [purchased, setPurchased] = useState<Partial<Record<UpsellId, boolean>>>({});
  const [errors, setErrors] = useState<Partial<Record<UpsellId, string>>>({});
  const currency = pickCurrency(locale);
  const allUpsells = UPSELL_STATICS.map((s) => resolveUpsell(s, t.upsells, currency, locale));
  const list = ids ? allUpsells.filter((u) => ids.includes(u.id)) : allUpsells;

  async function handleAccept(id: UpsellId) {
    if (!analysisId) {
      // eslint-disable-next-line no-console
      console.warn("UpsellSections: no analysisId; cannot charge");
      return;
    }
    capture("upsell_accepted", { upsell_id: id, analysis_id: analysisId });
    setBusy(id);
    setErrors((e) => ({ ...e, [id]: undefined }));
    const result = await chargeUpsell(id, analysisId, locale, t);
    if (result === "success") {
      capture("upsell_purchase_success", { upsell_id: id, analysis_id: analysisId });
      setPurchased((p) => ({ ...p, [id]: true }));
      router.refresh();
    } else if (result === "checkout") {
      window.location.href = localizeHref(`/checkout?upsell=${id}&analysis=${analysisId}`, locale);
      return;
    } else if (typeof result === "string") {
      setErrors((e) => ({ ...e, [id]: result }));
    }
    setBusy(null);
  }

  return (
    <section className={cn("mt-10", className)}>
      <h2 className="mb-2 text-center text-balance">{heading ?? t.upsells.sectionHeading}</h2>
      <p className="mx-auto mb-6 max-w-sm text-center text-sm text-[var(--color-ink-soft)]">
        {subhead ?? t.upsells.sectionSubhead}
      </p>

      <div className="space-y-5">
        {list.map((u) => (
          <UpsellCard
            key={u.id}
            upsell={u}
            busy={busy === u.id}
            purchased={!!purchased[u.id]}
            error={errors[u.id]}
            onAccept={handleAccept}
          />
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Pop-up variant — sequenced modals, triggered when the user scrolls to the
// bottom of the page. Used at the end of the report.
// ────────────────────────────────────────────────────────────────────────────

interface UpsellModalProps {
  upsell: Upsell;
  busy: boolean;
  onAccept: (id: UpsellId) => void;
  onDecline: () => void;
}

function UpsellModal({ upsell, busy, onAccept, onDecline }: UpsellModalProps) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-bg-overlay)] sm:items-center sm:p-4"
      onClick={onDecline}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-warm)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={upsell.imageSrc}
            alt={upsell.title}
            className="h-full w-full object-cover"
          />
          <button
            type="button"
            onClick={onDecline}
            aria-label={t.upsells.closeAria}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg font-bold text-[var(--color-ink-soft)] shadow-[var(--shadow-chip)] backdrop-blur"
          >
            ×
          </button>
        </div>

        <div className="p-6 pb-7">
          <p
            className="mb-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: upsell.accent }}
          >
            {upsell.subtitle}
          </p>
          <h2 className="mb-3 font-display text-2xl font-bold leading-tight text-[var(--color-ink)]">
            {upsell.title}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {upsell.body}
          </p>

          <div className="mb-4 flex items-baseline justify-between rounded-[var(--radius-input)] bg-[var(--color-bg-warm)] px-4 py-3">
            <span className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-[var(--color-ink)]">
                {t.upsells.oneTime}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-coral)]">
                {t.upsells.saleBadge}
              </span>
            </span>
            <span className="flex items-baseline gap-2">
              <span className="font-display text-base font-bold tabular text-[var(--color-ink-muted)] line-through decoration-[var(--color-coral)] decoration-2">
                {upsell.originalPrice}
              </span>
              <span
                className="font-display text-3xl font-extrabold tabular"
                style={{ color: upsell.accent }}
              >
                {upsell.price}
              </span>
            </span>
          </div>

          <Button size="block" disabled={busy} onClick={() => onAccept(upsell.id)}>
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                {t.upsells.processing}
              </span>
            ) : (
              upsell.cta
            )}
          </Button>
          <button
            type="button"
            onClick={onDecline}
            disabled={busy}
            className="mt-3 w-full text-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)] disabled:opacity-40"
          >
            {t.upsells.noThanks}
          </button>
        </div>
      </div>
    </div>
  );
}

interface UpsellPopupSequenceProps {
  ids?: UpsellId[];
  /** Required for the buttons to actually start checkout. Demo report has no analysisId. */
  analysisId?: string;
  /** When true, fire the first modal immediately on mount instead of
   *  waiting for the bottom-of-page sentinel to scroll into view. Used on
   *  the "report generating" screen — the user is already engaged. */
  triggerOnMount?: boolean;
  /** Fired the first time the sequence reaches its end (user has dismissed
   *  the last modal). Used by the generating-flow wrapper to gate the
   *  redirect to the full report on upsell completion. */
  onAllDone?: () => void;
}

/**
 * Sequenced upsell modals. Two trigger modes:
 *   1. Default: renders a 1px sentinel; when scrolled into view, the first
 *      modal opens. Used at the bottom of long pages.
 *   2. triggerOnMount: opens the first modal immediately on mount. Used on
 *      the "your report is generating" screen.
 *
 * Each modal advances on accept or decline; once all are seen, nothing
 * shows again for the rest of the page life.
 */
// Delay before the first upsell modal pops up on the "report generating"
// screen — gives the user a few seconds to read "Your report is being
// composed" before we throw the first upsell at them.
const TRIGGER_ON_MOUNT_DELAY_MS = 5000;

export function UpsellPopupSequence({
  ids,
  analysisId,
  triggerOnMount = false,
  onAllDone,
}: UpsellPopupSequenceProps) {
  const { t, locale } = useI18n();
  const currency = pickCurrency(locale);
  const all = UPSELL_STATICS.map((s) => resolveUpsell(s, t.upsells, currency, locale));
  const list = ids ? all.filter((u) => ids.includes(u.id)) : all;
  const [step, setStep] = useState<number>(-1);
  const [busy, setBusy] = useState<UpsellId | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const triggered = useRef(false);
  const allDoneFired = useRef(false);

  // Tell the parent the sequence has finished — used to gate the generating
  // page's auto-refresh until the user has actually dismissed every modal.
  useEffect(() => {
    if (allDoneFired.current) return;
    if (step >= 0 && step >= list.length) {
      allDoneFired.current = true;
      capture("upsell_sequence_completed", { analysis_id: analysisId ?? null, count: list.length });
      onAllDone?.();
    }
  }, [step, list.length, onAllDone, analysisId]);

  // Whenever a new upsell modal becomes the current step, log it as "viewed".
  useEffect(() => {
    if (step < 0 || step >= list.length) return;
    capture("upsell_viewed", {
      upsell_id: list[step].id,
      step_index: step,
      analysis_id: analysisId ?? null,
    });
  }, [step, list, analysisId]);

  useEffect(() => {
    if (triggerOnMount) {
      // Fire the first modal after a short delay so the user can read the
      // "report is being composed" message first. Generation runs in
      // parallel in the webhook; the upsell modals are purely UI.
      const t = setTimeout(() => {
        triggered.current = true;
        setStep(0);
      }, TRIGGER_ON_MOUNT_DELAY_MS);
      return () => clearTimeout(t);
    }
    const node = sentinelRef.current;
    if (!node) return;
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !triggered.current) {
            triggered.current = true;
            setStep(0);
            obs.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px 200px 0px", threshold: 0 },
    );
    obs.observe(node);
    return () => obs.disconnect();
  }, [triggerOnMount]);

  // When a charge succeeds we show a quick "added!" confirmation modal
  // before advancing to the next upsell. Stays on screen ~1.8s, or until
  // the user taps Continue.
  const [confirmedUpsell, setConfirmedUpsell] = useState<Upsell | null>(null);

  async function handleAccept(id: UpsellId) {
    if (!analysisId) {
      // Demo report — just close the modal.
      setStep((s) => s + 1);
      return;
    }
    capture("upsell_popup_accepted", { upsell_id: id, step_index: step, analysis_id: analysisId });
    const upsellRef = list.find((u) => u.id === id) ?? null;
    setBusy(id);
    const result = await chargeUpsell(id, analysisId, locale, t);
    setBusy(null);

    if (result === "success") {
      capture("upsell_popup_purchase_success", { upsell_id: id, analysis_id: analysisId });
      setConfirmedUpsell(upsellRef);
      // Auto-advance after 5s if the user doesn't tap Continue first.
      setTimeout(() => {
        setConfirmedUpsell((c) => (c?.id === id ? null : c));
        setStep((s) => s + 1);
      }, 5000);
      return;
    }

    // Anything else — including the requiresCheckout edge case — silently
    // skips. We never bounce the user out of the popup to /checkout
    // because their card is already on file from the intro fee.
    setStep((s) => s + 1);
  }

  function handleDecline() {
    const upsell = step >= 0 && step < list.length ? list[step] : null;
    if (upsell) {
      capture("upsell_popup_declined", {
        upsell_id: upsell.id,
        step_index: step,
        analysis_id: analysisId ?? null,
      });
    }
    setStep((s) => s + 1);
  }

  function handleConfirmContinue() {
    setConfirmedUpsell(null);
    setStep((s) => s + 1);
  }

  const current = step >= 0 && step < list.length ? list[step] : null;

  return (
    <>
      {!triggerOnMount && (
        <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      )}
      {confirmedUpsell ? (
        <UpsellConfirmedModal upsell={confirmedUpsell} onContinue={handleConfirmContinue} />
      ) : current ? (
        <UpsellModal
          upsell={current}
          busy={busy === current.id}
          onAccept={handleAccept}
          onDecline={handleDecline}
        />
      ) : null}
    </>
  );
}

function UpsellConfirmedModal({
  upsell,
  onContinue,
}: {
  upsell: Upsell;
  onContinue: () => void;
}) {
  const { t } = useI18n();
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[var(--color-bg-overlay)] sm:items-center sm:p-4"
      onClick={onContinue}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-t-[28px] bg-white p-7 sm:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div
            className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full"
            style={{ background: "var(--color-green)" }}
          >
            <span className="text-3xl font-bold text-white">✓</span>
          </div>
          <p
            className="mb-1 text-[11px] font-bold uppercase tracking-wider"
            style={{ color: upsell.accent }}
          >
            {upsell.subtitle}
          </p>
          <h2 className="mb-2 font-display text-2xl font-bold leading-tight text-[var(--color-ink)]">
            {fmt(t.upsells.addedHeading, { title: upsell.title })}
          </h2>
          <p className="mb-5 text-sm leading-relaxed text-[var(--color-ink-soft)]">
            {t.upsells.chargedCardBody}
          </p>
          <Button size="block" onClick={onContinue}>
            {t.upsells.continue}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Off-session upsell charge helper.
//
// Returns "success" | "checkout" | <error message>. "checkout" means the
// server couldn't charge off-session and wants the user routed to the
// interactive /checkout page.
// ────────────────────────────────────────────────────────────────────────────

type ChargeResult = "success" | "checkout" | string;

async function chargeUpsell(
  upsell: UpsellId,
  analysisId: string,
  locale: string,
  t: Dictionary,
): Promise<ChargeResult> {
  let res: Response;
  try {
    res = await fetch("/api/upsell-charge", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ upsell, analysisId, locale }),
    });
  } catch {
    return t.upsells.networkError;
  }

  const data = (await res.json().catch(() => ({}))) as {
    alreadyOwned?: boolean;
    requiresCheckout?: boolean;
    clientSecret?: string;
    publishableKey?: string;
    paymentIntentId?: string;
    error?: string;
  };

  if (data.alreadyOwned) return "success";
  if (data.requiresCheckout) return "checkout";

  if (!data.clientSecret || !data.publishableKey) {
    return data.error ?? t.upsells.paymentFailed;
  }

  // On-session confirm. Stripe.js triggers a 3DS modal if the issuing bank
  // requires SCA (every EU card), otherwise confirms silently. Either way
  // the customer's saved card is used — they never re-enter card details.
  let stripe: Awaited<ReturnType<typeof loadStripe>>;
  try {
    stripe = await loadStripe(data.publishableKey);
  } catch {
    return t.upsells.paymentFailed;
  }
  if (!stripe) return t.upsells.paymentFailed;

  const confirm = await stripe.confirmPayment({
    clientSecret: data.clientSecret,
    confirmParams: { return_url: window.location.href },
    redirect: "if_required",
  });
  if (confirm.error) {
    return confirm.error.message ?? t.upsells.paymentFailed;
  }
  if (confirm.paymentIntent?.status !== "succeeded") {
    return t.upsells.paymentFailed;
  }

  // Record + fire the pipeline server-side. Idempotent with the Stripe
  // webhook — whichever lands first wins, the other is a no-op. Not blocking
  // on this: a missed finalize still gets picked up by the webhook in prod.
  try {
    await fetch("/api/upsell-finalize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paymentIntentId: confirm.paymentIntent.id }),
    });
  } catch {
    /* webhook is the safety net */
  }
  return "success";
}
