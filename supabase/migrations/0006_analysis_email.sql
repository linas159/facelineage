-- Store the user's email on the analysis row so we know it before payment.
-- Collected on a dedicated step between /analyzing and /paywall.
alter table public.analyses
  add column if not exists email text;

create index if not exists idx_analyses_email on public.analyses(email);
