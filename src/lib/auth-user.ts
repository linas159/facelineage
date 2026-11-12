import "server-only";
import type { User } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import { metaEventId, sendMetaEvent } from "@/lib/meta/capi";

type DB = ReturnType<typeof createServiceClient>;

/**
 * Find or create the Supabase auth user for an email, and ensure the
 * matching public.profiles row exists.
 *
 * Race-safe: /payment-complete and the Stripe webhook can call this
 * concurrently for the same email. A per-email claim row
 * (auth_user_creation_claims) lets only one of them call createUser; the
 * other waits for that user to appear.
 *
 * The profiles upsert protects against orphaned auth users where the
 * `on_auth_user_created` trigger didn't run (e.g. a manual table wipe).
 */
export async function getOrCreateAuthUser(
  db: DB,
  email: string,
): Promise<User | null> {
  const lowered = email.toLowerCase();
  // Resolve via profiles.email first — a single indexed lookup. Falls back
  // to a paginated auth scan for orphaned auth users with no profiles row.
  // NOTE: listUsers() defaults to perPage 50, so it MUST be paginated —
  // an unpaginated call silently misses every user past the first page.
  const findByEmail = async (): Promise<User | null> => {
    const { data: profile } = await db
      .from("profiles")
      .select("id")
      .ilike("email", lowered)
      .maybeSingle();
    if (profile?.id) {
      const { data: byId } = await db.auth.admin.getUserById(profile.id);
      if (byId?.user) return byId.user;
    }

    for (let page = 1; ; page++) {
      const { data: list } = await db.auth.admin.listUsers({
        page,
        perPage: 1000,
      });
      const users = list?.users ?? [];
      const hit = users.find((u) => u.email?.toLowerCase() === lowered);
      if (hit) return hit;
      if (users.length < 1000) return null;
    }
  };

  let user = await findByEmail();
  let justCreated = false;

  if (!user) {
    // Only one caller may run createUser per email (see migration 0016).
    // Concurrent createUser calls for one email make GoTrue fail the loser
    // with a 500 "Database error creating new user", which used to leave
    // the customer who had just paid unsigned-in on an error page.
    const claim = await claimCreation(db, lowered);
    if (claim === "taken") {
      user = await waitFor(findByEmail, CLAIM_WAIT_MS);
    }

    if (!user) {
      try {
        const { data: created, error } = await db.auth.admin.createUser({
          email,
          email_confirm: true,
        });
        if (created?.user) {
          user = created.user;
          justCreated = true;
        } else if (error) {
          // Still possible without the lock (migration not applied, or the
          // claim holder outlived CLAIM_WAIT_MS). The other creator's user
          // exists or is about to, so look it up instead of failing.
          user = await waitFor(findByEmail, 5_000);
          if (!user) console.error("[auth-user] createUser failed:", error);
        }
      } finally {
        if (claim === "won") await releaseCreation(db, lowered);
      }
    }
  }

  if (!user) {
    console.error("[auth-user] could not resolve user for email", email);
    return null;
  }

  // Ensure profiles row exists. Idempotent — `on_auth_user_created`
  // creates it on auth.users INSERT, this is the fallback for orphaned
  // rows (manual wipes, trigger failures).
  const { error: profErr } = await db
    .from("profiles")
    .upsert(
      { id: user.id, email: user.email ?? email },
      { onConflict: "id", ignoreDuplicates: false },
    );
  if (profErr) {
    console.error("[auth-user] profiles upsert failed:", profErr);
  }

  // Fire CAPI CompleteRegistration only when the auth user was actually
  // created on this call (not re-found). Event_id is deterministic on
  // user.id so duplicate fires from racing callers dedupe to one event.
  if (justCreated) {
    void sendMetaEvent({
      eventName: "CompleteRegistration",
      eventId: metaEventId.completeRegistration(user.id),
      userData: {
        email: user.email ?? email,
        externalId: user.id,
      },
      customData: { contentName: "auth_user_created" },
    });
  }

  return user;
}

const CLAIMS_TABLE = "auth_user_creation_claims";
/** How long a claim loser waits for the holder's user to appear. */
const CLAIM_WAIT_MS = 15_000;
/** A claim older than this was abandoned (creator crashed) and may be taken over. */
const CLAIM_STALE_MS = 30_000;

/**
 * "won": this caller must create the user and release the claim.
 * "taken": another caller is creating it — wait for it.
 * "unavailable": the claims table is missing (migration not applied yet) or
 *   unreachable — create without the lock, as before.
 */
async function claimCreation(
  db: DB,
  email: string,
): Promise<"won" | "taken" | "unavailable"> {
  await db
    .from(CLAIMS_TABLE)
    .delete()
    .eq("email", email)
    .lt("claimed_at", new Date(Date.now() - CLAIM_STALE_MS).toISOString());

  const { error } = await db.from(CLAIMS_TABLE).insert({ email });
  if (!error) return "won";
  if (error.code === "23505") return "taken";
  console.warn("[auth-user] creation claim unavailable, creating unlocked:", error.message);
  return "unavailable";
}

async function releaseCreation(db: DB, email: string): Promise<void> {
  const { error } = await db.from(CLAIMS_TABLE).delete().eq("email", email);
  if (error) console.warn("[auth-user] releasing creation claim failed:", error.message);
}

async function waitFor<T>(
  probe: () => Promise<T | null>,
  timeoutMs: number,
): Promise<T | null> {
  const deadline = Date.now() + timeoutMs;
  for (let delay = 250; ; delay = Math.min(delay * 2, 2_000)) {
    const hit = await probe();
    if (hit || Date.now() >= deadline) return hit;
    await new Promise((r) => setTimeout(r, Math.min(delay, deadline - Date.now())));
  }
}
