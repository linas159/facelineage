"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { capture } from "@/lib/posthog/client";
import { cn } from "@/lib/utils";

interface OnboardingCarouselProps {
  step: number;
  totalSteps: number;
  image: string;
  imageAlt: string;
  title: string;
  body: string;
  ctaLabel: string;
  nextHref: string;
  /** Next-screen images to warm in the browser cache for instant paint. */
  prefetchImages?: string[];
}

/**
 * One onboarding screen: a generated hero visual, paging dots, headline,
 * supporting line, and the Continue/Start CTA. Advancing fires a PostHog
 * milestone and navigates to the next screen (or photo capture on the last).
 *
 * Each step is its own route (`/onboarding/[step]`) so the browser Back
 * button and analytics funnels behave naturally — matching the quiz funnel.
 */
export function OnboardingCarousel({
  step,
  totalSteps,
  image,
  imageAlt,
  title,
  body,
  ctaLabel,
  nextHref,
  prefetchImages,
}: OnboardingCarouselProps) {
  const router = useRouter();

  // Warm the next route + its imagery while the user reads this screen.
  useEffect(() => {
    router.prefetch(nextHref);
    prefetchImages?.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [router, nextHref, prefetchImages]);

  // Track which screen was seen — powers the onboarding drop-off funnel.
  useEffect(() => {
    capture("onboarding_step_viewed", { step });
  }, [step]);

  function advance() {
    capture("onboarding_step_continued", { step });
    router.push(nextHref);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* Hero visual — grows to fill the available space, centered. Breaks out
          of the shell's side gutter (-mx-5) so it renders edge-to-edge and as
          large as the viewport allows. */}
      <div className="-mx-5 flex min-h-0 flex-1 items-center justify-center py-1">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={image}
          alt={imageAlt}
          className="h-full w-full object-contain"
        />
      </div>

      {/* Text + dots + CTA — pinned to the bottom. */}
      <div className="flex-shrink-0 pt-2">
        <h2 className="text-center text-balance">{title}</h2>
        <p className="mx-auto mt-3 max-w-sm text-center text-[var(--color-ink-soft)]">
          {body}
        </p>

        {/* Paging dots */}
        <div className="mt-6 flex items-center justify-center gap-2" aria-hidden>
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
            <span
              key={n}
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                n === step
                  ? "w-6 bg-[var(--color-orange)]"
                  : "w-2 bg-[var(--color-orange-soft)]",
              )}
            />
          ))}
        </div>

        <Button
          size="block"
          className="mt-6"
          onClick={advance}
        >
          {ctaLabel} →
        </Button>
      </div>
    </div>
  );
}
