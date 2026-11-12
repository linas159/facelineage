-- Single-creator lock for auth users. After an intro payment, the Stripe
-- webhook and /payment-complete both run getOrCreateAuthUser for the same
-- email within milliseconds. When both reach auth.admin.createUser, GoTrue
-- lets one insert win and fails the other with a 500 "Database error
-- creating new user" (unique email violation) or `email_exists`. The loser
-- was /payment-complete, so the customer who had just paid was not signed
-- in and saw an error page instead of their report.
--
-- Whoever inserts the row for an email creates the user; everyone else
-- waits for that user to appear. Rows are deleted once creation finishes.
-- A row older than 30s counts as abandoned (crashed creator) and may be
-- taken over. Service-role only: RLS on, no policies.
create table if not exists public.auth_user_creation_claims (
  email text primary key,
  claimed_at timestamptz not null default now()
);

alter table public.auth_user_creation_claims enable row level security;
