import "server-only";

/**
 * Formatting primitives shared by the Visa and Mastercard response builders.
 *
 * Both schemes validate payloads strictly and reject the whole response for a
 * single over-length or wrongly-shaped field, so every value we emit goes
 * through one of these.
 */

/**
 * ISO 8601 in UTC at second precision: `2025-06-06T09:18:18Z`.
 *
 * Mastercard pins its date-times to exactly 20 characters, which is this
 * format and nothing else — `Date#toISOString()` returns 24 (it includes
 * milliseconds) and fails validation.
 */
export function isoSeconds(value: Date | string | number | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  return `${d.toISOString().slice(0, 19)}Z`;
}

/** Minor units → decimal string with 2 fractional digits ("1.95"). */
export function centsToString(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}

/** Minor units → number, for Visa's numeric Amount object. */
export function centsToNumber(cents: number | null | undefined): number {
  return Math.round(cents ?? 0) / 100;
}

/**
 * Truncate to a maximum length, or drop the value entirely.
 *
 * `mode: "omit"` is for fields where a clipped value is worse than no value —
 * a half-written email as `accountId` is unrecognizable to the cardholder and
 * actively harms deflection, whereas a missing optional field costs nothing.
 */
export function fit(
  value: string | null | undefined,
  max: number,
  mode: "truncate" | "omit" = "truncate",
): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= max) return trimmed;
  return mode === "omit" ? undefined : trimmed.slice(0, max);
}

/**
 * Short, quotable order reference derived from a purchase UUID.
 *
 * Visa caps `receipt.orderNumber` at 25 characters and a UUID is 36, so the
 * raw id cannot go in that field — and a UUID clipped to 25 characters is
 * worse than useless: it looks like a real identifier, the cardholder quotes
 * it to support, and it matches nothing. This gives a stable value that fits,
 * reads like an order number, and is still a prefix search away from the row
 * it came from (`purchases.id like '3f2b1c8e-9a4d%'`).
 */
export function orderReference(purchaseId: string): string {
  const hex = purchaseId.replace(/-/g, "").slice(0, 12).toUpperCase();
  return `FL-${hex}`;
}

/** ISO 4217, uppercase, exactly 3 letters. */
export function currencyCode(currency: string | null | undefined): string {
  const c = (currency ?? "usd").toUpperCase();
  return /^[A-Z]{3}$/.test(c) ? c : "USD";
}

/**
 * Masked PAN as it appears on a receipt — Visa caps display at the last 4.
 * Returns undefined without a last4, since `xxxxxxxxxxxx` alone tells the
 * cardholder nothing.
 */
export function maskedPan(last4: string | null | undefined): string | undefined {
  if (!last4) return undefined;
  return `xxxxxxxxxxxx${last4}`;
}

/** Whole months between two instants, floored at 0 and capped for maxLength. */
export function monthsBetween(from: Date | string | null | undefined, to: Date = new Date()): number {
  if (!from) return 0;
  const start = from instanceof Date ? from : new Date(from);
  if (Number.isNaN(start.getTime())) return 0;
  const months = (to.getFullYear() - start.getFullYear()) * 12 + (to.getMonth() - start.getMonth());
  // Don't count the current month until the day-of-month has come round.
  const adjusted = to.getDate() < start.getDate() ? months - 1 : months;
  return Math.max(0, adjusted);
}

/**
 * Recursively drop `undefined`, `null`, empty strings, empty objects and empty
 * arrays.
 *
 * The builders below assemble the richest possible response and let this pass
 * decide what actually ships. That matters: the integration guide is explicit
 * that irrelevant or empty data reduces clarity for the cardholder, and both
 * schemes validate the *shape* of any object that is present — so an object
 * emitted with all-undefined members is a validation failure, not a no-op.
 */
export function prune<T>(value: T): T {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined && v !== null);
    return (arr.length ? arr : undefined) as unknown as T;
  }
  if (value && typeof value === "object" && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = prune(v);
      if (cleaned === undefined || cleaned === null) continue;
      if (typeof cleaned === "string" && cleaned === "") continue;
      out[k] = cleaned;
    }
    return (Object.keys(out).length ? out : undefined) as unknown as T;
  }
  return value;
}
