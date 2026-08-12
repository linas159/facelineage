import { NextResponse, after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { runMainPipeline, isRecoverable } from "@/lib/ai/pipeline";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// A repair kicked off from here runs in `after()`, on this invocation.
export const maxDuration = 300;

/**
 * GET /api/report-status/[id]
 * Lightweight polling endpoint for the report page's "generating…" state.
 *
 * Doubles as the self-healing hook: a paid analysis that is stuck (failed, or
 * still `queued`, or holding a `running` claim from an invocation that died)
 * gets its pipeline re-fired here, in the background, while the page keeps
 * polling. The customer sitting on the page is exactly who we want to recover
 * for, and `runMainPipeline` resumes from wherever the previous run stopped.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (id === "demo") {
    return NextResponse.json({ status: "demo" });
  }
  const sb = await createClient();
  const { data } = await sb
    .from("analyses")
    .select(
      "generation_status, generation_error, is_paid, generation_started_at, generation_attempts",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ status: "missing" });

  const status = data.generation_status ?? "idle";

  if (
    data.is_paid &&
    isRecoverable({
      status,
      startedAt: data.generation_started_at,
      attempts: data.generation_attempts,
    })
  ) {
    console.log(`[report-status] re-firing stuck pipeline analysis=${id} (status=${status})`);
    after(async () => {
      try {
        await runMainPipeline(id);
      } catch (err) {
        console.error(`[report-status] repair failed analysis=${id}:`, err);
      }
    });
    // Report it as in-flight so the page keeps its spinner rather than
    // flashing the failure card for one poll cycle.
    return NextResponse.json({ status: "running", error: null });
  }

  return NextResponse.json({
    status,
    error: data.generation_error ?? null,
  });
}
