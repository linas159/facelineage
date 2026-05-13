import type { SVGProps } from "react";

/**
 * Reusable inline SVG icons for Facelineage.
 * Each is original artwork sized to a 32×32 viewBox so they crop cleanly into
 * pill buttons and circular badges. Sizing controlled via parent className.
 */

/** Camera icon — designed to sit on the orange "Take a selfie" CTA. White silhouette. */
export function CameraIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      {/* viewfinder bump */}
      <path d="M 11 5 Q 11.5 3 13.5 3 H 18.5 Q 20.5 3 21 5 L 22 8 H 10 Z" fill="white" />
      {/* body */}
      <rect x="2.5" y="7.5" width="27" height="20" rx="3.5" fill="white" />
      {/* lens — slightly darker to read against white body */}
      <circle cx="16" cy="18" r="6" fill="rgba(0,0,0,0.18)" />
      <circle cx="16" cy="18" r="3.5" fill="white" />
      <circle cx="14.6" cy="16.6" r="1" fill="rgba(255,255,255,0.7)" />
      {/* flash dot */}
      <circle cx="25" cy="11.5" r="1.1" fill="rgba(0,0,0,0.18)" />
    </svg>
  );
}

/** Photos / image-stack icon — designed for the white secondary "Upload" button. */
export function PhotosIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      {/* faint hint of a card behind */}
      <rect x="3" y="6" width="22" height="19" rx="2.5" fill="currentColor" opacity="0.3" />
      {/* main frame */}
      <rect x="6" y="9" width="22" height="20" rx="2.5" fill="currentColor" />
      {/* sun */}
      <circle cx="22" cy="14.5" r="1.9" fill="white" />
      {/* mountains */}
      <path d="M 8 25 L 13.5 17 L 18 21.5 L 22 18 L 26 23 V 26 H 8 Z" fill="white" />
    </svg>
  );
}

/** Green shield with white padlock, optically centered — for the "Encrypted" badge. */
export function ShieldLockIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      {/* shield */}
      <path
        d="M 16 2 L 28 6 V 16 Q 28 24 16 30 Q 4 24 4 16 V 6 Z"
        fill="#10b981"
      />
      {/* Lock — centered around y≈15 (shield's visual center, accounting for taper). */}
      {/* shackle */}
      <path
        d="M 12.4 14.5 V 11 Q 12.4 7.5 16 7.5 Q 19.6 7.5 19.6 11 V 14.5"
        stroke="white"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
      {/* body */}
      <rect x="10.5" y="14" width="11" height="9" rx="1.6" fill="white" />
      {/* keyhole */}
      <circle cx="16" cy="17.5" r="1.3" fill="#10b981" />
      <rect x="15.4" y="18" width="1.2" height="3" rx="0.6" fill="#10b981" />
    </svg>
  );
}

/** Green circle with white trash can — for the "30-day auto-delete" badge. */
export function TrashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <circle cx="16" cy="16" r="13" fill="#10b981" />
      {/* handle on top */}
      <rect x="13" y="7.5" width="6" height="2" rx="0.8" fill="white" />
      {/* lid */}
      <rect x="9" y="9.5" width="14" height="2.2" rx="1" fill="white" />
      {/* body — slightly tapered */}
      <path
        d="M 10.5 12 L 21.5 12 L 20.7 24 Q 20.6 25 19.6 25 H 12.4 Q 11.4 25 11.3 24 Z"
        fill="white"
      />
      {/* vertical strokes (suggest contents/lines) */}
      <line x1="14" y1="14.5" x2="14" y2="22" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="16" y1="14.5" x2="16" y2="22" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
      <line x1="18" y1="14.5" x2="18" y2="22" stroke="#10b981" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

/** Green shield with white check — for the "Never shared" badge. */
export function ShieldCheckIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" fill="none" {...props}>
      <path
        d="M 16 2 L 28 6 V 16 Q 28 24 16 30 Q 4 24 4 16 V 6 Z"
        fill="#10b981"
      />
      <path
        d="M 10 16.5 L 14 20.5 L 22 12.5"
        stroke="white"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
