import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { stripe } from "@/lib/stripe";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * POST /api/delete-account
 *
 * GDPR "right to be forgotten". Permanently deletes everything tied to the
 * signed-in user:
 *   1. Stripe customer  → cascades into subscription cancellation + PII strip
 *   2. Storage objects  → selfie + generated + artifact files
 *   3. auth.users row   → cascades to profiles → analyses → subscriptions →
 *                         purchases → upsell_artifacts → onboarding_responses
 *   4. Confirmation email via Resend
 *
 * Requires `{ confirm: "DELETE" }` in the body so accidental fetches can't
 * destroy data. The client modal asks for this confirmation.
 */
export async function POST(req: NextRequest) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { confirm?: string };
  if (body.confirm !== "DELETE") {
    return NextResponse.json(
      { error: "Confirmation required" },
      { status: 400 },
    );
  }

  const userId = user.id;
  const email = user.email ?? null;
  const svc = createServiceClient();

  // 1. Stripe — cancels active subs + strips PII when we delete the customer.
  try {
    const { data: subRow } = await svc
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userId)
      .maybeSingle();
    const customerId = subRow?.stripe_customer_id;
    if (stripe && customerId) {
      // Delete cancels all subs on the customer automatically.
      await stripe.customers.del(customerId).catch((err) => {
        // Already deleted / unknown id → tolerate. Log and continue.
        console.warn(`[delete-account] stripe.customers.del failed:`, err);
      });
    }
  } catch (err) {
    console.error(`[delete-account] stripe cleanup failed:`, err);
  }

  // 2. Storage objects. Selfie photos live under `analysis-photos/{userId}/*`
  // (and pre-auth uploads under `pending-{uuid}/*`, but those are unreachable
  // after we delete the user's analysis rows below). Generated images and
  // upsell artifacts are keyed by analysis_id under `generated/shared/*` and
  // `generated/upsells/*`. We list each user's analyses and remove every
  // referenced storage object before the DB cascade nukes the row pointers.
  try {
    // Gather the user's analyses + their photo paths
    const { data: analyses } = await svc
      .from("analyses")
      .select("id, photo_path, ancestor")
      .eq("user_id", userId);

    const analysisIds = (analyses ?? []).map((a) => a.id);

    // 2a. Selfies (analysis-photos bucket)
    const selfiePaths: string[] = (analyses ?? [])
      .map((a) => a.photo_path)
      .filter((p): p is string => typeof p === "string" && p.length > 0);
    if (selfiePaths.length > 0) {
      const { error } = await svc.storage
        .from("analysis-photos")
        .remove(selfiePaths);
      if (error) {
        console.warn(`[delete-account] analysis-photos remove failed:`, error);
      }
    }

    // 2b. Generated + artifacts buckets. Both store files under per-analysis
    // prefixes; list and remove. The bucket folder structure is set by the
    // pipeline (lib/ai/pipeline.ts) — we mirror it here.
    for (const analysisId of analysisIds) {
      for (const [bucket, prefix] of [
        ["generated", `shared/${analysisId}`],
        ["generated", `upsells/${analysisId}`],
        ["artifacts", `${analysisId}`],
      ] as const) {
        const { data: list } = await svc.storage.from(bucket).list(prefix);
        if (!list || list.length === 0) continue;
        const paths = list.map((f) => `${prefix}/${f.name}`);
        const { error } = await svc.storage.from(bucket).remove(paths);
        if (error) {
          console.warn(
            `[delete-account] ${bucket}:${prefix} remove failed:`,
            error,
          );
        }
      }
    }
  } catch (err) {
    console.error(`[delete-account] storage cleanup failed:`, err);
  }

  // 3. Delete auth user — cascades to profiles → analyses/subscriptions/
  // purchases/upsell_artifacts/onboarding_responses (all FK with cascade).
  const { error: delErr } = await svc.auth.admin.deleteUser(userId);
  if (delErr) {
    console.error(`[delete-account] deleteUser failed:`, delErr);
    return NextResponse.json(
      { error: "Could not delete account. Please contact support." },
      { status: 500 },
    );
  }

  // 4. Confirmation email (best-effort).
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey && email) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: process.env.EMAIL_FROM ?? "Facelineage <support@facelineage.com>",
        to: email,
        replyTo: process.env.EMAIL_REPLY_TO ?? "support@facelineage.com",
        subject: "Your Facelineage account has been deleted",
        text:
          "We've permanently deleted your Facelineage account and all associated " +
          "data (selfie, report, subscription, payment history).\n\n" +
          "If this wasn't you, reply to this email immediately — we'll investigate.\n\n" +
          "— Facelineage",
      });
    } catch (err) {
      console.warn(`[delete-account] confirmation email failed:`, err);
    }
  }

  return NextResponse.json({ success: true });
}
