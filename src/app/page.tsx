import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { TestimonialsSection } from "@/components/testimonials";
import { SlicedPortrait } from "@/components/sliced-portrait";
import { WorldMapBackground } from "@/components/world-map-background";
import { ColoredWorldMap } from "@/components/report/colored-world-map";
import { HeritageMirror } from "@/components/landing/heritage-mirror";
import { REGIONS } from "@/lib/report-data";

const SAMPLE_MAP_PAINT = REGIONS.flatMap((r) =>
  r.countries.map((c) => ({ iso2: c.iso2, color: r.color })),
);

export default function LandingPage() {
  return (
    <main className="bg-[var(--color-bg-base)]">
      {/* ───────────────── HERO — tight stack, minimal top/bottom padding ─────────────────
          Naturally sized (no 100dvh stretch), so the next section starts right after. */}
      <section className="relative">
        {/* Faded world map fills the hero background, behind everything */}
        <WorldMapBackground />
        {/* Nav */}
        <header className="relative z-10 mx-auto flex w-full max-w-md items-center justify-between px-5 pt-3 pb-1">
          <Logo className="h-10" />
          <Link href="/sign-up">
            <Button variant="ghost" size="sm">Sign in</Button>
          </Link>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-md px-5 pb-5">
          {/* Sliced portrait — natural size, tight padding */}
          <div className="flex justify-center py-2">
            <SlicedPortrait className="w-full" />
          </div>

          {/* Headline + subhead + CTA — sits right under the portrait */}
          <div className="pt-5">
            <h1 className="mb-2 text-center text-balance leading-[1.05]">
              Where in the world does <span className="text-[var(--color-orange)]">your face</span> come from?
            </h1>
            <p className="mb-4 text-center text-sm leading-snug text-[var(--color-ink-soft)]">
              Snap a selfie. Discover the regions, migrations, and heritage written into your features.
            </p>
            <Link href="/quiz/1">
              <Button size="block">Find out where I&apos;m from →</Button>
            </Link>
            <p className="mt-2.5 text-center text-[11px] text-[var(--color-ink-muted)]">
              ★ 4.8 from 12,000+ users · ~90 seconds
            </p>
          </div>
        </div>
      </section>

      {/* ───────────────── BELOW-THE-FOLD ───────────────── */}

      {/* Stats strip */}
      <section className="bg-[var(--color-bg-soft)] px-5 py-8">
        <div className="mx-auto grid max-w-md grid-cols-3 gap-3 text-center">
          {[
            ["124K+", "reports"],
            ["94", "regions"],
            ["6 sec", "avg scan"],
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
          How it works
        </p>
        <h2 className="mb-8 text-center">Three steps to your story</h2>
        <ol className="space-y-4">
          {[
            ["1", "Tell us about you", "Three quick questions to personalize your reading."],
            ["2", "Snap a selfie", "Front-facing, well-lit. Photo deletes after 30 days."],
            ["3", "Read your story", "Heritage breakdown, migration map, cultural ties — and more."],
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
          Sample report
        </p>
        <h2 className="mb-2 text-center">What you&apos;ll discover</h2>
        <p className="mx-auto mb-6 max-w-sm text-center text-sm text-[var(--color-ink-soft)]">
          Heritage breakdown, an interactive world map, six facial-trait clues, cultural ties, and a painted portrait of your ancestor.
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
              <p className="font-bold text-[var(--color-ink)]">Your ancestor portrait</p>
              <p className="text-xs leading-snug text-[var(--color-ink-soft)]">
                A painted face composed from your strongest matches — eight generations back.
              </p>
            </div>
          </div>

          <Link href="/report/demo">
            <Button size="block" variant="secondary">View full sample report →</Button>
          </Link>
        </Card>
      </section>

      {/* Heritage Mirror — single morphing portrait */}
      <HeritageMirror />

      {/* Testimonials — Trustpilot-style trust card + per-user cards */}
      <TestimonialsSection />

      {/* CTA */}
      <section className="mx-auto max-w-md px-5 pb-16 pt-8">
        <Card className="bg-[var(--color-orange-pale)] text-center">
          <h3 className="mb-2 font-display text-2xl">Ready to meet your ancestors?</h3>
          <p className="mb-6 text-sm text-[var(--color-ink-soft)]">
            Free quiz · No account needed to begin
          </p>
          <Link href="/quiz/1">
            <Button size="block" className="max-w-xs mx-auto">
              Begin my analysis →
            </Button>
          </Link>
        </Card>
      </section>

      {/* Footer */}
      <footer className="mx-auto max-w-md px-5 py-8 text-center text-xs text-[var(--color-ink-muted)]">
        <p>© {new Date().getFullYear()} Facelineage</p>
        <hr className="mt-3" />
        <div className="mt-3 flex justify-center gap-4">
          <Link href="/privacy" className="hover:text-[var(--color-orange)]">Privacy</Link>
          <Link href="/terms" className="hover:text-[var(--color-orange)]">Terms</Link>
          <Link href="/cookies" className="hover:text-[var(--color-orange)]">Cookies</Link>
          <Link href="/refunds" className="hover:text-[var(--color-orange)]">Refunds</Link>
        </div>
      </footer>
    </main>
  );
}
