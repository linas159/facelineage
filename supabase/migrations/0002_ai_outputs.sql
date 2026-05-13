-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0002 — enum additions                                        ║
-- ║                                                                           ║
-- ║  Postgres requires ALTER TYPE ADD VALUE to be committed before the new    ║
-- ║  enum values can be referenced. Keep this file enum-changes-only and run  ║
-- ║  it before 0003.                                                          ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter type product_kind add value if not exists 'ethnicity_portraits';
alter type product_kind add value if not exists 'partner_portrait';

do $$ begin
  create type generation_status as enum (
    'idle',         -- pre-payment; no generation has run
    'queued',       -- payment received, pipeline scheduled
    'running',      -- AI calls in flight
    'ready',        -- all artifacts persisted
    'failed'        -- pipeline errored
  );
exception when duplicate_object then null; end $$;
