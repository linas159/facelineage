"use client";

/**
 * Meta Pixel — browser-side typed wrapper around the global `fbq` function.
 *
 * The Pixel script itself is loaded in `app/layout.tsx`. PageView fires
 * automatically on first init. Subsequent route changes are tracked by
 * <PixelRouteTracker /> (also rendered from layout).
 *
 * Every conversion event should pass an `eventID` matching the same id we
 * send from the server via CAPI so Meta can dedupe the pair.
 */

declare global {
  interface Window {
    fbq?: ((...args: unknown[]) => void) & { queue?: unknown[]; loaded?: boolean };
    _fbq?: unknown;
  }
}

export type StandardEvent =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase"
  | "AddToCart";

export interface PixelEventParams {
  currency?: string;
  /** Decimal value (e.g. 1.95). */
  value?: number;
  content_name?: string;
  content_category?: string;
  content_ids?: string[];
  content_type?: "product" | "product_group";
  num_items?: number;
  [key: string]: unknown;
}

export function fbqTrack(
  event: StandardEvent,
  params?: PixelEventParams,
  eventID?: string,
): void {
  if (typeof window === "undefined") return;
  if (!window.fbq) return;
  if (eventID) {
    window.fbq("track", event, params ?? {}, { eventID });
  } else {
    window.fbq("track", event, params ?? {});
  }
}

/**
 * Generate a UUID for client-side event_id when no deterministic anchor
 * exists (e.g. anonymous landing-page Lead before any DB row is created).
 */
export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `e_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

export const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
