import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
}

/**
 * Facelineage wordmark — logo image on the left + "Facelineage" wordmark
 * with the "lineage" half tinted in the brand violet.
 *
 * The whole logo is one inline SVG so `className="h-7"` etc scales image
 * and text together as a single unit.
 */
export function Logo({ className, variant = "full" }: LogoProps) {
  if (variant === "mark") {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src="/facelineage-logo.png"
        alt="Facelineage"
        className={cn("h-8 w-8 object-contain", className)}
      />
    );
  }

  return (
    <svg
      viewBox="0 0 260 60"
      className={cn("h-7 w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Facelineage"
    >
      <image
        href="/facelineage-logo.png"
        x="0"
        y="0"
        width="60"
        height="60"
        preserveAspectRatio="xMidYMid meet"
      />

      <text
        x="66"
        y="42"
        fontFamily="Signika, Outfit, sans-serif"
        fontWeight="700"
        fontSize="28"
        letterSpacing="-0.5"
      >
        <tspan fill="#2a2540">Face</tspan><tspan fill="#7c5cff">lineage</tspan>
      </text>
    </svg>
  );
}
