"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Portrait {
  src: string;
  region: string;
  label: string;
  color: string;
}

const PORTRAITS: Portrait[] = [
  {
    src: "/landing/twin-east-asia.png",
    region: "East Asia",
    label: "Han Chinese",
    color: "#10b981",
  },
  {
    src: "/landing/twin-west-africa.png",
    region: "West Africa",
    label: "Yoruba",
    color: "#7c5cff",
  },
  {
    src: "/landing/twin-northern-europe.png",
    region: "Northern Europe",
    label: "Sami",
    color: "#ec4899",
  },
  {
    src: "/landing/twin-south-asia.png",
    region: "South Asia",
    label: "Bengali",
    color: "#fbbf24",
  },
  {
    src: "/landing/twin-andes.png",
    region: "South America",
    label: "Quechua",
    color: "#f97373",
  },
];

const CYCLE_MS = 2800;

export function HeritageMirror() {
  const [idx, setIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % PORTRAITS.length);
    }, CYCLE_MS);
    return () => clearInterval(t);
  }, [paused]);

  const current = PORTRAITS[idx];

  return (
    <section className="mx-auto max-w-md px-5 py-14">
      {/* Eyebrow */}
      <div className="mb-3 text-center">
        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold text-[var(--color-ink)] shadow-[var(--shadow-chip)]">
          <span className="h-2 w-2 rounded-full bg-gradient-to-br from-[var(--color-orange)] to-[var(--color-violet)]" />
          Heritage Mirror
        </span>
      </div>

      <h2 className="mb-2 text-center text-balance">
        Watch your face <span className="text-[var(--color-orange)]">travel the world</span>
      </h2>
      <p className="mx-auto mb-6 max-w-sm text-center text-sm text-[var(--color-ink-soft)]">
        Same bones, every culture. Five reflections, drawn from the heritage written into your features.
      </p>

      {/* Morphing portrait card */}
      <div
        className="relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-[28px] bg-[var(--color-bg-warm)] shadow-[var(--shadow-card)]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Crossfading layers */}
        {PORTRAITS.map((p, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={p.src}
            src={p.src}
            alt={`${p.label} reflection`}
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: i === idx ? 1 : 0 }}
          />
        ))}

        {/* Frame ring — animated color follows the active portrait */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[28px] ring-[6px] ring-inset transition-colors duration-700"
          style={{ boxShadow: `inset 0 0 0 6px ${current.color}` }}
        />

        {/* Region label */}
        <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3">
          <div
            className="rounded-2xl px-4 py-2.5 backdrop-blur-md"
            style={{ background: `${current.color}E6` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">
              {current.region}
            </div>
            <div className="font-display text-lg font-bold leading-tight text-white">
              {current.label}
            </div>
          </div>

          {/* Cycle dots */}
          <div className="flex gap-1.5 rounded-full bg-black/30 px-2 py-1.5 backdrop-blur-md">
            {PORTRAITS.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "block h-1.5 rounded-full transition-all duration-500",
                  i === idx ? "w-5 bg-white" : "w-1.5 bg-white/50",
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Tappable thumbnail row — jump to a specific reflection */}
      <div className="mx-auto mt-4 flex max-w-[340px] items-center justify-between gap-2">
        {PORTRAITS.map((p, i) => {
          const active = i === idx;
          return (
            <button
              key={p.src}
              type="button"
              onClick={() => setIdx(i)}
              aria-label={`Show ${p.label} reflection`}
              className={cn(
                "relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-full transition-all",
                active ? "scale-110" : "opacity-70 hover:opacity-100",
              )}
              style={{
                boxShadow: active
                  ? `0 0 0 3px ${p.color}, 0 0 0 5px white`
                  : "none",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt="" className="h-full w-full object-cover" />
            </button>
          );
        })}
      </div>

      <div className="mt-7 text-center">
        <Link href="/quiz/1">
          <Button size="block" className="mx-auto max-w-xs">
            Show me my reflections →
          </Button>
        </Link>
        <p className="mt-2 text-[11px] text-[var(--color-ink-muted)]">
          Powered by your selfie · Cancel anytime
        </p>
      </div>
    </section>
  );
}
