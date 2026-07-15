// scripts/purge-orphan-photos.mjs
//
// One-off cleanup for the `analysis-photos` Supabase Storage bucket, which had
// no working lifecycle and filled the storage quota (exceed_storage_size_quota).
//
// It deletes every source photo (user selfies + parent-comparison uploads) that
// is no longer needed:
//   • analyses already `ready`  → the report is done; the selfie is never read
//     again (report-loader reads the `generated`/`artifacts` buckets, not this).
//   • abandoned uploads older than the grace window (never paid / never signed up).
//   • orphans with no DB row at all — the files the old `purge-old-photo-paths`
//     pg_cron stranded when it nulled photo_path without deleting the object.
//
// KEPT: anything queued/running, and any non-ready upload inside the grace
// window (covers in-flight pipelines and users returning to pay a bit later).
//
// SAFE: never touches the `generated` or `artifacts` buckets (the report assets).
//
// Usage — DRY RUN by default (lists what it would delete, changes nothing):
//   node --env-file=.env.local scripts/purge-orphan-photos.mjs
//
// Actually delete:
//   node --env-file=.env.local scripts/purge-orphan-photos.mjs --apply
//
// Options:
//   --grace-days=N   retention window for non-ready uploads (default 3)
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env.

import { createClient } from "@supabase/supabase-js";

const BUCKET = "analysis-photos";
const LIST_PAGE = 1000;
const DB_PAGE = 1000;
const REMOVE_BATCH = 100;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error(
    "✗ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "  Run with: node --env-file=.env.local scripts/purge-orphan-photos.mjs",
  );
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const graceArg = args.find((a) => a.startsWith("--grace-days="));
const graceDays = graceArg ? Number(graceArg.split("=")[1]) : 3;
if (!Number.isFinite(graceDays) || graceDays < 0) {
  console.error("✗ --grace-days must be a non-negative number.");
  process.exit(1);
}

const db = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const fmtBytes = (n) => {
  if (n < 1024) return `${n} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = n / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
};

/** Recursively list every object under `prefix`. */
async function listAll(prefix = "") {
  const out = [];
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
      if (item.id === null) {
        out.push(...(await listAll(full))); // folder → recurse
      } else {
        out.push({ path: full, size: item.metadata?.size ?? 0 });
      }
    }
    if (data.length < LIST_PAGE) break;
    offset += LIST_PAGE;
  }
  return out;
}

/** Paths that must be kept (mirrors src/lib/storage-cleanup.ts). */
async function protectedPaths() {
  const cutoff = Date.now() - graceDays * 86_400_000;
  const keep = new Set();

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
      const recent = new Date(a.created_at).getTime() > cutoff;
      if ((processing || (gs !== "ready" && recent)) && a.photo_path) {
        keep.add(a.photo_path);
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
      const recent = new Date(fp.created_at).getTime() > cutoff;
      if (recent && fp.photo_path) keep.add(fp.photo_path);
    }
    if (!data || data.length < DB_PAGE) break;
  }

  return keep;
}

async function main() {
  console.log(`\n━━━ Purge analysis-photos ━━━`);
  console.log(`mode:        ${apply ? "APPLY (deleting)" : "DRY RUN (no changes)"}`);
  console.log(`grace days:  ${graceDays}\n`);

  console.log("Listing bucket…");
  const [objects, keep] = await Promise.all([listAll(), protectedPaths()]);
  const toDelete = objects.filter((o) => !keep.has(o.path));
  const reclaim = toDelete.reduce((n, o) => n + o.size, 0);
  const totalBytes = objects.reduce((n, o) => n + o.size, 0);

  console.log(`  objects found:     ${objects.length} (${fmtBytes(totalBytes)})`);
  console.log(`  kept (in use):     ${objects.length - toDelete.length}`);
  console.log(`  deletable:         ${toDelete.length} (${fmtBytes(reclaim)})\n`);

  if (toDelete.length === 0) {
    console.log("Nothing to delete. ✓\n");
    return;
  }

  const sample = toDelete.slice(0, 10).map((o) => `  - ${o.path} (${fmtBytes(o.size)})`);
  console.log(`Sample of deletable objects:\n${sample.join("\n")}`);
  if (toDelete.length > sample.length) {
    console.log(`  … and ${toDelete.length - sample.length} more\n`);
  } else {
    console.log("");
  }

  if (!apply) {
    console.log("DRY RUN — nothing deleted. Re-run with --apply to remove them.\n");
    return;
  }

  console.log("Deleting…");
  let removed = 0;
  const deletedPaths = [];
  for (let i = 0; i < toDelete.length; i += REMOVE_BATCH) {
    const batch = toDelete.slice(i, i + REMOVE_BATCH).map((o) => o.path);
    const { error } = await db.storage.from(BUCKET).remove(batch);
    if (error) throw new Error(`remove batch: ${error.message}`);
    removed += batch.length;
    deletedPaths.push(...batch);
    process.stdout.write(`\r  removed ${removed}/${toDelete.length}`);
  }
  process.stdout.write("\n");

  // Forget the DB pointers so nothing references the now-gone files.
  console.log("Nulling DB pointers…");
  for (let i = 0; i < deletedPaths.length; i += REMOVE_BATCH) {
    const batch = deletedPaths.slice(i, i + REMOVE_BATCH);
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      db.from("analyses").update({ photo_path: null }).in("photo_path", batch),
      db.from("family_photos").delete().in("photo_path", batch),
    ]);
    if (e1) console.warn(`  warn: null photo_path failed: ${e1.message}`);
    if (e2) console.warn(`  warn: delete family_photos failed: ${e2.message}`);
  }

  console.log(`\n✓ Removed ${removed} objects, reclaimed ~${fmtBytes(reclaim)}.\n`);
}

main().catch((err) => {
  console.error("\n✗ Failed:", err.message ?? err);
  process.exit(1);
});
