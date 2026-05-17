import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FunnelShell } from "@/components/funnel-shell";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { EmailClient } from "./email-client";

export const dynamic = "force-dynamic";

/**
 * GET /email
 *
 * Sits between /analyzing and /paywall. Collects the user's email so we
 * have it before they hit checkout — simplifies account provisioning,
 * makes PayPal "we couldn't link this" failures impossible, and lets us
 * send the report-ready email even if the user bounces post-payment.
 *
 * Signed-in users skip this step — we already know their email.
 */
export default async function EmailPage() {
  const jar = await cookies();
  const analysisId = jar.get("fl_pending_analysis_id")?.value;
  if (!analysisId) redirect("/start");

  // Already signed in? Stamp the email on the analysis and skip ahead.
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user?.email) {
    const svc = createServiceClient();
    await svc
      .from("analyses")
      .update({ email: user.email.toLowerCase(), user_id: user.id })
      .eq("id", analysisId);
    redirect("/paywall");
  }

  // Prefill if we already stored an email on this analysis (back nav).
  const svc = createServiceClient();
  const { data: row } = await svc
    .from("analyses")
    .select("email")
    .eq("id", analysisId)
    .maybeSingle();

  return (
    <FunnelShell>
      <EmailClient initialEmail={row?.email ?? ""} />
    </FunnelShell>
  );
}
