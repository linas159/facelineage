import "server-only";
import { createServiceClient } from "@/lib/supabase/server";

type DB = ReturnType<typeof createServiceClient>;

/** Columns every response builder needs. Selected once, shared by both schemes. */
const PURCHASE_COLUMNS = `
  id, user_id, analysis_id, product_sku, stripe_payment_intent,
  amount_cents, currency, status, created_at, fulfilled_at,
  card_brand, card_last4, card_bin, card_country,
  auth_code, network_transaction_id, acquirer_reference_number,
  statement_descriptor, authorized_at,
  customer_email, client_ip, client_user_agent, device_id, device_fingerprint,
  refunded_amount_cents, refunded_at
`;

export interface PurchaseRecord {
  id: string;
  user_id: string | null;
  analysis_id: string | null;
  product_sku: string | null;
  stripe_payment_intent: string | null;
  amount_cents: number;
  currency: string | null;
  status: string | null;
  created_at: string;
  fulfilled_at: string | null;
  card_brand: string | null;
  card_last4: string | null;
  card_bin: string | null;
  card_country: string | null;
  auth_code: string | null;
  network_transaction_id: string | null;
  acquirer_reference_number: string | null;
  statement_descriptor: string | null;
  authorized_at: string | null;
  customer_email: string | null;
  client_ip: string | null;
  client_user_agent: string | null;
  device_id: string | null;
  device_fingerprint: string | null;
  refunded_amount_cents: number | null;
  refunded_at: string | null;
}

/** Normalized identifiers pulled out of a Visa or Mastercard lookup request. */
export interface MatchInput {
  /** Visa `transactionId` / Mastercard `transactionIdentifierValue`. */
  networkTransactionId?: string;
  /** Acquirer Reference Number. Stripe never supplies one, so this is rarely set. */
  arn?: string;
  authCode?: string;
  cardLast4?: string;
  cardBin?: string;
  /** Minor units, already converted from the scheme's decimal string. */
  amountCents?: number;
  currency?: string;
  transactionDate?: Date;
  /** Merchant-defined order reference, when the acquirer forwarded one. */
  purchaseIdentifier?: string;
  /**
   * Visa `paymentDescriptor` / Mastercard `cardAcceptorName` — the merchant
   * name the cardholder sees on their statement. Never a primary key (every
   * one of our transactions carries the same descriptor), but a useful
   * tie-breaker when a weaker step returns several candidates.
   */
  paymentDescriptor?: string;
}

export type MatchOutcome =
  | { outcome: "found"; purchase: PurchaseRecord; strategy: string }
  | { outcome: "not_found"; strategy: null }
  | { outcome: "multiple"; strategy: string };

/**
 * ±3 days, as the integration guide recommends at every cascade step.
 *
 * The issuer's timestamp comes from the authorization message and ours from
 * our own clock at capture time; timezone handling and settlement lag between
 * the two routinely differ by more than a day.
 */
const DATE_TOLERANCE_MS = 3 * 24 * 60 * 60 * 1000;

type Filter =
  | { op: "eq"; col: string; val: string | number }
  | { op: "gte" | "lte"; col: string; val: string };

interface Step {
  strategy: string;
  filters: Filter[];
}

/** Scheme decimal string ("250.35") → minor units. */
export function parseAmountToCents(raw: string | number | null | undefined): number | undefined {
  if (raw === null || raw === undefined || raw === "") return undefined;
  const n = typeof raw === "number" ? raw : Number.parseFloat(String(raw));
  if (!Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

export function parseDate(raw: string | null | undefined): Date | undefined {
  if (!raw) return undefined;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Build the priority cascade for one lookup request.
 *
 * Ordered strongest identifier → weakest. Steps whose inputs the issuer did
 * not send are simply absent, which is the normal case: Visa omits ARN and
 * card BIN for Stripe-acquired transactions, and Clarity digital-channel
 * lookups often arrive without an auth code.
 */
function buildCascade(input: MatchInput): Step[] {
  const steps: Step[] = [];

  const window: Filter[] =
    input.transactionDate && !Number.isNaN(input.transactionDate.getTime())
      ? [
          {
            op: "gte",
            col: "authorized_at",
            val: new Date(input.transactionDate.getTime() - DATE_TOLERANCE_MS).toISOString(),
          },
          {
            op: "lte",
            col: "authorized_at",
            val: new Date(input.transactionDate.getTime() + DATE_TOLERANCE_MS).toISOString(),
          },
        ]
      : [];

  // Amounts are only comparable when the issuer's currency is the one we
  // charged in. The guide suggests converting across currencies first, but a
  // stale FX rate turns an exact-match step into a fuzzy one — and a wrong
  // match is worse than none. The identifier-led steps below cover the case.
  const amount: Filter[] =
    typeof input.amountCents === "number" && input.currency
      ? [
          { op: "eq", col: "amount_cents", val: input.amountCents },
          { op: "eq", col: "currency", val: input.currency.toLowerCase() },
        ]
      : [];

  // 1. Network transaction id — Visa's Transaction ID, Mastercard's Trace ID.
  //    Captured straight off the Stripe Charge; globally unique.
  if (input.networkTransactionId) {
    steps.push({
      strategy: "network_transaction_id",
      filters: [{ op: "eq", col: "network_transaction_id", val: input.networkTransactionId }],
    });
  }

  // 2. Acquirer Reference Number — also unique, but Stripe does not expose one,
  //    so this only fires for transactions backfilled from another source.
  if (input.arn) {
    steps.push({
      strategy: "arn",
      filters: [{ op: "eq", col: "acquirer_reference_number", val: input.arn }],
    });
  }

  // 3. Merchant order reference, when the acquirer forwarded one. Matches
  //    either our purchase id or the Stripe PaymentIntent id.
  if (input.purchaseIdentifier) {
    const ref = input.purchaseIdentifier.trim();
    steps.push({
      strategy: "purchase_identifier",
      filters: [
        { op: "eq", col: UUID_RE.test(ref) ? "id" : "stripe_payment_intent", val: ref },
      ],
    });
  }

  // 4. Card BIN + last4 + amount + date. Together the BIN and last4 pin down
  //    the card far more tightly than last4 alone. Stripe only exposes the BIN
  //    (`iin`) on accounts it has been enabled for, so on our data this step
  //    usually finds nothing and falls through at no cost — it is here so the
  //    field is genuinely searched on when it is available.
  if (input.cardBin && input.cardLast4 && amount.length) {
    steps.push({
      strategy: "bin+last4+amount",
      filters: [
        { op: "eq", col: "card_bin", val: input.cardBin },
        { op: "eq", col: "card_last4", val: input.cardLast4 },
        ...amount,
        ...window,
      ],
    });
  }

  // 5. Auth code + last4 + amount + date — the strongest combination available
  //    for a Stripe-acquired card transaction.
  if (input.authCode && input.cardLast4 && amount.length) {
    steps.push({
      strategy: "auth_code+last4+amount",
      filters: [
        { op: "eq", col: "auth_code", val: input.authCode },
        { op: "eq", col: "card_last4", val: input.cardLast4 },
        ...amount,
        ...window,
      ],
    });
  }

  // 6. Auth code + amount + date. Auth codes are six digits and are reused
  //    across merchants and time, so they always carry a date window.
  if (input.authCode && amount.length) {
    steps.push({
      strategy: "auth_code+amount",
      filters: [{ op: "eq", col: "auth_code", val: input.authCode }, ...amount, ...window],
    });
  }

  // 7. Auth code + date.
  if (input.authCode && window.length) {
    steps.push({
      strategy: "auth_code+date",
      filters: [{ op: "eq", col: "auth_code", val: input.authCode }, ...window],
    });
  }

  // 8. Card last4 + amount + date, for lookups that carry no auth code.
  if (input.cardLast4 && amount.length) {
    steps.push({
      strategy: "last4+amount",
      filters: [{ op: "eq", col: "card_last4", val: input.cardLast4 }, ...amount, ...window],
    });
  }

  // 9. Amount + currency + date — the documented last resort. Safe only
  //    because it still has to resolve to exactly one row: our price points
  //    are fixed, so a busy day legitimately yields several candidates and we
  //    correctly decline instead of guessing.
  if (amount.length && window.length) {
    steps.push({ strategy: "amount+date", filters: [...amount, ...window] });
  }

  return steps;
}

/**
 * Fetch up to a handful of candidates for one cascade step.
 *
 * The limit is small but greater than two: one row is a match and two is
 * ambiguous, but a few extra let `disambiguate()` try to break the tie before
 * we give up on the step.
 */
async function runStep(db: DB, filters: Filter[]): Promise<PurchaseRecord[]> {
  let query = db.from("purchases").select(PURCHASE_COLUMNS);
  for (const f of filters) {
    if (f.op === "eq") query = query.eq(f.col, f.val);
    else if (f.op === "gte") query = query.gte(f.col, f.val);
    else query = query.lte(f.col, f.val);
  }
  const { data, error } = await query.limit(10);
  if (error) {
    console.error("[prevent] lookup step failed:", error);
    return [];
  }
  return (data ?? []) as unknown as PurchaseRecord[];
}

/** Uppercase alphanumerics only — "FACELINEAGE.COM" and "FACELINEAGE COM" agree. */
function normalizeDescriptor(value: string | null | undefined): string {
  return (value ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Narrow several candidates using the weaker matching fields.
 *
 * The guide's cascade says that when a step returns multiple candidates you
 * continue to a more specific condition rather than give up. Card BIN and the
 * payment descriptor are exactly that kind of condition: neither can identify
 * a transaction alone — every transaction we take carries the same descriptor
 * — but either can separate two otherwise identical candidates.
 *
 * A filter is applied only when it leaves at least one row standing. Our
 * `card_bin` is usually null and descriptors vary in formatting between the
 * acquirer and the network, so a filter that matches nothing means our data is
 * missing, not that the candidates are wrong; dropping every row there would
 * turn a recoverable tie into a lost case.
 */
function disambiguate(rows: PurchaseRecord[], input: MatchInput): PurchaseRecord[] {
  let candidates = rows;

  if (input.cardBin) {
    const byBin = candidates.filter((r) => r.card_bin === input.cardBin);
    if (byBin.length > 0) candidates = byBin;
  }

  if (input.paymentDescriptor) {
    const wanted = normalizeDescriptor(input.paymentDescriptor);
    if (wanted) {
      const byDescriptor = candidates.filter((r) => {
        const stored = normalizeDescriptor(r.statement_descriptor);
        if (!stored) return false;
        // Visa truncates the descriptor to 25 characters and acquirers append
        // or trim suffixes, so neither side is reliably a full copy of the
        // other — containment either way is the honest comparison.
        return stored.startsWith(wanted) || wanted.startsWith(stored);
      });
      if (byDescriptor.length > 0) candidates = byDescriptor;
    }
  }

  return candidates;
}

/**
 * Find the single purchase an issuer is asking about.
 *
 * Stops at the first step that yields exactly one row. A step returning
 * several rows does not end the walk — a later, differently-constrained step
 * may still isolate one — but if the walk ends having seen candidates without
 * ever narrowing to one, the caller is told "multiple" rather than "not
 * found", so Mastercard gets its distinct MULTIPLE_TRANSACTIONS_FOUND code.
 *
 * Returning the wrong order is strictly worse than returning nothing: the
 * cardholder sees a purchase they genuinely do not recognize, which converts
 * a would-be deflection into a confirmed fraud claim. Every step is therefore
 * an exact match on indexed columns; nothing here is fuzzy.
 */
export async function findPurchase(db: DB, input: MatchInput): Promise<MatchOutcome> {
  let sawMultiple: string | null = null;

  for (const { strategy, filters } of buildCascade(input)) {
    const rows = await runStep(db, filters);
    if (rows.length === 1) {
      return { outcome: "found", purchase: rows[0], strategy };
    }
    if (rows.length > 1) {
      // Try the weaker fields as a tie-breaker before writing the step off.
      const narrowed = disambiguate(rows, input);
      if (narrowed.length === 1) {
        return { outcome: "found", purchase: narrowed[0], strategy: `${strategy}+disambiguated` };
      }
      sawMultiple = strategy;
    }
  }

  if (sawMultiple) return { outcome: "multiple", strategy: sawMultiple };
  return { outcome: "not_found", strategy: null };
}

// ────────────────────────────────────────────────────────────────────────────
// Context around a matched purchase
// ────────────────────────────────────────────────────────────────────────────

export interface PurchaseContext {
  purchaseCount: number;
  totalSpentCents: number;
  firstPurchaseAt: string | null;
  accountCreatedAt: string | null;
  subscription: {
    status: string | null;
    stripe_subscription_id: string | null;
    product_sku: string | null;
    current_period_start: string | null;
    current_period_end: string | null;
    cancel_at: string | null;
    canceled_at: string | null;
    created_at: string | null;
  } | null;
  /** Whether the report this purchase paid for was actually delivered. */
  reportDelivered: boolean;
}

/**
 * Load the surrounding account history for a matched purchase.
 *
 * Both schemes reward this heavily — Mastercard's AccountProfile and Visa's
 * customerInformation are what turn "yes, this charge exists" into "yes, and
 * this person has been a customer for eight months and opened the product
 * yesterday". Every query is keyed on an indexed column and they all run
 * concurrently, so the block costs roughly one round-trip.
 */
export async function loadContext(db: DB, purchase: PurchaseRecord): Promise<PurchaseContext> {
  const userId = purchase.user_id;

  const [historyRes, profileRes, subRes, analysisRes] = await Promise.all([
    userId
      ? db.from("purchases").select("amount_cents, created_at").eq("user_id", userId).eq("status", "paid")
      : Promise.resolve({ data: null }),
    userId
      ? db.from("profiles").select("created_at").eq("id", userId).maybeSingle()
      : Promise.resolve({ data: null }),
    userId
      ? db
          .from("subscriptions")
          .select(
            "status, stripe_subscription_id, product_sku, current_period_start, current_period_end, cancel_at, canceled_at, created_at",
          )
          .eq("user_id", userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    purchase.analysis_id
      ? db
          .from("analyses")
          .select("generation_status, is_paid")
          .eq("id", purchase.analysis_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const history = (historyRes.data ?? []) as Array<{ amount_cents: number; created_at: string }>;
  const totalSpentCents = history.reduce((sum, row) => sum + (row.amount_cents ?? 0), 0);
  const firstPurchaseAt = history.length
    ? history.reduce(
        (min, row) => (row.created_at < min ? row.created_at : min),
        history[0].created_at,
      )
    : purchase.created_at;

  const profile = profileRes.data as { created_at: string | null } | null;
  const analysis = analysisRes.data as {
    generation_status: string | null;
    is_paid: boolean;
  } | null;

  return {
    // A purchase that matched but whose owner row is missing still counts as
    // one purchase — never report a customer as having zero.
    purchaseCount: history.length || 1,
    totalSpentCents: totalSpentCents || purchase.amount_cents,
    firstPurchaseAt,
    accountCreatedAt: profile?.created_at ?? null,
    subscription: (subRes.data as PurchaseContext["subscription"]) ?? null,
    reportDelivered: analysis?.generation_status === "ready",
  };
}
