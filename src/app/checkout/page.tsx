import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { CheckoutClient } from "./checkout-client";
import { LEGACY_PLAN_REPLACEMENT, isSellablePlan, type PlanKey } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/server";
import { getLocale, localized } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

type SearchParams = {
  plan?: string;
  analysis?: string;
  upsell?: string;
};

export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = await getLocale();

  // Upsell flow still requires a signed-in user (off-session charge needs a
  // saved card on the existing customer). The page itself doesn't enforce
  // auth — /api/upsell-charge does that and returns 401 if missing.
  if (params.upsell && params.analysis) {
    return (
      <FunnelShell showBack backHref={localized(`/report/${params.analysis}`, locale)}>
        <CheckoutClient
          mode="upsell"
          upsellId={params.upsell as "parents" | "ethnicity" | "ages" | "partner" | "book"}
          analysisId={params.analysis}
        />
      </FunnelShell>
    );
  }

  // Intro flow: guest-friendly. No auth needed — email is collected here.
  if (params.plan && params.analysis) {
    const { data: analysis } = await createServiceClient()
      .from("analyses")
      .select("is_paid")
      .eq("id", params.analysis)
      .maybeSingle();
    if (analysis?.is_paid) redirect(localized(`/report/${params.analysis}`, locale));

    const plan = params.plan as PlanKey;
    const replacement = LEGACY_PLAN_REPLACEMENT[plan];
    if (replacement) {
      redirect(
        localized(
          `/checkout?plan=${replacement}&analysis=${encodeURIComponent(params.analysis)}`,
          locale,
        ),
      );
    }
    if (!isSellablePlan(plan)) redirect(localized(`/paywall?analysis=${encodeURIComponent(params.analysis)}`, locale));
    return (
      <FunnelShell showBack backHref={localized(`/paywall?analysis=${params.analysis}`, locale)}>
        <CheckoutClient mode="intro" plan={plan} analysisId={params.analysis} />
      </FunnelShell>
    );
  }

  redirect(localized("/paywall", locale));
}
