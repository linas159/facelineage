import { cn } from "@/lib/utils";

/**
 * Sliced-portrait hero — a portrait split into N angled bands. Each band shows
 * a different photo variant of the same composition, cut by parallel diagonal
 * lines tilted 15° clockwise.
 *
 * Two operating modes:
 *  1. Default: per-band photo files in /public (one per band).
 *  2. Override: pass `bandImages` prop to use ad-hoc paths (A/B testing).
 *
 * If a per-band file is missing, the SVG placeholder fills its band and the
 * band's optional `filter` colors it so the layout still demos.
 */

const TILT_DEG = 15;
const TILT_PCT = Math.tan((TILT_DEG * Math.PI) / 180) * 100; // ≈ 26.795

type Band = {
  /** Top of the band on the LEFT edge (% of container height). */
  y0: number;
  /** Bottom of the band on the LEFT edge. */
  y1: number;
  src: string;
  filter?: string;
  variant: string;
};

const BANDS: Band[] = [
  { y0:  -10, y1: 2, src: "/hero-blonde.webp",   variant: "blonde",
    filter: "brightness(1.18) saturate(0.78) hue-rotate(18deg)" },
  // No filter — user already has the photo at the right ethnicity.
  { y0: 2, y1: 20, src: "/hero-african.webp",  variant: "African" },
  { y0: 20, y1: 35, src: "/hero-asian.webp",    variant: "Asian",
    filter: "brightness(1.02) saturate(0.72) hue-rotate(-14deg)" },
  { y0: 35, y1: 51, src: "/hero-original.webp", variant: "original" },
  // No filter — user already has the photo at the right ethnicity.
  { y0: 51, y1: 69, src: "/hero-indian.webp",   variant: "Indian" },
  { y0: 69, y1: 100, src: "/hero-original.webp", variant: "original" },
];

/**
 * Chips paired roughly with band centers.
 *  - Left chip y = (y0 + y1) / 2  (band's center on the left edge)
 *  - Right chip y = ((y0 + tilt) + (y1 + tilt)) / 2  (band's center on the right edge)
 *
 * Pairs:
 *   Swedish  ↔ Nigerian   ≈ band 0
 *   Chinese  ↔ German     ≈ band 2
 *   Indian   ↔ Spanish    ≈ band 4
 */
const CHIPS = [
  { side: "right",  topPct:  9, flag: "🇸🇪", label: "Swedish"  },
  { side: "left", topPct: 12, flag: "🇳🇬", label: "Nigerian" },
  { side: "right",  topPct: 45, flag: "🇨🇳", label: "Chinese"  },
  { side: "left", topPct: 47, flag: "🇩🇪", label: "German"   },
  { side: "right",  topPct: 79, flag: "🇮🇳", label: "Indian"   },
  { side: "left", topPct: 85, flag: "🇪🇸", label: "Spanish"  },
] as const;

/**
 * Build the polygon for one band. Each band is a parallelogram bounded by two
 * parallel diagonals (separator lines), with corner caps where:
 *  - the first band's top edge follows the container top (horizontal)
 *  - the last band's bottom edge follows the container bottom (horizontal)
 *  - any separator that exits the container before x=100 is clipped at y=100
 */
function bandClipPath(b: Band, isFirst: boolean, isLast: boolean): string {
  const { y0, y1 } = b;
  const y0R = y0 + TILT_PCT;
  const y1R = y1 + TILT_PCT;
  const pts: string[] = [];

  // Top-left
  pts.push(isFirst ? "0% 0%" : `0% ${y0}%`);

  // Top-right (or where the top separator exits the container)
  if (isFirst) {
    pts.push("100% 0%");
  } else if (y0R <= 100) {
    pts.push(`100% ${y0R.toFixed(2)}%`);
  } else {
    const exitX = ((100 - y0) / TILT_PCT) * 100;
    pts.push(`${exitX.toFixed(2)}% 100%`);
  }

  // Bottom-right (or container BR + bottom-separator exit point)
  if (isLast) {
    if (y0R <= 100) pts.push("100% 100%");
    // else the band is a triangle — skip BR
  } else if (y1R <= 100) {
    pts.push(`100% ${y1R.toFixed(2)}%`);
  } else {
    pts.push("100% 100%");
    const exitX = ((100 - y1) / TILT_PCT) * 100;
    pts.push(`${exitX.toFixed(2)}% 100%`);
  }

  // Bottom-left
  pts.push(isLast ? "0% 100%" : `0% ${y1}%`);

  return `polygon(${pts.join(", ")})`;
}

/** Compute separator line endpoints, clipped to the container. */
function clampedSeparator(yLeft: number) {
  const yRight = yLeft + TILT_PCT;
  if (yRight <= 100) return { x1: 0, y1: yLeft, x2: 100, y2: yRight };
  const exitX = ((100 - yLeft) / TILT_PCT) * 100;
  return { x1: 0, y1: yLeft, x2: exitX, y2: 100 };
}

const SEPARATORS = BANDS.slice(0, -1).map((b) => clampedSeparator(b.y1));

interface SlicedPortraitProps {
  src?: string;
  fallbackSrc?: string;
  bandImages?: (string | null)[];
  alt?: string;
  className?: string;
  showChips?: boolean;
  showScan?: boolean;
  scanLabel?: string;
}

export function SlicedPortrait({
  fallbackSrc = "/hero-portrait.svg",
  bandImages,
  alt = "Portrait analyzed for heritage",
  className,
  showChips = true,
  showScan = true,
  scanLabel = "AI Heritage Scan",
}: SlicedPortraitProps) {
  return (
    <div className={cn("relative flex h-full w-full items-center justify-center", className)}>
      <div className="relative aspect-[1/1] max-h-full w-full max-w-[400px]">
        {/* Inner wrapper: clips photos AND separator lines to the rounded portrait area. */}
        <div className="absolute inset-0 overflow-hidden rounded-[var(--radius-card)]">
          {/* Sliced bands — each clipped to its angled parallelogram. */}
          {BANDS.map((b, i) => {
            const isFirst = i === 0;
            const isLast = i === BANDS.length - 1;
            const overrideSrc = bandImages?.[i] ?? null;
            const imgSrc = overrideSrc ?? b.src;

            return (
              <div
                key={`${b.y0}-${i}`}
                className="absolute inset-0"
                style={{ clipPath: bandClipPath(b, isFirst, isLast) }}
              >
                <picture>
                  <source srcSet={imgSrc} type="image/webp" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={fallbackSrc}
                    alt={alt}
                    className="h-full w-full select-none object-cover"
                    draggable={false}
                    style={b.filter ? { filter: b.filter } : undefined}
                  />
                </picture>
              </div>
            );
          })}

          {/* Angled separator lines — drawn as SVG so they stay crisp and the
              SVG can be precisely clipped to the container. */}
          <svg
            aria-hidden
            className="pointer-events-none absolute inset-0 z-[1] h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            {SEPARATORS.map((s, i) => (
              <line
                key={i}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="white"
                strokeWidth="2"
                vectorEffect="non-scaling-stroke"
              />
            ))}
          </svg>
        </div>

        {/* Country chips — outside the overflow-hidden wrapper so they can
            visually overlap the portrait edges. */}
        {showChips &&
          CHIPS.map((c) => (
            <div
              key={c.label}
              className={cn(
                "absolute z-10 flex items-center gap-1.5 rounded-[var(--radius-pill)] bg-white px-3 py-1.5 text-sm font-bold text-[var(--color-ink)] shadow-[var(--shadow-card)]",
                c.side === "left" ? "left-0 -translate-x-2" : "right-0 translate-x-2",
              )}
              style={{ top: `${c.topPct}%` }}
            >
              <span className="text-base leading-none">{c.flag}</span>
              <span className="leading-none">{c.label}</span>
            </div>
          ))}

        {/* "AI Heritage Scan" pill at bottom center */}
        {showScan && (
          <div className="absolute bottom-0 left-1/2 z-20 -translate-x-1/2 translate-y-1/2">
            <div className="flex items-center gap-1 rounded-[var(--radius-pill)] bg-white px-4 py-2 shadow-[var(--shadow-card)]">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[var(--color-orange)] to-[var(--color-coral)] text-xs text-white">
                ✦
              </span>
              <span className="text-sm font-bold text-[var(--color-ink)]">{scanLabel}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
