"use client";

import { createContext, useContext, useMemo } from "react";
import Link from "next/link";
import type { ComponentProps } from "react";
import { DEFAULT_LOCALE, type Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";

interface I18nValue {
  locale: Locale;
  t: Dictionary;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  dict,
  children,
}: {
  locale: Locale;
  dict: Dictionary;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(() => ({ locale, t: dict }), [locale, dict]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** `const { t, locale } = useI18n();` then `t.landing.heroHeadline` etc. */
export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx)
    throw new Error("useI18n() called outside <I18nProvider>");
  return ctx;
}

/**
 * Locale-aware `<Link>`. Drop-in replacement for `next/link`.
 * Adds the active locale prefix to internal hrefs automatically.
 */
export function LLink({
  href,
  ...rest
}: ComponentProps<typeof Link>) {
  const { locale } = useI18n();
  const localized =
    typeof href === "string" ? localizeHref(href, locale) : href;
  return <Link href={localized} {...rest} />;
}

export function localizeHref(href: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE) return href;
  if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) {
    return href;
  }
  const clean = href.startsWith("/") ? href : `/${href}`;
  if (clean === `/${locale}` || clean.startsWith(`/${locale}/`)) return clean;
  return `/${locale}${clean === "/" ? "" : clean}`;
}

/**
 * Simple template-literal interpolation for translation strings that
 * contain `{var}` placeholders. Pass values keyed by name.
 *
 *   fmt(t.email.terms, { terms: "Terms", privacy: "Privacy Policy" })
 */
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}
