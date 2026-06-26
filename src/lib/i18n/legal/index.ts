import type { Locale } from "../config";
import type { LegalContent } from "./types";
import { legalEn } from "./en";
import { legalPl } from "./pl";
import { legalRo } from "./ro";

const LEGAL: Record<Locale, LegalContent> = {
  en: legalEn,
  pl: legalPl,
  ro: legalRo,
};

/** Returns the full set of legal documents for the given locale. */
export function getLegal(locale: Locale): LegalContent {
  return LEGAL[locale];
}

export type { LegalContent, LegalDoc } from "./types";
