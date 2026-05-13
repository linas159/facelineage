import { cn } from "@/lib/utils";

/**
 * Full-bleed faded world map for the hero background.
 *
 * The SVG lives in /public/world-map.svg so it can be cached separately and
 * sized via CSS without re-parsing markup. Color is controlled via `currentColor`
 * — pass `color` (text color hex) to tint.
 */
interface WorldMapBackgroundProps {
  className?: string;
  /** Tint via text color — defaults to a warm peach-grey that sits on the brand bg. */
  color?: string;
  /** 0-1 opacity. */
  opacity?: number;
}

export function WorldMapBackground({
  className,
  color = "#9b89b3",
  opacity = 0.18,
}: WorldMapBackgroundProps) {
  return (
    <div
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 -z-0 overflow-hidden", className)}
      style={{ color, opacity }}
    >
      {/* Use object instead of img so currentColor cascades into the SVG paths */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid slice"
        className="h-full w-full"
      >
        <use href="/world-map.svg#root" />
        {/* Inline fallback so currentColor works even if external SVG fails to inline */}
      </svg>
      {/* Inline copy below — guaranteed to inherit currentColor */}
      <svg
        viewBox="0 0 1000 500"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 h-full w-full"
        fill="currentColor"
      >
        <use href="#world-map-paths" />
        <defs>
          <g id="world-map-paths">
            <path d="M 50 130 L 90 115 L 135 110 L 165 122 L 175 145 L 155 158 L 110 162 L 75 152 Z" />
            <path d="M 115 168 L 175 152 L 230 152 L 285 165 L 305 195 L 295 235 L 255 270 L 215 290 L 175 295 L 145 280 L 120 250 L 105 215 Z" />
            <path d="M 215 295 L 245 295 L 260 315 L 248 335 L 225 335 L 215 318 Z" />
            <path d="M 325 100 L 365 90 L 395 105 L 400 130 L 380 155 L 345 160 L 320 140 L 315 115 Z" />
            <path d="M 250 340 L 295 335 L 320 360 L 325 400 L 310 445 L 290 480 L 270 490 L 250 470 L 240 425 L 240 380 Z" />
            <path d="M 462 150 L 478 148 L 482 165 L 472 175 L 460 170 Z" />
            <path d="M 470 195 L 502 195 L 510 215 L 495 225 L 472 220 Z" />
            <path d="M 488 145 L 540 138 L 580 145 L 595 165 L 585 188 L 555 205 L 510 210 L 488 195 L 480 170 Z" />
            <path d="M 522 105 L 560 100 L 580 115 L 570 145 L 540 145 L 522 130 Z" />
            <path d="M 488 235 L 555 225 L 605 235 L 615 270 L 595 295 L 555 305 L 510 295 L 485 270 Z" />
            <path d="M 510 305 L 595 305 L 615 340 L 610 385 L 580 415 L 550 425 L 525 415 L 505 385 L 498 340 Z" />
            <path d="M 625 380 L 638 380 L 642 405 L 632 415 L 622 405 Z" />
            <path d="M 600 215 L 650 210 L 680 225 L 670 250 L 635 260 L 605 250 L 595 230 Z" />
            <path d="M 715 240 L 760 235 L 775 265 L 760 295 L 730 305 L 715 285 L 705 260 Z" />
            <path d="M 770 165 L 845 158 L 885 175 L 895 210 L 870 235 L 825 240 L 785 230 L 770 200 Z" />
            <path d="M 580 105 L 700 95 L 820 95 L 870 110 L 880 140 L 850 158 L 770 162 L 700 158 L 620 145 L 585 125 Z" />
            <path d="M 790 245 L 825 248 L 835 275 L 820 295 L 795 295 L 785 270 Z" />
            <path d="M 800 320 L 830 318 L 850 325 L 870 322 L 880 335 L 860 345 L 825 343 L 795 338 Z" />
            <path d="M 905 195 L 920 192 L 928 215 L 918 230 L 908 218 Z" />
            <path d="M 868 270 L 880 268 L 884 290 L 875 298 L 868 285 Z" />
            <path d="M 825 365 L 880 360 L 920 370 L 935 395 L 920 420 L 875 425 L 830 420 L 815 395 Z" />
            <path d="M 945 425 L 960 422 L 968 440 L 958 455 L 948 442 Z" />
            <path d="M 940 458 L 952 455 L 960 470 L 950 482 L 940 470 Z" />
          </g>
        </defs>
      </svg>
    </div>
  );
}
