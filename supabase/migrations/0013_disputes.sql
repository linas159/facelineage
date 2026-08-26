-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0013 — dispute ledger                                        ║
-- ║                                                                           ║
-- ║  We built the Prevent integration to stop disputes, then had no way to    ║
-- ║  tell whether it was working. When Merchanto asked "have you had any      ║
-- ║  disputes come in so far?" the only answer available was to go and read   ║
-- ║  the Stripe dashboard by hand — and even that cannot say whether an       ║
-- ║  Order Insight lookup preceded the dispute or not.                        ║
-- ║                                                                           ║
-- ║  This table is the missing half of the loop. Every Stripe dispute is      ║
-- ║  mirrored here, linked back to the purchase it came from, and stamped     ║
-- ║  with how many Prevent lookups we had already answered for that same      ║
-- ║  purchase. That single number distinguishes the two failure modes:        ║
-- ║                                                                           ║
-- ║    lookups = 0 → the schemes never asked us. Enrollment/routing problem,  ║
-- ║                  nothing to fix in our code.                              ║
-- ║    lookups > 0 → we were asked and answered, and it escalated anyway.     ║
-- ║                  That is a data-quality problem in our response.          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  stripe_dispute_id text not null unique,
  stripe_charge_id text,
  stripe_payment_intent text,
  purchase_id uuid references public.purchases(id) on delete set null,

  -- Denormalised from the purchase so a dispute stays readable even if the
  -- purchase row is later removed, and so "how many Visa disputes?" is one
  -- query rather than a join.
  card_brand text,
  amount_cents int,
  currency text,

  reason text,                     -- Stripe's reason, e.g. 'fraudulent'
  status text,                     -- needs_response | won | lost | ...
  network_reason_code text,        -- the scheme's own code, when Stripe has it

  -- How many Prevent lookups we had already answered for this purchase at the
  -- moment the dispute opened. See the header — this is the diagnostic.
  prevent_lookup_count int not null default 0,

  opened_at timestamptz,
  evidence_due_at timestamptz,
  closed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_disputes_opened_at
  on public.disputes (opened_at desc);
create index if not exists idx_disputes_card_brand
  on public.disputes (card_brand, opened_at desc)
  where card_brand is not null;
create index if not exists idx_disputes_purchase
  on public.disputes (purchase_id)
  where purchase_id is not null;

-- Written and read exclusively by the service-role client; RLS on with no
-- policies denies anon/authenticated outright, matching the prevent_* tables.
alter table public.disputes enable row level security;
