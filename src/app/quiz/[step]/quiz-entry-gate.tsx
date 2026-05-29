"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFeatureFlag } from "@/lib/posthog/use-feature-flag";
import { HOME_FUNNEL_FLAG } from "@/components/funnel-cta";

interface QuizEntryGateProps {
  /** Localized destination for the onboarding funnel (e.g. "/ro/onboarding/1"). */
  onboardingHref: string;
  children: React.ReactNode;
}

// If PostHog is slow/unreachable we don't want ad traffic stuck on a spinner.
// After this long we fall back to the onboarding funnel (the intended default).
const FLAG_TIMEOUT_MS = 2000;

/**
 * Wraps the FIRST quiz step so that any entry point — landing CTA, an ad that
 * deep-links to /quiz/1, a shared link — respects the `home-funnel` experiment.
 *
 * When the flag resolves to the onboarding variant (the default for anything
 * that isn't an explicit "control"), we replace the route with the onboarding
 * funnel so the visitor never sees the quiz. Control users render the quiz as
 * normal. A short loader avoids flashing the quiz before the flag resolves.
 */
export function QuizEntryGate({ onboardingHref, children }: QuizEntryGateProps) {
  const { value, loaded } = useFeatureFlag(HOME_FUNNEL_FLAG);
  const router = useRouter();
  const [timedOut, setTimedOut] = useState(false);

  const useOnboarding = value !== "control" && value !== false;

  // Warm the onboarding route so the redirect is instant.
  useEffect(() => {
    router.prefetch(onboardingHref);
  }, [router, onboardingHref]);

  // Fallback to onboarding if the flag never loads.
  useEffect(() => {
    if (loaded) return;
    const t = setTimeout(() => setTimedOut(true), FLAG_TIMEOUT_MS);
    return () => clearTimeout(t);
  }, [loaded]);

  // Send onboarding-variant visitors (and the timeout fallback) into the
  // onboarding funnel via replace() so Back doesn't bounce them here again.
  useEffect(() => {
    if ((loaded && useOnboarding) || (timedOut && !loaded)) {
      router.replace(onboardingHref);
    }
  }, [loaded, useOnboarding, timedOut, router, onboardingHref]);

  // Control users (flag loaded, value === "control") see the quiz. Everyone
  // else sees a loader until the redirect takes over.
  if (loaded && !useOnboarding) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-orange)] border-t-transparent"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
