import "server-only";

/**
 * Static merchant identity returned on every Prevent lookup response.
 *
 * Both schemes show these values to the cardholder inside their bank's app,
 * so they have to match what the customer actually saw at purchase time —
 * the storefront name, the descriptor on their statement, and a support
 * channel they can reach. Anything recognizable here is a deflected dispute.
 *
 * Values that differ per environment (phone, descriptor, MCC) come from env
 * so staging can point at test data without a code change.
 */

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";

export const MERCHANT = {
  /** Corporate/legal entity — matches the company on our Terms + Privacy. */
  legalName: "Andromeda Entertainment, MB",
  /** Consumer-facing brand — this is what the cardholder remembers. */
  storeName: "Facelineage",
  corporateUrl: APP_URL,
  websiteUrl: APP_URL,
  supportEmail: "support@facelineage.com",
  /**
   * Visa requires `merchantInformation.merchantContactPhone` on every OI
   * response and rejects the payload without it. E.164, no spaces.
   */
  contactPhone: process.env.PREVENT_MERCHANT_PHONE ?? "",
  /**
   * The merchant-name component of the billing descriptor, exactly as it
   * appears on the statement. Configured in Stripe → Settings → Public details.
   */
  statementDescriptor: process.env.PREVENT_STATEMENT_DESCRIPTOR ?? "FACELINEAGE",
  /** ISO 18245 category assigned by the acquirer. Omitted when unset. */
  mcc: process.env.PREVENT_MERCHANT_MCC ?? "",
  address: {
    line1: "Žygio g. 5",
    city: "Vilnius",
    postalCode: "08234",
    /** ISO 3166-1 alpha-3 — Visa's Address object wants three letters. */
    countryAlpha3: "LTU",
    countryName: "Lithuania",
  },
  links: {
    terms: `${APP_URL}/terms`,
    refunds: `${APP_URL}/refunds`,
    privacy: `${APP_URL}/privacy`,
    account: `${APP_URL}/account`,
    contact: `${APP_URL}/contact`,
    logo: `${APP_URL}/facelineage-logo.png`,
  },
} as const;

/** Short policy summaries. Mastercard shows these verbatim to the cardholder. */
export const POLICY = {
  refundRecap:
    "Full refund within 30 days of your first purchase — email support@facelineage.com from the address on your account.",
  cancellationRecap:
    "Cancel any time from your account page or by email; cancelling stops all future renewals.",
  termsRecap:
    "Subscription renews automatically at the stated price until cancelled. Reports are generated on demand and delivered digitally.",
  customerServiceInstructions:
    "Email support@facelineage.com and include the last 4 digits of your card. We reply within one business day.",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Product catalog
// ────────────────────────────────────────────────────────────────────────────

export interface ProductInfo {
  /** ≤100 chars — Mastercard `orderItems[].productName`. */
  name: string;
  /** ≤100 chars — Visa `productsPurchasedList[].productDescription`. */
  description: string;
  /** Visa `productType` (≤20) / Mastercard `productType` (≤30). */
  type: string;
  url: string;
  /** True for the intro-fee SKUs, which start a recurring plan. */
  recurring: boolean;
}

/**
 * `purchases.product_sku` → what the cardholder should recognize.
 *
 * Descriptions are deliberately concrete ("AI ancestry report") rather than
 * internal SKU language: the whole point of Order Insight is that the person
 * reading it in their banking app says "oh, right, that".
 */
const CATALOG: Record<string, ProductInfo> = {
  sub_intro_3d: {
    name: "Facelineage Report — 3-Day Access",
    description: "Facelineage AI ancestry report, 3-day access then weekly plan",
    type: "Subscription",
    url: `${APP_URL}/report`,
    recurring: true,
  },
  sub_intro_7d: {
    name: "Facelineage Report — 7-Day Access",
    description: "Facelineage AI ancestry report, 7-day access then weekly plan",
    type: "Subscription",
    url: `${APP_URL}/report`,
    recurring: true,
  },
  sub_intro_1m: {
    name: "Facelineage Report — 1-Month Access",
    description: "Facelineage AI ancestry report, 1-month access then monthly plan",
    type: "Subscription",
    url: `${APP_URL}/report`,
    recurring: true,
  },
  upsell_v2_parents: {
    name: "Mom + Dad Breakdown",
    description: "Facelineage add-on: which features you inherited from each parent",
    type: "Online Access",
    url: `${APP_URL}/report`,
    recurring: false,
  },
  upsell_v2_ethnicity: {
    name: "Heritage Mirror",
    description: "Facelineage add-on: your portrait rendered across world cultures",
    type: "Online Access",
    url: `${APP_URL}/report`,
    recurring: false,
  },
  upsell_v2_ages: {
    name: "Through The Ages",
    description: "Facelineage add-on: AI portraits of you across historical eras",
    type: "Online Access",
    url: `${APP_URL}/report`,
    recurring: false,
  },
  upsell_v2_partner: {
    name: "Future Partner",
    description: "Facelineage add-on: an AI portrait of your likely future partner",
    type: "Online Access",
    url: `${APP_URL}/report`,
    recurring: false,
  },
  upsell_v2_book: {
    name: "The Heritage Guidebook",
    description: "Facelineage add-on: downloadable PDF guide to your ancestry",
    type: "Digital Good",
    url: `${APP_URL}/report`,
    recurring: false,
  },
};

const FALLBACK: ProductInfo = {
  name: "Facelineage Digital Report",
  description: "Facelineage AI ancestry report and digital add-ons",
  type: "Online Access",
  url: APP_URL,
  recurring: false,
};

export function productInfo(sku: string | null | undefined): ProductInfo {
  if (!sku) return FALLBACK;
  return CATALOG[sku] ?? FALLBACK;
}

// ────────────────────────────────────────────────────────────────────────────
// Config validation
// ────────────────────────────────────────────────────────────────────────────

/**
 * Returns human-readable problems with the Prevent configuration.
 *
 * A response that omits a scheme-mandatory field is scored *Invalid* by
 * Merchanto and never reaches the issuer — which looks identical to us not
 * answering at all. Surfacing this at request time means a misconfigured
 * deploy shows up in the logs rather than as a silent stream of lost cases.
 */
export function preventConfigIssues(): string[] {
  const issues: string[] = [];
  if (!process.env.PREVENT_API_USERNAME || !process.env.PREVENT_API_PASSWORD) {
    issues.push(
      "PREVENT_API_USERNAME / PREVENT_API_PASSWORD are unset — every lookup will be rejected with 401.",
    );
  }
  if (!MERCHANT.contactPhone) {
    issues.push(
      "PREVENT_MERCHANT_PHONE is unset — Visa requires merchantInformation.merchantContactPhone and will mark the response Invalid without it.",
    );
  } else if (!/^\+[1-9]\d{6,17}$/.test(MERCHANT.contactPhone)) {
    issues.push(
      `PREVENT_MERCHANT_PHONE ("${MERCHANT.contactPhone}") is not E.164 (e.g. +37052112233).`,
    );
  }
  return issues;
}
