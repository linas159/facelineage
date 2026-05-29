"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { ButtonProps } from "@/components/ui/button";
import { useFeatureFlag } from "@/lib/posthog/use-feature-flag";
import { capture } from "@/lib/posthog/client";

/**
 * PostHog flag that decides which entry funnel a visitor sees.
 *
 *   Flag key:  home-funnel   (multivariate)
 *   Variants:  "onboarding"  → new 3-screen onboarding carousel (test)
 *              "control"     → existing 6-step quiz (control)
 *
 * Rollout for this test is 100/0 → everyone resolves to "onboarding".
 * Until flags load (or if PostHog is unreachable) we optimistically route to
 * the onboarding funnel, since that's the intended 100% exposure.
 */
export const HOME_FUNNEL_FLAG = "home-funnel";

interface FunnelCtaProps extends Omit<ButtonProps, "asChild"> {
  /** Localized href for the new onboarding funnel (e.g. "/onboarding/1"). */
  onboardingHref: string;
  /** Localized href for the control quiz funnel (e.g. "/quiz/1"). */
  quizHref: string;
  children: React.ReactNode;
}

/**
 * Renders the landing CTA as a link whose destination is chosen by the
 * `home-funnel` PostHog flag. The flag is read client-side; we default to the
 * onboarding funnel so there's no flash toward the quiz during flag load.
 */
export function FunnelCta({
  onboardingHref,
  quizHref,
  children,
  ...buttonProps
}: FunnelCtaProps) {
  const { value } = useFeatureFlag(HOME_FUNNEL_FLAG);
  const router = useRouter();

  // Treat anything other than an explicit "control" as the onboarding test.
  const useOnboarding = value !== "control" && value !== false;
  const href = useOnboarding ? onboardingHref : quizHref;

  // Warm the resolved entry route so the first tap feels instant.
  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  function handleClick() {
    capture("funnel_cta_clicked", {
      variant: useOnboarding ? "onboarding" : "control",
      href,
    });
  }

  return (
    <Link href={href} onClick={handleClick}>
      <Button {...buttonProps}>{children}</Button>
    </Link>
  );
}
