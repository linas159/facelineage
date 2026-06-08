/**
 * Single source of truth for which languages the app supports.
 * To add a new locale: append it here, then add a matching dictionary in
 * `src/lib/i18n/dictionaries/`. Routes and links update automatically via
 * the helpers in `./server` and `./client`.
 *
 * URL convention: the DEFAULT_LOCALE has no prefix (e.g. /quiz/1). All
 * other locales are accessed under `/{locale}/...` (e.g. /ro/quiz/1).
 */
export const LOCALES = ["en", "ro", "pl"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const NON_DEFAULT_LOCALES: ReadonlyArray<Locale> = LOCALES.filter(
  (l) => l !== DEFAULT_LOCALE,
);

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ro: "Română",
  pl: "Polski",
};

export function isLocale(s: string | null | undefined): s is Locale {
  return !!s && (LOCALES as readonly string[]).includes(s);
}
