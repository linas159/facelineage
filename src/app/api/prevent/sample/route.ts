import { NextResponse } from "next/server";
import { isAuthorized, UNAUTHORIZED_BODY } from "@/lib/prevent/auth";
import { buildVisaResponse } from "@/lib/prevent/visa";
import { buildClarityResponse } from "@/lib/prevent/mastercard";
import type { PurchaseContext, PurchaseRecord } from "@/lib/prevent/lookup";

/**
 * GET /api/prevent/sample            — a fully-populated pair of responses
 * GET /api/prevent/sample?minimal    — the degraded shape for a legacy row
 *
 * Renders both scheme responses from a fixed fixture, with no database
 * involved. Two uses:
 *
 *  - Merchanto's Swagger has a "Check Response" endpoint that validates a
 *    pasted payload against the scheme rules. This produces exactly what our
 *    live endpoints emit, so it can be pasted straight in.
 *  - `?minimal` shows what a purchase made before evidence capture existed
 *    looks like — still valid, but with no Compelling Evidence identifiers.
 *
 * Behind the same Basic Auth as the live endpoints: nothing here is secret,
 * but an unauthenticated route that advertises the merchant configuration is
 * not worth the surface area.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const purchase: PurchaseRecord = {
  id: "3f2b1c8e-9a4d-4f6b-8c1e-2d5a7b9c0e11",
  user_id: "11111111-2222-3333-4444-555555555555",
  analysis_id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
  product_sku: "sub_intro_7d",
  stripe_payment_intent: "pi_3QabcdEfGhIjKlMn0oPqRsTu",
  amount_cents: 395,
  currency: "usd",
  status: "paid",
  created_at: "2026-05-02T11:04:19.412Z",
  fulfilled_at: "2026-05-02T11:04:25.900Z",
  card_brand: "visa",
  card_last4: "4242",
  card_bin: "424242",
  card_country: "LT",
  auth_code: "368525",
  network_transaction_id: "441111111111100",
  acquirer_reference_number: null,
  statement_descriptor: "FACELINEAGE",
  authorized_at: "2026-05-02T11:04:19.000Z",
  customer_email: "jonas.petraitis@example.com",
  client_ip: "203.0.113.42",
  client_user_agent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.2 Mobile/15E148 Safari/604.1",
  device_id: "9f2c6a1b4e8d0357a1c9e2f4b6d80a13",
  device_fingerprint: "0a1b2c3d4e5f60718293a4b5c6d7e8f901234567",
  refunded_amount_cents: 0,
  refunded_at: null,
};

const ctx: PurchaseContext = {
  purchaseCount: 3,
  totalSpentCents: 3193,
  firstPurchaseAt: "2025-11-14T09:22:00.000Z",
  accountCreatedAt: "2025-11-14T09:20:00.000Z",
  subscription: {
    status: "trialing",
    stripe_subscription_id: "sub_1QabcdEfGhIjKlMn",
    product_sku: "sub_intro_7d",
    current_period_start: "2026-05-02T11:04:19.000Z",
    current_period_end: "2026-05-09T11:04:19.000Z",
    cancel_at: null,
    canceled_at: null,
    created_at: "2026-05-02T11:04:18.000Z",
  },
  reportDelivered: true,
};

// Worst case: a legacy row from before evidence capture — no device, no IP,
// no email, no subscription, and a one-off add-on rather than a plan.
const minimalPurchase: PurchaseRecord = {
  ...purchase,
  product_sku: "upsell_v2_book",
  user_id: null,
  card_brand: null,
  card_last4: null,
  card_bin: null,
  auth_code: null,
  acquirer_reference_number: null,
  statement_descriptor: null,
  customer_email: null,
  client_ip: null,
  client_user_agent: null,
  device_id: null,
  device_fingerprint: null,
  refunded_amount_cents: 1799,
  refunded_at: "2026-05-10T08:00:00.000Z",
};

const minimalCtx: PurchaseContext = {
  purchaseCount: 1,
  totalSpentCents: 1799,
  firstPurchaseAt: null,
  accountCreatedAt: null,
  subscription: null,
  reportDelivered: false,
};

export async function GET(req: Request) {
  if (!isAuthorized(req.headers)) {
    return NextResponse.json(UNAUTHORIZED_BODY, { status: 401 });
  }
  const minimal = new URL(req.url).searchParams.has("minimal");
  const p = minimal ? minimalPurchase : purchase;
  const c = minimal ? minimalCtx : ctx;
  return NextResponse.json({
    visa: buildVisaResponse(p, c),
    mastercard: buildClarityResponse(p, c, "zebj8evpeo"),
  });
}
