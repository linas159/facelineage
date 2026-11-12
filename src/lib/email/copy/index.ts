import { DEFAULT_LOCALE, INTL_LOCALE, isLocale, type Locale } from "@/lib/i18n/config";
import { localeForCurrency } from "@/lib/stripe";
import { en, type EmailCopy } from "./en";
import { pl } from "./pl";
import { ro } from "./ro";
import { ua } from "./ua";

const COPY: Record<Locale, EmailCopy> = { en, pl, ro, ua, uk: en };

export function emailCopy(locale: Locale): EmailCopy {
  return COPY[locale];
}

/**
 * Language for billing emails not tied to one analysis (reminders, cancels).
 * `profiles.locale` defaults to 'en' for every account, so 'en' there can't be
 * told apart from "never set"; a non-default profile locale wins, otherwise
 * the billing currency decides (checkout picks the currency from the locale,
 * so English buyers pay USD and stay English).
 */
export function billingLocale(
  profileLocale: string | null | undefined,
  currency: string | null | undefined,
): Locale {
  if (isLocale(profileLocale) && profileLocale !== DEFAULT_LOCALE) return profileLocale;
  const fromCurrency = localeForCurrency(currency);
  return isLocale(fromCurrency) ? fromCurrency : DEFAULT_LOCALE;
}

/** "€9.99/month" in the email's language. Unknown intervals → bare amount. */
export function perInterval(amount: string, interval: string | null | undefined, locale: Locale): string {
  const tpl = interval ? (COPY[locale].perInterval as Record<string, string>)[interval] : undefined;
  return tpl ? tpl.replace("{amount}", amount) : amount;
}

/**
 * The exact instant money moves, in UTC — "August 18, 2026 at 6:07 PM UTC",
 * "18 sierpnia 2026 18:07 UTC".
 *
 * Billing copy must name the moment, not the day. A bare date leaves the
 * customer guessing which hour their cancellation window closes, and leaves us
 * with nothing precise to point at when the charge is disputed.
 */
export function formatChargeMoment(unixSeconds: number, locale: Locale = "en"): string {
  return new Date(unixSeconds * 1000).toLocaleString(INTL_LOCALE[locale], {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** A calendar date in UTC — matches `formatChargeMoment`'s clock. */
export function formatChargeDate(unixSeconds: number, locale: Locale = "en"): string {
  return new Date(unixSeconds * 1000).toLocaleDateString(INTL_LOCALE[locale], {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export type { EmailCopy };
