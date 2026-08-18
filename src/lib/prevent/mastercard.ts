import "server-only";
import { MERCHANT, POLICY, productInfo } from "@/lib/prevent/config";
import { PLANS, isCurrency, type Currency, type PlanKey } from "@/lib/stripe";
import {
  centsToString,
  currencyCode,
  fit,
  isoSeconds,
  monthsBetween,
  prune,
} from "@/lib/prevent/format";
import type { PurchaseContext, PurchaseRecord } from "@/lib/prevent/lookup";
import {
  parseAmountToCents,
  parseDate,
  type MatchInput,
} from "@/lib/prevent/lookup";

/**
 * Mastercard Consumer Clarity.
 *
 * Two things differ structurally from Visa and both are easy to get wrong:
 *
 *  1. There is no 404. Every outcome — found, not found, ambiguous — is an
 *     HTTP 200 whose `responseStatus.code` carries the result.
 *  2. Every date-time is pinned to exactly 20 characters, i.e. ISO 8601 at
 *     second precision. `Date#toISOString()` emits 24 and fails validation.
 */

// ────────────────────────────────────────────────────────────────────────────
// Request
// ────────────────────────────────────────────────────────────────────────────

export interface ClarityRequestReference {
  originatorChannel?: string; // DIGITAL | CALL_CENTRE | FIRST_PARTY_TRUST | ...
  originatorId?: string;
  sourceId?: string;
  originatorDescription?: string;
  correlationId?: string;
  locale?: string;
}

export interface ClaritySearchCriteria {
  paymentType?: string;
  transactionIdentifierType?: string; // BANKNET_REF_NUM | INVOICE_REF_NUM
  transactionIdentifierValue?: string;
  acquirerReferenceNumber?: string | number;
  transactionDateTime?: string;
  cardFirstSix?: string;
  cardLastFour?: string;
  issuerAuthorizationCode?: string;
  transactionAmount?: string | number;
  transactionCurrencyCode?: string;
  merchantId?: string;
  cardAcceptorId?: string | number;
  cardAcceptorName?: string;
  cardAcceptorLocation?: string;
  cardAcceptorRegionCode?: string;
  cardAcceptorCountryCode?: string;
}

export interface ClarityLookupRequest {
  requestReference?: ClarityRequestReference;
  searchCriteria?: ClaritySearchCriteria;
}

export type ClarityStatusCode =
  | "TRANSACTION_FOUND"
  | "TRANSACTION_NOT_FOUND"
  | "MULTIPLE_TRANSACTIONS_FOUND";

/** Both top-level objects are mandatory; without searchCriteria there is nothing to match on. */
export function validateClarityRequest(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Body must be a JSON object";
  const b = body as ClarityLookupRequest;
  if (!b.searchCriteria || typeof b.searchCriteria !== "object") {
    return "Missing required object: searchCriteria";
  }
  return null;
}

export function clarityMatchInput(body: ClarityLookupRequest): MatchInput {
  const sc = body.searchCriteria ?? {};
  const arn =
    sc.acquirerReferenceNumber === undefined || sc.acquirerReferenceNumber === null
      ? undefined
      : String(sc.acquirerReferenceNumber).trim() || undefined;

  return {
    networkTransactionId: sc.transactionIdentifierValue?.trim() || undefined,
    arn,
    authCode: sc.issuerAuthorizationCode?.trim() || undefined,
    cardLast4: sc.cardLastFour?.trim() || undefined,
    cardBin: sc.cardFirstSix?.trim() || undefined,
    amountCents: parseAmountToCents(sc.transactionAmount),
    currency: sc.transactionCurrencyCode ?? undefined,
    transactionDate: parseDate(sc.transactionDateTime),
    // Clarity's equivalent of Visa's paymentDescriptor: the trading name shown
    // at the point of sale. Same role in matching — a tie-breaker, not a key.
    paymentDescriptor: sc.cardAcceptorName?.trim() || undefined,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Response
// ────────────────────────────────────────────────────────────────────────────

export function clarityStatusResponse(
  code: ClarityStatusCode,
  message: string,
  trackingId?: string,
): Record<string, unknown> {
  return prune({
    responseStatus: { code, message: fit(message, 100), trackingId: fit(trackingId, 201) },
  }) as Record<string, unknown>;
}

/** Stripe card brand → the four network names Clarity accepts. */
function paymentType(brand: string | null | undefined): string | undefined {
  switch ((brand ?? "").toLowerCase()) {
    case "visa":
      return "VISA";
    case "mastercard":
      return "MC";
    case "amex":
      return "AMEX";
    case "discover":
      return "DISCOVER";
    default:
      return undefined;
  }
}

function deviceType(ua: string | null | undefined): string | undefined {
  if (!ua) return undefined;
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  return "Desktop";
}

/** Coarse browser label for `appSourceBrowserType` (≤45 chars). */
function browserLabel(ua: string | null | undefined): string | undefined {
  if (!ua) return undefined;
  if (/Edg\//.test(ua)) return "Edge";
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return "Chrome";
  if (/Firefox\//.test(ua)) return "Firefox";
  if (/Safari\//.test(ua)) return "Safari";
  return "Other";
}

/** Days → the {interval, unit} pair Clarity expects for trial periods. */
function intervalFromDays(days: number): { interval: number; unit: string } {
  if (days > 0 && days % 30 === 0) return { interval: days / 30, unit: "Month" };
  if (days > 0 && days % 7 === 0) return { interval: days / 7, unit: "Week" };
  return { interval: days, unit: "Day" };
}

function lifecycleStatus(status: string | null | undefined): string {
  switch (status) {
    case "trialing":
    case "active":
    case "past_due":
      return "Active";
    case "canceled":
      return "Cancelled";
    case "incomplete":
      return "Not_Started";
    default:
      return "Expired";
  }
}

/**
 * The Recurring object — the single highest-value part of a Clarity response
 * for a subscription business.
 *
 * Cardholders reach Clarity through their banking app precisely because they
 * forgot about a renewal, and the issuer surfaces cancel/pause controls from
 * this data. Spelling out the trial terms, the real renewal price, the next
 * billing date and where to cancel resolves the inquiry in the app instead of
 * turning it into a "I didn't authorize this" dispute.
 */
function recurringBlock(
  purchase: PurchaseRecord,
  ctx: PurchaseContext,
): Record<string, unknown> | undefined {
  const sku = purchase.product_sku as PlanKey | null;
  if (!sku || !(sku in PLANS)) return undefined;
  const plan = PLANS[sku];
  const sub = ctx.subscription;

  const currency: Currency = isCurrency(purchase.currency) ? (purchase.currency as Currency) : "usd";
  const trial = intervalFromDays(plan.introDays);
  const started = purchase.authorized_at ?? purchase.created_at;
  const status = lifecycleStatus(sub?.status);
  const isTrialing = sub?.status === "trialing";

  return {
    trialPeriod: true,
    trialStatus: isTrialing ? "Active" : status === "Cancelled" ? "Cancelled" : "Expired",
    trialInterval: trial.interval,
    trialIntervalUnit: trial.unit,
    trialActivationDateTime: isoSeconds(started),
    trialStartDateTime: isoSeconds(started),
    // While the subscription is still on trial, Stripe's current period end
    // *is* the trial end; afterwards the trial ended one interval in.
    trialEndDateTime: isTrialing
      ? isoSeconds(sub?.current_period_end)
      : isoSeconds(new Date(new Date(started).getTime() + plan.introDays * 86_400_000)),
    trialPrice: centsToString(purchase.amount_cents),

    subscriptionActivationDateTime: isoSeconds(started),
    subscriptionStartDateTime: isoSeconds(sub?.created_at ?? started),
    subscriptionCancellationDateTime: isoSeconds(sub?.canceled_at),
    subscriptionExpirationDateTime: isoSeconds(sub?.cancel_at),
    subscriptionPrice: centsToString(plan.recurring[currency]),
    subscriptionInterval: 1,
    subscriptionIntervalUnit: plan.recurringInterval === "week" ? "Week" : "Month",
    subscriptionStatus: status,
    subscriptionCurrentPeriodStarted: isoSeconds(sub?.current_period_start),
    subscriptionCurrentPeriodEnds: isoSeconds(sub?.current_period_end),
    // Nothing is charged again until the intro period ends, so the trial end
    // and the first full-price payment are the same moment.
    subscriptionNextBillingDateTime: isoSeconds(sub?.current_period_end),
    subscriptionFirstPayment: centsToString(plan.recurring[currency]),
    numberOfHistoricSuccessfulPayments: ctx.purchaseCount,
    cancellationPenalty: false,
    cancellationPenaltyDescription: fit(POLICY.cancellationRecap, 500),
    subscriptionCancellationPolicyLink: fit(MERCHANT.links.refunds, 500),
    subscriptionContractLink: fit(MERCHANT.links.terms, 500),
  };
}

/**
 * Build the Clarity response for a matched purchase.
 *
 * As with Visa, every shipping and delivery-address field is omitted on
 * purpose: this is a digital service, and the guide warns that irrelevant
 * data reduces clarity even when it passes validation.
 */
export function buildClarityResponse(
  purchase: PurchaseRecord,
  ctx: PurchaseContext,
  trackingId?: string,
): Record<string, unknown> {
  const product = productInfo(purchase.product_sku);
  const authorizedAt = purchase.authorized_at ?? purchase.created_at;
  const refunded = purchase.refunded_amount_cents ?? 0;

  const response = {
    responseStatus: {
      code: "TRANSACTION_FOUND" as const,
      message: "Transaction details provided",
      trackingId: fit(trackingId ?? purchase.id, 201),
    },

    order: {
      merchantOrderId: fit(purchase.id, 50)!,
      orderDateTime: isoSeconds(authorizedAt)!,
      orderStatus: "Closed_Complete",
      orderEmail: fit(purchase.customer_email, 200),
      subtotal: centsToString(purchase.amount_cents),
      total: centsToString(purchase.amount_cents),
      refundTotal: refunded > 0 ? centsToString(refunded) : undefined,
      currencyCode: currencyCode(purchase.currency),
      // Our published policy is a 30-day money-back guarantee, so this is
      // true for any order inside that window and honest outside it.
      refundEligible:
        Date.now() - new Date(authorizedAt).getTime() < 30 * 86_400_000 && refunded === 0,
      // Stated precisely, because the issuer may read it back to the
      // cardholder: a one-off add-on has no recurring-billing disclosure to
      // consent to, and claiming otherwise is the kind of small inaccuracy
      // that costs credibility on the whole response.
      proofOfConsent: fit(
        product.recurring
          ? "Customer accepted the Terms of Service and the recurring-billing disclosure shown on the checkout page before submitting payment."
          : "Customer accepted the Terms of Service shown on the checkout page before submitting this one-time purchase.",
        500,
      ),
      communications: fit(
        `${
          ctx.reportDelivered
            ? "Ordered online and delivered digitally to the customer's account."
            : "Ordered online; digital access was granted to the customer's account immediately."
        } Support: ${MERCHANT.supportEmail}.${
          product.recurring ? ` Cancel any time at ${MERCHANT.links.account}.` : ""
        }`,
        1000,
      ),

      orderItems: [
        {
          id: fit(purchase.stripe_payment_intent ?? purchase.id, 100)!,
          productId: fit(purchase.product_sku, 100),
          productSku: fit(purchase.product_sku, 100),
          productName: fit(product.name, 100)!,
          productDescription: fit(product.description, 1000),
          linkToItemPurchased: fit(product.url, 500),
          quantity: "1",
          productPrice: centsToString(purchase.amount_cents),
          productType: fit(product.type, 30),
          itemDeliveryFormat: "Instant digital access",
          adultContent: false,
          usage: {
            // The strongest single signal against a "never received it"
            // claim: the report was generated and served to this account.
            productInUse: ctx.reportDelivered,
            lastUtilizationDateTime: isoSeconds(purchase.fulfilled_at ?? purchase.created_at),
            consumptionDescription: fit(
              ctx.reportDelivered
                ? "Ancestry report was generated and opened in the customer's account."
                : "Digital access was granted to the customer's account immediately after payment.",
              500,
            ),
            consumptionMethod: fit(
              purchase.client_ip
                ? `Accessed over the web from IP ${purchase.client_ip}.`
                : "Accessed over the web at facelineage.com.",
              500,
            ),
          },
          recurring: recurringBlock(purchase, ctx),
        },
      ],

      transactionDetails: {
        deviceIpAddress: fit(purchase.client_ip, 45),
        orderDeviceId: fit(purchase.device_id, 40),
        orderDeviceFingerprint: fit(purchase.device_fingerprint, 200),
        deviceType: fit(deviceType(purchase.client_user_agent), 20),
        appSourceBrowserType: fit(browserLabel(purchase.client_user_agent), 45),
        salesChannel: "Website",
      },

      payments: [
        {
          id: "1",
          matchedPayment: true,
          paymentType: paymentType(purchase.card_brand),
          cardLastFour: fit(purchase.card_last4, 4),
          cardFirstSix: purchase.card_bin?.length === 6 ? purchase.card_bin : undefined,
          totalBeforeTax: centsToString(purchase.amount_cents),
          paymentAmount: centsToString(purchase.amount_cents),
          transactionIdentifierValue: fit(purchase.network_transaction_id, 30),
          // Both are fixed-length in the schema — a value of any other length
          // fails validation and takes the whole response down with it.
          acquirerReferenceNumber:
            purchase.acquirer_reference_number?.length === 23
              ? purchase.acquirer_reference_number
              : undefined,
          issuerAuthorizationCode:
            purchase.auth_code?.length === 6 ? purchase.auth_code : undefined,
          authorizationDateTime: isoSeconds(authorizedAt),
          transactionType: "Sale",
          merchantBillingDescriptor: fit(
            purchase.statement_descriptor ?? MERCHANT.statementDescriptor,
            24,
          ),
          authorizedMerchantBillingDescriptor: fit(MERCHANT.statementDescriptor, 24),
        },
      ],

      callToActionLinks: [
        { linkUrl: fit(`${MERCHANT.websiteUrl}/account`, 500)!, linkType: "VIEW_ORDER" },
        { linkUrl: fit(MERCHANT.links.refunds, 500)!, linkType: "REQUEST_REFUND" },
      ],
    },

    merchantProfile: {
      name: fit(MERCHANT.storeName, 200),
      description: fit(
        "Facelineage generates AI ancestry and heritage reports from a selfie. Digital service, delivered online — no physical goods are shipped.",
        250,
      ),
      merchantCategoryCode: MERCHANT.mcc.length === 4 ? MERCHANT.mcc : undefined,
      refundPolicyRecap: fit(POLICY.refundRecap, 250),
      refundPolicyLink: fit(MERCHANT.links.refunds, 500),
      termsAndConditionsRecap: fit(POLICY.termsRecap, 250),
      termsAndConditionsLink: fit(MERCHANT.links.terms, 500),
      cancellationPolicyRecap: fit(POLICY.cancellationRecap, 250),
      cancellationPolicyLink: fit(MERCHANT.links.refunds, 500),
      logoUrl: fit(MERCHANT.links.logo, 500),
      merchantCustomerServiceContact: {
        phoneNumber: fit(MERCHANT.contactPhone, 30),
        email: fit(MERCHANT.supportEmail, 200),
        website: fit(MERCHANT.links.contact, 100),
        customerServiceInstructions: fit(POLICY.customerServiceInstructions, 250),
        address: {
          line1: fit(MERCHANT.address.line1, 100),
          city: fit(MERCHANT.address.city, 100),
          postalCode: fit(MERCHANT.address.postalCode, 10),
          country: fit(MERCHANT.address.countryName, 80),
        },
      },
    },

    accountProfile: {
      email: fit(purchase.customer_email, 200),
      userIdName: fit(purchase.customer_email, 65),
      accountCreationDateTime: isoSeconds(ctx.accountCreatedAt),
      customerNameDuration: monthsBetween(ctx.accountCreatedAt ?? ctx.firstPurchaseAt),
      totalSpendAmount: centsToString(ctx.totalSpentCents),
      countOfPurchasesSinceRegistration: ctx.purchaseCount,
      membershipSubscriptionType: fit(product.name, 75),
      accountPrimaryDeviceId: fit(purchase.device_id, 40),
      accountCreationIpAddress: fit(purchase.client_ip, 45),
      accountAuthenticationConducted: fit("Email magic-link authentication", 50),
      // A digital-goods order 90+ days old on the same device and card is the
      // First-Party Trust signal Mastercard weighs for reason code 4837.
      goodOrders90DaysOld:
        !!ctx.firstPurchaseAt &&
        Date.now() - new Date(ctx.firstPurchaseAt).getTime() > 90 * 86_400_000,
    },
  };

  return prune(response) as Record<string, unknown>;
}
