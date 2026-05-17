// scripts/list-stripe-products.mjs
//
// Auto-matches your Stripe products + prices to the env vars Facelineage
// needs, and prints them ready to paste into Vercel.
//
// Run with the LIVE key:
//   STRIPE_SECRET_KEY=sk_live_xxx node scripts/list-stripe-products.mjs
// Or .env.local (test mode):
//   node --env-file=.env.local scripts/list-stripe-products.mjs

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ Missing STRIPE_SECRET_KEY");
  process.exit(1);
}
const mode = key.startsWith("sk_live_") ? "LIVE" : "TEST";
const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });

console.log(`\n━━━ Stripe ${mode} mode ━━━\n`);

// 1. Pull every product + its prices
const products = [];
for await (const p of stripe.products.list({ active: true, limit: 100 })) {
  const prices = [];
  for await (const pr of stripe.prices.list({
    product: p.id,
    active: true,
    limit: 100,
  })) {
    prices.push(pr);
  }
  products.push({ ...p, prices });
}

if (products.length === 0) {
  console.error(
    "✗ No active products found in this mode. Did you run with the right key?",
  );
  console.error(`  Current key starts with: ${key.slice(0, 8)}…`);
  process.exit(1);
}

// 2. Helpers
const nameContains = (sub) => (p) =>
  (p.name ?? "").toLowerCase().includes(sub.toLowerCase());

function findRecurringPrice(productMatcher, interval) {
  for (const p of products.filter(productMatcher)) {
    for (const pr of p.prices) {
      if (pr.recurring?.interval === interval) {
        return { product: p, price: pr };
      }
    }
  }
  return null;
}

function findOneTimePrice(productMatcher, expectedCents) {
  for (const p of products.filter(productMatcher)) {
    for (const pr of p.prices) {
      if (!pr.recurring && pr.unit_amount === expectedCents) {
        return { product: p, price: pr };
      }
    }
  }
  // fall back to first one-time price under that product
  for (const p of products.filter(productMatcher)) {
    const pr = p.prices.find((x) => !x.recurring);
    if (pr) return { product: p, price: pr };
  }
  return null;
}

// 3. Resolve each env-var
const out = {};
const errors = [];

const week = findRecurringPrice(nameContains("3-Day"), "week")
  ?? findRecurringPrice(nameContains("Week"), "week")
  ?? findRecurringPrice(() => true, "week");
if (week) {
  out.STRIPE_PRICE_RECUR_WEEK = week.price.id;
  out.STRIPE_PRODUCT_WEEKLY   = week.product.id;
} else errors.push("Could not find a recurring/week price.");

const month = findRecurringPrice(nameContains("1-Month"), "month")
  ?? findRecurringPrice(nameContains("Month"), "month")
  ?? findRecurringPrice(() => true, "month");
if (month) {
  out.STRIPE_PRICE_RECUR_MONTH = month.price.id;
  out.STRIPE_PRODUCT_MONTHLY   = month.product.id;
} else errors.push("Could not find a recurring/month price.");

const upsells = [
  ["STRIPE_PRICE_UPSELL_PARENTS",   "Parent",          499],
  ["STRIPE_PRICE_UPSELL_ETHNICITY", "Heritage Mirror", 699],
  ["STRIPE_PRICE_UPSELL_AGES",      "Through The Ages", 699],
  ["STRIPE_PRICE_UPSELL_PARTNER",   "Future Partner",  699],
  ["STRIPE_PRICE_UPSELL_BOOK",      "Heritage Book",   999],
];
for (const [envVar, sub, cents] of upsells) {
  const hit = findOneTimePrice(nameContains(sub), cents);
  if (hit) out[envVar] = hit.price.id;
  else errors.push(`Could not find upsell price for "${sub}" (${envVar}).`);
}

// 4. Print result
console.log("━━━ Paste these into Vercel → Environment Variables ━━━\n");
for (const [k, v] of Object.entries(out)) {
  console.log(`${k}=${v}`);
}
console.log("");

if (errors.length) {
  console.log("━━━ Issues ━━━");
  for (const e of errors) console.log(`✗ ${e}`);
  console.log("\nFull product dump for reference:");
  for (const p of products) {
    console.log(`\n  ${p.name}  [${p.id}]`);
    for (const pr of p.prices) {
      const amt = pr.unit_amount != null ? `$${(pr.unit_amount / 100).toFixed(2)}` : "(custom)";
      const r = pr.recurring ? ` /${pr.recurring.interval}` : " one-time";
      console.log(`    ${pr.id}   ${amt} ${pr.currency.toUpperCase()}${r}`);
    }
  }
}

console.log("\n✓ Scope = Production (+ Preview if you want previews to use live). Redeploy after saving.\n");
