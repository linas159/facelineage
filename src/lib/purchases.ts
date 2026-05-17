import { createServiceClient } from "@/lib/supabase/server";

type DB = ReturnType<typeof createServiceClient>;

/**
 * Insert a purchase row, idempotent on stripe_payment_intent. Returns the
 * purchase id (existing or newly created) or null on failure.
 */
export async function recordPurchase(
  db: DB,
  fields: {
    user_id: string | null;
    analysis_id: string | null;
    product_sku: string;
    stripe_payment_intent: string;
    amount_cents: number | null;
    currency: string | null;
  },
): Promise<string | null> {
  const { data: existing } = await db
    .from("purchases")
    .select("id")
    .eq("stripe_payment_intent", fields.stripe_payment_intent)
    .maybeSingle();
  if (existing?.id) return existing.id;

  const { data: inserted, error } = await db
    .from("purchases")
    .insert({
      ...fields,
      status: "paid",
      fulfilled_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !inserted) {
    console.error("recordPurchase insert failed:", error);
    return null;
  }
  return inserted.id;
}
