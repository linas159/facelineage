// scripts/setup-stripe.mjs
//
// Creates Facelineage's Stripe products + multi-currency prices.
// Chained intro→recurring tiers can't be set up via the Stripe Dashboard UI;
// this script creates them via the API. Each Price holds USD + EUR + RON + PLN + UAH
// amounts via `currency_options` so we pass `currency` at checkout time and
// Stripe picks the matching amount.
//
// USAGE:
//   1. Put your STRIPE_SECRET_KEY into .env.local
//   2. node --env-file=.env.local scripts/setup-stripe.mjs
//   3. Copy the printed STRIPE_PRICE_* lines into your .env.local
//
// Idempotent: uses lookup_key on prices to avoid dupes across re-runs.
// Reused prices get any currency missing from their `currency_options`
// backfilled in place (e.g. after adding a new locale), so price IDs and
// env vars don't change. Pass --dry-run to only report what would change.
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
const ALT_CURRENCIES = ["eur", "ron", "pln", "uah"];

// Only the recurring prices live in Stripe's catalog. The intro fee is
// charged via PaymentIntent at checkout time (amounts sourced from PLANS in
// lib/stripe.ts), so we don't need separate Stripe prices for it.
const SUBSCRIPTION_TIERS = [
  {
    name: "Facelineage Weekly",
    recurringLookup: "fl_recur_week_mc_v2",
    recurringInterval: "week",
    recurringNickname: "$24.99 / week (multi-currency)",
    amounts: { usd: 2499, eur: 2499, ron: 9900, pln: 9999, uah: 99900 },
  },
  {
    name: "Facelineage Monthly",
    recurringLookup: "fl_recur_month_mc_v2",
    recurringInterval: "month",
    recurringNickname: "$47.99 / month (multi-currency)",
    amounts: { usd: 4799, eur: 4799, ron: 18900, pln: 19199, uah: 199900 },
  },
];

// 5 add-ons offered post-payment (report + dashboard).
const UPSELLS = [
  { envKey: "STRIPE_PRICE_UPSELL_PARENTS",   name: "Facelineage: What Each Parent Gave You", lookup: "fl_upsell_parents_mc_v2",   amounts: { usd: 499, eur: 499, ron: 1900, pln: 1999, uah: 19900 } },
  { envKey: "STRIPE_PRICE_UPSELL_ETHNICITY", name: "Facelineage: Heritage Mirror",            lookup: "fl_upsell_ethnicity_mc_v2", amounts: { usd: 699, eur: 699, ron: 2700, pln: 2799, uah: 29900 } },
  { envKey: "STRIPE_PRICE_UPSELL_AGES",      name: "Facelineage: Through The Ages",           lookup: "fl_upsell_ages_mc_v2",      amounts: { usd: 699, eur: 699, ron: 2700, pln: 2799, uah: 29900 } },
  { envKey: "STRIPE_PRICE_UPSELL_PARTNER",   name: "Facelineage: Future Partner",             lookup: "fl_upsell_partner_mc_v2",   amounts: { usd: 699, eur: 699, ron: 2700, pln: 2799, uah: 29900 } },
  { envKey: "STRIPE_PRICE_UPSELL_BOOK",      name: "Facelineage: Heritage Book",              lookup: "fl_upsell_book_mc_v2",      amounts: { usd: 999, eur: 999, ron: 3900, pln: 3999, uah: 39900 } },
];

function buildCurrencyOptions(amounts) {
  const opts = {};
  for (const c of ALT_CURRENCIES) {
    if (amounts[c] == null) continue;
    opts[c] = { unit_amount: amounts[c] };
  }
  return opts;
}

const DRY_RUN = process.argv.includes("--dry-run");

/** Add any ALT_CURRENCIES missing from an existing price's currency_options.
 * Currencies already present are left untouched (never re-priced here). */
async function backfillCurrencyOptions(price, amounts) {
  const have = price.currency_options ?? {};
  const missing = ALT_CURRENCIES.filter((c) => !have[c] && amounts[c] != null);
  if (!missing.length) return price;
  const summary = missing.map((c) => `${c}=${amounts[c]}`).join(" ");
  if (DRY_RUN) {
    console.log(`     would add ${summary}`);
    return price;
  }
  // Re-send existing amounts verbatim so the update can't drop them whether
  // Stripe merges or replaces the map.
  const currency_options = {};
  for (const [c, opt] of Object.entries(have)) {
    if (c !== price.currency && opt.unit_amount != null) currency_options[c] = { unit_amount: opt.unit_amount };
  }
  for (const c of missing) currency_options[c] = { unit_amount: amounts[c] };
  const updated = await stripe.prices.update(price.id, {
    currency_options,
    expand: ["product", "currency_options"],
  });
  console.log(`     added ${summary}`);
  return updated;
}

async function findOrCreatePrice({ productName, lookup, nickname, amounts, recurring }) {
  // 1. Look for existing price by lookup_key
  const existing = await stripe.prices.list({
    lookup_keys: [lookup],
    expand: ["data.product", "data.currency_options"],
    limit: 1,
  });
  if (existing.data.length) {
    const price = existing.data[0];
    console.log(`  ↺  ${lookup}: reused ${price.id}`);
    return backfillCurrencyOptions(price, amounts);
  }

  if (DRY_RUN) {
    console.log(`  +  ${lookup}: would create`);
    return { id: "(dry-run)", product: "(dry-run)" };
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
