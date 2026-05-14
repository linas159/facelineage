// scripts/print-product-ids.mjs
//
// Resolves your existing recurring prices into their parent Product IDs
// and prints two env-var lines ready to paste into Vercel / .env.local.
// Run:
//   node --env-file=.env.local scripts/print-product-ids.mjs

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ Missing STRIPE_SECRET_KEY in env.");
  process.exit(1);
}
const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });

async function product(priceEnvName) {
  const priceId = process.env[priceEnvName];
  if (!priceId) {
    console.error(`✗ ${priceEnvName} not set.`);
    return null;
  }
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  return typeof price.product === "string" ? price.product : price.product.id;
}

const weekly = await product("STRIPE_PRICE_RECUR_WEEK");
const monthly = await product("STRIPE_PRICE_RECUR_MONTH");

console.log("\n━━━ Paste these into Vercel → Environment Variables ━━━\n");
if (weekly) console.log(`STRIPE_PRODUCT_WEEKLY=${weekly}`);
if (monthly) console.log(`STRIPE_PRODUCT_MONTHLY=${monthly}`);
console.log("\n✓ Done. Scope = Production + Preview; redeploy after saving.\n");
