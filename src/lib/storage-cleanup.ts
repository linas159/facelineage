import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

/**
 * Storage lifecycle for the `analysis-photos` bucket.
 *
 * That bucket holds the raw user selfie (`{owner}/{uuid}.ext`) and the parent
 * photos for the "Parents Comparison" upsell (`{user}/{analysis}/parent-*`).
 * These source images are needed ONLY while the AI pipeline runs — see
 * `lib/ai/pipeline.ts`, the only reader of `photo_path`. The report itself
 * (`lib/report-loader.ts`) reads the `generated`/`artifacts` buckets, never
 * this one. So once an analysis is `ready` (or old and abandoned), its source
 * photos can be deleted with zero user-visible effect.
 *
 * Nothing was deleting them: the old `purge-old-photo-paths` pg_cron only
 * nulled `photo_path` after 30 days and left the object in the bucket forever
 * (it relied on an Edge Function that never shipped). That is what exhausted
 * the Supabase storage quota. This module deletes the OBJECT first, then nulls
 * the pointer — and, because it sweeps the whole bucket, it also reclaims the
 * historical orphans the old job stranded.
 */

const BUCKET = "analysis-photos";
const DEFAULT_GRACE_DAYS = 3;
const LIST_PAGE = 1000;
const DB_PAGE = 1000;
const REMOVE_BATCH = 100;

type Db = ReturnType<typeof createServiceClient>;

export type CleanupResult = {
  scanned: number; // objects found in the bucket
  protectedCount: number; // objects kept (in-flight or within grace window)
  deletable: number; // objects eligible for deletion
  removed: number; // objects actually deleted (0 on dry run)
  reclaimBytes: number; // bytes freed (or that would be freed on dry run)
  graceDays: number;
  dryRun: boolean;
};

/** Recursively list every object under `prefix` in the bucket. */
async function listAll(
  db: Db,
  prefix = "",
): Promise<Array<{ path: string; size: number }>> {
  const out: Array<{ path: string; size: number }> = [];
  let offset = 0;
  for (;;) {
    const { data, error } = await db.storage.from(BUCKET).list(prefix, {
      limit: LIST_PAGE,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`list "${prefix}": ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      const full = prefix ? `${prefix}/${item.name}` : item.name;
      // Supabase returns folders as pseudo-rows with a null id and no metadata.
      if (item.id === null) {
        out.push(...(await listAll(db, full)));
      } else {
        out.push({ path: full, size: item.metadata?.size ?? 0 });
      }
    }
    if (data.length < LIST_PAGE) break;
    offset += LIST_PAGE;
  }
  return out;
}

/**
 * Build the set of object paths that must be KEPT:
 *   • any analysis actively being processed (queued/running) — always kept;
 *   • any non-`ready` analysis created within the grace window — covers
 *     in-flight uploads, retryable failures, and users who upload then return
 *     to pay a little later;
 *   • any parent photo uploaded within the grace window.
 * Everything else (ready analyses, abandoned uploads past grace, and orphans
 * with no DB row at all) is deletable.
 */
async function protectedPaths(db: Db, graceDays: number): Promise<Set<string>> {
  const cutoff = Date.now() - graceDays * 86_400_000;
  const keep = new Set<string>();

  for (let from = 0; ; from += DB_PAGE) {
    const { data, error } = await db
      .from("analyses")
      .select("photo_path, generation_status, created_at")
      .not("photo_path", "is", null)
      .range(from, from + DB_PAGE - 1);
    if (error) throw new Error(`load analyses: ${error.message}`);
    for (const a of data ?? []) {
      const gs = a.generation_status ?? "idle";
      const processing = gs === "queued" || gs === "running";
      const recent = new Date(a.created_at as string).getTime() > cutoff;
      if ((processing || (gs !== "ready" && recent)) && a.photo_path) {
        keep.add(a.photo_path as string);
      }
    }
    if (!data || data.length < DB_PAGE) break;
  }

  for (let from = 0; ; from += DB_PAGE) {
    const { data, error } = await db
      .from("family_photos")
      .select("photo_path, created_at")
      .range(from, from + DB_PAGE - 1);
    if (error) throw new Error(`load family_photos: ${error.message}`);
    for (const fp of data ?? []) {
      const recent = new Date(fp.created_at as string).getTime() > cutoff;
      if (recent && fp.photo_path) keep.add(fp.photo_path as string);
    }
    if (!data || data.length < DB_PAGE) break;
  }

  return keep;
}

/** Null/forget the DB pointers for objects we just deleted. Best-effort. */
async function forgetPointers(db: Db, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += REMOVE_BATCH) {
    const batch = paths.slice(i, i + REMOVE_BATCH);
    // Selfie pointers live on analyses.photo_path; parent pointers on
    // family_photos.photo_path. The `.in()` simply no-ops where nothing matches.
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      db.from("analyses").update({ photo_path: null }).in("photo_path", batch),
      db.from("family_photos").delete().in("photo_path", batch),
    ]);
    if (e1) console.warn(`[cleanup] null photo_path failed:`, e1.message);
    if (e2) console.warn(`[cleanup] delete family_photos failed:`, e2.message);
  }
}

/**
 * Sweep the `analysis-photos` bucket and delete source photos no longer needed.
 * Pass `dryRun` to report what would be removed without touching anything.
 */
export async function cleanupAnalysisPhotos(
  opts: { graceDays?: number; dryRun?: boolean } = {},
): Promise<CleanupResult> {
  const graceDays = opts.graceDays ?? DEFAULT_GRACE_DAYS;
  const dryRun = opts.dryRun ?? false;
  const db = createServiceClient();

  const [objects, keep] = await Promise.all([
    listAll(db),
    protectedPaths(db, graceDays),
  ]);

  const toDelete = objects.filter((o) => !keep.has(o.path));
  const reclaimBytes = toDelete.reduce((n, o) => n + o.size, 0);

  let removed = 0;
  if (!dryRun && toDelete.length > 0) {
    for (let i = 0; i < toDelete.length; i += REMOVE_BATCH) {
      const batch = toDelete.slice(i, i + REMOVE_BATCH).map((o) => o.path);
      const { error } = await db.storage.from(BUCKET).remove(batch);
      if (error) throw new Error(`remove batch: ${error.message}`);
      removed += batch.length;
    }
    await forgetPointers(
      db,
      toDelete.map((o) => o.path),
    );
  }

  return {
    scanned: objects.length,
    protectedCount: objects.length - toDelete.length,
    deletable: toDelete.length,
    removed,
    reclaimBytes,
    graceDays,
    dryRun,
  };
}
