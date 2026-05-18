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
import { preloadCheckoutInit } from "@/lib/preload-checkout";
import { PayPalButton } from "@/components/paypal-button";
import { useI18n, fmt, localizeHref } from "@/lib/i18n/client";

type Mode = "intro" | "upsell";
type UpsellId = "parents" | "ethnicity" | "ages" | "partner" | "book";

interface CheckoutClientProps {
  mode: Mode;
  plan?: PlanKey;
  upsellId?: UpsellId;
  analysisId: string;
}

// Map upsell IDs to the dictionary key holding their short label.
// Reuses the upsell subtitle/title (short, localized) rather than maintaining
// a separate per-locale label list.
const UPSELL_TITLE_KEYS: Record<UpsellId, "parentsSubtitle" | "ethnicitySubtitle" | "agesSubtitle" | "partnerSubtitle" | "bookSubtitle"> = {
  parents: "parentsSubtitle",
  ethnicity: "ethnicitySubtitle",
  ages: "agesSubtitle",
  partner: "partnerSubtitle",
  book: "bookSubtitle",
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
  /** Set by /api/checkout — required to confirm card payments because we
   *  hide the email field in the PaymentElement. */
  customerEmail?: string | null;
}

export function CheckoutClient(props: CheckoutClientProps) {
  const { t, locale } = useI18n();
  const [init, setInit] = useState<CheckoutInit | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Intro mode: dedupe with the paywall preload. preloadCheckoutInit()
      // returns the cached/in-flight response if it exists, otherwise it
      // fires the fetch. This keeps a hard refresh on /checkout working
      // while making the paywall→checkout transition feel instant.
      if (props.mode === "intro" && props.plan) {
        const data = await preloadCheckoutInit(props.plan, props.analysisId);
        if (cancelled) return;
        if (data) setInit(data);
        else setError(t.checkout.couldNotStart);
        return;
      }

      // Upsell mode — one-time PI, no preload path.
      const res = await fetch("/api/upsell-checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ upsell: props.upsellId, analysisId: props.analysisId }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (!cancelled) setError(txt || t.checkout.couldNotStart);
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

  const upsellLabel =
    props.mode === "upsell" && props.upsellId
      ? t.upsells[UPSELL_TITLE_KEYS[props.upsellId]]
      : null;
  const labelTitle =
    props.mode === "intro"
      ? t.checkout.unlockYourReport
      : fmt(t.checkout.addUpsell, { label: upsellLabel ?? "" });

  // Localized "3 days" / "1 month" etc. — falls back to PLANS' English
  // string if for some reason the plan key isn't one we know about.
  const PERIOD_KEY_BY_PLAN: Record<PlanKey, "period3d" | "period7d" | "period1m"> = {
    sub_intro_3d: "period3d",
    sub_intro_7d: "period7d",
    sub_intro_1m: "period1m",
  };
  const introPeriod =
    props.mode === "intro" && props.plan
      ? t.paywall[PERIOD_KEY_BY_PLAN[props.plan]] ?? PLANS[props.plan].introPeriod
      : null;

  // /api/checkout returns a fully-locale-prefixed returnUrl. The upsell
  // path constructs its own here — apply the same prefix so a /ro user
  // doesn't land back on the English report.
  const redirectTarget =
    typeof window !== "undefined"
      ? init?.returnUrl ??
        (props.mode === "intro"
          ? `${window.location.origin}${localizeHref(`/payment-complete?analysis=${props.analysisId}`, locale)}`
          : `${window.location.origin}${localizeHref(`/report/${props.analysisId}?upsell=${props.upsellId}`, locale)}`)
      : "";

  return (
    <div className="pt-4">
      <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
        {t.checkout.secureCheckout}
      </p>
      <h1 className="mb-2 text-center text-2xl">{labelTitle}</h1>
      <p className="mx-auto mb-6 max-w-sm text-center text-xs text-[var(--color-ink-muted)]">
        {props.mode === "intro" && introPeriod
          ? fmt(t.checkout.introCharge, { period: introPeriod })
          : t.checkout.oneTimePurchase}
      </p>

      {error && (
        <Card className="mb-4 border-2 border-[var(--color-coral)]/30 bg-[var(--color-coral)]/5">
          <p className="text-sm text-[var(--color-coral)]">{error}</p>
        </Card>
      )}

      {init && (
        <Card className="mb-5 bg-[var(--color-orange-pale)]">
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-semibold text-[var(--color-ink)]">
              {t.checkout.chargedToday}
            </span>
            <span className="font-display text-3xl font-bold text-[var(--color-orange)] tabular">
              {formatMoney(init.amount, init.currency)}
            </span>
          </div>
        </Card>
      )}

      {/* Wallets — Express Checkout (Apple Pay, Google Pay, Link) plus our
          custom PayPal button. Stripe filters PayPal out of
          ExpressCheckoutElement unless the account has "PayPal Vault for
          Subscriptions" approval (gated, separate from the basic
          recurring approval), so we render PayPal ourselves and call
          stripe.confirmPayment directly with type="paypal". */}
      {init && stripePromise && (init.walletsClientSecret || init.clientSecret) && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret: init.walletsClientSecret ?? init.clientSecret!,
            appearance: APPEARANCE,
          }}
        >
          <div className="space-y-2">
            <ExpressSection redirectTarget={redirectTarget} />
            <PayPalButton
              clientSecret={init.walletsClientSecret ?? init.clientSecret!}
              returnUrl={redirectTarget}
            />
          </div>
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
              {t.checkout.orPayWithCard}
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
            customerEmail={init.customerEmail ?? null}
          />
        </Elements>
      )}

      {!init && !error && <CheckoutLoader />}

      <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
        {t.checkout.stripeNote}
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
        // maxRows:0 means unlimited rows. Stripe requires this when
        // overflow:"never" — otherwise it throws and the whole element
        // crashes (no wallets render at all).
        layout: { maxColumns: 1, maxRows: 0, overflow: "never" },
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
  customerEmail,
}: {
  amount: number;
  currency: string;
  redirectTarget: string;
  customerEmail: string | null;
}) {
  const { t } = useI18n();
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setBusy(true);
    setError(null);
    const { error: err } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: redirectTarget,
        payment_method_data: {
          billing_details: {
            // Stripe requires us to pass any field we set to "never" in the
            // PaymentElement's fields config. Email comes from /api/checkout
            // (we collected it on /email pre-paywall). Name/phone are not
            // collected by us — empty strings satisfy Stripe.
            email: customerEmail ?? undefined,
            name: "",
            phone: "",
            address: {
              // Country can't be empty per Stripe — derive from timezone.
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

  // If we have the email from /email, hide the field. If we don't (edge
  // case — direct hit to /checkout with no prior /email step), let Stripe
  // collect it as a fallback so we don't crash on confirm.
  const emailFieldMode = customerEmail ? "never" : "auto";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card className="!p-3">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "never", googlePay: "never", link: "never" },
            fields: {
              billingDetails: {
                email: emailFieldMode,
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
      </Card>

      {error && (
        <p className="rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
          {error}
        </p>
      )}

      <Button size="block" type="submit" disabled={busy || !stripe || !elements}>
        {busy ? t.checkout.processing : fmt(t.checkout.pay, { price: formatMoney(amount, currency) })}
      </Button>

      <button
        type="button"
        onClick={() => router.back()}
        className="w-full text-center text-sm text-[var(--color-ink-muted)] hover:text-[var(--color-ink-soft)]"
      >
        {t.checkout.cancel}
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

function CheckoutLoader() {
  const { t } = useI18n();
  const phases = [
    t.checkout.loaderPhases.p1,
    t.checkout.loaderPhases.p2,
    t.checkout.loaderPhases.p3,
    t.checkout.loaderPhases.p4,
  ];
  const [phaseIdx, setPhaseIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setPhaseIdx((i) => (i + 1) % phases.length),
      1800,
    );
    return () => clearInterval(id);
  }, [phases.length]);
  return (
    <Card className="text-center">
      <div className="relative mx-auto h-16 w-16">
        <span className="absolute inset-0 animate-ping rounded-full bg-[var(--color-orange)]/20" />
        <span className="absolute inset-2 animate-pulse rounded-full bg-[var(--color-orange)]/15" />
        <span className="absolute inset-3 flex items-center justify-center rounded-full bg-[var(--color-orange-pale)]">
          <span className="block h-7 w-7 animate-spin rounded-full border-[3px] border-[var(--color-orange)]/30 border-t-[var(--color-orange)]" />
        </span>
      </div>
      <p className="mt-4 text-sm font-semibold text-[var(--color-ink)]">
        {phases[phaseIdx]}
      </p>
      <p className="mt-1 text-[11px] text-[var(--color-ink-muted)]">
        {t.checkout.loaderSub}
      </p>
    </Card>
  );
}
