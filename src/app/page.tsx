import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { FunnelCta } from "@/components/funnel-cta";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TestimonialsSection } from "@/components/testimonials";
import { SlicedPortrait } from "@/components/sliced-portrait";
import { WorldMapBackground } from "@/components/world-map-background";
import { ColoredWorldMap } from "@/components/report/colored-world-map";
import { HeritageMirror } from "@/components/landing/heritage-mirror";
import { REGIONS } from "@/lib/report-data";
import { getDictionary, getLocale, localized } from "@/lib/i18n/server";
import { ViewContentBeacon } from "@/lib/meta/view-content";

const SAMPLE_MAP_PAINT = REGIONS.flatMap((r) =>
  r.countries.map((c) => ({ iso2: c.iso2, color: r.color })),
);

export default async function LandingPage() {
  const dict = await getDictionary();
  const locale = await getLocale();
  const l = (href: string) => localized(href, locale);
  return (
    <main className="bg-[var(--color-bg-base)]">
      <ViewContentBeacon
        contentName="landing"
        contentCategory="marketing"
      />
      {/* ───────────────── HERO — tight stack, minimal top/bottom padding ─────────────────
          Naturally sized (no 100dvh stretch), so the next section starts right after. */}
      <section className="relative">
        {/* Faded world map fills the hero background, behind everything */}
        <WorldMapBackground />
        {/* Nav */}
        <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-5 pt-3 pb-1">
          <Logo className="h-10" />
          <div className="flex items-center gap-2">
            <Link href={l("/refunds")}>
              <Button variant="ghost" size="sm">{dict.nav.askForRefund}</Button>
            </Link>
            <Link href={l("/sign-up")}>
              <Button variant="ghost" size="sm">{dict.nav.signIn}</Button>
            </Link>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-5">
          {/* Sliced portrait — natural size, tight padding */}
          <div className="flex justify-center py-2">
            <SlicedPortrait
              className="w-full"
              scanLabel={dict.landing.heroBadge}
              chipLabels={dict.flagLabels}
            />
          </div>

          {/* Headline + subhead + CTA — sits right under the portrait */}
          <div className="pt-5">
            <h1 className="mb-2 text-center text-balance leading-[1.05]">
              {dict.landing.heroHeadline}
            </h1>
            <p className="mb-4 text-center text-sm leading-snug text-[var(--color-ink-soft)]">
              {dict.landing.heroSubhead}
            </p>
            <FunnelCta
              size="block"
              onboardingHref={l("/onboarding/1")}
              quizHref={l("/quiz/1")}
            >
              {dict.landing.heroCta}
            </FunnelCta>
            <p className="mt-2.5 text-center text-[11px] text-[var(--color-ink-muted)]">
              {dict.landing.heroRating}
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── BELOW-THE-FOLD ───────────────── */}

      {/* Stats strip */}
      <section className="bg-[var(--color-bg-soft)] px-5 py-8">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-3 text-center">
          {[
            ["124K+", dict.landing.statsReports],
            ["94", dict.landing.statsRegions],
            ["6 sec", dict.landing.statsAvgScan],
          ].map(([stat, label]) => (
            <div key={label}>
              <div className="font-display text-2xl font-bold text-[var(--color-orange)] tabular">{stat}</div>
              <div className="text-xs text-[var(--color-ink-muted)]">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-md px-5 py-12">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {dict.landing.howItWorksEyebrow}
        </p>
        <h2 className="mb-8 text-center">{dict.landing.howItWorksHeading}</h2>
        <ol className="space-y-4">
          {[
            ["1", dict.landing.step1Title, dict.landing.step1Body],
            ["2", dict.landing.step2Title, dict.landing.step2Body],
            ["3", dict.landing.step3Title, dict.landing.step3Body],
          ].map(([n, title, desc]) => (
            <li key={n}>
              <Card className="flex items-start gap-4">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-orange-pale)] font-display text-lg font-bold text-[var(--color-orange)]">
                  {n}
                </div>
                <div>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <CardDescription className="mt-1">{desc}</CardDescription>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* Sample report visual */}
      <section className="mx-auto max-w-md px-5 py-8">
        <p className="mb-2 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          {dict.landing.sampleEyebrow}
        </p>
        <h2 className="mb-2 text-center">{dict.landing.sampleHeading}</h2>
        <p className="mx-auto mb-6 max-w-sm text-center text-sm text-[var(--color-ink-soft)]">
          {dict.landing.sampleBody}
        </p>
        <Card>
          <ColoredWorldMap
            paint={SAMPLE_MAP_PAINT}
            className="mb-4 aspect-[2/1] w-full overflow-hidden rounded-[var(--radius-input)] bg-[var(--color-bg-warm)]"
          />
          <div className="mb-5 flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <span
                key={r.key}
                className="inline-flex items-center gap-2 rounded-[var(--radius-chip)] bg-white px-3 py-2 text-sm font-semibold shadow-[var(--shadow-chip)]"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ background: r.color }}
                />
                {r.name} {r.pct.toFixed(1)}%
              </span>
            ))}
          </div>

          {/* Ancestor portrait teaser */}
          <div className="mb-5 flex items-center gap-4 rounded-[var(--radius-input)] bg-[var(--color-bg-warm)] p-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-full ring-2 ring-white shadow-[var(--shadow-chip)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/report/ancestor-portrait.png"
                alt="Sample ancestor portrait"
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="font-bold text-[var(--color-ink)]">{dict.landing.ancestorPortraitTitle}</p>
              <p className="text-xs leading-snug text-[var(--color-ink-soft)]">
                {dict.landing.ancestorPortraitBody}
              </p>
            </div>
          </div>

          <Link href={l("/report/demo")}>
            <Button size="block" variant="secondary">{dict.landing.viewSampleReport}</Button>
          </Link>
        </Card>
      </section>

      {/* Heritage Mirror — single morphing portrait */}
      <HeritageMirror />

      {/* Testimonials — Trustpilot-style trust card + per-user cards */}
      <TestimonialsSection
        heading={dict.landing.testimonialsHeading}
        bigNumber={dict.landing.trustBigNumber}
        bigNumberSub={dict.landing.trustBigNumberSub}
        rating={dict.landing.trustRating}
        ratingSub={dict.landing.trustRatingSub}
        outOf5Label={dict.landing.trustOutOf5}
        verifiedOnLabel={dict.landing.trustVerifiedOn}
        starsAlt={dict.landing.trust5Stars}
        groupImageAlt={dict.landing.testimonialsImageAlt}
        quoteOverrides={{
          "Maya R.": dict.testimonialQuotes.mayaR,
          "Daniel K.": dict.testimonialQuotes.danielK,
          "Priya S.": dict.testimonialQuotes.priyaS,
          "Carlos M.": dict.testimonialQuotes.carlosM,
          "Aiko T.": dict.testimonialQuotes.aikoT,
        }}
      />

      {/* CTA */}
      <section className="mx-auto max-w-md px-5 pb-16 pt-8">
        <Card className="bg-[var(--color-orange-pale)] text-center">
          <h3 className="mb-2 font-display text-2xl">{dict.landing.ctaReady}</h3>
          <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
            {dict.landing.ctaSub}
          </p>
          <FunnelCta
            size="block"
            className="max-w-xs mx-auto"
            onboardingHref={l("/onboarding/1")}
            quizHref={l("/quiz/1")}
          >
            {dict.landing.ctaButton}
          </FunnelCta>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-md px-5 py-8 text-center text-sm text-[var(--color-ink-muted)]">
        <p>© {new Date().getFullYear()} Facelineage</p>
        <hr className="mt-3" />
        <div className="mt-4 flex flex-wrap justify-center gap-x-5 gap-y-2 text-base font-medium">
          <Link href={l("/privacy")} className="hover:text-[var(--color-orange)]">{dict.footer.privacy}</Link>
          <Link href={l("/terms")} className="hover:text-[var(--color-orange)]">{dict.footer.terms}</Link>
          <Link href={l("/cookies")} className="hover:text-[var(--color-orange)]">{dict.footer.cookies}</Link>
          <Link href={l("/refunds")} className="hover:text-[var(--color-orange)]">{dict.footer.refunds}</Link>
          <Link href={l("/contact")} className="hover:text-[var(--color-orange)]">{dict.footer.contact}</Link>
        </div>
      </footer>
    </main>
  );
}
