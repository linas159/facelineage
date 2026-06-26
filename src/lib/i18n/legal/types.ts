/**
 * Structured, localized content model for the legal/info pages (Privacy,
 * Terms, Cookies, Refunds, Contact).
 *
 * Content is authored as blocks. Paragraphs and list items accept a tiny
 * inline-markdown subset so translators can write natural sentences while the
 * renderer handles formatting + locale-aware links:
 *
 *   **bold**                  → <strong>bold</strong>
 *   [label](/refunds)         → locale-aware internal <Link> (gets /pl, /ro …)
 *   [label](mailto:a@b.com)   → <a href="mailto:…">
 *   [label](https://…)        → external <a target="_blank">
 *
 * Keep each block as one self-contained line/sentence so a translator never
 * has to reorder fragments across keys.
 */
export type LegalBlock =
  | { kind: "p"; text: string }
  | { kind: "h"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] }
  /** Highlighted callout for important legal notices (consent, withdrawal). */
  | { kind: "note"; text: string };

export type LegalSlug =
  | "privacy"
  | "terms"
  | "cookies"
  | "refunds"
  | "contact";

export interface LegalDoc {
  metaTitle: string;
  metaDescription: string;
  title: string;
  /** Pre-formatted, localized "last updated" date, e.g. "June 25, 2026". */
  lastUpdated: string;
  blocks: LegalBlock[];
}

/** Chrome strings shared by every legal page (header/footer of LegalShell). */
export interface LegalUi {
  home: string;
  lastUpdated: string;
  /** Text before the support email in the footer line, e.g. "Questions? Email". */
  questions: string;
}

export interface LegalContent {
  ui: LegalUi;
  privacy: LegalDoc;
  terms: LegalDoc;
  cookies: LegalDoc;
  refunds: LegalDoc;
  contact: LegalDoc;
}
