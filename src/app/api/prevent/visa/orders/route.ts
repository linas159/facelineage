import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isAuthorized, UNAUTHORIZED_BODY } from "@/lib/prevent/auth";
import { preventConfigIssues } from "@/lib/prevent/config";
import { findPurchase, loadContext } from "@/lib/prevent/lookup";
import { recordLookup } from "@/lib/prevent/log";
import {
  buildVisaResponse,
  ceIdentifierCount,
  validateVisaRequest,
  visaMatchInput,
  type VisaLookupRequest,
} from "@/lib/prevent/visa";

/**
 * POST /api/prevent/visa/orders
 *
 * Receives Visa Order Insight lookups (source = OI, OID or CE) forwarded by
 * Merchanto, and answers with the order details the issuer shows to the
 * cardholder.
 *
 * Response-code contract (from the Prevent guide):
 *   200 — matched, JSON body with the order details
 *   401 — Basic Auth missing or wrong
 *   404 — no match, or the cascade could not narrow to a single transaction
 *   400 — the request itself was unusable
 *   500 — we failed
 *
 * A late response is scored the same as no response, so the budget is 1000 ms
 * end-to-end. Everything not needed to produce the body — audit logging in
 * particular — runs in `after()`.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Well inside the scheme's 1000 ms window; this only bounds pathological runs.
export const maxDuration = 15;

export async function POST(req: NextRequest) {
  const startedAt = Date.now();

  if (!isAuthorized(req.headers, "visa")) {
    return NextResponse.json(UNAUTHORIZED_BODY, { status: 401 });
  }

  // Misconfiguration produces responses that validate as Invalid and are
  // silently dropped before the issuer ever sees them. Say so loudly.
  const issues = preventConfigIssues();
  if (issues.length) {
    console.error(`[prevent/visa] configuration problems: ${issues.join(" | ")}`);
  }

  let body: VisaLookupRequest;
  try {
    body = (await req.json()) as VisaLookupRequest;
  } catch {
    return NextResponse.json({ error: "Malformed JSON body" }, { status: 400 });
  }

  const invalid = validateVisaRequest(body);
  if (invalid) {
    console.warn(`[prevent/visa] rejecting request: ${invalid}`);
    return NextResponse.json({ error: invalid }, { status: 400 });
  }

  const db = createServiceClient();
  const insightId = body.insightId;
  const source = body.source;

  try {
    const match = await findPurchase(db, visaMatchInput(body));

    if (match.outcome !== "found") {
      console.log(
        `[prevent/visa] no single match insightId=${insightId} source=${source} outcome=${match.outcome}`,
      );
      after(() =>
        recordLookup(db, {
          scheme: "visa",
          externalId: insightId,
          source,
          request: body,
          outcome: match.outcome,
          matchStrategy: match.strategy,
          durationMs: Date.now() - startedAt,
        }),
      );
      // The guide is explicit: prefer 404 over returning incomplete or
      // speculative data. An ambiguous cascade is also a 404 for Visa —
      // unlike Clarity, there is no "multiple matches" code.
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    const ctx = await loadContext(db, match.purchase);
    const response = buildVisaResponse(match.purchase, ctx);

    const ceCount = ceIdentifierCount(match.purchase);
    console.log(
      `[prevent/visa] matched insightId=${insightId} source=${source} strategy=${match.strategy} ` +
        `purchase=${match.purchase.id} ceIdentifiers=${ceCount}/4 ms=${Date.now() - startedAt}`,
    );
    if (ceCount < 2) {
      // Below two persistent identifiers Visa will never send a CE lookup for
      // this transaction, so the liability protection is gone — worth an
      // error-level line rather than burying it in the info stream.
      console.error(
        `[prevent/visa] purchase=${match.purchase.id} carries only ${ceCount} of the 4 CE identifiers — not CE eligible`,
      );
    }

    after(() =>
      recordLookup(db, {
        scheme: "visa",
        externalId: insightId,
        source,
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
    console.error("[prevent/visa] lookup failed:", err);
    after(() =>
      recordLookup(db, {
        scheme: "visa",
        externalId: insightId,
        source,
        request: body,
        outcome: "error",
        durationMs: Date.now() - startedAt,
      }),
    );
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
