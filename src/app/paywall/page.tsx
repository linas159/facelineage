import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type Stripe from "stripe";
import { FunnelShell } from "@/components/funnel-shell";
import { PaywallClient, type SavedPaymentMethod } from "./paywall-client";
import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { ViewContentBeacon } from "@/lib/meta/view-content";

export const dynamic = "force-dynamic";

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string }>;
}) {
  const params = await searchParams;
  let analysisId = params.analysis ?? null;
  let savedPm: SavedPaymentMethod | null = null;

  // 1) explicit ?analysis= wins.
  // 2) pre-auth cookie (set during capture).
  // 3) for a returning signed-in user, fall back to their latest analysis.
  if (!analysisId) {
    const jar = await cookies();
    analysisId = jar.get("fl_pending_analysis_id")?.value ?? null;
  }

  // For signed-in users: detect saved card on file so we can offer
  // one-tap "charge my card" instead of routing through /checkout.
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();

  if (user) {
    if (!analysisId) {
      const { data } = await sb
        .from("analyses")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      analysisId = data?.id ?? null;
    }

    // Look up Stripe customer + default PM
    const { data: subRow } = await sb
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (subRow?.stripe_customer_id && stripe) {
      try {
        const customer = (await stripe.customers.retrieve(subRow.stripe_customer_id)) as Stripe.Customer;
        const pmRef = customer.invoice_settings?.default_payment_method;
        const pmId = typeof pmRef === "string" ? pmRef : pmRef?.id;
        if (pmId) {
          const pm = await stripe.paymentMethods.retrieve(pmId);
          savedPm = paymentMethodSummary(pm);
        }
      } catch {
        // Customer / PM lookup failed — fall through to interactive checkout.
      }
    }
  }

  if (!analysisId) redirect("/start");

  return (
    <FunnelShell>
      <ViewContentBeacon
        contentName="paywall"
        contentCategory="funnel"
        contentIds={[analysisId]}
      />
      <PaywallClient analysisId={analysisId} savedPm={savedPm} />
    </FunnelShell>
  );
}

function paymentMethodSummary(pm: Stripe.PaymentMethod): SavedPaymentMethod | null {
  // Card-style PM
  if (pm.type === "card" && pm.card) {
    return {
      kind: "card",
      label: `${pm.card.brand.toUpperCase()} ●●●● ${pm.card.last4}`,
    };
  }
  // PayPal — Stripe's PaymentMethod type for PayPal
  if (pm.type === "paypal") {
    return {
      kind: "paypal",
      label: "PayPal",
    };
  }
  // Link
  if (pm.type === "link") {
    return {
      kind: "link",
      label: "Link",
    };
  }
  return null;
}
