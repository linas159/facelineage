// scripts/test-prevent.mjs
//
// Exercises the Merchanto Prevent endpoints (Visa Order Insight + Mastercard
// Consumer Clarity) the same way Merchanto will: HTTPS POST, Basic Auth, no
// query parameters.
//
// By default it pulls a real, recent purchase out of Supabase and builds the
// lookup payloads from its actual identifiers — which is what the Merchanto
// "Check Flow" test needs, since that endpoint requires details of a genuine
// transaction from our system.
//
//   node --env-file=.env.local scripts/test-prevent.mjs
//   node --env-file=.env.local scripts/test-prevent.mjs --base https://facelineage.com
//   node --env-file=.env.local scripts/test-prevent.mjs --miss    # expect a not-found
//
// Checks, per scheme:
//   • 401 without credentials
//   • a matching lookup returns the expected status + body
//   • a deliberately unmatchable lookup degrades correctly
//     (Visa → HTTP 404, Mastercard → HTTP 200 + TRANSACTION_NOT_FOUND)
//   • round-trip stays under the scheme's 1000 ms budget

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};
const has = (name) => args.includes(`--${name}`);

const BASE = flag("base", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
  /\/$/,
  "",
);
const USER = process.env.PREVENT_API_USERNAME;
const PASS = process.env.PREVENT_API_PASSWORD;

if (!USER || !PASS) {
  console.error("✗ Missing PREVENT_API_USERNAME / PREVENT_API_PASSWORD");
  process.exit(1);
}

const authHeader = `Basic ${Buffer.from(`${USER}:${PASS}`).toString("base64")}`;

// ── Pick a transaction to look up ───────────────────────────────────────────

async function loadPurchase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("✗ Missing Supabase credentials — cannot pick a real transaction");
    process.exit(1);
  }
  const db = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await db
    .from("purchases")
    .select(
      "id, amount_cents, currency, authorized_at, created_at, card_last4, card_bin, auth_code, network_transaction_id, stripe_payment_intent",
    )
    .eq("status", "paid")
    .not("network_transaction_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("✗ Supabase query failed:", error.message);
    process.exit(1);
  }
  if (!data) {
    console.error(
      "✗ No purchase with a network_transaction_id yet.\n" +
        "  Evidence capture starts at the next payment — make one test purchase first.",
    );
    process.exit(1);
  }
  return data;
}

const uuid = () => crypto.randomUUID();

// ── Payload builders ────────────────────────────────────────────────────────

function visaPayload(p, { miss }) {
  return {
    // Visa never reuses an insightId — regenerate for every single test.
    insightId: uuid(),
    clientId: Number(process.env.PREVENT_VISA_CLIENT_ID ?? 9978),
    source: "OI",
    cardLast4: miss ? "0000" : (p.card_last4 ?? "4242"),
    cardBin: p.card_bin ?? undefined,
    paymentType: "VISA",
    transactionDate: new Date(p.authorized_at ?? p.created_at).toISOString(),
    transactionAmount: {
      amount: miss ? 999999 : p.amount_cents / 100,
      currency: (p.currency ?? "usd").toUpperCase(),
    },
    authCode: miss ? "000000" : (p.auth_code ?? undefined),
    transactionId: miss ? "000000000000000" : p.network_transaction_id,
    transactionType: "SALE",
    paymentDescriptor: process.env.PREVENT_STATEMENT_DESCRIPTOR ?? "FACELINEAGE",
    transactionRequestId: uuid(),
  };
}

function clarityPayload(p, { miss }) {
  return {
    requestReference: {
      originatorChannel: "DIGITAL",
      originatorId: uuid().replace(/-/g, ""),
      originatorDescription: "Test Issuer",
      correlationId: uuid().slice(0, 10),
      locale: "en-US",
    },
    searchCriteria: {
      paymentType: "MC",
      transactionIdentifierType: "BANKNET_REF_NUM",
      transactionIdentifierValue: miss ? "NOPE000000000" : p.network_transaction_id,
      transactionDateTime: new Date(p.authorized_at ?? p.created_at).toISOString(),
      cardLastFour: miss ? "0000" : (p.card_last4 ?? "4242"),
      cardFirstSix: p.card_bin ?? undefined,
      issuerAuthorizationCode: miss ? "000000" : (p.auth_code ?? undefined),
      transactionAmount: miss ? "9999.99" : (p.amount_cents / 100).toFixed(2),
      transactionCurrencyCode: (p.currency ?? "usd").toUpperCase(),
      merchantId: process.env.PREVENT_MC_MERCHANT_ID ?? undefined,
      cardAcceptorName: "Facelineage",
    },
  };
}

// ── Runner ──────────────────────────────────────────────────────────────────

let failures = 0;

async function post(path, body, { auth = true } = {}) {
  const startedAt = Date.now();
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(auth ? { authorization: authHeader } : {}),
    },
    body: JSON.stringify(body),
  });
  const ms = Date.now() - startedAt;
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json, ms };
}

function check(label, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${label}`);
  } else {
    failures++;
    console.log(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

function reportLatency(ms) {
  // Merchanto discards anything slower than this; the scheme scores it Timeout.
  const ok = ms < 1000;
  check(`responded in ${ms} ms (budget 1000 ms)`, ok, ok ? "" : "TOO SLOW");
}

const purchase = await loadPurchase();
const miss = has("miss");

console.log(`\n━━━ Merchanto Prevent — ${BASE} ━━━`);
console.log(`Using purchase ${purchase.id}`);
console.log(
  `  amount=${(purchase.amount_cents / 100).toFixed(2)} ${(purchase.currency ?? "usd").toUpperCase()}` +
    `  txnId=${purchase.network_transaction_id}  auth=${purchase.auth_code ?? "-"}  last4=${purchase.card_last4 ?? "-"}`,
);
if (miss) console.log("  mode: --miss (expecting a not-found result)\n");
else console.log("");

// ── Visa ────────────────────────────────────────────────────────────────────
console.log("Visa Order Insight  POST /api/prevent/visa/orders");
{
  const noAuth = await post("/api/prevent/visa/orders", visaPayload(purchase, { miss: false }), {
    auth: false,
  });
  check("rejects a request with no credentials (401)", noAuth.status === 401, `got ${noAuth.status}`);

  const res = await post("/api/prevent/visa/orders", visaPayload(purchase, { miss }));
  reportLatency(res.ms);
  if (miss) {
    check("unmatchable lookup returns 404", res.status === 404, `got ${res.status}`);
  } else {
    check("matched lookup returns 200", res.status === 200, `got ${res.status}`);
    const b = res.json ?? {};
    check(
      "receipt.productsPurchasedList[].productDescription present",
      !!b.receipt?.productsPurchasedList?.[0]?.productDescription,
    );
    check("merchantInformation.merchantName present", !!b.merchantInformation?.merchantName);
    check("merchantInformation.merchantUrl present", !!b.merchantInformation?.merchantUrl);
    check(
      "merchantInformation.merchantContactPhone present (Visa rejects without it)",
      !!b.merchantInformation?.merchantContactPhone,
    );
    check(
      "merchantInformation.storeDetails.storeName present",
      !!b.merchantInformation?.storeDetails?.storeName,
    );
    const ce = [
      b.customerInformation?.accountId,
      b.device?.deviceId,
      b.device?.ipAddress,
      b.device?.deviceFingerprint,
    ].filter(Boolean).length;
    check(
      `carries ${ce} of 4 Compelling Evidence identifiers (need 2)`,
      ce >= 2,
      "not CE eligible — Visa will never send a CE lookup for this transaction",
    );
    if (has("print")) console.log(JSON.stringify(b, null, 2));
  }
}

// ── Mastercard ──────────────────────────────────────────────────────────────
console.log("\nMastercard Clarity  POST /api/prevent/mastercard/orders");
{
  const noAuth = await post(
    "/api/prevent/mastercard/orders",
    clarityPayload(purchase, { miss: false }),
    { auth: false },
  );
  check("rejects a request with no credentials (401)", noAuth.status === 401, `got ${noAuth.status}`);

  const res = await post("/api/prevent/mastercard/orders", clarityPayload(purchase, { miss }));
  reportLatency(res.ms);
  // Clarity has no 404 — every outcome is a 200 carrying a responseStatus code.
  check("returns HTTP 200", res.status === 200, `got ${res.status}`);
  const b = res.json ?? {};
  if (miss) {
    check(
      "responseStatus.code is TRANSACTION_NOT_FOUND",
      b.responseStatus?.code === "TRANSACTION_NOT_FOUND",
      `got ${b.responseStatus?.code}`,
    );
  } else {
    check(
      "responseStatus.code is TRANSACTION_FOUND",
      b.responseStatus?.code === "TRANSACTION_FOUND",
      `got ${b.responseStatus?.code}`,
    );
    check("order.merchantOrderId present", !!b.order?.merchantOrderId);
    check(
      "order.orderDateTime is second-precision ISO (exactly 20 chars)",
      typeof b.order?.orderDateTime === "string" && b.order.orderDateTime.length === 20,
      `got "${b.order?.orderDateTime}"`,
    );
    check("order.subtotal / order.total present", !!b.order?.subtotal && !!b.order?.total);
    check("order.currencyCode present", !!b.order?.currencyCode);
    check("order.orderItems[0].productName present", !!b.order?.orderItems?.[0]?.productName);
    check(
      "subscription details present (drives the issuer's cancel controls)",
      !!b.order?.orderItems?.[0]?.recurring,
      "no recurring block — expected for one-off add-ons, not for a plan",
    );
    if (has("print")) console.log(JSON.stringify(b, null, 2));
  }
}

// ── Notifications ───────────────────────────────────────────────────────────
console.log("\nNotifications");
for (const scheme of ["visa", "mastercard"]) {
  const path = `/api/prevent/${scheme}/notifications`;
  const noAuth = await post(path, { caseId: uuid(), caseStatus: "new" }, { auth: false });
  check(`${scheme}: rejects a request with no credentials (401)`, noAuth.status === 401, `got ${noAuth.status}`);

  const res = await post(path, {
    caseId: uuid(),
    caseStatus: "new",
    caseDate: new Date().toISOString(),
    cardLast4: purchase.card_last4 ?? "4242",
    paymentType: scheme === "visa" ? "visa" : "masterCard",
    transactionDate: new Date(purchase.authorized_at ?? purchase.created_at).toISOString(),
    transactionAmount: {
      amount: purchase.amount_cents / 100,
      currency: (purchase.currency ?? "usd").toUpperCase(),
    },
    authCode: purchase.auth_code ?? undefined,
    transactionId: purchase.network_transaction_id,
    linkedTransactionId: uuid(),
    paymentDescriptor: process.env.PREVENT_STATEMENT_DESCRIPTOR ?? "FACELINEAGE",
  });
  check(`${scheme}: acknowledges with 200`, res.status === 200, `got ${res.status}`);
}

console.log(
  failures === 0
    ? "\n✓ All checks passed\n"
    : `\n✗ ${failures} check${failures === 1 ? "" : "s"} failed\n`,
);
process.exit(failures === 0 ? 0 : 1);
