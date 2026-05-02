import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "full" | "mark";
}

/**
 * Facelineage wordmark — Cormorant Garamond serif with subtle gold accent.
 * The dotted lineage line under "lineage" hints at descent.
 */
export function Logo({ className, variant = "full" }: LogoProps) {
  if (variant === "mark") {
    return (
      <svg
        viewBox="0 0 48 48"
        className={cn("h-8 w-8", className)}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#E8C77E" />
            <stop offset="100%" stopColor="#8B6F47" />
          </linearGradient>
        </defs>
        <circle cx="24" cy="24" r="22" fill="none" stroke="url(#goldGrad)" strokeWidth="1" />
        <text
          x="24"
          y="32"
          textAnchor="middle"
          fontFamily="Cormorant Garamond, serif"
          fontWeight="500"
          fontSize="24"
          fill="#C9A961"
        >
          F
        </text>
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 280 48"
      className={cn("h-8 w-auto", className)}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Facelineage"
    >
      <text
        x="0"
        y="34"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontWeight="500"
        fontSize="32"
        letterSpacing="0.5"
        fill="#F4EFE6"
      >
        Face
      </text>
      <text
        x="80"
        y="34"
        fontFamily="Cormorant Garamond, Georgia, serif"
        fontWeight="500"
        fontStyle="italic"
        fontSize="32"
        letterSpacing="0.5"
        fill="#C9A961"
      >
        lineage
      </text>
      {/* Subtle lineage line under "lineage" */}
      <line
        x1="82"
        y1="40"
        x2="220"
        y2="40"
        stroke="#C9A961"
        strokeWidth="0.5"
        strokeDasharray="1 3"
        opacity="0.5"
      />
    </svg>
  );
}
