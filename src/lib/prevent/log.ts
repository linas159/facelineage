import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

type DB = ReturnType<typeof createServiceClient>;

export interface LookupLog {
  scheme: "visa" | "mastercard";
  externalId?: string;
  source?: string;
  request: unknown;
  response?: unknown;
  matchedPurchaseId?: string | null;
  matchStrategy?: string | null;
  outcome: "found" | "not_found" | "multiple" | "error";
  durationMs: number;
}

/**
 * Persist one lookup for later forensics.
 *
 * Always called from inside `after()` so it cannot count against the scheme's
 * 1000 ms response budget, and it never throws: a logging failure must not
 * turn a good lookup into a lost case.
 *
 * Merchanto's dashboard already shows *that* a lookup came back Not Found —
 * what it cannot show is which identifiers the issuer actually sent, which is
 * the only way to tell a genuinely unknown transaction from a gap in our
 * matching cascade.
 */
export async function recordLookup(db: DB, log: LookupLog): Promise<void> {
  try {
    await db.from("prevent_lookups").insert({
      scheme: log.scheme,
      external_id: log.externalId ?? null,
      source: log.source ?? null,
      request: log.request ?? {},
      response: log.response ?? null,
      matched_purchase_id: log.matchedPurchaseId ?? null,
      match_strategy: log.matchStrategy ?? null,
      outcome: log.outcome,
      duration_ms: Math.round(log.durationMs),
    });
  } catch (err) {
    console.error("[prevent] failed to record lookup:", err);
  }
}
