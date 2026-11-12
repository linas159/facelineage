-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0017 — per-analysis locale                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- The app locale (URL prefix: en, pl, ua, ro, …) the customer was using when
-- they uploaded the selfie. The AI writes the report in this language and
-- the report page, PDF and emails render in it. Pre-existing rows were all
-- generated in English.
alter table public.analyses
  add column if not exists locale text not null default 'en';
