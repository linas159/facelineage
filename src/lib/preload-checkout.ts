/**
 * Fires the /api/checkout request from the paywall click handler so the
 * Stripe round-trip (~5–10s creating two subscriptions) runs in parallel
 * with the /checkout route navigation. The result is stashed in
 * sessionStorage keyed by plan+analysis; the checkout page reads it on
 * mount and skips the fetch when fresh.
 */

const PRELOAD_TTL_MS = 30 * 60 * 1000; // 30 min — well under Stripe PI expiry

type Plan = string;

export interface CheckoutInitCached {
  walletsClientSecret?: string;
  cardClientSecret?: string;
  clientSecret?: string;
  publishableKey: string;
  amount: number;
  currency: string;
  returnUrl?: string;
}

interface Stamped {
  at: number;
  data: CheckoutInitCached;
}

function key(plan: Plan, analysisId: string) {
  return `fl_checkout_init:${plan}:${analysisId}`;
}

function inflightKey(plan: Plan, analysisId: string) {
  return `fl_checkout_inflight:${plan}:${analysisId}`;
}

const inflight = new Map<string, Promise<CheckoutInitCached | null>>();

export function preloadCheckoutInit(
  plan: Plan,
  analysisId: string,
  locale: string = "en",
): Promise<CheckoutInitCached | null> {
  const k = inflightKey(plan, analysisId);
  const existing = inflight.get(k);
  if (existing) return existing;

  const p = (async () => {
    try {
      // Skip if we already have a fresh cached result.
      const cached = readCheckoutInit(plan, analysisId);
      if (cached) return cached;

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, analysisId, locale }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as CheckoutInitCached;
      try {
        const stamped: Stamped = { at: Date.now(), data };
        sessionStorage.setItem(key(plan, analysisId), JSON.stringify(stamped));
      } catch {
        // sessionStorage unavailable (private mode etc.) — fine, caller
        // will fall back to a regular fetch on the /checkout page.
      }
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(k);
    }
  })();
  inflight.set(k, p);
  return p;
}

export function readCheckoutInit(
  plan: Plan,
  analysisId: string,
): CheckoutInitCached | null {
  try {
    const raw = sessionStorage.getItem(key(plan, analysisId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stamped;
    if (Date.now() - parsed.at > PRELOAD_TTL_MS) {
      sessionStorage.removeItem(key(plan, analysisId));
      return null;
    }
    return parsed.data;
  } catch {
    return null;
  }
}

export function consumeCheckoutInit(
  plan: Plan,
  analysisId: string,
): CheckoutInitCached | null {
  const data = readCheckoutInit(plan, analysisId);
  if (data) {
    try {
      sessionStorage.removeItem(key(plan, analysisId));
    } catch {}
  }
  return data;
}
