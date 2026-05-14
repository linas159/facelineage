import { redirect } from "next/navigation";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { FunnelShell } from "@/components/funnel-shell";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

type SearchParams = {
  payment_intent?: string;
  redirect_status?: string;
  analysis?: string;
};

/**
 * GET /payment-complete
 *
 * Stripe redirects here after the user pays the intro fee. Responsibilities:
 *   1. Confirm the PaymentIntent actually succeeded (don't trust query params).
 *   2. Provision a Supabase user from the email Stripe collected.
 *   3. Claim the analysis row to that user.
 *   4. Generate a magic-link via the Supabase admin API and redirect the
 *      browser to its `action_link`. Supabase verifies the token, sets the
 *      session cookie, and redirects to /report/[analysisId].
 *
 * The webhook also handles steps 2-3 idempotently for cases where this
 * page never loads (e.g. user closes the tab). This route is the happy-path.
 */
export default async function PaymentCompletePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  if (!stripe || !params.payment_intent || !params.analysis) {
    return failed("Missing payment details. If you were charged, please contact support.");
  }

  // 1. Verify with Stripe (don't trust redirect_status alone).
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(params.payment_intent);
  } catch {
    return failed("Couldn't verify the payment. Please contact support.");
  }
  if (pi.status !== "succeeded") {
    return failed(`Payment is ${pi.status}. Please try again or contact support.`);
  }

  // Email lives on the PaymentMethod's billing_details (wallet auto-fills it;
  // card form collects it inline). Fall back to receipt_email just in case.
  let email: string | undefined;
  const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id;
  if (pmId) {
    try {
      const pm = await stripe.paymentMethods.retrieve(pmId);
      email = pm.billing_details?.email ?? undefined;
    } catch {
      // ignore — fall through to receipt_email
    }
  }
  if (!email) email = pi.receipt_email ?? undefined;

  const analysisId = pi.metadata?.analysis_id ?? params.analysis;
  if (!email || !analysisId) {
    return failed("Payment confirmed but we couldn't link it to your account. Please contact support.");
  }

  const db = createServiceClient();

  // 2. Find or create the Supabase user. We use the admin API so we can
  // auto-confirm their email (they just proved ownership via Stripe).
  const user = await getOrCreateUser(db, email);
  if (!user) {
    return failed("Couldn't provision your account. Please contact support.");
  }

  // 3. Claim the analysis row + mark paid + queue the pipeline (webhook
  // may have already done this; everything below is idempotent).
  await db
    .from("analyses")
    .update({ user_id: user.id, is_paid: true, generation_status: "queued" })
    .eq("id", analysisId);

  // (The pre-auth cookie is cleared by /auth/confirm — page components
  // can't write cookies in Next.js 15.)

  // 4. Mint a one-time token via the admin API. We don't use the action_link
  // returned by Supabase — its redirect uses a URL fragment which we can't
  // read server-side. Instead, we pass the hashed_token directly to our own
  // /auth/confirm route, which calls verifyOtp + sets the session cookie.
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const { data: linkData } = await db.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  const hashedToken = linkData?.properties?.hashed_token;
  if (!hashedToken) {
    return failed("Couldn't sign you in automatically. Please log in via the email we sent.");
  }

  redirect(
    `${baseUrl}/auth/confirm?token_hash=${encodeURIComponent(hashedToken)}` +
      `&type=magiclink&next=${encodeURIComponent(`/report/${analysisId}`)}`,
  );
}

async function getOrCreateUser(
  db: ReturnType<typeof createServiceClient>,
  email: string,
) {
  // Check existing user. The admin API doesn't have a "get by email" helper,
  // so we use listUsers with an email filter (Supabase 2024+).
  const { data: list } = await db.auth.admin.listUsers();
  const existing = list?.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) return existing;

  const { data: created, error } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
  });
  if (error) {
    console.error("createUser failed:", error);
    return null;
  }
  return created.user;
}

function failed(message: string) {
  return (
    <FunnelShell>
      <Card className="mt-10 text-center">
        <CardTitle className="mb-2">Hmm, something didn&apos;t line up.</CardTitle>
        <CardDescription>{message}</CardDescription>
      </Card>
    </FunnelShell>
  );
}
