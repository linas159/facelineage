import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--color-bg-base)]">
      {/* Ambient gold gradient */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "radial-gradient(ellipse at top, rgba(201,169,97,0.15), transparent 50%), radial-gradient(ellipse at bottom right, rgba(139,111,71,0.1), transparent 50%)",
        }}
      />

      {/* Nav */}
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <Link href="/sign-up">
          <Button variant="ghost" size="sm">Sign in</Button>
        </Link>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-6xl gap-16 px-6 pb-32 pt-20 lg:grid-cols-[1.1fr_1fr] lg:gap-24 lg:pt-32">
        <div>
          <p className="mb-6 font-mono text-xs uppercase tracking-[0.3em] text-[var(--color-gold)]">
            AI Heritage Analysis
          </p>
          <h1 className="mb-8 text-[var(--color-ivory)]">
            Discover the lineage <em className="text-[var(--color-gold)]">written on your face.</em>
          </h1>
          <p className="mb-12 max-w-xl text-lg leading-relaxed text-[var(--color-ivory-muted)]">
            Upload a single photo. Our AI traces the migrations, populations, and
            heritage etched into your features — across 12,000 years of human history.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/start">
              <Button size="xl">Begin your analysis</Button>
            </Link>
            <span className="font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]">
              ★★★★★ &nbsp; 4.8 from 12,000+ users
            </span>
          </div>
        </div>

        {/* Hero visual placeholder — replace with actual face mosaic */}
        <div className="relative aspect-[4/5] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-gold)] bg-[var(--color-bg-elevated)]">
          <div
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "linear-gradient(135deg, rgba(201,169,97,0.2), transparent 50%), linear-gradient(225deg, rgba(139,111,71,0.15), transparent 50%)",
            }}
          />
          <div className="absolute inset-0 grid grid-cols-3 gap-2 p-4 opacity-60">
            {Array.from({ length: 12 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square rounded-md border border-[var(--color-border-gold)]"
                style={{
                  background: `linear-gradient(${i * 30}deg, rgba(201,169,97,${0.05 + (i % 4) * 0.05}), transparent)`,
                }}
              />
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--color-bg-base)] to-transparent p-6">
            <p className="font-display text-sm italic text-[var(--color-ivory-muted)]">
              &ldquo;Faces of one ancestral story.&rdquo;
            </p>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="relative z-10 mx-auto max-w-6xl border-t border-[var(--color-border-subtle)] px-6 py-12">
        <div className="grid grid-cols-2 gap-8 text-center md:grid-cols-4">
          {[
            ["12,000+", "Reports generated"],
            ["94", "Population groups"],
            ["6 sec", "Average analysis"],
            ["4.8★", "User rating"],
          ].map(([stat, label]) => (
            <div key={label}>
              <div className="font-display text-3xl text-[var(--color-gold)]">{stat}</div>
              <div className="mt-1 font-mono text-xs uppercase tracking-wider text-[var(--color-muted)]">
                {label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 mx-auto max-w-6xl border-t border-[var(--color-border-subtle)] px-6 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-[var(--color-muted)]">
          <span>© {new Date().getFullYear()} Facelineage. For entertainment & cultural exploration.</span>
          <div className="flex gap-6">
            <Link href="/privacy" className="hover:text-[var(--color-gold)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--color-gold)]">Terms</Link>
            <Link href="/refunds" className="hover:text-[var(--color-gold)]">Refunds</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
