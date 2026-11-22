"use client";

/**
 * PayPal visibility across paywall + checkout. PayPal is always shown; the
 * PostHog `hide-paypal` flag that used to gate it is no longer read.
 */
export function usePayPalVisibility(): { show: boolean } {
  return { show: true };
}
