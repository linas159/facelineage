import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /auth/callback?code=…&next=/paywall
 *
 * Magic-link / OAuth landing route. Exchanges the code for a session, claims
 * any pending pre-auth analysis (created during capture before the user had
 * an account), then redirects to `next`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/sign-up?error=missing_code", req.url));
  }

  const sb = await createClient();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/sign-up?error=${encodeURIComponent(error.message)}`, req.url));
  }

  // Claim a pending analysis if the cookie was set during capture.
  const jar = await cookies();
  const pendingAnalysisId = jar.get("fl_pending_analysis_id")?.value;
  if (pendingAnalysisId) {
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const svc = createServiceClient();
      await svc.from("analyses").update({ user_id: user.id }).eq("id", pendingAnalysisId);
    }
    jar.set("fl_pending_analysis_id", "", { maxAge: 0, path: "/" });
  }

  return NextResponse.redirect(new URL(next, req.url));
}
