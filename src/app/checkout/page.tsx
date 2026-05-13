import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { CheckoutClient } from "./checkout-client";
import { PLANS, type PlanKey } from "@/lib/stripe";

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

  // Upsell flow still requires a signed-in user (off-session charge needs a
  // saved card on the existing customer). The page itself doesn't enforce
  // auth — /api/upsell-charge does that and returns 401 if missing.
  if (params.upsell && params.analysis) {
    return (
      <FunnelShell showBack backHref={`/report/${params.analysis}`}>
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
    const plan = params.plan as PlanKey;
    if (!PLANS[plan]) redirect("/paywall");
    return (
      <FunnelShell showBack backHref="/paywall">
        <CheckoutClient mode="intro" plan={plan} analysisId={params.analysis} />
      </FunnelShell>
    );
  }

  redirect("/paywall");
}
