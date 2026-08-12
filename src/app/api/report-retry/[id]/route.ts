import { NextResponse, after } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runMainPipeline } from "@/lib/ai/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/report-retry/[id]
 *
 * Manual "try again" for a report whose automatic attempts have been used up.
 * Authorization is RLS: the read below goes through the user-scoped client, so
 * it only succeeds for someone who can already see the analysis.
 *
 * Resets the attempt counter and re-fires the pipeline in the background;
 * `runMainPipeline` resumes from whatever step previously failed.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const sb = await createClient();
  const { data: row } = await sb
    .from("analyses")
    .select("id, is_paid, generation_status")
    .eq("id", id)
    .maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!row.is_paid) {
    return NextResponse.json({ error: "Analysis is not paid" }, { status: 402 });
  }
  if (row.generation_status === "ready") {
    return NextResponse.json({ status: "ready" });
  }

  // Clear the attempt budget so the forced run isn't blocked by it, and drop
  // any stale `running` claim so the run can take over immediately.
  const svc = createServiceClient();
  await svc
    .from("analyses")
    .update({ generation_attempts: 0, generation_status: "queued", generation_error: null })
    .eq("id", id);

  console.log(`[report-retry] manual retry requested analysis=${id}`);
  after(async () => {
    try {
      await runMainPipeline(id, { force: true });
    } catch (err) {
      console.error(`[report-retry] retry failed analysis=${id}:`, err);
    }
  });

  return NextResponse.json({ status: "running" });
}
