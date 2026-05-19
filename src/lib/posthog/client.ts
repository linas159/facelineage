"use client";

import posthog from "posthog-js";

/**
 * Thin wrapper around posthog-js. Use these instead of importing posthog
 * directly so we can swap implementations without touching call sites.
 *
 * The provider in /lib/posthog/provider.tsx initializes posthog once. Calls
 * before init queue up internally.
 */

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function capture(event: string, props?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  try {
    posthog.capture(event, props ?? {});
  } catch {
    /* never throw from analytics */
  }
}

export function identify(distinctId: string, traits?: AnalyticsProps): void {
  if (typeof window === "undefined") return;
  try {
    posthog.identify(distinctId, traits ?? {});
  } catch {
    /* never throw from analytics */
  }
}

export function resetIdentity(): void {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
  } catch {
    /* never throw from analytics */
  }
}
