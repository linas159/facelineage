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

export function CheckoutClient(props: CheckoutClientProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [publishableKey, setPublishableKey] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [returnUrl, setReturnUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // For intro flow, the user must enter an email before we create the PI
  // (Stripe requires a customer for setup_future_usage). For upsell flow,
  // the email is already on file via the existing customer.
  const [email, setEmail] = useState("");
  const [submittingEmail, setSubmittingEmail] = useState(false);

  async function initiate(emailValue: string | null) {
    setSubmittingEmail(true);
    setError(null);
    try {
      const url = props.mode === "intro" ? "/api/checkout" : "/api/upsell-checkout";
      const body =
        props.mode === "intro"
          ? { plan: props.plan, analysisId: props.analysisId, email: emailValue }
          : { upsell: props.upsellId, analysisId: props.analysisId };
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const t = await res.text();
        setError(t || "Could not start checkout");
        return;
      }
      const j = (await res.json()) as {
        clientSecret: string;
        publishableKey: string;
        amount: number;
        returnUrl?: string;
      };
      setClientSecret(j.clientSecret);
      setPublishableKey(j.publishableKey);
      setAmount(j.amount);
      if (j.returnUrl) setReturnUrl(j.returnUrl);
    } finally {
      setSubmittingEmail(false);
    }
  }

  // Upsell flow: kick off immediately (email already on file).
  useEffect(() => {
    if (props.mode === "upsell") {
      initiate(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.mode]);

  const stripePromise = useMemo<Promise<StripeJs | null> | null>(() => {
    if (!publishableKey) return null;
    return loadStripe(publishableKey);
  }, [publishableKey]);

  const labelTitle =
    props.mode === "intro"
      ? "Unlock your report"
      : `Add: ${UPSELL_LABELS[props.upsellId!]}`;

  const introPeriod =
    props.mode === "intro" && props.plan ? PLANS[props.plan].introPeriod : null;

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

      {/* Email step (intro flow only, shown before Elements load) */}
      {props.mode === "intro" && !clientSecret && (
        <Card className="mb-4 !p-5">
          <p className="mb-1 text-sm font-semibold text-[var(--color-ink)]">
            Where should we send your receipt?
          </p>
          <p className="mb-3 text-xs text-[var(--color-ink-muted)]">
            We&apos;ll use this to send your report link too — no password to remember.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (email) initiate(email);
            }}
            className="space-y-3"
          >
            <input
              type="email"
              required
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submittingEmail}
              className="h-12 w-full rounded-[var(--radius-input)] border-2 border-[var(--color-line)] bg-white px-4 text-base text-[var(--color-ink)] placeholder:text-[var(--color-ink-faint)] focus:border-[var(--color-orange)] focus:outline-none disabled:opacity-60"
            />
            <Button size="block" type="submit" disabled={submittingEmail || !email}>
              {submittingEmail ? "Preparing checkout…" : "Continue →"}
            </Button>
          </form>
        </Card>
      )}

      {amount !== null && (
        <Card className="mb-4 bg-[var(--color-orange-pale)]">
          <div className="flex items-baseline justify-between">
            <span className="text-sm font-semibold text-[var(--color-ink)]">
              Charged today
            </span>
            <span className="font-display text-3xl font-bold text-[var(--color-orange)] tabular">
              {formatMoney(amount, "usd")}
            </span>
          </div>
        </Card>
      )}

      {clientSecret && stripePromise && (
        <Elements
          stripe={stripePromise}
          options={{
            clientSecret,
            appearance: {
              theme: "flat",
              variables: {
                colorPrimary: "#7c5cff",
                colorBackground: "#ffffff",
                colorText: "#2a2540",
                colorDanger: "#f97373",
                fontFamily: "Outfit, system-ui, sans-serif",
                borderRadius: "12px",
                spacingUnit: "5px",
              },
            },
          }}
        >
          <CheckoutForm
            amount={amount ?? 0}
            mode={props.mode}
            analysisId={props.analysisId}
            redirectTarget={
              returnUrl ??
              (props.mode === "intro"
                ? `${window.location.origin}/payment-complete?analysis=${props.analysisId}`
                : `${window.location.origin}/report/${props.analysisId}?upsell=${props.upsellId}`)
            }
          />
        </Elements>
      )}

      {!clientSecret && !error && (
        <Card className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--color-orange-pale)] border-t-[var(--color-orange)]" />
          <p className="mt-3 text-xs text-[var(--color-ink-muted)]">Preparing secure checkout…</p>
        </Card>
      )}

      <p className="mt-6 text-center text-[10px] leading-relaxed text-[var(--color-ink-muted)]">
        Payments are processed by Stripe. Your card details never touch our servers.
      </p>
    </div>
  );
}

interface CheckoutFormProps {
  amount: number;
  mode: Mode;
  analysisId: string;
  redirectTarget: string;
}

function CheckoutForm({ amount, redirectTarget }: CheckoutFormProps) {
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
      },
    });
    if (err) {
      setError(err.message ?? "Payment failed");
      setBusy(false);
    }
    // On success, Stripe redirects to return_url — no router.push needed.
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Express Checkout (Apple Pay, Google Pay, PayPal, Link) — appears
          only when the browser/device supports at least one wallet. */}
      <ExpressCheckoutElement
        onConfirm={() => {
          /* Stripe handles the wallet flow + posts to return_url itself. */
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
          buttonHeight: 48,
        }}
      />

      <div className="relative my-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t border-[var(--color-line-strong)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--color-bg-base)] px-3 font-semibold text-[var(--color-ink-muted)]">
            or pay with card
          </span>
        </div>
      </div>

      <Card className="!p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            wallets: { applePay: "auto", googlePay: "auto" },
            // Suppress Stripe's auto-mandate ("by providing your card info
            // you allow … to charge for future payments"). The required
            // disclosure for the recurring charge is already on the paywall.
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
        {busy ? "Processing…" : `Pay ${formatMoney(amount, "usd")}`}
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
