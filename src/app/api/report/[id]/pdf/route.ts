import { loadReport } from "@/lib/report-loader";
import { buildReportPdf } from "@/lib/pdf/report-pdf";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Building the document is fast; the ancestor-portrait fetch is the slow part.
export const maxDuration = 60;

/**
 * GET /api/report/[id]/pdf
 *
 * Streams the report back as a PDF attachment. Authorization is RLS:
 * `loadReport` reads through the user-scoped client, so a stranger's id comes
 * back as `missing`.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const report = await loadReport(id);

  if (report.status === "missing") {
    return jsonError("Not found", 404);
  }
  if (report.status !== "ready" && report.status !== "demo") {
    return jsonError("This report isn't finished yet", 409);
  }

  let bytes: Uint8Array;
  try {
    bytes = await buildReportPdf(report);
  } catch (err) {
    console.error(`[report-pdf] build failed analysis=${id}:`, err);
    return jsonError("Could not build the PDF", 500);
  }

  const top = report.regions[0]?.name ?? "heritage";
  const filename = `facelineage-${slug(top)}-report.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(bytes.byteLength),
      "content-disposition": `attachment; filename="${filename}"`,
      // Signed image URLs inside the build expire, and the report itself can
      // be regenerated — never let a proxy hold on to this.
      "cache-control": "private, no-store",
    },
  });
}

function jsonError(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function slug(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "heritage"
  );
}
