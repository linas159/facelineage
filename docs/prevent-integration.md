# Merchanto Prevent — Visa Order Insight & Mastercard Consumer Clarity

Real-time dispute prevention. When a cardholder questions a charge in their
bank's app or on the phone, the issuer asks Visa/Mastercard, who ask Merchanto,
who ask us — and we have under a second to say what the purchase was. A good
answer resolves the inquiry in the banking app; a missing or late one becomes a
chargeback.

Spec: <https://admin.merchanto.org/docs/prevent/overview>

## Endpoints

All four take `POST`, require HTTPS, take no query parameters, and are guarded
by HTTP Basic Auth using `PREVENT_API_USERNAME` / `PREVENT_API_PASSWORD`.

| Endpoint | Purpose |
| --- | --- |
| `/api/prevent/visa/orders` | Visa OI / OID / CE lookups |
| `/api/prevent/mastercard/orders` | Mastercard Clarity lookups (all channels) |
| `/api/prevent/visa/notifications` | Visa case-status webhooks |
| `/api/prevent/mastercard/notifications` | Mastercard case-status webhooks |
| `/api/prevent/sample` | Not for Merchanto — renders a canonical response pair for pasting into their Swagger validator. `?minimal` shows the degraded shape. |

### Status codes differ between the schemes

Visa uses HTTP status to carry the outcome — `200` matched, `404` no match *or*
ambiguous, `400` bad request, `401` auth, `500` failure.

Mastercard has **no 404**. Every lookup outcome is an HTTP `200` whose
`responseStatus.code` is `TRANSACTION_FOUND`, `TRANSACTION_NOT_FOUND` or
`MULTIPLE_TRANSACTIONS_FOUND`. 4xx/5xx there mean auth, malformed request, or
our own failure, and Merchanto scores all of those as *Failed*.

## Environment

```
PREVENT_API_USERNAME          # issued by Merchanto
PREVENT_API_PASSWORD          # issued by Merchanto
PREVENT_MERCHANT_PHONE        # E.164, e.g. +37052112233 — REQUIRED by Visa
PREVENT_STATEMENT_DESCRIPTOR  # exactly as it appears on the statement
PREVENT_MERCHANT_MCC          # ISO 18245 code from the acquirer; omitted if blank
```

`PREVENT_MERCHANT_PHONE` is not optional. Visa marks any Order Insight response
without `merchantInformation.merchantContactPhone` as *Invalid*, and an Invalid
response is never forwarded to the issuer — from the scheme's point of view the
case went unanswered. `preventConfigIssues()` logs an error on every request
while it is unset.

### Where each value comes from

Only the credentials come from Merchanto. The descriptor and MCC come from
**Stripe**, our acquirer — and both must match what Stripe actually sends to
the network, not what we would like them to be. A descriptor that differs from
the one on the cardholder's statement defeats the point of the response: they
are looking for the string they don't recognize, and we would be showing them
a different one.

Read the live values straight off the account:

```bash
STRIPE_SECRET_KEY=sk_live_... node -e '
const s = require("stripe")(process.env.STRIPE_SECRET_KEY);
s.accounts.retrieve().then(a => console.log({
  mcc: a.business_profile?.mcc,
  descriptor: a.settings?.payments?.statement_descriptor,
  supportPhone: a.business_profile?.support_phone,
}));'
```

`business_profile.mcc` → `PREVENT_MERCHANT_MCC`,
`settings.payments.statement_descriptor` → `PREVENT_STATEMENT_DESCRIPTOR`.

Note the descriptor Stripe reports is the *full* one; Visa's
`paymentDescriptor` and Mastercard's `merchantBillingDescriptor` want the
merchant-name component, and Mastercard caps it at 24 characters.

## How matching works

`src/lib/prevent/lookup.ts` walks a priority cascade, strongest identifier
first, and stops at the first step that resolves to exactly **one** row:

1. `network_transaction_id` — Visa's Transaction ID / Mastercard's Trace ID
2. `acquirer_reference_number` (ARN)
3. merchant order reference (our purchase id, or the Stripe PaymentIntent id)
4. auth code + last4 + amount + date
5. auth code + amount + date
6. auth code + date
7. last4 + amount + date
8. amount + currency + date

Every step carries a ±3 day tolerance on `authorized_at` to absorb timezone and
settlement drift. Amount comparisons only run when the issuer's currency
matches the one we charged in — converting across currencies with a stale FX
rate would turn an exact-match step into a fuzzy one, and a *wrong* match is
worse than no match: the cardholder is shown a purchase they genuinely do not
recognize, which converts a would-be deflection into a confirmed fraud claim.

**Stripe supplies no ARN and usually no card BIN**, so steps 2 and any
BIN-keyed matching rarely fire. Step 1 is the workhorse.

## Data capture

None of this can be reconstructed after the fact, so it is written once, right
after payment settles.

`src/lib/prevent/evidence.ts` → `capturePaymentEvidence()` runs from
`provisionIntroPayment()` and from the upsell branch of the Stripe webhook. It
reads the Stripe **Charge** (not the PaymentIntent) for:

- `payment_method_details.card.network_transaction_id`
- `payment_method_details.card.authorization_code`
- `brand`, `last4`, `iin`, `country`
- `calculated_statement_descriptor`
- `created` → `authorized_at`

Browser-side context (`client_ip`, `client_user_agent`, `device_id`,
`device_fingerprint`) is captured at checkout by `src/lib/device.ts` and stashed
on Stripe metadata — the webhook that writes the purchase row has no browser of
its own.

`charge.refunded` mirrors refunds onto the row so lookup responses stop telling
the cardholder the order is still refundable after we have already refunded it.

## Compelling Evidence

Visa only sends a CE lookup (`source = CE`) if our earlier OI/OID response
carried **at least two of four** persistent identifiers:

| Identifier | Source | Constraint |
| --- | --- | --- |
| `customerInformation.accountId` | account email | ≤50 chars, must be recognizable — omitted rather than truncated |
| `device.ipAddress` | `x-forwarded-for` at checkout | public IP, clear text |
| `device.deviceId` | `localStorage`, `src/lib/device.ts` | ≥15 chars, unhashed. We emit 32 hex |
| `device.deviceFingerprint` | SHA-256 of stable device attributes | 20–45 chars. We emit 40 hex |

Account id + IP is the guaranteed floor; the two device values are best-effort
(private mode and non-secure origins can block them). The Visa route logs at
**error** level whenever a matched purchase carries fewer than two — that is
the signal that liability protection has quietly stopped working.

Purchases made before this shipped have none of these and are not CE eligible.

## Testing

```bash
npm run prevent:test                                  # against localhost
npm run prevent:test -- --base https://facelineage.com
npm run prevent:test -- --miss                        # expect a not-found
npm run prevent:test -- --print                       # dump the payloads
```

The script picks the most recent real purchase that has a
`network_transaction_id`, builds both scheme payloads from its actual
identifiers, and asserts auth, status codes, mandatory fields, CE identifier
count, and the <1000 ms budget. It needs at least one purchase made *after*
evidence capture shipped.

Merchanto's own Swagger has two test endpoints, per their guide:

- **Check Response** — paste a payload from `/api/prevent/sample` to validate
  its shape.
- **Check Flow** — emulates a live lookup end to end. Regenerate `insightId`
  (Visa) and `transactionIdentifierValue` (Mastercard) on **every** run;
  reusing an `insightId` returns 422. `clientId` / `merchantId` come from the
  Merchanto account manager.

## Latency

The budget is 1000 ms end-to-end; a late response is scored *Timeout* and
treated as no response. Audit logging runs in `after()` so it never counts
against it, and every cascade step is an exact match on an indexed column.

The realistic risk is a cold start, not query time. If Merchanto's monitoring
flags slow responses, the fix is to keep the function warm rather than to
optimize the queries.

## Observability

- `prevent_lookups` — every inbound lookup with the request payload, the
  cascade step that matched, and the duration. Merchanto's dashboard shows
  *that* a lookup came back Not Found; this shows which identifiers the issuer
  actually sent, which is the only way to tell a genuinely unknown transaction
  from a gap in our matching.
- `prevent_notifications` — case-status webhooks, deduped on
  `(scheme, case_id, case_status)` because Merchanto retries.

Log lines are prefixed `[prevent/visa]`, `[prevent/mc]` and `[prevent]`.
Escalations (`caseStatus` `failed` or `delete`) log at error level.
