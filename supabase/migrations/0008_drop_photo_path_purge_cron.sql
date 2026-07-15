-- ╔══════════════════════════════════════════════════════════════════════════╗
-- ║  Facelineage 0008 — retire the leaky photo-path purge cron               ║
-- ║                                                                           ║
-- ║  0001 scheduled `purge-old-photo-paths` to NULL analyses.photo_path after ║
-- ║  30 days, expecting a nightly Edge Function to delete the underlying      ║
-- ║  storage object. That function was never built, so the job only erased    ║
-- ║  the pointer and left the file in `analysis-photos` forever — orphaning   ║
-- ║  every selfie and eventually exhausting the storage quota.                ║
-- ║                                                                           ║
-- ║  Storage lifecycle now lives in the Vercel cron                           ║
-- ║  `GET /api/cron/cleanup-storage` (lib/storage-cleanup.ts), which deletes  ║
-- ║  the object BEFORE nulling the pointer and sweeps historical orphans.     ║
-- ║  Unschedule the old job so it stops stranding new files.                  ║
-- ╚══════════════════════════════════════════════════════════════════════════╝

do $$
begin
  perform cron.unschedule('purge-old-photo-paths');
exception
  when others then
    -- Job may not exist in this environment (e.g. a fresh DB); ignore.
    null;
end $$;
