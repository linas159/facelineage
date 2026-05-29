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

/**
 * Read a feature flag value. Returns `undefined` until PostHog has loaded
 * its flags (the first request after init is async). For booleans the value
 * is `true`/`false`; for multivariate flags it's the variant string key.
 *
 * Prefer the `useFeatureFlag` hook in React components — it re-renders when
 * flags finish loading. Use this raw getter only in imperative call sites.
 */
export function getFeatureFlag(key: string): boolean | string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return posthog.getFeatureFlag(key);
  } catch {
    return undefined;
  }
}

/**
 * Subscribe to the moment PostHog has flags available (and on every reload).
 * Returns an unsubscribe function. Safe to call before init — posthog-js
 * queues the callback internally.
 */
export function onFeatureFlags(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  try {
    return posthog.onFeatureFlags(cb);
  } catch {
    return () => {};
  }
}
