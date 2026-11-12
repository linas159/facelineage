import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { Card, CardDescription, CardTitle, Chip } from "@/components/ui/card";
import { EthnicityExplorer } from "@/components/report/ethnicity-explorer";
import { GeneratingFlow } from "@/components/report/generating-flow";
import { ReportActions } from "@/components/report/report-actions";
import type { UpsellId } from "@/components/upsell-sections";
import { loadReport } from "@/lib/report-loader";
import { createClient } from "@/lib/supabase/server";
import { dictionaryFor, fmt, getLocale, localized } from "@/lib/i18n/server";
import type { UpsellSku } from "@/lib/report-loader";

const SKU_TO_UI_ID: Record<UpsellSku, UpsellId> = {
  upsell_v2_parents: "parents",
  upsell_v2_ethnicity: "ethnicity",
  upsell_v2_ages: "ages",
  upsell_v2_partner: "partner",
  upsell_v2_book: "book",
};

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const locale = await getLocale();
  const report = await loadReport(id);

  // A report is shown in the language it was generated in. Opened under the
  // wrong prefix (an emailed link, a language switch) → hop to its own one.
  if (report.locale && report.locale !== locale) {
    redirect(localized(`/report/${id}`, report.locale));
  }
  const t = dictionaryFor(report.locale ?? locale).report;

  if (report.status === "missing") {
    // RLS hides the row from signed-out visitors, so "missing" usually means
    // a paying customer opened the emailed link on another device/browser.
    // Send them to sign in and straight back here — not to the dashboard,
    // whose sign-up bounce drops the report and points at the quiz.
    const sb = await createClient();
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      const next = localized(`/report/${id}`, locale);
      redirect(localized(`/sign-up?next=${encodeURIComponent(next)}`, locale));
    }
    redirect(localized("/dashboard", locale));
  }

  // Unpaid draft (e.g., the user navigated here via the dashboard before
  // checking out). Send them to the paywall for this specific analysis.
  if (report.status === "idle" && !report.isPaid) {
    redirect(localized(`/paywall?analysis=${id}`, locale));
  }

  // In-flight: show the generating placeholder until polling sees `ready`.
  // We also treat paid `idle` as in-flight here: covers the brief window
  // between Stripe redirect and webhook touching the row.
  if (
    report.status === "idle" ||
    report.status === "queued" ||
    report.status === "running" ||
    report.status === "failed"
  ) {
    const initialStatus =
      report.status === "idle" ? "queued" : (report.status as "queued" | "running" | "failed");
    const unownedIds = (["parents", "ethnicity", "ages", "partner", "book"] as UpsellId[]).filter(
      (uiId) => {
        const sku = (Object.keys(SKU_TO_UI_ID) as UpsellSku[]).find(
          (s) => SKU_TO_UI_ID[s] === uiId,
        );
        return sku ? !(report.upsells[sku] && report.upsells[sku]!.length > 0) : true;
      },
    );
    return (
      <FunnelShell>
        <div className="pt-6 text-center">
          <Chip color="orange" className="mb-4">{t.paymentReceived}</Chip>
          <h1 className="mb-3 text-balance">{t.composingHeadline}</h1>
          <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--color-ink-soft)]">
            {t.composingBody}
          </p>
        </div>
        {/* Wrapper coordinates the spinner + upsell popups so the
            page only swaps to the full report once both the pipeline
            is ready and the user has dismissed every upsell modal. */}
        <GeneratingFlow
          analysisId={id}
          initialStatus={initialStatus}
          initialError={report.errorMessage}
          upsellIds={unownedIds}
        />
      </FunnelShell>
    );
  }

  // Ready (or demo) — render the full report
  const {
    conclusion,
    heritageStory,
    uniquenessScore,
    regions,
    facialTraits,
    culturalInsights,
    ancestor,
  } = report;

  return (
    <FunnelShell>
      {/* ─────────── HERO ─────────── */}
      <div className="pt-6 text-center">
        <Chip color="green" className="mb-4">{t.complete}</Chip>
        <h1 className="mb-3 text-balance">
          <Highlighted template={t.heroTitle} value={t.heroYears} />
        </h1>
        <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--color-ink-soft)]">
          {t.heroSub}
        </p>
      </div>

      {/* ─────────── ETHNICITY CONCLUSION ─────────── */}
      <Card className="mb-5 bg-[var(--color-orange-pale)]">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {t.conclusionEyebrow}
        </p>
        <CardTitle className="mb-2">{t.conclusionTitle}</CardTitle>
        <CardDescription>{conclusion}</CardDescription>
      </Card>

      {/* ─────────── PIE CHART + MAP + DETAIL ─────────── */}
      <EthnicityExplorer regions={regions} labels={t} />

      {/* ─────────── FACIAL TRAITS ─────────── */}
      <section className="mt-8">
        <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {t.traitsEyebrow}
        </p>
        <h2 className="mb-4 text-center text-2xl">{t.traitsTitle}</h2>
        <div className="space-y-4">
          {facialTraits.map((t) => (
            <Card key={t.key} className="!p-5">
              <div className="mb-3 flex items-center gap-4">
                {t.imageSrc && (
                  <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[var(--radius-input)] bg-[var(--color-bg-warm)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={t.imageSrc} alt={t.name} className="h-full w-full object-cover" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-lg">{t.name}</CardTitle>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {t.supportingRegions.map((iso) => (
                      <span
                        key={iso}
                        className="rounded-full bg-[var(--color-orange-pale)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--color-orange-deep)]"
                      >
                        {iso.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <CardDescription>{t.description}</CardDescription>
            </Card>
          ))}
        </div>
      </section>

      {/* ─────────── ANCESTOR PORTRAIT ─────────── */}
      <section className="mt-8">
        <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {t.ancestorEyebrow}
        </p>
        <h2 className="mb-4 text-center text-2xl">{t.ancestorTitle}</h2>
        <Card className="overflow-hidden !p-0">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-bg-warm)]">
            {ancestor.imageSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ancestor.imageSrc}
                alt={fmt(t.ancestorAlt, { name: ancestor.name })}
                className="h-full w-full object-cover"
              />
            )}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent p-5 text-white">
              <p className="font-display text-xl font-bold leading-tight">{ancestor.name}</p>
              <p className="mt-1 text-xs uppercase tracking-wider opacity-90">
                {ancestor.era} · {ancestor.place}
              </p>
            </div>
          </div>
          <div className="p-5">
            <CardDescription>{ancestor.description}</CardDescription>
          </div>
        </Card>
      </section>

      {/* ─────────── CULTURAL INSIGHTS ─────────── */}
      <section className="mt-8">
        <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {t.cultureEyebrow}
        </p>
        <h2 className="mb-4 text-center text-2xl">{t.cultureTitle}</h2>
        <div className="space-y-4">
          {culturalInsights.map((c) => (
            <Card key={c.key} className={c.imageSrc ? "overflow-hidden !p-0" : ""}>
              {c.imageSrc && (
                <div className="aspect-[16/9] w-full overflow-hidden bg-[var(--color-bg-warm)]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={c.imageSrc} alt={c.name} className="h-full w-full object-cover" />
                </div>
              )}
              <div className={c.imageSrc ? "p-5" : ""}>
                <CardTitle className="mb-2 text-lg">{c.name}</CardTitle>
                <CardDescription>{c.description}</CardDescription>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ─────────── HERITAGE STORY ─────────── */}
      <Card className="mt-8">
        <CardTitle className="mb-1">{t.storyTitle}</CardTitle>
        <CardDescription className="mb-4">{t.storySub}</CardDescription>
        <p className="text-base leading-relaxed text-[var(--color-ink-soft)]">
          <span className="float-left mr-2 font-display text-5xl leading-[0.85] text-[var(--color-orange)]">
            {heritageStory.charAt(0)}
          </span>
          {heritageStory.slice(1)}
        </p>
      </Card>

      {/* ─────────── UNIQUENESS SCORE ─────────── */}
      <Card className="mt-5 text-center">
        <CardTitle>{t.scoreTitle}</CardTitle>
        <p className="my-4 font-display text-6xl font-bold text-[var(--color-green)] tabular">
          {uniquenessScore}
          <span className="text-2xl">/100</span>
        </p>
        <CardDescription>{fmt(t.scoreBody, { n: uniquenessScore })}</CardDescription>
      </Card>

      {/* ─────────── SHARE / DOWNLOAD ─────────── */}
      <ReportActions analysisId={id} backHref={localized("/dashboard", report.locale ?? locale)} />

    </FunnelShell>
  );
}

/** Renders a dictionary line with `{years}`-style slot shown in the accent colour. */
function Highlighted({ template, value }: { template: string; value: string }) {
  const [before, after = ""] = template.split(/\{\w+\}/);
  return (
    <>
      {before}
      <span className="text-[var(--color-orange)]">{value}</span>
      {after}
    </>
  );
}
