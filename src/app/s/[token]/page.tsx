import type { Metadata } from "next";
import { after } from "next/server";
import { cache } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, Chip } from "@/components/ui/card";
import { loadReport, type ReportData } from "@/lib/report-loader";
import { appOrigin, bumpShareView, resolveShareToken, shareUrl } from "@/lib/share";
import { DEFAULT_LOCALE } from "@/lib/i18n/config";
import { dictionaryFor, fmt, getLocale, localized } from "@/lib/i18n/server";

export const dynamic = "force-dynamic";

/**
 * Public, unauthenticated view of a shared report.
 *
 * Deliberately a teaser rather than the whole thing: the conclusion, the
 * ethnicity split, the ancestor portrait and the uniqueness score — enough
 * for the recipient to see what the sender got, while the facial-trait
 * breakdown and the long-form heritage story stay behind the purchase. The
 * uploaded selfie is never exposed here.
 */

const load = cache(async (token: string): Promise<ReportData | null> => {
  const analysisId = await resolveShareToken(token);
  if (!analysisId) return null;
  // The share token is the credential — the visitor has no session, so this
  // read has to bypass RLS.
  const report = await loadReport(analysisId, { bypassRls: true });
  return report.status === "ready" ? report : null;
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const report = await load(token);
  if (!report) return { title: "Facelineage" };

  const locale = report.locale ?? DEFAULT_LOCALE;
  const t = dictionaryFor(locale).share;
  const top = report.regions[0];
  const title = top
    ? fmt(t.metaTitleTop, { region: top.name, pct: top.pct.toFixed(1) })
    : t.metaTitle;
  const description = report.conclusion.slice(0, 200) || t.metaDescription;
  const url = shareUrl(token, locale);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: `${appOrigin()}/s/${token}/image`, width: 1024, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${appOrigin()}/s/${token}/image`],
    },
  };
}

export default async function SharedReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const report = await load(token);
  if (!report) notFound();

  // Render in the report's language, like the report page itself.
  const locale = report.locale ?? DEFAULT_LOCALE;
  if (locale !== (await getLocale())) redirect(localized(`/s/${token}`, locale));
  const t = dictionaryFor(locale).share;
  const r = dictionaryFor(locale).report;

  // Counting the visit must never delay (or fail) the render.
  after(() => bumpShareView(token));

  const { conclusion, regions, ancestor, uniquenessScore, culturalInsights } = report;
  const total = regions.reduce((sum, r) => sum + r.pct, 0) || 1;

  return (
    <main className="min-h-[100dvh] bg-[var(--color-bg-base)]">
      <header className="bg-[var(--color-bg-base)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">
          <Link href={localized("/", locale)}>
            <Logo className="h-10" />
          </Link>
          <Link href={localized("/quiz/1", locale)}>
            <Button size="sm">{t.tryCta}</Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md px-5 pb-16">
        <div className="pt-4 text-center">
          <Chip color="violet" className="mb-4">{t.chip}</Chip>
          <h1 className="mb-3 text-balance">
            {t.heroTitle.split("{years}")[0]}
            <span className="text-[var(--color-orange)]">{t.heroYears}</span>
            {t.heroTitle.split("{years}")[1]}
          </h1>
          <p className="mx-auto mb-6 max-w-sm text-sm text-[var(--color-ink-soft)]">
            {t.intro}
          </p>
        </div>

        {conclusion && (
          <Card className="mb-5 bg-[var(--color-orange-pale)]">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
              {t.conclusionEyebrow}
            </p>
            <CardTitle className="mb-2">{t.conclusionTitle}</CardTitle>
            <CardDescription>{conclusion}</CardDescription>
          </Card>
        )}

        {regions.length > 0 && (
          <Card className="mb-5">
            <CardTitle className="mb-4">{t.breakdownTitle}</CardTitle>
            <div className="space-y-3">
              {regions.map((r) => (
                <div key={r.key}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-semibold text-[var(--color-ink)]">{r.name}</span>
                    <span className="text-sm font-bold tabular text-[var(--color-ink-soft)]">
                      {r.pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-line)]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(2, (r.pct / total) * 100)}%`,
                        backgroundColor: r.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {ancestor.imageSrc && (
          <Card className="mb-5 overflow-hidden !p-0">
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-[var(--color-bg-warm)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ancestor.imageSrc}
                alt={fmt(r.ancestorAlt, { name: ancestor.name })}
                className="h-full w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/30 to-transparent p-5 text-white">
                <p className="font-display text-xl font-bold leading-tight">{ancestor.name}</p>
                <p className="mt-1 text-xs uppercase tracking-wider opacity-90">
                  {ancestor.era} · {ancestor.place}
                </p>
              </div>
            </div>
          </Card>
        )}

        {culturalInsights[0] && (
          <Card className="mb-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
              {t.insightEyebrow}
            </p>
            <CardTitle className="mb-2">{culturalInsights[0].name}</CardTitle>
            <CardDescription>{culturalInsights[0].description}</CardDescription>
          </Card>
        )}

        <Card className="mb-8 text-center">
          <CardTitle>{t.scoreTitle}</CardTitle>
          <p className="my-4 font-display text-6xl font-bold text-[var(--color-green)] tabular">
            {uniquenessScore}
            <span className="text-2xl">/100</span>
          </p>
          <CardDescription>{fmt(t.scoreBody, { n: uniquenessScore })}</CardDescription>
        </Card>

        <Card className="bg-[var(--color-orange-pale)] text-center">
          <CardTitle className="mb-2">{t.ctaTitle}</CardTitle>
          <CardDescription className="mb-5">{t.ctaBody}</CardDescription>
          <Link href={localized("/quiz/1", locale)}>
            <Button size="block">{t.ctaButton}</Button>
          </Link>
        </Card>

        <p className="mt-6 text-center text-[11px] text-[var(--color-ink-muted)]">
          {t.disclaimer}
        </p>
      </div>
    </main>
  );
}
