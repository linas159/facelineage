// scripts/wipe-stripe-test-transactions.mjs
//
// Refunds + cancels + deletes all TEST-MODE customers, subscriptions, and
// charges in your Stripe account. Leaves products and prices intact, so
// your STRIPE_PRICE_*/STRIPE_PRODUCT_* env vars keep working.
//
// Run:
//   node --env-file=.env.local scripts/wipe-stripe-test-transactions.mjs
//
// Refuses to run unless STRIPE_SECRET_KEY starts with `sk_test_`.

import Stripe from "stripe";

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error("✗ Missing STRIPE_SECRET_KEY in env.");
  process.exit(1);
}
if (!key.startsWith("sk_test_")) {
  console.error("✗ Refusing to run — STRIPE_SECRET_KEY is not a test key.");
  console.error("  This script is destructive and only runs against sk_test_*.");
  process.exit(1);
}

const stripe = new Stripe(key, { apiVersion: "2024-12-18.acacia" });

async function refundAllPaymentIntents() {
  let count = 0;
  for await (const pi of stripe.paymentIntents.list({ limit: 100 })) {
    if (pi.status !== "succeeded") continue;
    if (pi.amount_received === 0) continue;
    try {
      await stripe.refunds.create({ payment_intent: pi.id });
      count++;
      process.stdout.write(`  refunded ${pi.id}\r`);
    } catch (err) {
      // Most common: "charge already refunded" — fine, skip.
      if (!String(err).includes("already")) {
        console.warn(`  ! refund failed for ${pi.id}: ${err.message ?? err}`);
      }
    }
  }
  console.log(`\n✓ Refunded ${count} PaymentIntent(s).`);
}

async function cancelAllSubscriptions() {
  let count = 0;
  // `status: "all"` returns canceled too — skip those, cancel everything else.
  for await (const sub of stripe.subscriptions.list({ status: "all", limit: 100 })) {
    if (sub.status === "canceled") continue;
    try {
      await stripe.subscriptions.cancel(sub.id);
      count++;
      process.stdout.write(`  canceled ${sub.id}\r`);
    } catch (err) {
      console.warn(`  ! cancel failed for ${sub.id}: ${err.message ?? err}`);
    }
  }
  console.log(`\n✓ Canceled ${count} subscription(s).`);
}

async function deleteAllCustomers() {
  let count = 0;
  for await (const c of stripe.customers.list({ limit: 100 })) {
    try {
      await stripe.customers.del(c.id);
      count++;
      process.stdout.write(`  deleted ${c.id}\r`);
    } catch (err) {
      console.warn(`  ! delete failed for ${c.id}: ${err.message ?? err}`);
    }
  }
  console.log(`\n✓ Deleted ${count} customer(s).`);
}

console.log("Wiping Stripe TEST data (keeping products + prices)…\n");

console.log("→ Step 1/3: refunding succeeded PaymentIntents");
await refundAllPaymentIntents();

console.log("\n→ Step 2/3: canceling subscriptions");
await cancelAllSubscriptions();

console.log("\n→ Step 3/3: deleting customers");
await deleteAllCustomers();

console.log("\n✓ Done. Products and prices untouched.");
