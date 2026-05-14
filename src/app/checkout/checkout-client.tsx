"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import {
  Elements,
  ExpressCheckoutElement,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PLANS, type PlanKey } from "@/lib/stripe";

type Mode = "intro" | "upsell";
type UpsellId = "parents" | "ethnicity" | "ages" | "partner" | "book";

interface CheckoutClientProps {
  mode: Mode;
  plan?: PlanKey;
  upsellId?: UpsellId;
  analysisId: string;
}

const UPSELL_LABELS: Record<UpsellId, string> = {
  parents: "What Each Parent Gave You",
  ethnicity: "Heritage Mirror",
  ages: "Through The Ages",
  partner: "Future Partner",
  book: "Heritage Book",
};

// Minimal IANA-timezone → ISO-2 country mapping for the common cases.
// Used to fill the billing country without showing a dropdown.
const TZ_TO_COUNTRY: Record<string, string> = {
  "Europe/Vilnius": "LT", "Europe/Riga": "LV", "Europe/Tallinn": "EE",
  "Europe/London": "GB", "Europe/Dublin": "IE", "Europe/Paris": "FR",
  "Europe/Berlin": "DE", "Europe/Amsterdam": "NL", "Europe/Brussels": "BE",
  "Europe/Madrid": "ES", "Europe/Lisbon": "PT", "Europe/Rome": "IT",
  "Europe/Athens": "GR", "Europe/Helsinki": "FI", "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO", "Europe/Copenhagen": "DK", "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ", "Europe/Budapest": "HU", "Europe/Vienna": "AT",
  "Europe/Zurich": "CH", "Europe/Bucharest": "RO", "Europe/Sofia": "BG",
  "Europe/Moscow": "RU", "Europe/Kyiv": "UA", "Europe/Istanbul": "TR",
  "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US",
  "America/Los_Angeles": "US", "America/Phoenix": "US", "America/Toronto": "CA",
  "America/Vancouver": "CA", "America/Mexico_City": "MX", "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR", "America/Bogota": "CO", "America/Lima": "PE",
  "America/Santiago": "CL", "Asia/Tokyo": "JP", "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN", "Asia/Hong_Kong": "HK", "Asia/Singapore": "SG",
  "Asia/Bangkok": "TH", "Asia/Jakarta": "ID", "Asia/Manila": "PH",
  "Asia/Karachi": "PK", "Asia/Kolkata": "IN", "Asia/Dubai": "AE",
  "Asia/Tehran": "IR", "Asia/Jerusalem": "IL", "Asia/Riyadh": "SA",
  "Africa/Cairo": "EG", "Africa/Lagos": "NG", "Africa/Johannesburg": "ZA",
  "Africa/Nairobi": "KE", "Australia/Sydney": "AU", "Australia/Melbourne": "AU",
  "Pacific/Auckland": "NZ",
};

function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return TZ_TO_COUNTRY[tz] ?? "US";
  } catch {
    return "US";
  }
}

const APPEARANCE = {
  theme: "flat" as const,
  variables: {
    colorPrimary: "#7c5cff",
    colorBackground: "#ffffff",
    colorText: "#2a2540",
    colorDanger: "#f97373",
    fontFamily: "Outfit, system-ui, sans-serif",
    borderRadius: "12px",
    spacingUnit: "4px",
  },
};

interface CheckoutInit {
  walletsClientSecret?: string; // intro-mode only
  cardClientSecret?: string;    // intro-mode only
  clientSecret?: string;        // upsell-mode (single PI)
  publishableKey: string;
  amount: number;
  currency: string;
  returnUrl?: string;
}

export function CheckoutClient(props: CheckoutClientProps) {
  const [init, setInit] = useState<CheckoutInit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const url = props.mode === "intro" ? "/api/checkout" : "/api/upsell-checkout";
      const body =
        props.mode === "intro"
          ? { plan: props.plan, analysisId: props.analysisId }
          : { upsell: props.upsellId, analysisId: props.analysisId };
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        if (!cancelled) setError(t || "Could not start checkout");
        return;
      }
      const j = (await res.json()) as CheckoutInit;
      if (!cancelled) setInit(j);
    })();
    return () => {
      cancelled = true;
    };
  }, [props.mode, props.plan, props.upsellId, props.analysisId]);

  const stripePromise = useMemo<Promise<StripeJs | null> | null>(() => {
    if (!init?.publishableKey) return null;
    return loadStripe(init.publishableKey);
  }, [init?.publishableKey]);

  const labelTitle =
    props.mode === "intro"
      ? "Unlock your report"
      : `Add: ${UPSELL_LABELS[props.upsellId!]}`;

  const introPeriod =
    props.mode === "intro" && props.plan ? PLANS[props.plan].introPeriod : null;

  const redirectTarget =
    typeof window !== "undefined"
      ? init?.returnUrl ??
        (props.mode === "intro"
          ? `${window.location.origin}/payment-complete?analysis=${props.analysisId}`
          : `${window.location.origin}/report/${props.analysisId}?upsell=${props.upsellId}`)
      : "";

  return (
    <div className="pt-4">
      <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
        Secure checkout
      </p>
      <h1 className="mb-2 text-center text-2xl">{labelTitle}</h1>
      <p className="mx-auto mb-6 max-w-sm text-center text-xs text-[var(--color-ink-muted)]">
        {props.mode === "intro" && introPeriod
          ? `Today's charge covers your ${introPeriod} access.`
          : "One-time purchase."}
      </p>

      {error && (
        <Card className="mb-4 border-2 border-[var(--color-coral)]/30 bg-[var(--color-coral)]/5">
          <p className="text-sm text-[var(--color-coral)]">{error}</p>
        </Card>
      )}

      {init && (
        <Card className="mb-5 bg-[var(--color-orange-pale)]">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              Charged today
            </span>
            <span className="font-display text-3xl font-bold text-[var(--color-orange)] tabular">
              {formatMoney(init.amount, init.currency)}
            </span>
          </div>
        </Card>
      )}

      {/* Wallets — Express Checkout (PayPal, Apple Pay, Google Pay, Link).
          Uses its own Elements provider tied to the wallets-PI clientSecret
          so PayPal can render. */}
      {init && stripePromise && (init.walletsClientSecret || init.clientSecret) && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: init.walletsClientSecret ?? init.clientSecret!,
            appearance: APPEARANCE,
          }}
        >
          <ExpressSection redirectTarget={redirectTarget} />
        </Elements>
      )}

      {/* Divider — sits between wallets above and card form below */}
      {init && (
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--color-line-strong)]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-[var(--color-bg-base)] px-3 font-semibold text-[var(--color-ink-muted)]">
              or pay with card
            </span>
          </div>
        </div>
      )}

      {/* Card form — separate Elements provider tied to the card-only PI
          so PaymentElement renders the card fields directly (no tabs). */}
      {init && stripePromise && (init.cardClientSecret || init.clientSecret) && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: init.cardClientSecret ?? init.clientSecret!,
            appearance: APPEARANCE,
          }}
        >
          <CardSection
            amount={init.amount}
            currency={init.currency}
            redirectTarget={redirectTarget}
          />
        </Elements>
      )}

      {!init && !error && (
        <Card className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-orange-pale)] border-t-[var(--color-orange)]" />
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">
            Preparing secure checkout…
          </p>
        </Card>
      )}

      <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
        Payments are processed by Stripe. Your card details never touch our servers.
      </p>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Wallets section (Express Checkout)
// ────────────────────────────────────────────────────────────────────────────

function ExpressSection({ redirectTarget }: { redirectTarget: string }) {
  const stripe = useStripe();
  const elements = useElements();

  return (
    <ExpressCheckoutElement
      onReady={(e) => {
        // Logs which wallets actually rendered (per device + Stripe rules).
        // If this prints an empty list, Stripe deemed all of them ineligible
        // for the current environment.
        console.log("[ExpressCheckout] available:", e.availablePaymentMethods);
      }}
      onConfirm={async () => {
        if (!stripe || !elements) return;
        await stripe.confirmPayment({
          elements,
          confirmParams: { return_url: redirectTarget },
        });
      }}
      options={{
        paymentMethods: {
          applePay: "auto",
          googlePay: "auto",
          paypal: "auto",
          link: "auto",
          amazonPay: "never",
          klarna: "never",
        },
        layout: { maxColumns: 1, maxRows: 4, overflow: "never" },
        paymentMethodOrder: ["googlePay", "applePay", "paypal", "link"],
        buttonHeight: 48,
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Card section (PaymentElement, card-only)
// ────────────────────────────────────────────────────────────────────────────

function CardSection({
  amount,
  currency,
  redirectTarget,
}: {
  amount: number;
  currency: string;
  redirectTarget: string;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentType, setPaymentType] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    if (paymentType === "card" && !email) {
      setError("Please enter your email so we can send you the report.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: redirectTarget,
        payment_method_data: {
          billing_details: {
            email: email || undefined,
            name: "",
            phone: "",
            // Every address sub-field set to "never" on the PaymentElement
            // must be passed here. Empty strings work for line1/line2/city/
            // state. Country can't be empty per Stripe — we detect it from
            // the device's timezone. postalCode is "auto" (Stripe collects
            // if the issuer requires AVS) so we don't pass it.
            address: {
              country: detectCountry(),
              line1: "",
              line2: "",
              city: "",
              state: "",
            },
          },
        },
      },
    });
    if (err) {
      setError(err.message ?? "Payment failed");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="!p-3">
        <PaymentElement
          onChange={(e) => setPaymentType(e.value?.type ?? null)}
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never", link: "never" },
            fields: {
              billingDetails: {
                email: "never",
                name: "never",
                phone: "never",
                address: {
                  country: "never",
                  postalCode: "auto",
                  line1: "never",
                  line2: "never",
                  city: "never",
                  state: "never",
                },
              },
            },
            terms: {
              card: "never",
              applePay: "never",
              googlePay: "never",
              paypal: "never",
              sepaDebit: "never",
              auBecsDebit: "never",
              bancontact: "never",
              cashapp: "never",
              ideal: "never",
              sofort: "never",
              usBankAccount: "never",
            },
          }}
        />

        {paymentType === "card" && (
          <div className="mt-4">
            <label className="mb-1.5 block text-[13px] text-[var(--color-ink-soft)]">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 w-full rounded-[12px] border border-[var(--color-line-strong)] bg-white px-3 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-orange)] focus:outline-none focus:ring-1 focus:ring-[var(--color-orange)]"
            />
          </div>
        )}
      </Card>

      {error && (
        <p className="rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
          {error}
        </p>
      )}

      <Button size="block" type="submit" disabled={busy || !stripe || !elements}>
        {busy ? "Processing…" : `Pay ${formatMoney(amount, currency)}`}
      </Button>

      <button
        type="button"
        onClick={() => router.back()}
        className="w-full text-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
      >
        Cancel
      </button>
    </form>
  );
}

function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}
