"use client";

import { useState } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import type { StripeError } from "@stripe/stripe-js";
import { useI18n, fmt, localizeHref } from "@/lib/i18n/client";
import { capture } from "@/lib/posthog/client";

interface BlikButtonProps {
  clientSecret: string;
  returnUrl: string;
  /** Pre-formatted amounts/date for the recurring-mandate disclosure. */
  introPrice: string;
  recurringPrice: string;
  firstRenewalDate: string;
  customerEmail: string | null;
}

/**
 * BLIK for PLN intro checkouts. Confirms the wallets subscription's
 * PaymentIntent (which lists `blik`) with a 6-digit code; the customer then
 * approves the payment + a recurring (Model O) mandate in their banking app.
 * Because the PI has `setup_future_usage=off_session` (set by the
 * subscription's `save_default_payment_method`), Stripe saves the BLIK PM as
 * the subscription default and charges it off-session after the trial.
 *
 * No redirect: confirmBlikPayment polls until approval/decline/timeout, so
 * on success we navigate to the return URL ourselves with the same params
 * Stripe would append.
 *
 * Stripe requires the mandate terms and supported-bank list to be shown
 * before the code is collected — hence the two-step (expand, then pay) UI.
 */
export function BlikButton({
  clientSecret,
  returnUrl,
  introPrice,
  recurringPrice,
  firstRenewalDate,
  customerEmail,
}: BlikButtonProps) {
  const { t, locale } = useI18n();
  const stripe = useStripe();
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function errorMessage(err: StripeError): string {
    // The sandbox (and some API versions) report every decline as
    // `generic_decline`, so fall back to the error code when needed.
    switch (err.decline_code) {
      case "recurring_not_supported_by_bank":
        return t.checkout.blikBankUnsupported;
      case "insufficient_funds":
        return t.checkout.blikInsufficientFunds;
      case "customer_declined":
        return t.checkout.blikDeclined;
      case "payment_limit_exceeded":
        return t.checkout.blikLimitExceeded;
      case "code_invalid":
      case "code_expired":
        return t.checkout.blikInvalidCode;
    }
    switch (err.code) {
      case "payment_method_invalid_parameter":
        return t.checkout.blikInvalidCode;
      case "payment_method_provider_timeout":
        return t.checkout.blikTimeout;
      default:
        return t.checkout.blikFailed;
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    capture("checkout_blik_pay_clicked");

    const { paymentIntent, error: err } = await stripe.confirmBlikPayment(clientSecret, {
      payment_method: {
        blik: {},
        billing_details: { email: customerEmail ?? undefined },
      },
      payment_method_options: { blik: { code } },
    });

    if (!err && paymentIntent?.status === "succeeded") {
      const url = new URL(returnUrl);
      url.searchParams.set("payment_intent", paymentIntent.id);
      url.searchParams.set("redirect_status", "succeeded");
      window.location.assign(url.toString());
      return;
    }

    capture("checkout_blik_pay_failed", {
      code: err?.code ?? null,
      decline_code: err?.decline_code ?? null,
      status: paymentIntent?.status ?? null,
    });
    setError(err ? errorMessage(err) : t.checkout.blikFailed);
    // BLIK codes are single-use — make the customer generate a fresh one.
    setCode("");
    setBusy(false);
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!stripe}
        aria-label={t.checkout.payWithBlikAria}
        className="flex h-12 w-full items-center justify-center rounded-[12px] bg-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        <BlikLogo />
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-[12px] border border-[var(--color-line-strong)] bg-white p-4"
    >
      <div className="flex items-center gap-2">
        <BlikLogo small />
        <span className="text-sm font-semibold text-[var(--color-ink)]">{t.checkout.blikTitle}</span>
      </div>

      <p className="text-xs leading-relaxed text-[var(--color-ink-soft)]">
        {fmt(t.checkout.blikMandate, {
          intro: introPrice,
          price: recurringPrice,
          date: firstRenewalDate,
        })}{" "}
        <a href={localizeHref("/terms", locale)} target="_blank" rel="noreferrer" className="underline">
          {t.checkout.blikTerms}
        </a>
      </p>
      <p className="text-[11px] leading-relaxed text-[var(--color-ink-muted)]">{t.checkout.blikBanks}</p>

      <label className="block">
        <span className="mb-1 block text-xs font-semibold text-[var(--color-ink)]">
          {t.checkout.blikCodeLabel}
        </span>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          placeholder="000 000"
          value={code}
          disabled={busy}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          className="h-12 w-full rounded-[12px] border border-[var(--color-line-strong)] text-center font-mono text-2xl tracking-[0.4em] outline-none focus:border-[var(--color-orange)]"
        />
      </label>

      {busy && (
        <p className="text-center text-sm font-semibold text-[var(--color-ink)]">{t.checkout.blikWaiting}</p>
      )}
      {error && (
        <p className="rounded-[var(--radius-input)] bg-[var(--color-coral)]/10 p-3 text-center text-sm text-[var(--color-coral)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !stripe || code.length !== 6}
        className="h-12 w-full rounded-[12px] bg-black text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {busy ? t.checkout.processing : fmt(t.checkout.pay, { price: introPrice })}
      </button>
    </form>
  );
}

function BlikLogo({ small = false }: { small?: boolean }) {
  // Simplified BLIK wordmark: white letters with the signature red→pink dot.
  const h = small ? 18 : 24;
  return (
    <svg viewBox="0 0 88 32" height={h} role="img" aria-hidden="true">
      <rect width="88" height="32" rx="6" fill="#000" />
      <text
        x="10"
        y="23"
        fill="#fff"
        fontFamily="Arial Black, Arial, sans-serif"
        fontWeight="900"
        fontSize="20"
        letterSpacing="1"
      >
        blik
      </text>
      <defs>
        <linearGradient id="blik-dot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff0052" />
          <stop offset="1" stopColor="#e83e49" />
        </linearGradient>
      </defs>
      <circle cx="72" cy="12" r="5" fill="url(#blik-dot)" />
    </svg>
  );
}
