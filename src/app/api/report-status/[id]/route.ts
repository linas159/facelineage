import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /api/report-status/[id]
 * Lightweight polling endpoint for the report page's "generating…" state.
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
    .select("generation_status, generation_error")
    .eq("id", id)
    .maybeSingle();
  if (!data) return NextResponse.json({ status: "missing" });
  return NextResponse.json({
    status: data.generation_status ?? "idle",
    error: data.generation_error ?? null,
  });
}
