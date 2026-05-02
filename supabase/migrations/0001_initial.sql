-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage initial schema                                               ║
-- ║  Tables, enums, RLS, storage, cron                                        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ───── extensions ────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists pg_cron;

-- ───── enums ─────────────────────────────────────────────────────────────────
create type analysis_status as enum (
  'uploading', 'analyzing', 'preview_ready', 'ready', 'failed'
);

create type sub_status as enum (
  'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'paused'
);

create type product_kind as enum (
  'subscription_intro_3d',
  'subscription_intro_7d',
  'subscription_intro_1m',
  'pdf_book',
  'parents_comparison',
  'sibling_comparison',
  'ages_portraits',
  'cultural_deep_dive',
  'migration_video',
  'print_book'
);

create type purchase_status as enum (
  'pending', 'paid', 'refunded', 'failed', 'fulfilled'
);

create type family_relation as enum (
  'mother', 'father', 'sibling', 'grandparent_maternal', 'grandparent_paternal', 'other'
);

-- ───── profiles ─────────────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text not null,
  full_name text,
  avatar_url text,
  locale text default 'en',
  marketing_opt_in boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_profiles_email on public.profiles(email);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', null));
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───── onboarding responses ─────────────────────────────────────────────────
create table public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  answers jsonb not null,
  -- shape: {gender, age_range, eye_color, hair_color, region_guess, interest_reason, ...}
  completed_at timestamptz default now()
);

create index idx_onboarding_user on public.onboarding_responses(user_id);

-- ───── analyses (one per photo + report) ────────────────────────────────────
create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  photo_path text,                        -- supabase storage path; nullified after 30d
  status analysis_status default 'uploading',
  face_attributes jsonb,                  -- raw output from DeepFace + Face++
  ethnicity_breakdown jsonb,              -- [{region, pct, confidence}]
  preview_region text,                    -- top region for free preview
  preview_pct numeric(5,2),
  narrative jsonb,                        -- {heritage_story, migration_path, cultural_ties, fun_facts}
  uniqueness_score int,
  pdf_url text,
  share_card_url text,
  is_paid boolean default false,
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index idx_analyses_user on public.analyses(user_id);
create index idx_analyses_status on public.analyses(status);
create index idx_analyses_created_at on public.analyses(created_at);

-- ───── family photos (parents/siblings comparison upsell) ───────────────────
create table public.family_photos (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references public.analyses(id) on delete cascade,
  relation family_relation not null,
  photo_path text not null,
  face_attributes jsonb,
  created_at timestamptz default now()
);

create index idx_family_photos_analysis on public.family_photos(analysis_id);

-- ───── products (price catalog) ─────────────────────────────────────────────
create table public.products (
  sku text primary key,
  kind product_kind not null,
  stripe_price_id text not null,
  stripe_recurring_price_id text,         -- for intro→recurring chains
  amount_cents int not null,
  recurring_amount_cents int,
  display_name text not null,
  description text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Seed the 3 subscription tiers + upsells (replace stripe_price_id with real values via env)
insert into public.products (sku, kind, stripe_price_id, stripe_recurring_price_id, amount_cents, recurring_amount_cents, display_name, description) values
  ('sub_intro_3d', 'subscription_intro_3d', 'STRIPE_PRICE_INTRO_3D', 'STRIPE_PRICE_RECUR_WEEK', 195, 2499, '3-Day Access', '$1.95 for 3 days, then $24.99/week'),
  ('sub_intro_7d', 'subscription_intro_7d', 'STRIPE_PRICE_INTRO_7D', 'STRIPE_PRICE_RECUR_WEEK', 699, 2499, '7-Day Access', '$6.99 for 7 days, then $24.99/week'),
  ('sub_intro_1m', 'subscription_intro_1m', 'STRIPE_PRICE_INTRO_1M', 'STRIPE_PRICE_RECUR_MONTH', 1799, 4799, '1-Month Access', '$17.99 for 1 month, then $47.99/month'),
  ('upsell_pdf_book', 'pdf_book', 'STRIPE_PRICE_PDF_BOOK', null, 1499, null, 'Heritage Book', '300-page PDF deep-dive into your ancestry'),
  ('upsell_parents', 'parents_comparison', 'STRIPE_PRICE_PARENTS_COMPARE', null, 999, null, 'Parents Comparison', 'See what you inherited from each parent'),
  ('upsell_ages', 'ages_portraits', 'STRIPE_PRICE_AGES_PORTRAITS', null, 999, null, 'Through The Ages', 'AI portraits of you across historical eras'),
  ('upsell_culture', 'cultural_deep_dive', 'STRIPE_PRICE_CULTURAL_DEEPDIVE', null, 499, null, 'Cultural Deep Dive', 'Extended cultural insights for one region');

-- ───── subscriptions ────────────────────────────────────────────────────────
create table public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  stripe_schedule_id text,                -- for intro→recurring phase chains
  product_sku text references public.products(sku),
  status sub_status,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_subscriptions_stripe_customer on public.subscriptions(stripe_customer_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- ───── purchases (one-time + subscription rows) ─────────────────────────────
create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  analysis_id uuid references public.analyses(id) on delete set null,
  product_sku text references public.products(sku),
  stripe_payment_intent text,
  stripe_checkout_session text unique,
  amount_cents int not null,
  currency text default 'usd',
  status purchase_status default 'pending',
  fulfilled_at timestamptz,
  metadata jsonb,
  created_at timestamptz default now()
);

create index idx_purchases_user on public.purchases(user_id);
create index idx_purchases_session on public.purchases(stripe_checkout_session);

-- ───── upsell artifacts (generated PDFs/images/videos) ──────────────────────
create table public.upsell_artifacts (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid references public.purchases(id) on delete cascade,
  artifact_type text,                     -- 'pdf' | 'image_set' | 'video' | 'json'
  storage_path text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- ───── share links ──────────────────────────────────────────────────────────
create table public.share_links (
  token text primary key,
  analysis_id uuid references public.analyses(id) on delete cascade,
  expires_at timestamptz,
  view_count int default 0,
  created_at timestamptz default now()
);

create index idx_share_links_analysis on public.share_links(analysis_id);

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Row Level Security                                                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.profiles enable row level security;
alter table public.onboarding_responses enable row level security;
alter table public.analyses enable row level security;
alter table public.family_photos enable row level security;
alter table public.subscriptions enable row level security;
alter table public.purchases enable row level security;
alter table public.upsell_artifacts enable row level security;
alter table public.share_links enable row level security;
alter table public.products enable row level security;

-- profiles: users can read/update only their own
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- onboarding: users own their answers
create policy "onboarding_all_own" on public.onboarding_responses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- analyses: users own
create policy "analyses_all_own" on public.analyses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- family photos: through analysis
create policy "family_photos_all_own" on public.family_photos
  for all using (
    exists (select 1 from public.analyses a where a.id = analysis_id and a.user_id = auth.uid())
  );

-- subscriptions: read-only for user
create policy "subscriptions_select_own" on public.subscriptions
  for select using (auth.uid() = user_id);

-- purchases: read-only for user
create policy "purchases_select_own" on public.purchases
  for select using (auth.uid() = user_id);

-- upsell artifacts: through purchase
create policy "upsell_artifacts_select_own" on public.upsell_artifacts
  for select using (
    exists (select 1 from public.purchases p where p.id = purchase_id and p.user_id = auth.uid())
  );

-- products: public read
create policy "products_public_read" on public.products
  for select using (active = true);

-- share links: public read by token (no auth required)
create policy "share_links_public_read" on public.share_links
  for select using (expires_at is null or expires_at > now());

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Storage                                                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'analysis-photos',
  'analysis-photos',
  false,
  10485760, -- 10 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
) on conflict (id) do nothing;

-- Storage RLS — users can only access their own folder
create policy "users_upload_own_photos" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'analysis-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_read_own_photos" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'analysis-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "users_delete_own_photos" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'analysis-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Bucket for generated artifacts (PDFs, share cards) — also private
insert into storage.buckets (id, name, public, file_size_limit)
values ('artifacts', 'artifacts', false, 52428800)
on conflict (id) do nothing;

-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Cron: purge photos older than 30 days                                    ║
-- ╚══════════════════════════════════════════════════════════════════════════╝
-- Nullifies the path (report data stays intact). The actual storage object
-- is removed by an Edge Function triggered nightly.

select cron.schedule(
  'purge-old-photo-paths',
  '0 3 * * *',
  $$
    update public.analyses
    set photo_path = null
    where created_at < now() - interval '30 days'
      and photo_path is not null;
  $$
);

-- ───── updated_at trigger ───────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();
