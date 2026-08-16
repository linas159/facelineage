import { loadReport } from "@/lib/report-loader";
import { resolveShareToken } from "@/lib/share";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /s/[token]/image
 *
 * The OG/Twitter preview image for a shared report: the ancestor portrait,
 * proxied. Link unfurlers (iMessage, WhatsApp, Slack) can't be handed a
 * Supabase signed URL — it expires long before the preview is re-fetched —
 * so this stable URL re-signs and streams the bytes on demand.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const analysisId = await resolveShareToken(token);
  if (!analysisId) return fallback();

  const report = await loadReport(analysisId, { bypassRls: true });
  const src = report.status === "ready" ? report.ancestor.imageSrc : null;
  if (!src || !/^https?:\/\//.test(src)) return fallback();

  try {
    const upstream = await fetch(src, { signal: AbortSignal.timeout(10_000) });
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
    return new Response(await upstream.arrayBuffer(), {
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/png",
        // Safe to cache at the edge: the portrait for a given token never
        // changes, and the URL itself carries the (unguessable) credential.
        "cache-control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (err) {
    console.warn(
      `[share-image] proxy failed token=${token}: ${err instanceof Error ? err.message : String(err)}`,
    );
    return fallback();
  }
}

/** Fall back to the static brand image so unfurls never show a broken card. */
function fallback(): Response {
  return Response.redirect(
    `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/facelineage-logo.png`,
    302,
  );
}
