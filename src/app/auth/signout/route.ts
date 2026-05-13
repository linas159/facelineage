import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * POST /auth/signout?next=/sign-up
 * Signs the user out and redirects. Use as the action of a small form.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  await sb.auth.signOut();
  const url = new URL(req.url);
  const next = url.searchParams.get("next") ?? "/";
  return NextResponse.redirect(new URL(next, req.url), { status: 303 });
}

// Also allow GET so a plain link works as a fallback.
export async function GET(req: NextRequest) {
  return POST(req);
}
