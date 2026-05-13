"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Region } from "@/lib/report-data";
import { ColoredWorldMap } from "./colored-world-map";

function describeArc(cx: number, cy: number, r: number, startA: number, endA: number) {
  const x1 = cx + r * Math.sin(startA);
  const y1 = cy - r * Math.cos(startA);
  const x2 = cx + r * Math.sin(endA);
  const y2 = cy - r * Math.cos(endA);
  const large = endA - startA > Math.PI ? 1 : 0;
  return `M${cx},${cy} L${x1.toFixed(3)},${y1.toFixed(3)} A${r},${r} 0 ${large} 1 ${x2.toFixed(3)},${y2.toFixed(3)} Z`;
}

interface Props {
  regions: Region[];
}

export function EthnicityExplorer({ regions }: Props) {
  const [selectedKey, setSelectedKey] = useState<string>(regions[0]?.key ?? "");
  const total = regions.reduce((s, r) => s + r.pct, 0);

  // Pre-compute pie-slice paths so we can map over them cleanly.
  const slices = useMemo(() => {
    let cum = 0;
    return regions.map((r) => {
      const start = (cum / total) * 2 * Math.PI;
      cum += r.pct;
      const end = (cum / total) * 2 * Math.PI;
      return {
        region: r,
        startA: start,
        endA: end,
        midA: (start + end) / 2,
      };
    });
  }, [regions, total]);

  const selected = regions.find((r) => r.key === selectedKey) ?? regions[0];

  const paint = useMemo(
    () => selected.countries.map((c) => ({ iso2: c.iso2, color: selected.color })),
    [selected],
  );

  return (
    <div>
      {/* Pie chart */}
      <div className="rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <p className="text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Your ethnicity
        </p>
        <h3 className="mb-1 text-center font-display text-xl font-bold">
          Ethnicity diagram
        </h3>
        <p className="mb-4 text-center text-xs text-[var(--color-ink-muted)]">
          Tap a slice to see the regional breakdown
        </p>

        <div className="relative mx-auto w-[260px]">
          <svg viewBox="0 0 200 200" className="block h-auto w-full">
            {slices.map(({ region, startA, endA, midA }) => {
              const isSel = region.key === selected.key;
              const offset = isSel ? 6 : 0;
              const tx = Math.sin(midA) * offset;
              const ty = -Math.cos(midA) * offset;
              return (
                <g
                  key={region.key}
                  transform={`translate(${tx.toFixed(3)} ${ty.toFixed(3)})`}
                  style={{ transition: "transform 0.25s ease" }}
                >
                  <path
                    d={describeArc(100, 100, 80, startA, endA)}
                    fill={region.color}
                    opacity={isSel ? 1 : 0.85}
                    stroke="white"
                    strokeWidth={2}
                    style={{ cursor: "pointer" }}
                    onClick={() => setSelectedKey(region.key)}
                  />
                </g>
              );
            })}
            <circle cx="100" cy="100" r="42" fill="white" />
          </svg>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-2xl font-bold text-[var(--color-ink)] tabular leading-none">
              {selected.pct.toFixed(2)}%
            </span>
            <span className="mt-1 max-w-[110px] text-[10px] font-semibold uppercase tracking-wider text-[var(--color-ink-soft)]">
              {selected.name}
            </span>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {regions.map((r) => {
            const isSel = r.key === selected.key;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setSelectedKey(r.key)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all",
                  isSel
                    ? "bg-[var(--color-ink)] text-white"
                    : "bg-[var(--color-bg-warm)] text-[var(--color-ink-soft)]",
                )}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                {r.name}
                <span className="tabular opacity-80">{r.pct.toFixed(1)}%</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* World map — countries belonging to the selected region get tinted */}
      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
          Geographic spread
        </p>
        <h3 className="mb-3 font-display text-xl font-bold">{selected.name}</h3>

        <ColoredWorldMap
          paint={paint}
          className="aspect-[2/1] w-full overflow-hidden rounded-[var(--radius-input)] bg-[var(--color-bg-warm)]"
        />

        <p className="mt-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">
          {selected.blurb}
        </p>
      </div>

      {/* Detail breakdown for the selected region */}
      <div className="mt-5 rounded-[var(--radius-card)] bg-white p-5 shadow-[var(--shadow-card)]">
        <div className="mb-4 flex items-baseline justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
              Detalisation
            </p>
            <h3 className="font-display text-xl font-bold">{selected.name}</h3>
          </div>
          <span
            className="font-display text-2xl font-bold tabular"
            style={{ color: selected.color }}
          >
            {selected.pct.toFixed(2)}%
          </span>
        </div>
        <ul className="space-y-2.5">
          {selected.countries.map((c) => {
            const widthPct = Math.min(100, (c.pct / selected.countries[0].pct) * 100);
            return (
              <li key={c.iso2} className="flex items-center gap-3">
                <span className="w-44 text-sm font-semibold text-[var(--color-ink)]">
                  {c.name}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--color-line)]">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${widthPct}%`, background: selected.color }}
                  />
                </div>
                <span className="w-14 text-right font-display text-sm font-bold tabular text-[var(--color-ink)]">
                  {c.pct.toFixed(2)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
