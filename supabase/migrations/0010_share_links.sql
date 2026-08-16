-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0010 — public share links for finished reports               ║
-- ║                                                                           ║
-- ║  `share_links` was declared in 0001 but never used. The report page's     ║
-- ║  "Share my result" button now mints one token per analysis and hands out  ║
-- ║  /s/<token>, a public teaser view. Two things were missing for that:      ║
-- ║    1. a uniqueness guarantee so repeated shares reuse the same link       ║
-- ║       (racing taps must not create a second token for one analysis), and  ║
-- ║    2. an atomic view counter — the page is read by unauthenticated        ║
-- ║       visitors, so the bump can't be a read-modify-write.                 ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Defensive: the table ships in 0001, but keep this migration standalone-safe.
create table if not exists public.share_links (
  token text primary key,
  analysis_id uuid references public.analyses(id) on delete cascade,
  expires_at timestamptz,
  view_count int default 0,
  created_at timestamptz default now()
);

alter table public.share_links
  add column if not exists last_viewed_at timestamptz;

-- One live link per analysis. Replaces the non-unique index from 0001.
drop index if exists public.idx_share_links_analysis;
create unique index if not exists idx_share_links_analysis_unique
  on public.share_links(analysis_id);

alter table public.share_links enable row level security;

-- Reads happen through the service client (the visitor is anonymous and the
-- token is the credential), but keep the 0001 policy in place for parity.
drop policy if exists "share_links_public_read" on public.share_links;
create policy "share_links_public_read" on public.share_links
  for select using (expires_at is null or expires_at > now());

-- ───── atomic view counter ──────────────────────────────────────────────────
create or replace function public.increment_share_view(p_token text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.share_links
  set view_count = coalesce(view_count, 0) + 1,
      last_viewed_at = now()
  where token = p_token;
$$;

grant execute on function public.increment_share_view(text) to anon, authenticated, service_role;
