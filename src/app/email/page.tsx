import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { FunnelShell } from "@/components/funnel-shell";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { EmailClient } from "./email-client";
import { getLocale, localized } from "@/lib/i18n/server";
import { unlockIfSubscriber } from "@/lib/subscription-access";

export const dynamic = "force-dynamic";

/**
 * GET /email
 *
 * Sits between /analyzing and /paywall. Collects the user's email so we
 * have it before they hit checkout — simplifies account provisioning,
 * makes PayPal "we couldn't link this" failures impossible, and lets us
 * send the report-ready email even if the user bounces post-payment.
 *
 * Signed-in users skip this step — we already know their email. They also
 * have no `fl_pending_analysis_id` cookie (upload-photo only sets it for
 * anonymous visitors), so their analysis arrives as `?analysis=` from
 * /analyzing and is accepted only if they own it.
 */
export default async function EmailPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string }>;
}) {
  const jar = await cookies();
  const cookieAnalysisId = jar.get("fl_pending_analysis_id")?.value;
  const locale = await getLocale();

  // Already signed in? Stamp the email on the analysis and skip ahead.
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (user?.email) {
    const svc = createServiceClient();
    const paramId = (await searchParams).analysis;
    let analysisId = cookieAnalysisId;
    if (paramId) {
      const { data: owned } = await svc
        .from("analyses")
        .select("id")
        .eq("id", paramId)
        .eq("user_id", user.id)
        .maybeSingle();
      if (owned) analysisId = owned.id;
    }
    if (!analysisId) redirect(localized("/start", locale));
    await svc
      .from("analyses")
      .update({ email: user.email.toLowerCase(), user_id: user.id })
      .eq("id", analysisId);
    // Subscribers: new analyses are included — straight to the report.
    if (await unlockIfSubscriber({ analysisId, userId: user.id, email: user.email, db: svc })) {
      redirect(localized(`/report/${analysisId}`, locale));
    }
    redirect(localized(`/paywall?analysis=${encodeURIComponent(analysisId)}`, locale));
  }

  const analysisId = cookieAnalysisId;
  if (!analysisId) redirect(localized("/start", locale));

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
