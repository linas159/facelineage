import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FunnelShell } from "@/components/funnel-shell";
import { PaywallClient } from "./paywall-client";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PaywallPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string }>;
}) {
  const params = await searchParams;
  let analysisId = params.analysis ?? null;

  // 1) explicit ?analysis= wins.
  // 2) pre-auth cookie (set during capture).
  // 3) for a returning signed-in user, fall back to their latest analysis.
  if (!analysisId) {
    const jar = await cookies();
    analysisId = jar.get("fl_pending_analysis_id")?.value ?? null;
  }
  if (!analysisId) {
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (user) {
      const { data } = await sb
        .from("analyses")
        .select("id")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      analysisId = data?.id ?? null;
    }
  }

  if (!analysisId) redirect("/start");

  return (
    <FunnelShell>
      <PaywallClient analysisId={analysisId} />
    </FunnelShell>
  );
}
