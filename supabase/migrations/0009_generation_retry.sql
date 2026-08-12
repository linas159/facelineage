-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0009 — make report generation recoverable                    ║
-- ║                                                                           ║
-- ║  Before this migration the pipeline had no way to tell a genuinely        ║
-- ║  running job from one whose serverless invocation died mid-run: both      ║
-- ║  read as generation_status = 'running', and the "already running, skip"   ║
-- ║  guard meant such a row could never be retried. These two columns let     ║
-- ║  the pipeline reclaim stale claims and bound how often it retries.        ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

alter table public.analyses
  add column if not exists generation_started_at timestamptz,
  add column if not exists generation_attempts int not null default 0;

-- Repair sweeps look for paid analyses that are not yet ready.
create index if not exists idx_analyses_generation_recovery
  on public.analyses (generation_status, generation_started_at)
  where generation_status in ('queued', 'running', 'failed');
