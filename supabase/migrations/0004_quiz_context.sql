-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0004 — context passed to AI                                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

-- Per-analysis context the AI uses to ground the report:
--   quiz_answers   — { gender, motivation, ambiguity, surprise, age }
--   timezone       — IANA timezone captured client-side (e.g. "Europe/Vilnius")
--   country_hint   — ISO-2 country code (derived from timezone or IP)
alter table public.analyses
  add column if not exists quiz_answers jsonb,
  add column if not exists timezone text,
  add column if not exists country_hint text;
