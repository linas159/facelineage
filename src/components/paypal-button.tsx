"use client";

import { useState } from "react";
import { useStripe } from "@stripe/react-stripe-js";
import type {
  ConfirmPaymentData,
  CreatePaymentMethodPayPalData,
} from "@stripe/stripe-js";
import { useI18n } from "@/lib/i18n/client";

interface PayPalButtonProps {
  clientSecret: string;
  returnUrl: string;
}

/**
 * Custom "Pay with PayPal" button that bypasses Stripe's
 * ExpressCheckoutElement filter (which gates the PayPal button behind a
 * separate "PayPal Vault for Subscriptions" account approval).
 *
 * On click we call `stripe.confirmPayment` directly with
 * `payment_method_data: { type: "paypal" }`. Stripe redirects to PayPal,
 * the user authorizes, redirects back to `returnUrl`. The wallets
 * subscription's PaymentIntent already has `paypal` in
 * `payment_method_types`, so this works exactly like the tab flow — just
 * launched from our own UI.
 */
export function PayPalButton({ clientSecret, returnUrl }: PayPalButtonProps) {
  const { t } = useI18n();
  const stripe = useStripe();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!stripe || busy) return;
    setBusy(true);
    setError(null);

    const { paymentMethod, error: pmErr } = await stripe.createPaymentMethod({
      type: "paypal",
    } satisfies CreatePaymentMethodPayPalData);
    if (pmErr || !paymentMethod) {
      setError(pmErr?.message ?? t.checkout.paypalFailed);
      setBusy(false);
      return;
    }

    const confirmParams: ConfirmPaymentData = {
      return_url: returnUrl,
      payment_method: paymentMethod.id,
    };
    const { error: err } = await stripe.confirmPayment({
      clientSecret,
      confirmParams,
    });
    if (err) {
      setError(err.message ?? t.checkout.paypalFailed);
      setBusy(false);
    }
    // Success path: Stripe redirects; nothing to do here.
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || !stripe}
        aria-label={t.checkout.payWithPaypalAria}
        style={{
          width: "100%",
          height: 48,
          background: "#FFC439",
          border: 0,
          borderRadius: 12,
          cursor: busy || !stripe ? "wait" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 0,
          opacity: !stripe ? 0.5 : 1,
          transition: "background 120ms ease",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#F5BE2D";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.background = "#FFC439";
        }}
      >
        {busy ? (
          <span style={{ fontSize: 14, fontWeight: 600, color: "#253B80" }}>
            {t.checkout.paypalRedirecting}
          </span>
        ) : (
          <PayPalLogo />
        )}
      </button>
      {error && (
        <p
          style={{
            marginTop: 8,
            fontSize: 13,
            color: "var(--color-coral)",
            textAlign: "center",
          }}
        >
          {error}
        </p>
      )}
    </>
  );
}

function PayPalLogo() {
  // Official PayPal wordmark SVG.
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 124 33"
      height="22"
      role="img"
      aria-hidden="true"
    >
      <path
        d="M46.211 6.749h-6.839a.95.95 0 0 0-.939.802L35.673 24.85a.57.57 0 0 0 .564.658h3.267a.95.95 0 0 0 .939-.803l.746-4.73a.95.95 0 0 1 .938-.803h2.164c4.505 0 7.105-2.18 7.784-6.5.306-1.89.013-3.375-.872-4.415-.972-1.142-2.696-1.746-4.987-1.746zM47 13.154c-.374 2.454-2.249 2.454-4.062 2.454h-1.032l.724-4.583a.57.57 0 0 1 .563-.481h.473c1.235 0 2.4 0 3.002.704.359.42.469 1.044.332 1.906zM68.508 13.075h-3.277a.57.57 0 0 0-.563.481l-.145.916-.229-.332c-.709-1.029-2.29-1.373-3.868-1.373-3.619 0-6.71 2.741-7.312 6.586-.313 1.918.132 3.752 1.22 5.031.998 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .563.66h2.95a.95.95 0 0 0 .939-.803l1.771-11.219a.568.568 0 0 0-.561-.658zm-4.565 6.374c-.316 1.871-1.801 3.127-3.695 3.127-.951 0-1.711-.305-2.199-.883-.484-.574-.668-1.391-.514-2.301.295-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.499.589.697 1.411.554 2.317zM86.073 13.075h-3.293a.954.954 0 0 0-.787.417l-4.543 6.691-1.925-6.43a.953.953 0 0 0-.912-.678h-3.236a.57.57 0 0 0-.541.754l3.625 10.638-3.408 4.811a.57.57 0 0 0 .465.9h3.289a.949.949 0 0 0 .781-.408l10.946-15.8a.57.57 0 0 0-.461-.895z"
        fill="#253B80"
      />
      <path
        d="M94.992 6.749h-6.84a.95.95 0 0 0-.938.802L84.455 24.85a.569.569 0 0 0 .562.658h3.51a.665.665 0 0 0 .656-.562l.785-4.971a.95.95 0 0 1 .938-.803h2.164c4.506 0 7.105-2.18 7.785-6.5.307-1.89.012-3.375-.873-4.415-.971-1.142-2.694-1.746-4.985-1.746zm.789 6.405c-.373 2.454-2.248 2.454-4.062 2.454h-1.031l.725-4.583a.568.568 0 0 1 .562-.481h.473c1.234 0 2.4 0 3.002.704.359.42.468 1.044.331 1.906zM117.288 13.075h-3.275a.567.567 0 0 0-.562.481l-.145.916-.23-.332c-.709-1.029-2.289-1.373-3.867-1.373-3.619 0-6.709 2.741-7.311 6.586-.312 1.918.131 3.752 1.219 5.031 1 1.176 2.426 1.666 4.125 1.666 2.916 0 4.533-1.875 4.533-1.875l-.146.91a.57.57 0 0 0 .564.66h2.949a.95.95 0 0 0 .938-.803l1.771-11.219a.571.571 0 0 0-.563-.658zm-4.565 6.374c-.314 1.871-1.801 3.127-3.695 3.127-.949 0-1.711-.305-2.199-.883-.484-.574-.666-1.391-.514-2.301.297-1.855 1.805-3.152 3.67-3.152.93 0 1.686.309 2.184.892.501.589.699 1.411.554 2.317zM121.155 7.225l-2.832 18.013a.569.569 0 0 0 .562.658h2.823a.95.95 0 0 0 .939-.803l2.795-17.708a.57.57 0 0 0-.562-.659h-3.16a.571.571 0 0 0-.565.499z"
        fill="#179BD7"
      />
      <path
        d="M7.266 29.154l.523-3.322-1.165-.027H1.061L4.927 1.292a.316.316 0 0 1 .314-.268h9.38c3.114 0 5.263.648 6.385 1.927.526.6.861 1.227 1.023 1.917.17.724.173 1.589.007 2.644l-.012.077v.676l.526.298a3.69 3.69 0 0 1 1.065.812c.45.513.741 1.165.864 1.938.127.795.085 1.741-.123 2.812-.24 1.232-.628 2.305-1.152 3.183a6.547 6.547 0 0 1-1.825 2c-.696.494-1.523.869-2.458 1.109-.906.236-1.939.355-3.072.355h-.73c-.522 0-1.029.188-1.427.525a2.21 2.21 0 0 0-.744 1.328l-.055.299-.924 5.855-.042.215c-.011.068-.03.102-.058.125a.155.155 0 0 1-.096.035H7.266z"
        fill="#253B80"
      />
      <path
        d="M23.048 7.667c-.028.179-.06.362-.096.55-1.237 6.351-5.469 8.545-10.874 8.545H9.326c-.661 0-1.218.48-1.321 1.132L6.596 26.83l-.399 2.533a.704.704 0 0 0 .695.814h4.881c.578 0 1.069-.42 1.16-.99l.048-.248.919-5.832.059-.32c.09-.572.582-.992 1.16-.992h.73c4.729 0 8.431-1.92 9.513-7.476.452-2.321.218-4.259-.978-5.622a4.667 4.667 0 0 0-1.336-1.03z"
        fill="#179BD7"
      />
      <path
        d="M21.754 7.151a9.757 9.757 0 0 0-1.203-.267 15.284 15.284 0 0 0-2.426-.177h-7.352a1.172 1.172 0 0 0-1.159.992L8.05 17.605l-.045.289a1.336 1.336 0 0 1 1.321-1.132h2.752c5.405 0 9.637-2.195 10.874-8.545.037-.188.068-.371.096-.55a6.594 6.594 0 0 0-1.017-.429 9.045 9.045 0 0 0-.277-.087z"
        fill="#222D65"
      />
      <path
        d="M9.614 7.699a1.169 1.169 0 0 1 1.159-.991h7.352c.871 0 1.684.057 2.426.177a9.757 9.757 0 0 1 1.481.353c.365.121.704.264 1.017.429.368-2.347-.003-3.945-1.272-5.392C20.378.682 17.853 0 14.622 0h-9.38c-.66 0-1.223.48-1.325 1.133L.01 25.898a.806.806 0 0 0 .795.932h5.791l1.454-9.225 1.564-9.906z"
        fill="#253B80"
      />
    </svg>
  );
}
