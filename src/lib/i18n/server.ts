import "server-only";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { ro } from "./dictionaries/ro";
import { pl } from "./dictionaries/pl";

const DICTIONARIES: Record<Locale, Dictionary> = {
  en,
  ro,
  pl,
};

/**
 * Reads the locale set by `src/middleware.ts` from request headers.
 * Falls back to DEFAULT_LOCALE if the header is missing (e.g. for
 * routes that bypass middleware, like API routes).
 */
export async function getLocale(): Promise<Locale> {
  const h = await headers();
  const fromHeader = h.get("x-locale");
  return isLocale(fromHeader) ? fromHeader : DEFAULT_LOCALE;
}

/** Returns the full dictionary for the current request's locale. */
export async function getDictionary(): Promise<Dictionary> {
  const locale = await getLocale();
  return DICTIONARIES[locale];
}

/**
 * Prefix `href` with `/{locale}` when the active locale isn't the
 * default. Use in any server component or server action that builds a
 * URL (Link href, redirect target, email link, etc.).
 */
export function localized(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  if (href.startsWith("http")) return href; // absolute — leave alone
  const clean = href.startsWith("/") ? href : `/${href}`;
  // Avoid double-prefixing
  if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

export type { Dictionary };
