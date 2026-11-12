import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { appOrigin, getOrCreateShareToken, shareUrl } from "@/lib/share";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n/config";
import { dictionaryFor, fmt, localized } from "@/lib/i18n/server";

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
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // The demo report has no DB row — share the demo page itself, in the
  // language the sharer is browsing (API routes carry no locale prefix).
  if (id === "demo") {
    const ref = new URL(req.headers.get("referer") ?? appOrigin()).pathname.split("/")[1];
    const locale = isLocale(ref) ? ref : DEFAULT_LOCALE;
    const t = dictionaryFor(locale).share;
    return NextResponse.json({
      url: `${appOrigin()}${localized("/report/demo", locale)}`,
      title: t.shareTitle,
      text: t.shareTextGeneric,
    });
  }

  const sb = await createClient();
  const { data: row } = await sb
    .from("analyses")
    .select("id, generation_status, regions, is_paid, locale")
    .eq("id", id)
    .maybeSingle();

  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (row.generation_status !== "ready" || !row.is_paid) {
    return NextResponse.json(
      { error: "This report isn't finished yet" },
      { status: 409 },
    );
  }

  const token = await getOrCreateShareToken(id);
  if (!token) {
    return NextResponse.json({ error: "Could not create share link" }, { status: 500 });
  }

  // Shared in the report's own language — the recipient lands on the same.
  const locale = isLocale(row.locale) ? row.locale : DEFAULT_LOCALE;
  const t = dictionaryFor(locale).share;
  const top = (row.regions as Array<{ name?: string; pct?: number }> | null)?.[0];
  const text = top?.name ? fmt(t.shareTextTop, { region: top.name }) : t.shareTextGeneric;

  return NextResponse.json({
    url: shareUrl(token, locale),
    title: t.shareTitle,
    text,
  });
}
