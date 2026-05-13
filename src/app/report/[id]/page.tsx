import Link from "next/link";
import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, Chip } from "@/components/ui/card";
import { EthnicityExplorer } from "@/components/report/ethnicity-explorer";
import { GeneratingState } from "@/components/report/generating-state";
import { loadReport } from "@/lib/report-loader";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await loadReport(id);

  if (report.status === "missing") {
    redirect("/dashboard");
  }

  // Unpaid draft (e.g., the user navigated here via the dashboard before
  // checking out). Send them to the paywall for this specific analysis.
  if (report.status === "idle" && !report.isPaid) {
    redirect(`/paywall?analysis=${id}`);
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
    return (
      <FunnelShell>
        <div className="pt-6 text-center">
          <Chip color="orange" className="mb-4">Payment received</Chip>
          <h1 className="mb-3 text-balance">
            Your report is being composed.
          </h1>
          <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--color-ink-soft)]">
            Sit tight — we&apos;re reading your selfie, mapping your regions, and painting your ancestor portrait.
          </p>
        </div>
        <GeneratingState
          analysisId={id}
          initialStatus={initialStatus}
          initialError={report.errorMessage}
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
        <Chip color="green" className="mb-4">Report complete</Chip>
        <h1 className="mb-3 text-balance">
          Your face tells a story <span className="text-[var(--color-orange)]">12,000 years</span> in the making.
        </h1>
        <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--color-ink-soft)]">
          Here&apos;s the heritage written into your features.
        </p>
      </div>

      {/* ─────────── ETHNICITY CONCLUSION ─────────── */}
      <Card className="mb-5 bg-[var(--color-orange-pale)]">
        <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Conclusion
        </p>
        <CardTitle className="mb-2">Your heritage at a glance</CardTitle>
        <CardDescription>{conclusion}</CardDescription>
      </Card>

      {/* ─────────── PIE CHART + MAP + DETAIL ─────────── */}
      <EthnicityExplorer regions={regions} />

      {/* ─────────── FACIAL TRAITS ─────────── */}
      <section className="mt-8">
        <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Facial traits
        </p>
        <h2 className="mb-4 text-center text-2xl">Six features, six clues</h2>
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
          Your ancestor
        </p>
        <h2 className="mb-4 text-center text-2xl">A face from your line</h2>
        <Card className="overflow-hidden !p-0">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-bg-warm)]">
            {ancestor.imageSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ancestor.imageSrc}
                alt={`Ancestor portrait — ${ancestor.name}`}
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
          Cultural insights
        </p>
        <h2 className="mb-4 text-center text-2xl">Where your face feels at home</h2>
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
        <CardTitle className="mb-1">Your heritage story</CardTitle>
        <CardDescription className="mb-4">
          A narrative woven from your strongest matches.
        </CardDescription>
        <p className="text-base leading-relaxed text-[var(--color-ink-soft)]">
          <span className="float-left mr-2 font-display text-5xl leading-[0.85] text-[var(--color-orange)]">
            {heritageStory.charAt(0)}
          </span>
          {heritageStory.slice(1)}
        </p>
      </Card>

      {/* ─────────── UNIQUENESS SCORE ─────────── */}
      <Card className="mt-5 text-center">
        <CardTitle>Facial uniqueness score</CardTitle>
        <p className="my-4 font-display text-6xl font-bold text-[var(--color-green)] tabular">
          {uniquenessScore}
          <span className="text-2xl">/100</span>
        </p>
        <CardDescription>
          Your combination of features is rarer than {uniquenessScore}% of analyses we&apos;ve run.
        </CardDescription>
      </Card>

      {/* ─────────── SHARE / DOWNLOAD ─────────── */}
      <div className="mt-8 flex flex-col gap-3">
        <Button size="block">Share my result</Button>
        <Button size="block" variant="secondary">Download PDF</Button>
        <Link href="/dashboard">
          <Button size="block" variant="ghost">Back to my reports</Button>
        </Link>
      </div>

    </FunnelShell>
  );
}
