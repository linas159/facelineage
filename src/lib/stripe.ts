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
 * Price), so only recurring + upsell prices live in Stripe's catalog.
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

/** Plan metadata — used by the UI. Source of truth for the chained pricing. */
export const PLANS = {
  sub_intro_3d: {
    label: "3-Day Access",
    introCents: 195,
    introDays: 3,
    recurringCents: 2499,
    recurringInterval: "week" as const,
    introPrice: "$1.95",
    recurringPrice: "$24.99",
    recurringPeriod: "week",
    introPeriod: "3 days",
  },
  sub_intro_7d: {
    label: "7-Day Access",
    introCents: 699,
    introDays: 7,
    recurringCents: 2499,
    recurringInterval: "week" as const,
    introPrice: "$6.99",
    recurringPrice: "$24.99",
    recurringPeriod: "week",
    introPeriod: "7 days",
  },
  sub_intro_1m: {
    label: "1-Month Access",
    introCents: 1799,
    introDays: 30,
    recurringCents: 4799,
    recurringInterval: "month" as const,
    introPrice: "$17.99",
    recurringPrice: "$47.99",
    recurringPeriod: "month",
    introPeriod: "1 month",
  },
} as const;

export type PlanKey = keyof typeof PLANS;

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
