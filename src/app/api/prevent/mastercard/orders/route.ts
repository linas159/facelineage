import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthorized, UNAUTHORIZED_BODY } from "@/lib/prevent/auth";
import { preventConfigIssues } from "@/lib/prevent/config";
import { findPurchase, loadContext } from "@/lib/prevent/lookup";
import { recordLookup } from "@/lib/prevent/log";
import {
  buildClarityResponse,
  clarityMatchInput,
  clarityStatusResponse,
  validateClarityRequest,
  type ClarityLookupRequest,
} from "@/lib/prevent/mastercard";

/**
 * POST /api/prevent/mastercard/orders
 *
 * Receives Mastercard Consumer Clarity lookups forwarded by Merchanto. The
 * same endpoint serves every originator channel — DIGITAL, CALL_CENTRE,
 * FIRST_PARTY_TRUST, MASTERCOM and TRANSACTION_DATA — because the payload and
 * the expected response are identical across them.
 *
 * Unlike Visa, **there is no 404 here**. A miss is still an HTTP 200 whose
 * `responseStatus.code` says TRANSACTION_NOT_FOUND or
 * MULTIPLE_TRANSACTIONS_FOUND; 4xx/5xx are reserved for auth, malformed
 * requests and our own failures, and Merchanto scores those as *Failed*.
 *
 * Budget is 1000 ms end-to-end, so audit logging runs in `after()`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  if (!isAuthorized(req.headers)) {
    return NextResponse.json(UNAUTHORIZED_BODY, { status: 401 });
  }

  const issues = preventConfigIssues();
  if (issues.length) {
    console.error(`[prevent/mc] configuration problems: ${issues.join(" | ")}`);
  }

  let body: ClarityLookupRequest;
  try {
    body = (await req.json()) as ClarityLookupRequest;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const invalid = validateClarityRequest(body);
  if (invalid) {
    console.warn(`[prevent/mc] rejecting request: ${invalid}`);
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const db = createServiceClient();
  const correlationId = body.requestReference?.correlationId;
  const channel = body.requestReference?.originatorChannel;

  try {
    const match = await findPurchase(db, clarityMatchInput(body));

    if (match.outcome !== "found") {
      const code =
        match.outcome === "multiple" ? "MULTIPLE_TRANSACTIONS_FOUND" : "TRANSACTION_NOT_FOUND";
      const response = clarityStatusResponse(
        code,
        match.outcome === "multiple"
          ? "Search criteria matched more than one transaction"
          : "No matching transaction found",
        correlationId,
      );
      console.log(
        `[prevent/mc] no single match correlationId=${correlationId} channel=${channel} code=${code}`,
      );
      after(() =>
        recordLookup(db, {
          scheme: "mastercard",
          externalId: correlationId,
          source: channel,
          request: body,
          response,
          outcome: match.outcome,
          matchStrategy: match.strategy,
          durationMs: Date.now() - startedAt,
        }),
      );
      return NextResponse.json(response, { status: 200 });
    }

    const ctx = await loadContext(db, match.purchase);
    const response = buildClarityResponse(match.purchase, ctx, correlationId);

    console.log(
      `[prevent/mc] matched correlationId=${correlationId} channel=${channel} ` +
        `strategy=${match.strategy} purchase=${match.purchase.id} ms=${Date.now() - startedAt}`,
    );

    after(() =>
      recordLookup(db, {
        scheme: "mastercard",
        externalId: correlationId,
        source: channel,
        request: body,
        response,
        matchedPurchaseId: match.purchase.id,
        matchStrategy: match.strategy,
        outcome: "found",
        durationMs: Date.now() - startedAt,
      }),
    );

    return NextResponse.json(response, { status: 200 });
  } catch (err) {
    console.error("[prevent/mc] lookup failed:", err);
    after(() =>
      recordLookup(db, {
        scheme: "mastercard",
        externalId: correlationId,
        source: channel,
        request: body,
        outcome: "error",
        durationMs: Date.now() - startedAt,
      }),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
