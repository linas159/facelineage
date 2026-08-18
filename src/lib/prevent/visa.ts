import "server-only";
import { MERCHANT, productInfo } from "@/lib/prevent/config";
import {
  centsToNumber,
  currencyCode,
  fit,
  isoSeconds,
  maskedPan,
  monthsBetween,
  orderReference,
  prune,
} from "@/lib/prevent/format";
import type { PurchaseContext, PurchaseRecord } from "@/lib/prevent/lookup";
import {
  parseAmountToCents,
  parseDate,
  type MatchInput,
} from "@/lib/prevent/lookup";

/**
 * Visa Order Insight (OI / OID / CE).
 *
 * All three lookup sources arrive on the same endpoint with the same payload
 * shape and take the same response — a CE lookup simply asks about a *older*
 * transaction than the one under dispute, so there is no separate code path.
 */

// ────────────────────────────────────────────────────────────────────────────
// Request
// ────────────────────────────────────────────────────────────────────────────

export interface VisaAmount {
  amount?: number;
  currency?: string;
}

export interface VisaLookupRequest {
  insightId?: string;
  clientId?: number;
  source?: string; // OI | OID | CE
  cardBin?: string;
  cardLast4?: string;
  paymentType?: string;
  token?: string;
  /** Merchant-name component of the billing descriptor, as the cardholder sees it. */
  paymentDescriptor?: string;
  paymentDescriptorContact?: string;
  transactionDate?: string;
  transactionAmount?: VisaAmount;
  destinationAmount?: VisaAmount;
  arn?: string;
  authCode?: string;
  terminalId?: string;
  acquirerBin?: string;
  cardAcceptorId?: string;
  mcsn?: string;
  purchaseIdentifier?: string;
  transactionId?: string;
  transactionType?: string;
  cardExpirationDate?: string;
  mcc?: string;
  posEntryModeCode?: string;
  eci?: string;
  transactionRequestId?: string;
  linkedInsightId?: string;
}

/**
 * Reject payloads that cannot possibly be matched before touching the
 * database. Visa marks `insightId`, `source`, `paymentType`,
 * `paymentDescriptor`, `transactionDate`, `transactionAmount` and
 * `transactionRequestId` as required; we only hard-require the ones the
 * matcher actually depends on, so a request with an unexpected-but-harmless
 * omission still gets a real answer rather than a 400.
 */
export function validateVisaRequest(body: unknown): string | null {
  if (!body || typeof body !== "object") return "Body must be a JSON object";
  const b = body as VisaLookupRequest;
  if (!b.transactionAmount || typeof b.transactionAmount.amount !== "number") {
    if (!b.transactionId && !b.arn && !b.authCode) {
      return "Request carries neither transactionAmount nor any transaction identifier";
    }
  }
  return null;
}

export function visaMatchInput(body: VisaLookupRequest): MatchInput {
  return {
    networkTransactionId: body.transactionId?.trim() || undefined,
    arn: body.arn?.trim() || undefined,
    authCode: body.authCode?.trim() || undefined,
    cardLast4: body.cardLast4?.trim() || undefined,
    cardBin: body.cardBin?.trim() || undefined,
    amountCents: parseAmountToCents(body.transactionAmount?.amount),
    currency: body.transactionAmount?.currency ?? undefined,
    transactionDate: parseDate(body.transactionDate),
    purchaseIdentifier: body.purchaseIdentifier?.trim() || undefined,
    paymentDescriptor: body.paymentDescriptor?.trim() || undefined,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Response
// ────────────────────────────────────────────────────────────────────────────

function amountObject(cents: number | null | undefined, currency: string | null | undefined) {
  return { amount: centsToNumber(cents), currency: currencyCode(currency) };
}

/** Coarse device class from the user agent — Visa's `deviceType` is free text. */
function deviceType(ua: string | null | undefined): string | undefined {
  if (!ua) return undefined;
  if (/iPad|Tablet/i.test(ua)) return "Tablet";
  if (/Mobi|Android|iPhone/i.test(ua)) return "Mobile";
  return "PC";
}

/**
 * One-line plain-English summary of what the customer bought and got.
 *
 * This is the field a call-centre agent reads aloud, so it says what happened
 * in the order the cardholder will recognize it: what it was, when it landed,
 * and what happens next on the card.
 */
function communications(
  purchase: PurchaseRecord,
  ctx: PurchaseContext,
  product: ReturnType<typeof productInfo>,
): string {
  const parts: string[] = [];
  const when = purchase.authorized_at ?? purchase.created_at;
  parts.push(
    `${product.name} purchased on ${new Date(when).toISOString().slice(0, 10)} at ${MERCHANT.storeName} (${MERCHANT.websiteUrl}).`,
  );
  if (purchase.customer_email) {
    parts.push(
      `Digital delivery — access granted immediately to the account ${purchase.customer_email}${
        ctx.reportDelivered ? " and the report was generated and viewed" : ""
      }.`,
    );
  }
  if (product.recurring && ctx.subscription) {
    const status = ctx.subscription.status ?? "active";
    if (status === "canceled") {
      parts.push("The subscription has since been cancelled; no further charges will be made.");
    } else {
      parts.push(
        `This started a recurring subscription. It can be cancelled any time at ${MERCHANT.links.account}, which stops all future charges.`,
      );
    }
  }
  if ((purchase.refunded_amount_cents ?? 0) > 0) {
    parts.push("A refund has already been issued for this order.");
  }
  parts.push(`Questions: ${MERCHANT.supportEmail}. Refund policy: ${MERCHANT.links.refunds}`);
  return parts.join(" ").slice(0, 1000);
}

/**
 * Build the Visa OI response for a matched purchase.
 *
 * Two things drive the shape beyond "describe the order":
 *
 *  - We sell a digital service, so `deliveryAddress` and every shipping field
 *    is deliberately absent. The guide is explicit that shipping data on a
 *    non-physical order confuses issuers and hurts deflection.
 *  - Compelling Evidence needs at least two of four persistent identifiers
 *    (accountId, deviceId, ipAddress, deviceFingerprint). We capture all four
 *    where the browser allows it; account id (the customer's own email) plus
 *    IP is the guaranteed floor. Without two, Visa never sends us a CE lookup
 *    at all, so this is the part that earns liability protection later.
 */
export function buildVisaResponse(
  purchase: PurchaseRecord,
  ctx: PurchaseContext,
): Record<string, unknown> {
  const product = productInfo(purchase.product_sku);
  const currency = purchase.currency;
  const orderDate = isoSeconds(purchase.authorized_at ?? purchase.created_at);

  const response = {
    receipt: {
      orderDate,
      orderNumber: orderReference(purchase.id),
      purchaseCategory: "SERVICE",
      // Stripe PaymentIntent ids are 27 characters and Visa allows 25, so the
      // raw id can never ship here. Omitted rather than clipped — `orderNumber`
      // above already gives support something to search on.
      invoiceNumber: fit(purchase.stripe_payment_intent, 25, "omit"),
      // The product is available the moment the payment clears.
      downloadDateTime: isoSeconds(purchase.fulfilled_at ?? purchase.created_at),
      subTotalAmount: amountObject(purchase.amount_cents, currency),
      orderTotalAmount: amountObject(purchase.amount_cents, currency),
      paymentInformation: {
        paymentMethod: maskedPan(purchase.card_last4),
        paymentSubTotalAmount: amountObject(purchase.amount_cents, currency),
        paymentTotalAmount: amountObject(purchase.amount_cents, currency),
      },
      productsPurchasedList: [
        {
          productType: fit(product.type, 20),
          productDescription: fit(product.description, 100)!,
          productUrl: fit(product.url, 1000),
          unitPriceAmount: amountObject(purchase.amount_cents, currency),
          quantity: 1,
        },
      ],
    },

    merchantInformation: {
      merchantName: fit(MERCHANT.legalName, 100),
      merchantUrl: fit(MERCHANT.corporateUrl, 1000),
      websiteUrl: fit(MERCHANT.websiteUrl, 1000),
      merchantContactPhone: fit(MERCHANT.contactPhone, 20),
      merchantAddress: {
        address1: fit(MERCHANT.address.line1, 50),
        address2: fit(MERCHANT.address.line2, 50),
        city: fit(MERCHANT.address.city, 50),
        postalCode: fit(MERCHANT.address.postalCode, 9),
        country: MERCHANT.address.countryAlpha3,
      },
      termsAndConditions: fit(MERCHANT.links.terms, 2000),
      storeDetails: {
        storeName: fit(MERCHANT.storeName, 100),
        storeContactPhone: fit(MERCHANT.contactPhone, 20),
      },
    },

    customerInformation: {
      // Must be recognizable to the cardholder — their own login email. A
      // clipped email is not recognizable, so over-length drops the field
      // rather than sending half of one.
      accountId: fit(purchase.customer_email, 50, "omit"),
      emailAddress: fit(purchase.customer_email, 254, "omit"),
      lengthOfRelationship: fit(
        String(Math.min(999, monthsBetween(ctx.accountCreatedAt ?? ctx.firstPurchaseAt))),
        3,
      ),
    },

    device: {
      deviceType: fit(deviceType(purchase.client_user_agent), 20),
      deviceId: fit(purchase.device_id, 64),
      ipAddress: fit(purchase.client_ip, 45),
      // Visa caps the fingerprint at 45 chars and requires at least 20.
      deviceFingerprint: fit(purchase.device_fingerprint, 45),
    },

    communications: communications(purchase, ctx, product),
  };

  return prune(response) as Record<string, unknown>;
}

/**
 * How many of Visa's four persistent CE identifiers this response carries.
 * Two is the threshold for Compelling Evidence eligibility; logging the count
 * makes a silent regression in browser-side capture visible.
 */
export function ceIdentifierCount(purchase: PurchaseRecord): number {
  return [
    fit(purchase.customer_email, 50, "omit"),
    purchase.device_id,
    purchase.client_ip,
    purchase.device_fingerprint,
  ].filter(Boolean).length;
}
