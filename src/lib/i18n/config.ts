/**
 * Single source of truth for which languages the app supports.
 * To add a new locale: append it here and fill in every `Record<Locale, …>`
 * below (TypeScript flags the gaps), then add:
 *   - a dictionary in `src/lib/i18n/dictionaries/` (+ register in `./server`)
 *   - legal pages in `src/lib/i18n/legal/`
 *   - a checkout currency in `LOCALE_TO_CURRENCY` (`src/lib/stripe.ts`)
 *   - transactional email copy in `src/lib/email/copy/` (+ register in its `index.ts`)
 *   - glyph coverage in the PDF font (`src/lib/pdf/fonts/`, Noto Sans covers
 *     Latin/Latin-Ext/Cyrillic/Greek; other scripts need another font)
 * Routes and links update automatically via the helpers in `./server` and
 * `./client`; the AI writes reports in `AI_LANGUAGE_NAME[locale]`.
 *
 * `uk` is the United Kingdom market, not a language: it's the English site
 * (English dictionary/emails/report language, US-style formatting) with
 * prices in GBP and slightly different legal price examples. Don't confuse it
 * with Ukrainian, whose URL prefix is `ua` (HTML lang `uk`).
 *
 * URL convention: the DEFAULT_LOCALE has no prefix (e.g. /quiz/1). All
 * other locales are accessed under `/{locale}/...` (e.g. /ro/quiz/1).
 */
export const LOCALES = ["en", "ro", "pl", "ua", "uk"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const NON_DEFAULT_LOCALES: ReadonlyArray<Locale> = LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE,
);

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ro: "Română",
  pl: "Polski",
  ua: "Українська",
  uk: "English (UK)",
};

/**
 * BCP-47 language tag per locale, for `<html lang>`. Differs from the URL
 * prefix for Ukrainian: `/ua` is the user-facing prefix, `uk` is the ISO
 * 639-1 language code browsers and screen readers expect.
 */
export const HTML_LANG: Record<Locale, string> = {
  en: "en",
  ro: "ro",
  pl: "pl",
  ua: "uk",
  uk: "en",
};

/** BCP-47 tag for `Intl` date/number formatting per locale. */
export const INTL_LOCALE: Record<Locale, string> = {
  en: "en-US",
  ro: "ro-RO",
  pl: "pl-PL",
  ua: "uk-UA",
  uk: "en-US",
};

/**
 * Language name the AI is told to write the report in. English names, since
 * the analysis prompt itself is English.
 */
export const AI_LANGUAGE_NAME: Record<Locale, string> = {
  en: "English",
  ro: "Romanian",
  pl: "Polish",
  ua: "Ukrainian",
  uk: "English",
};

/** Format a date for display in `locale`, e.g. "12 listopada 2026". */
export function formatDate(
  date: Date | string | number,
  locale: Locale,
  opts: Intl.DateTimeFormatOptions = { year: "numeric", month: "long", day: "numeric" },
): string {
  return new Date(date).toLocaleDateString(INTL_LOCALE[locale], opts);
}

export function isLocale(s: string | null | undefined): s is Locale {
  return !!s && (LOCALES as readonly string[]).includes(s);
}
