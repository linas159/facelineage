import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  // Don't throw at import — allow build without keys. Server actions check at runtime.
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      // Pin API version so behavior is stable.
      apiVersion: "2024-12-18.acacia" as Stripe.LatestApiVersion,
      typescript: true,
    })
  : (null as unknown as Stripe);

/**
 * Map of internal SKU → env var holding the Stripe price ID.
 *
 * Note: the intro fee is charged via a one-time PaymentIntent (not a Stripe
 * Price), so only recurring + upsell prices live in Stripe's catalog. The
 * recurring/upsell Prices each hold all supported currencies via Stripe's
 * `currency_options` field — we pass `currency` at checkout time.
 */
export const PRICE_ENV = {
  recur_week: "STRIPE_PRICE_RECUR_WEEK",
  recur_month: "STRIPE_PRICE_RECUR_MONTH",
  upsell_v2_parents: "STRIPE_PRICE_UPSELL_PARENTS",
  upsell_v2_ethnicity: "STRIPE_PRICE_UPSELL_ETHNICITY",
  upsell_v2_ages: "STRIPE_PRICE_UPSELL_AGES",
  upsell_v2_partner: "STRIPE_PRICE_UPSELL_PARTNER",
  upsell_v2_book: "STRIPE_PRICE_UPSELL_BOOK",
} as const;

export type PriceSku = keyof typeof PRICE_ENV;

export function priceIdFor(sku: PriceSku): string {
  const envName = PRICE_ENV[sku];
  const id = process.env[envName];
  if (!id) throw new Error(`Missing env ${envName} for sku ${sku}`);
  return id;
}

/** UI key (in upsell-sections.tsx) → SKU. Keep in sync with UpsellId. */
export const UPSELL_SKU_BY_UI_ID = {
  parents: "upsell_v2_parents",
  ethnicity: "upsell_v2_ethnicity",
  ages: "upsell_v2_ages",
  partner: "upsell_v2_partner",
  book: "upsell_v2_book",
} as const satisfies Record<string, PriceSku>;

// ────────────────────────────────────────────────────────────────────────────
// Currency / locale handling
// ────────────────────────────────────────────────────────────────────────────

export const SUPPORTED_CURRENCIES = ["usd", "eur", "ron"] as const;
export type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: Currency = "usd";

export function isCurrency(s: string | null | undefined): s is Currency {
  return !!s && (SUPPORTED_CURRENCIES as readonly string[]).includes(s.toLowerCase());
}

/** Map locale → checkout currency. New locales: add a row here.
 * Note: Romania uses EUR here (not RON) because PayPal + Link don't
 * support RON. Card + Apple/Google Pay work in any currency, but losing
 * PayPal/Link narrows checkout options too much. EUR is widely accepted
 * in Romania for digital products. */
const LOCALE_TO_CURRENCY: Record<string, Currency> = {
  en: "usd",
  ro: "eur",
};

export function pickCurrency(locale: string | null | undefined): Currency {
  if (!locale) return DEFAULT_CURRENCY;
  return LOCALE_TO_CURRENCY[locale] ?? DEFAULT_CURRENCY;
}

/** Intl.NumberFormat locale to use for each app locale. */
const LOCALE_FOR_INTL: Record<string, string> = {
  en: "en-US",
  ro: "ro-RO",
};

/**
 * Format a minor-unit amount as a localized currency string. Drops the
 * decimal part when the amount is a whole major unit — so RON 27 renders
 * as "27 RON" instead of "27,00 RON", while USD 195 stays "$1.95".
 */
export function formatPrice(
  cents: number,
  currency: Currency,
  locale: string = "en",
): string {
  const intlLocale = LOCALE_FOR_INTL[locale] ?? "en-US";
  const fractionDigits = cents % 100 === 0 ? 0 : 2;
  return new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

/**
 * Read the correct amount off a Stripe Price for the requested currency.
 * Falls back to the default `unit_amount` if `currency_options` doesn't
 * carry the target currency (defensive — shouldn't happen for prices
 * created by `scripts/setup-stripe.mjs`).
 */
export function priceAmountFor(price: Stripe.Price, currency: Currency): number {
  if (price.currency === currency) return price.unit_amount ?? 0;
  return (
    price.currency_options?.[currency]?.unit_amount ?? price.unit_amount ?? 0
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Plan catalog
// ────────────────────────────────────────────────────────────────────────────

type Amounts = Record<Currency, number>;

/** Plan metadata — used by the UI + server. Holds amounts in every supported
 * currency. The intro fee is charged via a one-time PaymentIntent so its
 * amounts live here (not in Stripe's catalog). The recurring amounts mirror
 * the Stripe Price's `currency_options` for the matching SKU. */
export const PLANS = {
  sub_intro_3d: {
    labelKey: "planLabel3d" as const,
    introDays: 3,
    introPeriod: "3 days",
    recurringInterval: "week" as const,
    recurringPeriod: "week",
    intro: { usd: 195, eur: 195, ron: 750 } satisfies Amounts,
    recurring: { usd: 2499, eur: 2499, ron: 9900 } satisfies Amounts,
    original: { usd: 995, eur: 995, ron: 3900 } satisfies Amounts,
  },
  sub_intro_7d: {
    labelKey: "planLabel7d" as const,
    introDays: 7,
    introPeriod: "7 days",
    recurringInterval: "week" as const,
    recurringPeriod: "week",
    intro: { usd: 395, eur: 395, ron: 1500 } satisfies Amounts,
    recurring: { usd: 2499, eur: 2499, ron: 9900 } satisfies Amounts,
    original: { usd: 1299, eur: 1299, ron: 4900 } satisfies Amounts,
  },
  sub_intro_1m: {
    labelKey: "planLabel1m" as const,
    introDays: 30,
    introPeriod: "1 month",
    recurringInterval: "month" as const,
    recurringPeriod: "month",
    intro: { usd: 1395, eur: 1395, ron: 5500 } satisfies Amounts,
    recurring: { usd: 4799, eur: 4799, ron: 18900 } satisfies Amounts,
    original: { usd: 3999, eur: 3999, ron: 15900 } satisfies Amounts,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

/** Strikethrough "was" prices for upsells — UI-only marketing, not in Stripe. */
export const UPSELL_ORIGINAL: Record<PriceSku, Amounts | null> = {
  recur_week: null,
  recur_month: null,
  upsell_v2_parents: { usd: 899, eur: 899, ron: 3500 },
  upsell_v2_ethnicity: { usd: 1299, eur: 1299, ron: 4900 },
  upsell_v2_ages: { usd: 1299, eur: 1299, ron: 4900 },
  upsell_v2_partner: { usd: 1299, eur: 1299, ron: 4900 },
  upsell_v2_book: { usd: 1799, eur: 1799, ron: 6900 },
};

/**
 * Resolve the customer's email from a Stripe PaymentMethod + PaymentIntent.
 * Different payment method types stash the email in different places:
 *   - card:     billing_details.email (we collect it in the form)
 *   - paypal:   paypal.payer_email    (PayPal returns it after authorization)
 *   - link:     link.email
 *   - wallets:  billing_details.email (auto-filled by Apple/Google Pay)
 * Falls back to pi.receipt_email if all PM fields are blank.
 */
export function resolveCustomerEmail(
  pm: import("stripe").Stripe.PaymentMethod,
  pi?: import("stripe").Stripe.PaymentIntent | null,
): string | undefined {
  const billing = pm.billing_details?.email ?? undefined;
  if (billing) return billing;
  const paypal = pm.paypal?.payer_email ?? undefined;
  if (paypal) return paypal;
  const link = pm.link?.email ?? undefined;
  if (link) return link;
  return pi?.receipt_email ?? undefined;
}
