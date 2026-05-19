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
 * concurrently for the same email. Whichever wins the createUser call,
 * the other one re-lists and finds the just-created user instead of
 * blowing up on the email_exists error.
 *
 * The profiles upsert protects against orphaned auth users where the
 * `on_auth_user_created` trigger didn't run (e.g. a manual table wipe).
 */
export async function getOrCreateAuthUser(
  db: DB,
  email: string,
): Promise<User | null> {
  const lowered = email.toLowerCase();
  const findByEmail = async (): Promise<User | null> => {
    const { data: list } = await db.auth.admin.listUsers();
    return (
      list?.users.find((u) => u.email?.toLowerCase() === lowered) ?? null
    );
  };

  let user = await findByEmail();
  let justCreated = false;

  if (!user) {
    const { data: created, error } = await db.auth.admin.createUser({
      email,
      email_confirm: true,
    });
    if (created?.user) {
      user = created.user;
      justCreated = true;
    } else if (error && (error as { code?: string }).code === "email_exists") {
      // Lost the race to another caller — re-fetch.
      user = await findByEmail();
    } else if (error) {
      console.error("[auth-user] createUser failed:", error);
      return null;
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
