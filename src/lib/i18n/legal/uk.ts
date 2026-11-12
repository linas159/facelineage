import { legalEn } from "./en";
import type { LegalBlock, LegalContent, LegalDoc } from "./types";

/** USD price examples in the English legal copy → their GBP counterparts
 *  (see `PLANS` in `src/lib/stripe.ts`). */
const GBP_EXAMPLES: ReadonlyArray<[string, string]> = [
  ["$1.95", "£1.49"],
  ["$47.99", "£37.99"],
];

function toGbp(text: string): string {
  return GBP_EXAMPLES.reduce((s, [usd, gbp]) => s.split(usd).join(gbp), text);
}

function mapBlock(b: LegalBlock): LegalBlock {
  return b.kind === "ul" ? { ...b, items: b.items.map(toGbp) } : { ...b, text: toGbp(b.text) };
}

function mapDoc(doc: LegalDoc): LegalDoc {
  return { ...doc, blocks: doc.blocks.map(mapBlock) };
}

/** UK market: the English legal pages with price examples in GBP. */
export const legalUk: LegalContent = {
  ui: legalEn.ui,
  privacy: mapDoc(legalEn.privacy),
  terms: mapDoc(legalEn.terms),
  cookies: mapDoc(legalEn.cookies),
  refunds: mapDoc(legalEn.refunds),
  contact: mapDoc(legalEn.contact),
};
