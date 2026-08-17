-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0011 — Merchanto Prevent (Visa OI / Mastercard Clarity)      ║
-- ║                                                                           ║
-- ║  Issuers ask us, in real time, "what was this charge?". To answer we      ║
-- ║  must find the transaction from card-network identifiers we never used    ║
-- ║  to store: the network transaction id, the issuer auth code, the card     ║
-- ║  last4, and the authorization timestamp. `purchases` only had our own     ║
-- ║  Stripe PaymentIntent id, which the issuer does not know.                 ║
-- ║                                                                           ║
-- ║  The same response also carries Compelling Evidence identifiers (IP,      ║
-- ║  device id, device fingerprint, account id). Visa requires at least two   ║
-- ║  of those four on the OI/OID response before it will ever send us a CE    ║
-- ║  lookup, so they have to be captured at payment time — they cannot be     ║
-- ║  reconstructed afterwards.                                                ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ───── transaction-matching + evidence columns ──────────────────────────────
alter table public.purchases
  -- Matching keys (populated from the Stripe Charge after payment).
  add column if not exists card_brand text,
  add column if not exists card_last4 text,
  add column if not exists card_bin text,
  add column if not exists card_country text,
  add column if not exists auth_code text,
  add column if not exists network_transaction_id text,
  add column if not exists acquirer_reference_number text,
  add column if not exists statement_descriptor text,
  add column if not exists authorized_at timestamptz,
  -- Compelling-Evidence identifiers (captured in the browser at checkout).
  add column if not exists customer_email text,
  add column if not exists client_ip text,
  add column if not exists client_user_agent text,
  add column if not exists device_id text,
  add column if not exists device_fingerprint text,
  -- Refund state, surfaced to the cardholder in the lookup response.
  add column if not exists refunded_amount_cents int not null default 0,
  add column if not exists refunded_at timestamptz;

-- Existing rows have no authorization timestamp; the row's own creation time
-- is within seconds of it, and the ±3 day matching tolerance absorbs the rest.
update public.purchases
set authorized_at = created_at
where authorized_at is null;

-- ───── lookup indexes ───────────────────────────────────────────────────────
-- The matching cascade walks strongest identifier → weakest. Every step must
-- be a single indexed query: the scheme allows us under 1000 ms end-to-end.

create index if not exists idx_purchases_network_txn
  on public.purchases (network_transaction_id)
  where network_transaction_id is not null;

create index if not exists idx_purchases_arn
  on public.purchases (acquirer_reference_number)
  where acquirer_reference_number is not null;

create index if not exists idx_purchases_auth_code
  on public.purchases (auth_code, authorized_at)
  where auth_code is not null;

create index if not exists idx_purchases_card_last4
  on public.purchases (card_last4, authorized_at)
  where card_last4 is not null;

-- Weakest step: amount + currency + date window, no card identifiers at all.
create index if not exists idx_purchases_amount_window
  on public.purchases (currency, amount_cents, authorized_at);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Lookup audit trail                                                       ║
-- ║                                                                           ║
-- ║  Merchanto's dashboard is the system of record for lookup outcomes, but   ║
-- ║  it cannot show WHY our matcher missed. This table stores the inbound     ║
-- ║  payload, which cascade step matched (if any), and how long we took, so   ║
-- ║  a "Not Found" can be reproduced offline against real request data.       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.prevent_lookups (
  id uuid primary key default gen_random_uuid(),
  scheme text not null,                    -- 'visa' | 'mastercard'
  -- Visa: insightId. Mastercard: requestReference.correlationId.
  external_id text,
  source text,                             -- Visa: OI | OID | CE. MC: originatorChannel.
  request jsonb not null,
  response jsonb,
  matched_purchase_id uuid references public.purchases(id) on delete set null,
  -- Which cascade step produced the match, e.g. 'network_transaction_id'.
  match_strategy text,
  outcome text not null,                   -- 'found' | 'not_found' | 'multiple' | 'error'
  duration_ms int,
  created_at timestamptz default now()
);

create index if not exists idx_prevent_lookups_created_at
  on public.prevent_lookups (created_at desc);
create index if not exists idx_prevent_lookups_external_id
  on public.prevent_lookups (external_id);
create index if not exists idx_prevent_lookups_outcome
  on public.prevent_lookups (outcome, created_at desc);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Dispute-status notifications                                             ║
-- ║                                                                           ║
-- ║  Merchanto POSTs one of these whenever a case changes state:              ║
-- ║    new    → the inquiry was deflected (no chargeback)                     ║
-- ║    failed → it escalated into a dispute                                   ║
-- ║    delete → a previously deflected case was reopened                      ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.prevent_notifications (
  id uuid primary key default gen_random_uuid(),
  scheme text not null,                    -- 'visa' | 'mastercard'
  case_id text not null,
  case_status text not null,               -- new | delete | failed | timeout
  case_date timestamptz,
  payload jsonb not null,
  matched_purchase_id uuid references public.purchases(id) on delete set null,
  created_at timestamptz default now()
);

-- Merchanto retries webhooks; the same (case, status) pair must not pile up.
create unique index if not exists idx_prevent_notifications_case_status
  on public.prevent_notifications (scheme, case_id, case_status);
create index if not exists idx_prevent_notifications_created_at
  on public.prevent_notifications (created_at desc);

-- ───── RLS ──────────────────────────────────────────────────────────────────
-- Both tables are written and read exclusively by the service-role client.
-- Enabling RLS with no policies denies anon/authenticated access outright.
alter table public.prevent_lookups enable row level security;
alter table public.prevent_notifications enable row level security;
