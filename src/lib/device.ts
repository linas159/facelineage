/**
 * Persistent device identifiers for card-scheme dispute prevention.
 *
 * Visa's Compelling Evidence rules need at least two of four persistent
 * identifiers on the Order Insight response — account id, IP address, device
 * id, device fingerprint — before Visa will send a CE lookup at all. The
 * server sees the IP and the account email on its own; these two have to come
 * from the browser, and they have to be captured at payment time because
 * there is no way to reconstruct them from a Stripe Charge afterwards.
 *
 * Both are sent to /api/checkout and stored on the purchase.
 */

const DEVICE_ID_KEY = "fl_device_id";

/**
 * A stable, opaque id for this browser profile.
 *
 * Visa requires at least 15 characters, unhashed and unique; 32 hex chars
 * satisfies that and stays inside Mastercard's tighter 40-char cap. It is a
 * random value with no personal data in it, minted once and reused.
 */
export function getDeviceId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 15) return existing;

    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    // Private mode / storage disabled. The fingerprint and the server-side
    // IP still carry the CE requirement.
    return undefined;
  }
}

/**
 * A hash of stable device attributes.
 *
 * Visa wants a fingerprint of at least 20 characters and at most 45, built
 * from a combination of device attributes, and explicitly allows it to be
 * hashed — so we hash and keep 40 hex chars, which fits both schemes' limits.
 *
 * Only coarse, non-identifying attributes go in. Anything that varies between
 * two visits from the same device (window size, scroll state) would break the
 * comparison the scheme performs, so those are deliberately excluded.
 */
export async function getDeviceFingerprint(): Promise<string | undefined> {
  if (typeof window === "undefined") return undefined;
  try {
    const nav = window.navigator;
    const parts = [
      nav.userAgent,
      nav.language,
      (nav.languages ?? []).join(","),
      String(nav.hardwareConcurrency ?? ""),
      String((nav as Navigator & { deviceMemory?: number }).deviceMemory ?? ""),
      // Screen dimensions, not window dimensions — the window is resizable.
      `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
      String(window.devicePixelRatio ?? ""),
      Intl.DateTimeFormat().resolvedOptions().timeZone ?? "",
      String(new Date().getTimezoneOffset()),
    ].join("|");

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(parts));
    const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
    return hex.slice(0, 40);
  } catch {
    // crypto.subtle needs a secure context; on http:// dev origins it is absent.
    return undefined;
  }
}

export interface DeviceContext {
  deviceId?: string;
  deviceFingerprint?: string;
}

/** Both identifiers together, for the checkout request body. */
export async function getDeviceContext(): Promise<DeviceContext> {
  const [deviceId, deviceFingerprint] = await Promise.all([
    Promise.resolve(getDeviceId()),
    getDeviceFingerprint(),
  ]);
  return { deviceId, deviceFingerprint };
}
