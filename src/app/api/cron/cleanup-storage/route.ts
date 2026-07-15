import { NextResponse } from "next/server";
import { cleanupAnalysisPhotos } from "@/lib/storage-cleanup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// A full-bucket sweep can take a while once there's a large backlog.
export const maxDuration = 300;

/**
 * GET /api/cron/cleanup-storage
 *
 * Vercel Cron hits this daily to keep the `analysis-photos` bucket from growing
 * unbounded (see lib/storage-cleanup.ts). It deletes source selfies/parent
 * photos for analyses that are already `ready`, plus abandoned uploads and
 * historical orphans past the grace window.
 *
 * Auth mirrors the charge-reminders cron: Vercel sends
 * `Authorization: Bearer ${CRON_SECRET}`. Without a matching env we 401.
 *
 * Operational flags (still require CRON_SECRET):
 *   ?dryRun=1        → report what would be deleted without removing anything.
 *   ?graceDays=N     → override the retention window (default 3 days).
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const params = new URL(req.url).searchParams;
  const dryRun = params.get("dryRun") === "1";
  const graceParam = Number(params.get("graceDays"));
  const graceDays = Number.isFinite(graceParam) && graceParam >= 0 ? graceParam : undefined;

  try {
    const result = await cleanupAnalysisPhotos({ dryRun, graceDays });
    console.log("[cron] cleanup-storage run complete", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[cron] cleanup-storage failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }
}
