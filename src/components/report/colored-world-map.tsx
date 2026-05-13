"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { cn } from "@/lib/utils";

// Pull the embedded <style> block out of the supplied world-map SVG so it
// doesn't fight with our dynamic country fills, and make it responsive by
// adding a viewBox + width/height="100%".
function prepareMapSvg(raw: string): string {
  const noStyle = raw.replace(
    /<style[^>]*id="style_css_sheet"[^>]*>[\s\S]*?<\/style>/,
    "",
  );
  return noStyle.replace(/<svg([^>]*)>/, (full, attrs: string) => {
    const wMatch = attrs.match(/width="(\d+)"/);
    const hMatch = attrs.match(/height="(\d+)"/);
    if (!wMatch || !hMatch) return full;
    const w = wMatch[1];
    const h = hMatch[1];
    const stripped = attrs
      .replace(/\s*width="\d+"/, "")
      .replace(/\s*height="\d+"/, "");
    return `<svg${stripped} viewBox="0 0 ${w} ${h}" width="100%" height="100%" preserveAspectRatio="xMidYMid meet">`;
  });
}

interface Props {
  /** Country fills — each iso2 lowercased and tinted with the given color. */
  paint: { iso2: string; color: string }[];
  className?: string;
}

export function ColoredWorldMap({ paint, className }: Props) {
  const [mapHtml, setMapHtml] = useState<string | null>(null);
  const scopeId = `fl-worldmap-${useId().replace(/[:]/g, "")}`;

  useEffect(() => {
    let cancelled = false;
    fetch("/report/worldmap-blank.svg")
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        setMapHtml(prepareMapSvg(text));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dynamicCss = useMemo(() => {
    const colored = paint
      .map(
        ({ iso2, color }) =>
          `#${scopeId} .landxx.${iso2.toLowerCase()} { fill: ${color}; }`,
      )
      .join("\n");
    return `
      #${scopeId} svg { width: 100%; height: 100%; display: block; }
      #${scopeId} .oceanxx { fill: transparent; }
      #${scopeId} .landxx { fill: #2a2540; stroke: #4a4366; stroke-width: 0.4; transition: fill 0.35s ease; }
      #${scopeId} .limitxx, #${scopeId} .unxx { fill: none; stroke: #4a4366; stroke-width: 0.3; }
      ${colored}
    `;
  }, [paint, scopeId]);

  return (
    <div id={scopeId} className={cn("relative", className)}>
      <style dangerouslySetInnerHTML={{ __html: dynamicCss }} />
      {mapHtml ? (
        <div
          className="h-full w-full"
          dangerouslySetInnerHTML={{ __html: mapHtml }}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-[var(--color-ink-muted)]">
          Loading map…
        </div>
      )}
    </div>
  );
}
