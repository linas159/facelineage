import { cn } from "@/lib/utils";

/**
 * Placeholder illustration component.
 *
 * In production, replace each `id` branch with an actual SVG/PNG asset.
 * See docs/visual-assets-plan.md for spec, sources, and prompts.
 */

type IllustrationId =
  | "hero-faces"          // landing hero — diverse smiling faces collage
  | "world-map"           // landing — world map with pins
  | "scan-face"           // analyzing — face with scan grid
  | "heritage-globe"      // analyzing — rotating globe
  | "report-celebrate"    // post-paywall — celebratory scene
  | "parents-comparison"  // upsell — parent + child comparison
  | "pdf-book"            // upsell — open book with map
  | "ages-portraits"      // upsell — same face in different historical garb
  | "selfie-frame"        // capture — phone with selfie frame
  | "checkmark-burst";    // confirmation

interface IllustrationProps {
  id: IllustrationId;
  className?: string;
  ariaLabel?: string;
}

export function Illustration({ id, className, ariaLabel }: IllustrationProps) {
  return (
    <div
      role="img"
      aria-label={ariaLabel ?? id}
      className={cn(
        "relative flex items-center justify-center overflow-hidden rounded-[var(--radius-card)]",
        className,
      )}
    >
      {/* Decorative gradient placeholder per id */}
      <Placeholder id={id} />
    </div>
  );
}

function Placeholder({ id }: { id: IllustrationId }) {
  const palette: Record<IllustrationId, [string, string]> = {
    "hero-faces": ["#ffe4d3", "#ffb692"],
    "world-map": ["#fff5e8", "#ffe4d3"],
    "scan-face": ["#fff5e8", "#ffd6a8"],
    "heritage-globe": ["#ffe4d3", "#ffb21d"],
    "report-celebrate": ["#ffe4d3", "#5fac23"],
    "parents-comparison": ["#ffe4d3", "#7c5cff"],
    "pdf-book": ["#fff5e8", "#ffb21d"],
    "ages-portraits": ["#ffe4d3", "#f36671"],
    "selfie-frame": ["#fff5e8", "#ffb692"],
    "checkmark-burst": ["#e8f5dc", "#5fac23"],
  };
  const [a, b] = palette[id];

  return (
    <svg viewBox="0 0 400 400" className="h-full w-full">
      <defs>
        <radialGradient id={`g-${id}`} cx="50%" cy="50%">
          <stop offset="0%" stopColor={b} stopOpacity="0.4" />
          <stop offset="100%" stopColor={a} stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="400" height="400" fill={`url(#g-${id})`} />
      {/* Soft cultural-icon hints — abstract shapes only */}
      <circle cx="80" cy="80" r="32" fill={b} opacity="0.18" />
      <circle cx="320" cy="100" r="24" fill={b} opacity="0.22" />
      <circle cx="100" cy="320" r="40" fill={b} opacity="0.15" />
      <circle cx="300" cy="320" r="28" fill={b} opacity="0.20" />
      <circle cx="200" cy="200" r="100" fill="white" opacity="0.6" />
      <text
        x="200"
        y="210"
        textAnchor="middle"
        fontFamily="Signika, sans-serif"
        fontWeight="700"
        fontSize="22"
        fill="#2a2018"
        opacity="0.6"
      >
        {id.replace(/-/g, " ")}
      </text>
    </svg>
  );
}
