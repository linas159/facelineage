import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/delete-account — DISABLED.
 *
 * Self-serve account/data deletion is no longer available. This route
 * previously deleted the Stripe customer, all storage objects, and the
 * auth.users row (GDPR cascade). It has been intentionally disabled so no
 * customer-initiated request can delete the Stripe customer or their data.
 *
 * GDPR "right to erasure" requests are now handled manually via support
 * (support@facelineage.com). If the self-serve flow is ever reinstated, the
 * prior implementation is recoverable from git history.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "Account deletion is no longer available here. Email support@facelineage.com to request data erasure.",
    },
    { status: 410 },
  );
}
