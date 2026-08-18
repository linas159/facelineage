import "server-only";
import crypto from "node:crypto";

/**
 * HTTP Basic Auth for the Merchanto Prevent endpoints.
 *
 * Merchanto issues a **separate credential pair per scheme** — one for Visa
 * Order Insight, one for Mastercard Clarity — and signs each inbound call with
 * the pair belonging to that scheme. A single shared pair would therefore
 * reject one of the two integrations outright, so credentials are resolved by
 * scheme, with an optional shared pair as fallback for local testing.
 *
 * These are the only routes in the app that accept an arbitrary POST body
 * without a Supabase session, so this check is the whole perimeter — it runs
 * before we read the body.
 */

export type PreventScheme = "visa" | "mastercard";

/**
 * Constant-time string compare that does not leak length.
 *
 * `crypto.timingSafeEqual` throws when the buffers differ in size, and
 * catching that throw would itself be a length oracle. Hashing both sides
 * first makes every comparison the same 32 bytes.
 */
function safeEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

/**
 * Credentials for one scheme. Scheme-specific vars win; the shared pair is a
 * convenience for local testing and for the `/sample` route, which belongs to
 * neither scheme.
 */
function credentialsFor(scheme: PreventScheme | null): Array<[string, string]> {
  const pairs: Array<[string | undefined, string | undefined]> = [];

  if (scheme === "visa") {
    pairs.push([process.env.PREVENT_VISA_API_USERNAME, process.env.PREVENT_VISA_API_PASSWORD]);
  } else if (scheme === "mastercard") {
    pairs.push([process.env.PREVENT_MC_API_USERNAME, process.env.PREVENT_MC_API_PASSWORD]);
  } else {
    // Scheme-agnostic route: accept either scheme's credentials.
    pairs.push([process.env.PREVENT_VISA_API_USERNAME, process.env.PREVENT_VISA_API_PASSWORD]);
    pairs.push([process.env.PREVENT_MC_API_USERNAME, process.env.PREVENT_MC_API_PASSWORD]);
  }

  pairs.push([process.env.PREVENT_API_USERNAME, process.env.PREVENT_API_PASSWORD]);

  return pairs.filter((p): p is [string, string] => !!p[0] && !!p[1]);
}

/** Parse `Authorization: Basic <base64>` into a user/password pair. */
function parseBasic(headers: Headers): [string, string] | null {
  const header = headers.get("authorization") ?? headers.get("Authorization");
  if (!header) return null;

  const [scheme, encoded] = header.split(" ");
  if (!encoded || scheme?.toLowerCase() !== "basic") return null;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return null;
  }

  // Only the FIRST colon separates user from password — passwords may contain
  // colons, usernames may not (RFC 7617).
  const sep = decoded.indexOf(":");
  if (sep < 0) return null;
  return [decoded.slice(0, sep), decoded.slice(sep + 1)];
}

/**
 * Validate the Basic Auth header for a given scheme.
 *
 * Returns false when no credentials are configured, so a half-configured
 * deploy fails closed rather than accepting anonymous lookups.
 *
 * Pass `null` for routes that belong to neither scheme; either pair is then
 * accepted.
 */
export function isAuthorized(headers: Headers, scheme: PreventScheme | null = null): boolean {
  const candidates = credentialsFor(scheme);
  if (candidates.length === 0) return false;

  const parsed = parseBasic(headers);
  if (!parsed) return false;
  const [user, pass] = parsed;

  // Every candidate is evaluated, and both halves of each are compared
  // unconditionally: short-circuiting on a username mismatch would make a
  // wrong username measurably faster to reject than a wrong password.
  let ok = false;
  for (const [expectedUser, expectedPass] of candidates) {
    const userOk = safeEqual(user, expectedUser);
    const passOk = safeEqual(pass, expectedPass);
    ok = (userOk && passOk) || ok;
  }
  return ok;
}

/** 401 body shared by all Prevent routes. */
export const UNAUTHORIZED_BODY = { error: "Unauthorized" } as const;
