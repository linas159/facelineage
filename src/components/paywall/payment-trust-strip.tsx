/**
 * Trust strip beneath the unlock button — a horizontal row of payment-brand
 * SVG badges loaded from /public/strip/. The SVGs already include their own
 * bordered white card backgrounds, so we render them as plain images and let
 * them flow.
 */

const LOGOS: { src: string; alt: string }[] = [
  { src: "/strip/apple-pay.svg", alt: "Apple Pay" },
  { src: "/strip/google-pay.svg", alt: "Google Pay" },
  { src: "/strip/visa.svg", alt: "Visa" },
  { src: "/strip/mastercard.svg", alt: "Mastercard" },
  { src: "/strip/american-express.svg", alt: "American Express" },
  { src: "/strip/discover.svg", alt: "Discover" },
  { src: "/strip/paypal.svg", alt: "PayPal" },
];

export function PaymentTrustStrip({ heading }: { heading: string }) {
  return (
    <div className="mb-3 flex flex-col items-center gap-2">
      <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-ink-soft)]">
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden>
          <path
            d="M8 1.5l5.5 2v4.4c0 3.2-2.3 5.9-5.5 6.6-3.2-.7-5.5-3.4-5.5-6.6V3.5l5.5-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M5.5 8l1.8 1.8L11 6.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {heading}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {LOGOS.map((logo) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={logo.src}
            src={logo.src}
            alt={logo.alt}
            className="h-7 w-auto"
          />
        ))}
      </div>
    </div>
  );
}
