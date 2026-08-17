import "server-only";
import crypto from "node:crypto";

/**
 * HTTP Basic Auth for the Merchanto Prevent endpoints.
 *
 * Merchanto issues one credential pair per merchant and sends it on every
 * lookup and notification. These are the only unauthenticated-by-Supabase
 * routes in the app that accept arbitrary POST bodies, so the check is the
 * whole perimeter — it runs before we read the body.
 */

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
 * Validate the `Authorization: Basic <base64>` header against the configured
 * credentials. Returns false when credentials are unset, so a half-configured
 * deploy fails closed rather than accepting anonymous lookups.
 */
export function isAuthorized(headers: Headers): boolean {
  const expectedUser = process.env.PREVENT_API_USERNAME;
  const expectedPass = process.env.PREVENT_API_PASSWORD;
  if (!expectedUser || !expectedPass) return false;

  const header = headers.get("authorization") ?? headers.get("Authorization");
  if (!header) return false;

  const [scheme, encoded] = header.split(" ");
  if (!encoded || scheme?.toLowerCase() !== "basic") return false;

  let decoded: string;
  try {
    decoded = Buffer.from(encoded, "base64").toString("utf8");
  } catch {
    return false;
  }

  // Only the FIRST colon separates user from password — passwords may contain
  // colons, usernames may not (RFC 7617).
  const sep = decoded.indexOf(":");
  if (sep < 0) return false;
  const user = decoded.slice(0, sep);
  const pass = decoded.slice(sep + 1);

  // Evaluate both halves unconditionally — `&&` would short-circuit and turn
  // "wrong username" into a measurably faster response than "wrong password".
  const userOk = safeEqual(user, expectedUser);
  const passOk = safeEqual(pass, expectedPass);
  return userOk && passOk;
}

/** 401 body shared by all four Prevent routes. */
export const UNAUTHORIZED_BODY = { error: "Unauthorized" } as const;
