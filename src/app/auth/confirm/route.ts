import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * GET /auth/confirm?token_hash=…&type=magiclink&next=/dashboard
 *
 * Server-side OTP verify. Works for both:
 *   1. Admin-generated magic links (e.g. /payment-complete) — we pass the
 *      hashed_token directly to this route, no email round-trip.
 *   2. User-clicked email links — requires Supabase Email Template to point
 *      to this route using `{{ .TokenHash }}` instead of `{{ .ConfirmationURL }}`.
 *
 * On success, Supabase sets the session cookie via the SSR client's
 * cookie handlers, and we redirect to `next`.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as "magiclink" | "email" | "recovery" | null;
  const next = url.searchParams.get("next") ?? "/dashboard";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/sign-up?error=missing_token", req.url));
  }

  const sb = await createClient();
  const { data, error } = await sb.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(`/sign-up?error=${encodeURIComponent(error?.message ?? "verify_failed")}`, req.url),
    );
  }

  // Claim any pre-auth analysis the user started before signing in.
  const jar = await cookies();
  const pendingAnalysisId = jar.get("fl_pending_analysis_id")?.value;
  if (pendingAnalysisId) {
    const svc = createServiceClient();
    await svc.from("analyses").update({ user_id: data.user.id }).eq("id", pendingAnalysisId);
    jar.set("fl_pending_analysis_id", "", { maxAge: 0, path: "/" });
  }

  return NextResponse.redirect(new URL(next, req.url));
}
