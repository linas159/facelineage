import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { unlockIncludedAnalysis } from "@/lib/provisioning";

type DB = ReturnType<typeof createServiceClient>;

const LIVE_STATUSES: ReadonlySet<Stripe.Subscription.Status> = new Set(["active", "trialing"]);

/**
 * Every active/trialing Stripe subscription that belongs to this person.
 *
 * The `subscriptions` table keeps one row per user, but one person can own
 * several Stripe subscriptions under different Stripe customers: /api/checkout
 * creates a fresh customer per purchase, and the first checkout runs before
 * the auth user exists (so its subscription has no `supabase_user_id`). Look
 * them up by the customer on the user's row AND by every Stripe customer with
 * the account email.
 */
export async function findLiveSubscriptions(opts: {
  userId?: string | null;
  email?: string | null;
  db?: DB;
}): Promise<Stripe.Subscription[]> {
  if (!stripe) return [];
  const db = opts.db ?? createServiceClient();
  const customerIds = new Set<string>();

  if (opts.userId) {
    const { data: row } = await db
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", opts.userId)
      .maybeSingle();
    if (row?.stripe_customer_id) customerIds.add(row.stripe_customer_id);
  }

  const email = opts.email?.trim();
  if (email) {
    // Stripe's email filter is case-sensitive; checkout stores whatever the
    // customer typed, provisioning later mirrors the account (lower-case) one.
    for (const variant of new Set([email, email.toLowerCase()])) {
      const list = await stripe.customers.list({ email: variant, limit: 100 });
      for (const c of list.data) customerIds.add(c.id);
    }
  }

  const live = new Map<string, Stripe.Subscription>();
  for (const customer of customerIds) {
    const subs = await stripe.subscriptions.list({ customer, status: "all", limit: 100 });
    for (const s of subs.data) {
      if (LIVE_STATUSES.has(s.status)) live.set(s.id, s);
    }
  }
  return [...live.values()];
}

/**
 * Subscribers never see a paywall: if this signed-in user owns the analysis
 * and has a running subscription, mark it paid and start generation.
 * Returns true when the analysis is (now) unlocked.
 */
export async function unlockIfSubscriber(opts: {
  analysisId: string;
  userId: string;
  email?: string | null;
  db?: DB;
}): Promise<boolean> {
  const db = opts.db ?? createServiceClient();
  const { data: analysis } = await db
    .from("analyses")
    .select("user_id, is_paid")
    .eq("id", opts.analysisId)
    .maybeSingle();
  if (!analysis || analysis.user_id !== opts.userId) return false;
  if (analysis.is_paid) return true;
  if (!(await hasLiveSubscription({ userId: opts.userId, email: opts.email, db }))) return false;
  await unlockIncludedAnalysis({ analysisId: opts.analysisId, userId: opts.userId, db });
  return true;
}

/** True while the person has a running (active/trialing) subscription. */
export async function hasLiveSubscription(opts: {
  userId?: string | null;
  email?: string | null;
  db?: DB;
}): Promise<boolean> {
  try {
    return (await findLiveSubscriptions(opts)).length > 0;
  } catch (err) {
    console.error("[subscription-access] lookup failed:", err);
    return false;
  }
}
