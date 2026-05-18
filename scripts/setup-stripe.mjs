// scripts/setup-stripe.mjs
//
// Creates Facelineage's Stripe products + multi-currency prices.
// Chained intro→recurring tiers can't be set up via the Stripe Dashboard UI;
// this script creates them via the API. Each Price holds USD + EUR + RON
// amounts via `currency_options` so we pass `currency` at checkout time and
// Stripe picks the matching amount.
//
// USAGE:
//   1. Put your STRIPE_SECRET_KEY into .env.local
//   2. node --env-file=.env.local scripts/setup-stripe.mjs
//   3. Copy the printed STRIPE_PRICE_* lines into your .env.local
//
// Idempotent: uses lookup_key on prices to avoid dupes across re-runs.
// Bump the *_LOOKUP keys below to force a fresh Price (existing
// subscriptions stay on the old Price ID — that's intentional).

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ Missing STRIPE_SECRET_KEY. Run with: node --env-file=.env.local scripts/setup-stripe.mjs");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });

// Currencies kept in sync with src/lib/stripe.ts SUPPORTED_CURRENCIES.
// USD is the default (`unit_amount` / `currency`); the rest live under
// `currency_options`.
const DEFAULT_CURRENCY = "usd";
const ALT_CURRENCIES = ["eur", "ron"];

// Only the recurring prices live in Stripe's catalog. The intro fee is
// charged via PaymentIntent at checkout time (amounts sourced from PLANS in
// lib/stripe.ts), so we don't need separate Stripe prices for it.
const SUBSCRIPTION_TIERS = [
  {
    name: "Facelineage Weekly",
    recurringLookup: "fl_recur_week_mc_v1",
    recurringInterval: "week",
    recurringNickname: "$24.99 / week (multi-currency)",
    amounts: { usd: 2499, eur: 2499, ron: 9900 },
  },
  {
    name: "Facelineage Monthly",
    recurringLookup: "fl_recur_month_mc_v1",
    recurringInterval: "month",
    recurringNickname: "$47.99 / month (multi-currency)",
    amounts: { usd: 4799, eur: 4799, ron: 18900 },
  },
];

// 5 add-ons offered post-payment (report + dashboard).
const UPSELLS = [
  { envKey: "STRIPE_PRICE_UPSELL_PARENTS",   name: "Facelineage: What Each Parent Gave You", lookup: "fl_upsell_parents_mc_v1",   amounts: { usd: 499, eur: 499, ron: 1900 } },
  { envKey: "STRIPE_PRICE_UPSELL_ETHNICITY", name: "Facelineage: Heritage Mirror",            lookup: "fl_upsell_ethnicity_mc_v1", amounts: { usd: 699, eur: 699, ron: 2700 } },
  { envKey: "STRIPE_PRICE_UPSELL_AGES",      name: "Facelineage: Through The Ages",           lookup: "fl_upsell_ages_mc_v1",      amounts: { usd: 699, eur: 699, ron: 2700 } },
  { envKey: "STRIPE_PRICE_UPSELL_PARTNER",   name: "Facelineage: Future Partner",             lookup: "fl_upsell_partner_mc_v1",   amounts: { usd: 699, eur: 699, ron: 2700 } },
  { envKey: "STRIPE_PRICE_UPSELL_BOOK",      name: "Facelineage: Heritage Book",              lookup: "fl_upsell_book_mc_v1",      amounts: { usd: 999, eur: 999, ron: 3900 } },
];

function buildCurrencyOptions(amounts) {
  const opts = {};
  for (const c of ALT_CURRENCIES) {
    if (amounts[c] == null) continue;
    opts[c] = { unit_amount: amounts[c] };
  }
  return opts;
}

async function findOrCreatePrice({ productName, lookup, nickname, amounts, recurring }) {
  // 1. Look for existing price by lookup_key
  const existing = await stripe.prices.list({
    lookup_keys: [lookup],
    expand: ["data.product", "data.currency_options"],
    limit: 1,
  });
  if (existing.data.length) {
    console.log(`  ↺  ${lookup}: reused ${existing.data[0].id}`);
    return existing.data[0];
  }

  // 2. Find or create the parent product
  const products = await stripe.products.search({ query: `name:'${productName.replace(/'/g, "\\'")}'`, limit: 1 });
  let product = products.data[0];
  if (!product) {
    product = await stripe.products.create({ name: productName });
    console.log(`  +  product: ${product.id} (${productName})`);
  }

  // 3. Create the price with currency_options
  const price = await stripe.prices.create({
    product: product.id,
    currency: DEFAULT_CURRENCY,
    unit_amount: amounts[DEFAULT_CURRENCY],
    currency_options: buildCurrencyOptions(amounts),
    nickname,
    lookup_key: lookup,
    ...(recurring ? { recurring } : {}),
  });
  const altSummary = ALT_CURRENCIES.map((c) => `${c}=${amounts[c]}`).join(" ");
  console.log(`  +  ${lookup}: ${price.id}  (usd=${amounts.usd} ${altSummary})`);
  return price;
}

async function main() {
  console.log("\n━━━ Recurring subscription prices ━━━");
  const envOut = {};

  for (const tier of SUBSCRIPTION_TIERS) {
    console.log(`\n${tier.name}`);
    const recurring = await findOrCreatePrice({
      productName: tier.name,
      lookup: tier.recurringLookup,
      nickname: tier.recurringNickname,
      amounts: tier.amounts,
      recurring: { interval: tier.recurringInterval },
    });
    if (tier.recurringInterval === "week") envOut.STRIPE_PRICE_RECUR_WEEK = recurring.id;
    if (tier.recurringInterval === "month") envOut.STRIPE_PRICE_RECUR_MONTH = recurring.id;

    // Also cache the product id so /api/checkout doesn't need a round-trip
    // to resolve it for add_invoice_items.price_data.
    const productId = typeof recurring.product === "string" ? recurring.product : recurring.product.id;
    if (tier.recurringInterval === "week") envOut.STRIPE_PRODUCT_WEEKLY = productId;
    if (tier.recurringInterval === "month") envOut.STRIPE_PRODUCT_MONTHLY = productId;
  }

  console.log("\n━━━ Upsells ━━━");
  for (const u of UPSELLS) {
    const price = await findOrCreatePrice({
      productName: u.name,
      lookup: u.lookup,
      nickname: u.name,
      amounts: u.amounts,
    });
    envOut[u.envKey] = price.id;
  }

  console.log("\n━━━ Paste these into .env.local ━━━\n");
  Object.entries(envOut).forEach(([k, v]) => console.log(`${k}=${v}`));
  console.log("\n✓ Done.\n");
}

main().catch((e) => {
  console.error("\n✗ Error:", e.message);
  process.exit(1);
});
