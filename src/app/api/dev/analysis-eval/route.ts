import { NextResponse } from "next/server";
import { analyzeFace } from "@/lib/ai/claude";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/dev/analysis-eval  — accuracy harness only. Not a product route.
 *
 * Exists so `scripts/eval-analysis.mjs` can score the *real* `analyzeFace`
 * rather than a copy of the prompt that would quietly drift out of sync with
 * the one customers actually hit. That fidelity is the whole point: an eval
 * that scores a duplicate prompt tells you nothing about production.
 *
 * Disabled unless ANALYSIS_EVAL_ENABLED=1 is set, and it answers 404 (not 403)
 * when it is off, so the endpoint is indistinguishable from a typo in prod.
 * There is no auth beyond that flag — never set it on a public deployment.
 */
export async function POST(req: Request) {
  if (process.env.ANALYSIS_EVAL_ENABLED !== "1") {
    return new NextResponse(null, { status: 404 });
  }

  let body: {
    imageBase64?: string;
    mediaType?: string;
    context?: Record<string, unknown>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  if (!body.imageBase64) {
    return NextResponse.json({ error: "imageBase64 is required" }, { status: 400 });
  }

  const mediaType =
    body.mediaType === "image/png" || body.mediaType === "image/webp"
      ? body.mediaType
      : "image/jpeg";

  const startedAt = Date.now();
  try {
    const result = await analyzeFace({
      imageBase64: body.imageBase64,
      mediaType,
      context: (body.context ?? {}) as Parameters<typeof analyzeFace>[0]["context"],
    });
    return NextResponse.json({ ok: true, elapsedMs: Date.now() - startedAt, result });
  } catch (err) {
    // Reported rather than thrown: a run of 20 images should record which one
    // failed and keep going, not abort the whole sweep on the first bad photo.
    return NextResponse.json(
      {
        ok: false,
        elapsedMs: Date.now() - startedAt,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 },
    );
  }
}
