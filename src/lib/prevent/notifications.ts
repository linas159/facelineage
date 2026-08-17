import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthorized, UNAUTHORIZED_BODY } from "@/lib/prevent/auth";
import { findPurchase, parseAmountToCents, parseDate } from "@/lib/prevent/lookup";

/**
 * Dispute-status notifications from the Merchanto Prevent platform.
 *
 * Visa and Mastercard notifications share one payload shape, so both routes
 * delegate here and differ only in the `scheme` they record.
 *
 * Lifecycle (Visa's terminology, which Merchanto keeps for both schemes):
 *   new    → the inquiry was deflected; no chargeback happened
 *   failed → it escalated into a dispute
 *   delete → a previously deflected case was reopened or charged back
 */

export interface PreventNotification {
  caseId?: string;
  caseStatus?: string;
  caseDate?: string;
  cardBin?: string;
  cardLast4?: string;
  paymentType?: string;
  transactionDate?: string;
  transactionAmount?: { amount?: number; currency?: string };
  arn?: string;
  authCode?: string;
  acquirerBin?: string;
  cardAcceptorId?: string;
  paymentDescriptor?: string;
  mcsn?: string;
  purchaseIdentifier?: string;
  transactionId?: string;
  linkedTransactionId?: string;
  transactionType?: string;
  mcc?: string;
  posEntryModeCode?: string;
}

export async function handlePreventNotification(
  req: NextRequest,
  scheme: "visa" | "mastercard",
): Promise<NextResponse> {
  if (!isAuthorized(req.headers)) {
    return NextResponse.json(UNAUTHORIZED_BODY, { status: 401 });
  }

  let body: PreventNotification;
  try {
    body = (await req.json()) as PreventNotification;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const caseId = body.caseId?.trim();
  const caseStatus = body.caseStatus?.trim();
  if (!caseId || !caseStatus) {
    return NextResponse.json(
      { error: "Missing required fields: caseId, caseStatus" },
      { status: 400 },
    );
  }

  // An escalation is the outcome we were trying to prevent, and it is the one
  // that costs money. Log it at error level so it reaches alerting rather than
  // sitting in an info stream nobody reads.
  const level = caseStatus === "failed" || caseStatus === "delete" ? console.error : console.log;
  level(
    `[prevent/${scheme}] notification case=${caseId} status=${caseStatus} ` +
      `txn=${body.transactionId ?? "-"} amount=${body.transactionAmount?.amount ?? "-"} ${body.transactionAmount?.currency ?? ""}`,
  );

  // Acknowledge immediately — Merchanto only needs the 200. Matching the case
  // back to a purchase costs several queries and must not delay the ack or
  // risk a retry storm if the database is briefly slow.
  after(async () => {
    const db = createServiceClient();
    let matchedPurchaseId: string | null = null;

    try {
      const match = await findPurchase(db, {
        networkTransactionId: body.transactionId?.trim() || undefined,
        arn: body.arn?.trim() || undefined,
        authCode: body.authCode?.trim() || undefined,
        cardLast4: body.cardLast4?.trim() || undefined,
        cardBin: body.cardBin?.trim() || undefined,
        amountCents: parseAmountToCents(body.transactionAmount?.amount),
        currency: body.transactionAmount?.currency ?? undefined,
        transactionDate: parseDate(body.transactionDate),
        purchaseIdentifier: body.purchaseIdentifier?.trim() || undefined,
      });
      if (match.outcome === "found") matchedPurchaseId = match.purchase.id;
    } catch (err) {
      console.error(`[prevent/${scheme}] notification match failed:`, err);
    }

    try {
      // Merchanto retries webhooks; (scheme, case, status) is unique so a
      // repeat delivery refreshes the row instead of duplicating the case.
      await db.from("prevent_notifications").upsert(
        {
          scheme,
          case_id: caseId,
          case_status: caseStatus,
          case_date: parseDate(body.caseDate)?.toISOString() ?? null,
          payload: body,
          matched_purchase_id: matchedPurchaseId,
        },
        { onConflict: "scheme,case_id,case_status" },
      );
    } catch (err) {
      console.error(`[prevent/${scheme}] notification insert failed:`, err);
    }

    if (matchedPurchaseId) {
      console.log(
        `[prevent/${scheme}] notification case=${caseId} linked to purchase=${matchedPurchaseId}`,
      );
    } else {
      console.warn(
        `[prevent/${scheme}] notification case=${caseId} could not be linked to a purchase`,
      );
    }
  });

  return NextResponse.json({ received: true }, { status: 200 });
}
