-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0003 — AI generation outputs + upsell catalog refresh       ║
-- ║                                                                           ║
-- ║  Depends on enum additions in 0002. Run 0002 first.                       ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- ───── analyses: columns for generated outputs ──────────────────────────────
alter table public.analyses
  add column if not exists generation_status generation_status default 'idle',
  add column if not exists generation_error text,
  add column if not exists conclusion text,
  add column if not exists regions jsonb,           -- [{key, name, pct, color, blurb, countries: [...]}]
  add column if not exists facial_traits jsonb,     -- [{key, name, description, supporting_regions: [iso2,...]}]
  add column if not exists cultural_insights jsonb, -- [{key, name, description, region_keys, image_path}]
  add column if not exists heritage_story text,
  add column if not exists ancestor jsonb,          -- {name, era, place, description, image_path}
  add column if not exists uniqueness_score_v2 int;

create index if not exists idx_analyses_generation_status
  on public.analyses(generation_status);

-- ───── refresh products catalog for the 5-upsell list ───────────────────────
-- Soft-delete (deactivate) the old upsell SKUs so historical purchases still
-- resolve, and seed the 5 new ones at the new price points.
update public.products
   set active = false
 where sku in ('upsell_pdf_book', 'upsell_parents', 'upsell_ages', 'upsell_culture');

insert into public.products (sku, kind, stripe_price_id, amount_cents, display_name, description) values
  ('upsell_v2_parents',   'parents_comparison',  'STRIPE_PRICE_UPSELL_PARENTS',   499, 'What Each Parent Gave You', 'Side-by-side breakdown of which features came from which parent'),
  ('upsell_v2_ethnicity', 'ethnicity_portraits', 'STRIPE_PRICE_UPSELL_ETHNICITY', 699, 'Heritage Mirror',           'Your face reborn across five different cultures'),
  ('upsell_v2_ages',      'ages_portraits',      'STRIPE_PRICE_UPSELL_AGES',      699, 'Through The Ages',          'Eight portraits of you across historical eras'),
  ('upsell_v2_partner',   'partner_portrait',    'STRIPE_PRICE_UPSELL_PARTNER',   699, 'Future Partner',            'A portrait of the kind of person who would balance you most'),
  ('upsell_v2_book',      'pdf_book',            'STRIPE_PRICE_UPSELL_BOOK',      999, 'Heritage Book',             'Your full ancestral story as a printable PDF')
on conflict (sku) do update set
  stripe_price_id = excluded.stripe_price_id,
  amount_cents    = excluded.amount_cents,
  display_name    = excluded.display_name,
  description     = excluded.description,
  active          = true;

-- ───── upsell-artifact references the analysis (not just the purchase) ──────
-- Required so the dashboard can show a user's unlocked add-ons next to the
-- analysis they belong to.
alter table public.upsell_artifacts
  add column if not exists analysis_id uuid references public.analyses(id) on delete cascade,
  add column if not exists product_sku text references public.products(sku);

create index if not exists idx_upsell_artifacts_analysis
  on public.upsell_artifacts(analysis_id);

-- ───── second storage bucket for generated portraits ────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'generated',
  'generated',
  false,
  20971520, -- 20 MB
  array['image/jpeg', 'image/png', 'image/webp']
) on conflict (id) do nothing;

-- Generated artifacts are owned by the analysis owner; users read their own.
drop policy if exists "users_read_own_generated" on storage.objects;
create policy "users_read_own_generated"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'generated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
