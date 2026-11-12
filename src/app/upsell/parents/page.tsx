import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { ParentsUploadForm } from "./parents-upload-form";
import { createClient } from "@/lib/supabase/server";
import { getLocale, localized } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

export default async function ParentsUpsellPage({
  searchParams,
}: {
  searchParams: Promise<{ analysis?: string }>;
}) {
  const params = await searchParams;
  const locale = await getLocale();
  if (!params.analysis) redirect(localized("/dashboard", locale));

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    const next = localized(`/upsell/parents?analysis=${params.analysis}`, locale);
    redirect(localized(`/sign-up?next=${encodeURIComponent(next)}`, locale));
  }

  return (
    <FunnelShell showBack backHref={`/report/${params.analysis}`}>
      <div className="pt-6 text-center">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Add-on · Parents
        </p>
        <h1 className="mb-3 text-balance">Upload one photo of each parent</h1>
        <p className="mx-auto mb-8 max-w-sm text-sm text-[var(--color-ink-soft)]">
          We&apos;ll compare your features against both parents&apos; and tell you which
          traits came from which side. Photos delete in 30 days, same as your selfie.
        </p>
      </div>
      <ParentsUploadForm analysisId={params.analysis} />
    </FunnelShell>
  );
}
