import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, getOrCreateShareToken, shareUrl } from "@/lib/share";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/share/[id]
 *
 * Mints (or returns) the public link for a finished report and hands the
 * client everything it needs for `navigator.share()`. Authorization is RLS:
 * the read below goes through the user-scoped client, so it only succeeds for
 * someone who can already see the analysis.
 */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // The demo report has no DB row — share the demo page itself.
  if (id === "demo") {
    return NextResponse.json({
      url: `${appOrigin()}/report/demo`,
      title: "My Facelineage heritage report",
      text: "I traced my face back through 12,000 years of heritage. Take a look:",
    });
  }

  const sb = await createClient();
  const { data: row } = await sb
    .from("analyses")
    .select("id, generation_status, regions")
    .eq("id", id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.generation_status !== "ready") {
    return NextResponse.json(
      { error: "This report isn't finished yet" },
      { status: 409 },
    );
  }

  const token = await getOrCreateShareToken(id);
  if (!token) {
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }

  const top = (row.regions as Array<{ name?: string; pct?: number }> | null)?.[0];
  const text = top?.name
    ? `My face traces back to ${top.name} heritage. See the full breakdown:`
    : "I traced my face back through 12,000 years of heritage. Take a look:";

  return NextResponse.json({
    url: shareUrl(token),
    title: "My Facelineage heritage report",
    text,
  });
}
