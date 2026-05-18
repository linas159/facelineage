"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { TESTIMONIALS, type Testimonial } from "@/lib/testimonials-data";

export { TESTIMONIALS };
export type { Testimonial };

// ────────────────────────────────────────────────────────────────────────────
// Small visual pieces
// ────────────────────────────────────────────────────────────────────────────

/**
 * Decorative laurel — uses /public/laurel.png as a CSS mask, fills with the
 * gold color via background. Pass `side="right"` to mirror.
 */
function Laurel({
  side,
  className,
  color = "#d4a432",
}: {
  side: "left" | "right";
  className?: string;
  color?: string;
}) {
  const maskStyles = {
    WebkitMaskImage: "url('/laurel.png')",
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskImage: "url('/laurel.png')",
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    backgroundColor: color,
  } as React.CSSProperties;

  return (
    <div
      aria-hidden
      className={cn("flex-shrink-0", side === "right" && "-scale-x-100", className)}
      style={maskStyles}
    />
  );
}

/** Trustpilot 5-star graphic. Place the official asset at /testimonial/trustpilot-stars.svg. */
function TrustpilotStars({ imgSrc, alt = "5 stars", className }: { imgSrc: string; alt?: string; className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={imgSrc} alt={alt} className={cn("h-7 w-auto", className)} />;
}

/** Smaller star row for individual testimonial cards (Facelineage orange). */
function MiniStars({ count = 5 }: { count?: number }) {
  return (
    <div className="flex gap-0.5 text-base text-[var(--color-orange)]">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i}>★</span>
      ))}
    </div>
  );
}

/** Avatar — real photo when available, colored initials as fallback if file 404s. */
function Avatar({ t, size = 48 }: { t: Testimonial; size?: number }) {
  const [errored, setErrored] = useState(false);

  if (t.avatarSrc && !errored) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={t.avatarSrc}
        alt={t.name}
        width={size}
        height={size}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
        onError={() => setErrored(true)}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center rounded-full text-sm font-bold text-white"
      style={{ background: t.avatarColor, width: size, height: size }}
    >
      {t.initials}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Trust summary card — laurels + big stat + Trustpilot-style rating pill
// ────────────────────────────────────────────────────────────────────────────

interface TrustSummaryCardProps {
  bigNumber?: string;
  bigNumberSub?: string;
  rating?: string;
  ratingSub?: string;
  outOf5Label?: string;
  verifiedOnLabel?: string;
  starsAlt?: string;
  trustpilotStarsSrc?: string;
  trustpilotLogoSrc?: string;
  className?: string;
}

export function TrustSummaryCard({
  bigNumber = "12,000+",
  bigNumberSub = "ancestry reads delivered across 90+ countries",
  rating = "4.8",
  ratingSub = "Based on 3,200+ verified reviews",
  outOf5Label = " out of 5",
  verifiedOnLabel = "Verified on",
  starsAlt = "5 stars",
  trustpilotStarsSrc = "/testimonial/trustpilot-stars.svg",
  trustpilotLogoSrc = "/testimonial/trustpilot-logo.png",
  className,
}: TrustSummaryCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      {/* Big stat — flanked by golden laurels (PNG mask, mirrored on the right) */}
      <div className="flex items-center justify-center gap-3">
        <Laurel side="right" className="h-20 w-9" />
        <div className="flex-1 text-center">
          <div className="font-display text-3xl font-bold leading-none text-[var(--color-ink)] tabular sm:text-4xl">
            {bigNumber}
          </div>
          <p className="mx-auto mt-2 max-w-xs text-xs leading-snug text-[var(--color-ink-soft)] sm:text-sm">
            {bigNumberSub}
          </p>
        </div>
        <Laurel side="left" className="h-20 w-9" />
      </div>

      {/* Rating pill */}
      <div className="mt-5 flex items-center justify-between gap-3 rounded-[var(--radius-input)] bg-[#e8f5dc] px-4 py-3">
        <div>
          <div className="font-bold leading-none">
            <span className="text-lg text-[var(--color-green)]">{rating}</span>
            <span className="text-base text-[var(--color-ink)]">{outOf5Label}</span>
          </div>
          <p className="mt-1 text-[11px] leading-tight text-[var(--color-ink-soft)]">
            {ratingSub}
          </p>
        </div>
        <TrustpilotStars imgSrc={trustpilotStarsSrc} alt={starsAlt} />
      </div>

      {/* Trustpilot attribution */}
      {trustpilotLogoSrc && (
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-[var(--color-ink-muted)]">
          <span>{verifiedOnLabel}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={trustpilotLogoSrc} alt="Trustpilot" className="h-6 w-auto" />
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// TestimonialCard — Trustpilot-style: name + stars on the left, photo on the right
// ────────────────────────────────────────────────────────────────────────────

export function TestimonialCard({
  t,
  className,
}: {
  t: Testimonial;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]",
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="font-bold leading-tight text-[var(--color-ink)]">{t.name}</p>
          <div className="mt-1.5">
            <MiniStars count={t.rating ?? 5} />
          </div>
        </div>
        <Avatar t={t} />
      </div>
      <p className="text-sm leading-relaxed text-[var(--color-ink-soft)]">
        {t.quote}
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Carousel + grid — kept for compatibility with other pages
// ────────────────────────────────────────────────────────────────────────────

export function TestimonialCarousel({
  items = TESTIMONIALS,
  intervalMs = 4500,
  quoteOverrides,
}: {
  items?: Testimonial[];
  intervalMs?: number;
  /** Map of testimonial.name → translated quote. */
  quoteOverrides?: Record<string, string>;
}) {
  const [idx, setIdx] = useState(0);

  const localizedItems = quoteOverrides
    ? items.map((t) =>
        quoteOverrides[t.name] ? { ...t, quote: quoteOverrides[t.name] } : t,
      )
    : items;

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % localizedItems.length), intervalMs);
    return () => clearInterval(t);
  }, [localizedItems.length, intervalMs]);

  return (
    <div className="relative h-[170px]">
      {localizedItems.map((t, i) => (
        <div
          key={t.name}
          className="absolute inset-0 transition-opacity duration-500"
          style={{ opacity: i === idx ? 1 : 0, pointerEvents: i === idx ? "auto" : "none" }}
        >
          <TestimonialCard t={t} />
        </div>
      ))}
      <div className="absolute -bottom-5 left-1/2 flex -translate-x-1/2 gap-1.5">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            aria-label={`Testimonial ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === idx ? "w-5 bg-[var(--color-orange)]" : "w-1.5 bg-[var(--color-line-strong)]",
            )}
          />
        ))}
      </div>
    </div>
  );
}

export function TestimonialGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {TESTIMONIALS.map((t) => (
        <TestimonialCard key={t.name} t={t} />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Full section — drop-in replacement for the landing page testimonials block
// ────────────────────────────────────────────────────────────────────────────

interface TestimonialsSectionProps {
  /** Heading shown above the trust block. */
  heading?: string;
  /** Big illustration above the trust card. Defaults to /testimonial/group.png. */
  groupImageSrc?: string | null;
  /** Alt text for the group image. */
  groupImageAlt?: string;
  bigNumber?: string;
  bigNumberSub?: string;
  rating?: string;
  ratingSub?: string;
  outOf5Label?: string;
  verifiedOnLabel?: string;
  starsAlt?: string;
  /** Override the path to your Trustpilot stars image. */
  trustpilotStarsSrc?: string;
  /** How many testimonial cards to show. */
  count?: number;
}

export function TestimonialsSection({
  heading = "Our explorers trust us",
  groupImageSrc = "/testimonial/group.png",
  groupImageAlt = "People who've discovered their heritage",
  bigNumber = "12,000+",
  bigNumberSub = "ancestry reads delivered across 90+ countries",
  rating = "4.8",
  ratingSub = "Based on 3,200+ verified reviews",
  outOf5Label,
  verifiedOnLabel,
  starsAlt,
  trustpilotStarsSrc,
  count = 3,
  quoteOverrides,
}: TestimonialsSectionProps & {
  /** Map of testimonial.name → translated quote. Falls back to t.quote. */
  quoteOverrides?: Record<string, string>;
}) {
  return (
    <section className="py-6">
      {/* Heading — constrained to mobile column */}
      <div className="mx-auto max-w-md px-5">
        <h2 className="text-center text-balance">{heading}</h2>
      </div>

      {/* Group image — full viewport width, edge to edge */}
      {groupImageSrc && (
        <div className="mx-auto max-w-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={groupImageSrc}
            alt={groupImageAlt}
            className="block h-auto w-full"
          />
        </div>
      )}

      {/* Trust card + per-user cards — back inside the mobile column */}
      <div className="mx-auto max-w-md px-5">
        <TrustSummaryCard
          bigNumber={bigNumber}
          bigNumberSub={bigNumberSub}
          rating={rating}
          ratingSub={ratingSub}
          outOf5Label={outOf5Label}
          verifiedOnLabel={verifiedOnLabel}
          starsAlt={starsAlt}
          trustpilotStarsSrc={trustpilotStarsSrc}
          className="mb-6"
        />

        <div className="space-y-4">
          {TESTIMONIALS.slice(0, count).map((t) => {
            const localized = quoteOverrides?.[t.name];
            const tt = localized ? { ...t, quote: localized } : t;
            return <TestimonialCard key={t.name} t={tt} />;
          })}
        </div>
      </div>
    </section>
  );
}
