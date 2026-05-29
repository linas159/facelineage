import { notFound } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { OnboardingCarousel } from "./onboarding-carousel";
import { getDictionary, getLocale, localized } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * 3-screen onboarding carousel — the feature-flagged alternative to the
 * 6-step quiz (`/quiz/[step]`). Each screen shows a generated visual, a
 * headline + supporting line, paging dots, and a Continue CTA. The final
 * screen's CTA goes straight to photo capture (no quiz in between).
 *
 * Routing between the quiz and this funnel is decided by the `home-funnel`
 * PostHog flag, read in <FunnelCta> on the landing page. The step definitions
 * here are language-agnostic — they reference dictionary keys under
 * `onboarding`. To translate, edit the dictionaries.
 */
type Slide = {
  id: number;
  image: string;
  titleKey: keyof Dictionary["onboarding"];
  bodyKey: keyof Dictionary["onboarding"];
  altKey: keyof Dictionary["onboarding"];
  /** Which CTA label to show — the last slide uses "Start my scan". */
  ctaKey: "continueButton" | "startButton";
};

const SLIDES: Slide[] = [
  {
    id: 1,
    image: "/onboarding/slide-1.png",
    titleKey: "slide1Title",
    bodyKey: "slide1Body",
    altKey: "slide1ImageAlt",
    ctaKey: "continueButton",
  },
  {
    id: 2,
    image: "/onboarding/slide-2.png",
    titleKey: "slide2Title",
    bodyKey: "slide2Body",
    altKey: "slide2ImageAlt",
    ctaKey: "continueButton",
  },
  {
    id: 3,
    image: "/onboarding/slide-3.png",
    titleKey: "slide3Title",
    bodyKey: "slide3Body",
    altKey: "slide3ImageAlt",
    ctaKey: "startButton",
  },
];

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);
  const slide = SLIDES.find((s) => s.id === stepNum);
  if (!slide) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const o = dict.onboarding;

  const isLast = stepNum >= SLIDES.length;
  // Final slide hands off to photo capture. The `from` param lets capture's
  // back button return to onboarding rather than the (unseen) quiz.
  const next = isLast
    ? "/capture?from=onboarding"
    : `/onboarding/${stepNum + 1}`;
  const back = stepNum > 1 ? `/onboarding/${stepNum - 1}` : "/";

  // Warm the next screen's hero image (or the capture selfie illustration).
  const nextSlide = SLIDES.find((s) => s.id === stepNum + 1);
  const prefetchImages = isLast
    ? ["/selfie.png"]
    : nextSlide
      ? [nextSlide.image]
      : [];

  return (
    <FunnelShell fillViewport showBack backHref={localized(back, locale)}>
      <OnboardingCarousel
        step={stepNum}
        totalSteps={SLIDES.length}
        image={slide.image}
        imageAlt={o[slide.altKey]}
        title={o[slide.titleKey]}
        body={o[slide.bodyKey]}
        ctaLabel={o[slide.ctaKey]}
        nextHref={localized(next, locale)}
        prefetchImages={prefetchImages}
      />
    </FunnelShell>
  );
}
