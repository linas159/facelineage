import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/billing-portal
 *
 * Creates a Stripe Customer Portal session for the signed-in user and
 * returns the URL. The client redirects the browser to it. Portal handles
 * subscription cancellation, payment-method updates, and invoice viewing —
 * we don't replicate any of that in-app.
 *
 * Requires the user to have a `subscriptions.stripe_customer_id`. Anyone
 * who reached this route without a sub on file (shouldn't happen via the
 * account page) gets a 404.
 */
export async function POST() {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: sub } = await sb
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!sub?.stripe_customer_id) {
    return NextResponse.json(
      { error: "No subscription on file" },
      { status: 404 },
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://facelineage.com";

  const session = await stripe.billingPortal.sessions.create({
    customer: sub.stripe_customer_id,
    return_url: `${baseUrl}/account`,
  });

  return NextResponse.json({ url: session.url });
}
