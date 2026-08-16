import "server-only";
import { randomBytes } from "crypto";
import { cache } from "react";
import { createServiceClient } from "@/lib/supabase/server";

/** 12 random bytes → 16 base64url chars. Unguessable, still short enough
 *  to survive a WhatsApp line-break. */
const TOKEN_BYTES = 12;

export function appOrigin(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function shareUrl(token: string): string {
  return `${appOrigin()}/s/${token}`;
}

function mintToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Return the share token for an analysis, creating one on first use.
 *
 * Idempotent by design: the caller (the share button) can fire this on every
 * tap and always gets the same link back, so a URL someone already sent to a
 * friend keeps working. The unique index on `analysis_id` (migration 0010) is
 * what makes that safe under concurrent taps — the loser of the race re-reads
 * the winner's row instead of minting a second token.
 */
export async function getOrCreateShareToken(analysisId: string): Promise<string | null> {
  const svc = createServiceClient();

  const existing = await svc
    .from("share_links")
    .select("token")
    .eq("analysis_id", analysisId)
    .maybeSingle();
  if (existing.data?.token) return existing.data.token;

  const token = mintToken();
  const { error } = await svc
    .from("share_links")
    .insert({ token, analysis_id: analysisId });
  if (!error) return token;

  // 23505 = unique violation. Either another request just created the row for
  // this analysis, or (astronomically unlikely) the token collided. Re-read.
  if ((error as { code?: string }).code === "23505") {
    const retry = await svc
      .from("share_links")
      .select("token")
      .eq("analysis_id", analysisId)
      .maybeSingle();
    if (retry.data?.token) return retry.data.token;
  }

  console.error("[share] could not create share link", analysisId, error);
  return null;
}

/**
 * Resolve a public share token to its analysis id. Returns null for unknown
 * or expired tokens.
 *
 * Wrapped in React's `cache` so a page render and its `generateMetadata` —
 * which both need the same token — share one round trip.
 */
export const resolveShareToken = cache(async (token: string): Promise<string | null> => {
  const svc = createServiceClient();
  const { data } = await svc
    .from("share_links")
    .select("analysis_id, expires_at")
    .eq("token", token)
    .maybeSingle();

  if (!data?.analysis_id) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;

  return data.analysis_id as string;
});

/**
 * Bump the view counter. Atomic (see migration 0010) because the readers are
 * anonymous and concurrent, and never fatal — a lost count must not take the
 * page down with it.
 */
export async function bumpShareView(token: string): Promise<void> {
  const svc = createServiceClient();
  const { error } = await svc.rpc("increment_share_view", { p_token: token });
  if (error) console.warn("[share] view counter bump failed:", error.message);
}
