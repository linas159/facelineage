import "server-only";
import crypto from "node:crypto";

/**
 * Meta Conversions API — server-to-server event helper.
 *
 * Pairs with the browser Pixel: every event sent here can match a Pixel
 * event by `event_id`, and Meta dedupes the pair into a single conversion.
 * iOS/ad-blockers eat 30–40% of Pixel events; CAPI is the source of truth.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";
const ACCESS_TOKEN = process.env.META_CAPI_ACCESS_TOKEN ?? "";
const TEST_EVENT_CODE = process.env.META_TEST_EVENT_CODE ?? "";
const GRAPH_VERSION = "v21.0";

export type MetaEventName =
  | "PageView"
  | "ViewContent"
  | "Lead"
  | "CompleteRegistration"
  | "InitiateCheckout"
  | "Purchase"
  | "AddToCart";

export interface UserData {
  email?: string;
  phone?: string;
  externalId?: string;
  /** Stripe customer id, IP, UA, fbp/fbc — see RequestContext. */
  ipAddress?: string;
  userAgent?: string;
  /** _fbp cookie (Pixel browser id). */
  fbp?: string;
  /** _fbc cookie (Pixel click id) — fbclid stamped at first visit. */
  fbc?: string;
}

export interface CustomData {
  currency?: string;
  /** Decimal value in the major unit (e.g. 1.95, not 195). */
  value?: number;
  contentName?: string;
  contentCategory?: string;
  contentIds?: string[];
  contentType?: "product" | "product_group";
  numItems?: number;
  /** Free-form passthrough — Meta accepts arbitrary fields here. */
  [key: string]: unknown;
}

export interface SendEventOpts {
  eventName: MetaEventName;
  /** Deterministic dedup id matching the Pixel call. Required. */
  eventId: string;
  /** Unix seconds. Defaults to now. */
  eventTime?: number;
  /** URL the event happened on (best for ViewContent / PageView). */
  eventSourceUrl?: string;
  /** "website" by default. */
  actionSource?: "website" | "app" | "email" | "chat" | "phone_call" | "system_generated";
  userData?: UserData;
  customData?: CustomData;
}

function sha256(input: string): string {
  return crypto.createHash("sha256").update(input.trim().toLowerCase()).digest("hex");
}

function normalizeUserData(u: UserData | undefined): Record<string, unknown> {
  if (!u) return {};
  const out: Record<string, unknown> = {};
  if (u.email) out.em = [sha256(u.email)];
  if (u.phone) {
    // Strip non-digits before hashing — Meta wants E.164-ish without +.
    const digits = u.phone.replace(/[^\d]/g, "");
    if (digits) out.ph = [sha256(digits)];
  }
  if (u.externalId) out.external_id = [sha256(u.externalId)];
  if (u.ipAddress) out.client_ip_address = u.ipAddress;
  if (u.userAgent) out.client_user_agent = u.userAgent;
  if (u.fbp) out.fbp = u.fbp;
  if (u.fbc) out.fbc = u.fbc;
  return out;
}

function normalizeCustomData(c: CustomData | undefined): Record<string, unknown> {
  if (!c) return {};
  const out: Record<string, unknown> = {};
  if (c.currency) out.currency = c.currency.toUpperCase();
  if (typeof c.value === "number") out.value = c.value;
  if (c.contentName) out.content_name = c.contentName;
  if (c.contentCategory) out.content_category = c.contentCategory;
  if (c.contentIds && c.contentIds.length) out.content_ids = c.contentIds;
  if (c.contentType) out.content_type = c.contentType;
  if (typeof c.numItems === "number") out.num_items = c.numItems;
  for (const [k, v] of Object.entries(c)) {
    if (
      [
        "currency",
        "value",
        "contentName",
        "contentCategory",
        "contentIds",
        "contentType",
        "numItems",
      ].includes(k)
    )
      continue;
    out[k] = v;
  }
  return out;
}

/**
 * Send a single event to Meta. Failures are logged, never thrown — analytics
 * should not break the request path.
 */
export async function sendMetaEvent(opts: SendEventOpts): Promise<void> {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[meta-capi] missing PIXEL_ID or ACCESS_TOKEN — skipping", opts.eventName);
    }
    return;
  }

  const eventTime = opts.eventTime ?? Math.floor(Date.now() / 1000);
  const event = {
    event_name: opts.eventName,
    event_time: eventTime,
    event_id: opts.eventId,
    action_source: opts.actionSource ?? "website",
    event_source_url: opts.eventSourceUrl,
    user_data: normalizeUserData(opts.userData),
    custom_data: normalizeCustomData(opts.customData),
  };

  const body: Record<string, unknown> = {
    data: [event],
    access_token: ACCESS_TOKEN,
  };
  if (TEST_EVENT_CODE) body.test_event_code = TEST_EVENT_CODE;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${PIXEL_ID}/events`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(
        `[meta-capi] ${opts.eventName} failed status=${res.status} body=${text.slice(0, 500)}`,
      );
      return;
    }
    if (process.env.NODE_ENV !== "production") {
      console.log(`[meta-capi] sent ${opts.eventName} event_id=${opts.eventId}`);
    }
  } catch (err) {
    console.error(`[meta-capi] ${opts.eventName} threw:`, err);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Request-context helpers — read IP, UA, fbp/fbc from a Next.js request.
// ────────────────────────────────────────────────────────────────────────────

export interface RequestContext {
  ipAddress?: string;
  userAgent?: string;
  fbp?: string;
  fbc?: string;
  eventSourceUrl?: string;
}

/**
 * Extract IP, UA, and Pixel cookies (`_fbp`, `_fbc`) from headers + cookies.
 * Call this from API routes / server actions and merge the result into
 * `sendMetaEvent({ userData: {...ctx} })`. Better match quality = lower CPA.
 */
export function readRequestContext(req: {
  headers: Headers;
  url?: string;
}): RequestContext {
  const headers = req.headers;
  const xff = headers.get("x-forwarded-for") ?? "";
  const ipAddress =
    xff.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    headers.get("cf-connecting-ip") ||
    undefined;
  const userAgent = headers.get("user-agent") ?? undefined;

  const cookieHeader = headers.get("cookie") ?? "";
  const cookies = parseCookies(cookieHeader);
  const fbp = cookies["_fbp"];
  const fbc = cookies["_fbc"];

  return {
    ipAddress,
    userAgent,
    fbp,
    fbc,
    eventSourceUrl: req.url,
  };
}

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(/;\s*/)) {
    const eq = part.indexOf("=");
    if (eq <= 0) continue;
    const k = part.slice(0, eq).trim();
    const v = part.slice(eq + 1).trim();
    if (k && v) out[k] = decodeURIComponent(v);
  }
  return out;
}

/**
 * Deterministic event-id helpers. Using a deterministic id means the
 * browser Pixel and server CAPI can both compute the same id from a
 * shared anchor (PaymentIntent, subscription, user id) without round-tripping.
 */
export const metaEventId = {
  purchase: (paymentIntentId: string) => `purchase_${paymentIntentId}`,
  upsellPurchase: (paymentIntentId: string) => `purchase_${paymentIntentId}`,
  initiateCheckout: (analysisId: string, plan: string) =>
    `initiate_checkout_${analysisId}_${plan}`,
  lead: (analysisId: string) => `lead_${analysisId}`,
  completeRegistration: (userId: string) => `complete_registration_${userId}`,
  viewContent: (analysisId: string, page: string) => `view_${page}_${analysisId}`,
};
