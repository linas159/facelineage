import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import {
  stripe,
  PLANS,
  priceIdFor,
  pickCurrency,
  type PlanKey,
} from "@/lib/stripe";
import { isLocale, DEFAULT_LOCALE } from "@/lib/i18n/config";
import { createServiceClient } from "@/lib/supabase/server";
import { localized } from "@/lib/i18n/server";
import { metaEventId, readRequestContext, sendMetaEvent } from "@/lib/meta/capi";

/**
 * POST /api/checkout
 *
 * Creates TWO Stripe Subscriptions tied to the same customer:
 *   - subWallets → ExpressCheckoutElement (card + paypal + link allowed,
 *     so PayPal can render as a wallet *and* be saved for recurring).
 *   - subCard    → PaymentElement (card only, no tabs).
 *
 * Each subscription has `trial_period_days` for the intro window and an
 * `add_invoice_items` line for the $1.95 intro fee, with
 * `payment_behavior: "default_incomplete"` so the first invoice's
 * PaymentIntent must be paid to activate. After payment, Stripe auto-charges
 * the recurring price after the trial ends (PayPal billing agreement or
 * saved card — both work).
 *
 * Whichever subscription is paid wins; the webhook cancels the sibling.
 */
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 500 });
  }

  const {
    plan,
    analysisId,
    locale: bodyLocale,
    deviceId,
    deviceFingerprint,
  } = (await req.json()) as {
    plan: PlanKey;
    analysisId?: string;
    locale?: string;
    /** Compelling Evidence identifiers read in the browser — see @/lib/device. */
    deviceId?: string;
    deviceFingerprint?: string;
  };
  const planMeta = PLANS[plan];
  if (!planMeta) return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  if (!analysisId) {
    return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
  }

  // Locale comes from the client (fetch payload). Middleware only sets
  // x-locale based on URL prefix, and /api/* fetches are unprefixed, so we
  // can't rely on it here.
  const locale = isLocale(bodyLocale) ? bodyLocale : DEFAULT_LOCALE;
  const currency = pickCurrency(locale);
  const introAmount = planMeta.intro[currency];

  const db = createServiceClient();
  const { data: analysis } = await db
    .from("analyses")
    .select("id, user_id, email")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) {
    return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Email is collected on /email before the paywall, so we can attach it
  // up-front. Stripe uses it for receipts + PayPal billing agreements.
  const customer = await stripe.customers.create({
    email: analysis.email ?? undefined,
    metadata: {
      source: "facelineage_checkout",
      analysis_id: analysisId,
    },
  });

  const recurringSku = planMeta.recurringInterval === "week" ? "recur_week" : "recur_month";
  const recurringPriceId = priceIdFor(recurringSku);

  // Resolve the product id for `add_invoice_items.price_data`. Prefer the
  // env-cached value (one-time setup) so we save a Stripe round-trip on
  // every checkout. Falls back to a price-retrieve if the env isn't set.
  const cachedProductEnv =
    planMeta.recurringInterval === "week"
      ? process.env.STRIPE_PRODUCT_WEEKLY
      : process.env.STRIPE_PRODUCT_MONTHLY;
  let introProductId = cachedProductEnv ?? "";
  if (!introProductId) {
    const recurringPrice = await stripe.prices.retrieve(recurringPriceId, {
      expand: ["product"],
    });
    introProductId =
      typeof recurringPrice.product === "string"
        ? recurringPrice.product
        : (recurringPrice.product as Stripe.Product).id;
  }

  // Capture Pixel cookies now so the Stripe webhook (which fires the
  // Purchase event server-to-server with no browser cookies of its own)
  // can pass them to CAPI for high match quality.
  const ctxEarly = readRequestContext({
    headers: req.headers,
    url: req.headers.get("referer") ?? undefined,
  });
  const baseMetadata: Record<string, string> = {
    kind: "intro_fee",
    plan,
    analysis_id: analysisId,
  };
  if (ctxEarly.fbp) baseMetadata.meta_fbp = ctxEarly.fbp;
  if (ctxEarly.fbc) baseMetadata.meta_fbc = ctxEarly.fbc;
  if (ctxEarly.userAgent) {
    // Stripe metadata values are capped at 500 chars; UAs occasionally exceed.
    baseMetadata.meta_ua = ctxEarly.userAgent.slice(0, 500);
  }
  if (ctxEarly.ipAddress) baseMetadata.meta_ip = ctxEarly.ipAddress;
  // Dispute prevention (Visa OI / MC Clarity): the browser-side half of the
  // Compelling Evidence identifiers. Stashed here for the same reason as the
  // Pixel context — the webhook that writes the purchase row has no browser
  // of its own. Length-capped to the tightest limit either scheme allows.
  if (deviceId) baseMetadata.device_id = deviceId.slice(0, 40);
  if (deviceFingerprint) baseMetadata.device_fp = deviceFingerprint.slice(0, 45);

  const baseSubParams: Omit<Stripe.SubscriptionCreateParams, "payment_settings" | "metadata"> = {
    customer: customer.id,
    currency,
    items: [{ price: recurringPriceId, quantity: 1 }],
    trial_period_days: planMeta.introDays,
    add_invoice_items: [
      {
        price_data: {
          currency,
          product: introProductId,
          unit_amount: introAmount,
        },
      },
    ],
    payment_behavior: "default_incomplete",
    expand: ["latest_invoice.payment_intent"],
  };

  // PayPal + Link only support some currencies — not RON. Drop the
  // unsupported methods per currency so Stripe doesn't reject the sub create
  // with "payment method type X does not support currency Y". PayPal covers
  // PLN (Link doesn't), so PLN gets card + paypal.
  const PM_CURRENCIES: Record<string, Set<Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType>> = {
    usd: new Set(["card", "paypal", "link"]),
    eur: new Set(["card", "paypal", "link"]),
    ron: new Set(["card"]),
    pln: new Set(["card", "paypal"]),
  };
  const walletsMethods = Array.from(
    PM_CURRENCIES[currency] ?? new Set(["card"]),
  ) as Stripe.SubscriptionCreateParams.PaymentSettings.PaymentMethodType[];

  const [subWallets, subCard] = await Promise.all([
    stripe.subscriptions.create({
      ...baseSubParams,
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: walletsMethods,
      },
      metadata: { ...baseMetadata, flow: "wallets" },
    }),
    stripe.subscriptions.create({
      ...baseSubParams,
      payment_settings: {
        save_default_payment_method: "on_subscription",
        payment_method_types: ["card"],
      },
      metadata: { ...baseMetadata, flow: "card" },
    }),
  ]);
  // The webhook finds the unused sibling by listing the customer's subs
  // with matching analysis_id metadata — no need to pay the round-trip to
  // cross-link them here.

  const walletsInvoice = subWallets.latest_invoice as Stripe.Invoice | null;
  const cardInvoice = subCard.latest_invoice as Stripe.Invoice | null;
  const walletsPI = walletsInvoice?.payment_intent as Stripe.PaymentIntent | null;
  const cardPI = cardInvoice?.payment_intent as Stripe.PaymentIntent | null;

  if (!walletsPI?.client_secret || !cardPI?.client_secret) {
    return NextResponse.json(
      { error: "Could not initialize checkout" },
      { status: 500 },
    );
  }

  // Preserve the user's locale through the Stripe redirect: middleware
  // strips the `/ro` prefix internally, so without re-adding it the
  // post-payment pages (payment-complete, generating, popups) render in
  // the default locale even when the user came from `/ro/...`.
  const returnPath = localized(`/payment-complete?analysis=${analysisId}`, locale);

  // CAPI InitiateCheckout — pairs with the browser Pixel fired by the
  // paywall (same deterministic event_id). Value is the intro fee, since
  // that's the amount the user is being asked to pay right now.
  void sendMetaEvent({
    eventName: "InitiateCheckout",
    eventId: metaEventId.initiateCheckout(analysisId, plan),
    eventSourceUrl: ctxEarly.eventSourceUrl,
    userData: {
      email: analysis.email ?? undefined,
      externalId: analysisId,
      ipAddress: ctxEarly.ipAddress,
      userAgent: ctxEarly.userAgent,
      fbp: ctxEarly.fbp,
      fbc: ctxEarly.fbc,
    },
    customData: {
      currency,
      value: introAmount / 100,
      contentName: plan,
      contentCategory: "subscription_intro",
      contentIds: [plan],
      contentType: "product",
      numItems: 1,
    },
  });

  return NextResponse.json({
    walletsClientSecret: walletsPI.client_secret,
    cardClientSecret: cardPI.client_secret,
    publishableKey: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    amount: introAmount,
    currency,
    returnUrl: `${baseUrl}${returnPath}`,
    customerEmail: analysis.email ?? null,
  });
}
