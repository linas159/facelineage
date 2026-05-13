// scripts/setup-stripe.mjs
//
// Creates Facelineage's Stripe products + prices.
// Chained intro→recurring tiers can't be set up via the Stripe Dashboard UI;
// this script creates them via the API.
//
// USAGE:
//   1. Put your STRIPE_SECRET_KEY into .env.local
//   2. node --env-file=.env.local scripts/setup-stripe.mjs
//   3. Copy the printed STRIPE_PRICE_* lines into your .env.local
//
// This is idempotent at the product level (uses lookup_key on prices to avoid dupes
// across re-runs).

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ Missing STRIPE_SECRET_KEY. Run with: node --env-file=.env.local scripts/setup-stripe.mjs");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });

// Only the recurring prices live in Stripe's catalog. The intro fee is
// charged via PaymentIntent at checkout time (amount sourced from PLANS in
// lib/stripe.ts), so we don't need separate Stripe prices for it.
const SUBSCRIPTION_TIERS = [
  {
    name: "Facelineage Weekly",
    recurringLookup: "fl_recur_week_2499",
    recurringCents: 2499,
    recurringInterval: "week",
    recurringNickname: "$24.99 / week",
  },
  {
    name: "Facelineage Monthly",
    recurringLookup: "fl_recur_month_4799",
    recurringCents: 4799,
    recurringInterval: "month",
    recurringNickname: "$47.99 / month",
  },
];

// 5 add-ons offered post-payment (report + dashboard).
const UPSELLS = [
  { envKey: "STRIPE_PRICE_UPSELL_PARENTS",   name: "Facelineage: What Each Parent Gave You", lookup: "fl_upsell_parents_v2",   cents: 499 },
  { envKey: "STRIPE_PRICE_UPSELL_ETHNICITY", name: "Facelineage: Heritage Mirror",            lookup: "fl_upsell_ethnicity_v1", cents: 699 },
  { envKey: "STRIPE_PRICE_UPSELL_AGES",      name: "Facelineage: Through The Ages",           lookup: "fl_upsell_ages_v2",      cents: 699 },
  { envKey: "STRIPE_PRICE_UPSELL_PARTNER",   name: "Facelineage: Future Partner",             lookup: "fl_upsell_partner_v1",   cents: 699 },
  { envKey: "STRIPE_PRICE_UPSELL_BOOK",      name: "Facelineage: Heritage Book",              lookup: "fl_upsell_book_v2",      cents: 999 },
];

async function findOrCreatePrice({ productName, lookup, nickname, cents, recurring }) {
  // 1. Look for existing price by lookup_key
  const existing = await stripe.prices.list({ lookup_keys: [lookup], expand: ["data.product"], limit: 1 });
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

  // 3. Create the price
  const price = await stripe.prices.create({
    product: product.id,
    currency: "usd",
    unit_amount: cents,
    nickname,
    lookup_key: lookup,
    ...(recurring ? { recurring } : {}),
  });
  console.log(`  +  ${lookup}: ${price.id}  (${nickname})`);
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
      cents: tier.recurringCents,
      recurring: { interval: tier.recurringInterval },
    });
    if (tier.recurringInterval === "week") envOut.STRIPE_PRICE_RECUR_WEEK = recurring.id;
    if (tier.recurringInterval === "month") envOut.STRIPE_PRICE_RECUR_MONTH = recurring.id;
  }

  console.log("\n━━━ Upsells ━━━");
  for (const u of UPSELLS) {
    const price = await findOrCreatePrice({
      productName: u.name,
      lookup: u.lookup,
      nickname: u.name,
      cents: u.cents,
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
