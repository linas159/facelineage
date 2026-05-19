import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import {
  metaEventId,
  readRequestContext,
  sendMetaEvent,
} from "@/lib/meta/capi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * POST /api/save-email
 * Body: { analysisId?: string, email: string }
 *
 * Saves the email to the analysis row. Falls back to the pre-auth cookie
 * (`fl_pending_analysis_id`) when no analysisId is sent. Returns 200 on
 * success. Idempotent — overwriting is fine.
 */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { analysisId?: string; email?: string }
    | null;
  if (!body?.email || !EMAIL_RE.test(body.email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const jar = await cookies();
  const analysisId = body.analysisId ?? jar.get("fl_pending_analysis_id")?.value;
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const db = createServiceClient();
  const { error } = await db
    .from("analyses")
    .update({ email })
    .eq("id", analysisId);
  if (error) {
    console.error("[save-email] update failed:", error);
    return NextResponse.json({ error: "Could not save email" }, { status: 500 });
  }

  // CAPI Lead — pairs with the browser Pixel Lead the email form fired
  // moments earlier (same event_id) so Meta dedupes them into one lead.
  const ctx = readRequestContext({
    headers: req.headers,
    url: req.headers.get("referer") ?? undefined,
  });
  void sendMetaEvent({
    eventName: "Lead",
    eventId: metaEventId.lead(analysisId),
    eventSourceUrl: ctx.eventSourceUrl,
    userData: {
      email,
      externalId: analysisId,
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
      fbp: ctx.fbp,
      fbc: ctx.fbc,
    },
    customData: { contentName: "email_capture" },
  });

  return NextResponse.json({ ok: true });
}
