"use client";

import { useEffect, useState } from "react";
import { useFeatureFlag } from "./use-feature-flag";

/**
 * PostHog boolean flag controlling PayPal across paywall + checkout.
 *   ON  → PayPal hidden.
 *   OFF → PayPal shown (also the fallback when the flag is missing or
 *         PostHog never loads, e.g. blocked by an ad blocker).
 */
export const HIDE_PAYPAL_FLAG = "hide-paypal";

/** How long to wait for PostHog flags before falling back to showing PayPal. */
const FLAG_TIMEOUT_MS = 1500;

/**
 * Returns `show: true` only once we know PayPal should be visible — flags
 * resolved with the flag off, or the timeout passed without flags. Until
 * then PayPal stays hidden so it never flashes in and then disappears.
 */
export function usePayPalVisibility(): { show: boolean } {
  const { value, loaded } = useFeatureFlag(HIDE_PAYPAL_FLAG);
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (loaded) return;
    const id = setTimeout(() => setTimedOut(true), FLAG_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [loaded]);

  const hidden = value === true;
  const ready = loaded || value !== undefined || timedOut;
  return { show: ready && !hidden };
}
