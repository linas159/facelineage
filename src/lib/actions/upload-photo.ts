"use server";

import { randomUUID } from "crypto";
import { cookies } from "next/headers";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { z } from "zod";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

const FormSchema = z.object({
  file: z.instanceof(File),
});

/**
 * Server action: upload the user's photo to Supabase Storage and create
 * an `analyses` row in the 'uploading' state. Pre-auth users get a temp
 * `pending_user_id` saved in a cookie and reconciled on sign-up.
 */
export async function uploadPhoto(formData: FormData) {
  const parsed = FormSchema.safeParse({ file: formData.get("file") });
  if (!parsed.success) {
    return { error: "No file provided" };
  }
  const { file } = parsed.data;

  if (file.size > MAX_BYTES) return { error: "File is too large (max 10MB)" };
  if (!ACCEPTED.includes(file.type)) return { error: "Unsupported file type" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Pre-auth users get a temp ID. We'll reconcile on sign-up.
  const ownerId = user?.id ?? `pending-${randomUUID()}`;
  const path = `${ownerId}/${randomUUID()}.${file.name.split(".").pop() ?? "jpg"}`;

  // Use service client for pre-auth uploads (bypasses RLS while we still
  // tightly scope the path to the random owner ID). Authed users use their
  // own client so RLS is enforced.
  const client = user ? supabase : createServiceClient();
  const { error: upErr } = await client.storage
    .from("analysis-photos")
    .upload(path, file, { contentType: file.type, upsert: false });

  if (upErr) return { error: `Upload failed: ${upErr.message}` };

  // Optional quiz context + browser timezone — best-effort; never blocks.
  let quizAnswers: Record<string, string> | null = null;
  try {
    const raw = formData.get("quiz_answers");
    if (typeof raw === "string") quizAnswers = JSON.parse(raw);
  } catch {}
  const tz = (() => {
    const v = formData.get("timezone");
    return typeof v === "string" && v ? v : null;
  })();
  const countryHint = tz ? guessCountryFromTimezone(tz) : null;

  // Insert analysis row (service client for pre-auth users).
  const dbClient = user ? supabase : createServiceClient();
  const { data: analysis, error: dbErr } = await dbClient
    .from("analyses")
    .insert({
      user_id: user?.id ?? null,
      photo_path: path,
      status: "uploading",
      quiz_answers: quizAnswers,
      timezone: tz,
      country_hint: countryHint,
    })
    .select("id")
    .single();

  if (dbErr) return { error: `DB error: ${dbErr.message}` };

  // For pre-auth users, stash the analysis id so /auth/callback can claim
  // ownership once the user signs up.
  if (!user) {
    const jar = await cookies();
    jar.set("fl_pending_analysis_id", analysis.id, {
      maxAge: 60 * 60 * 24, // 24h
      path: "/",
      httpOnly: true,
      sameSite: "lax",
    });
  }

  redirect(`/analyzing?id=${analysis.id}`);
}

/**
 * Map an IANA timezone to a likely ISO-2 country code. Best-effort — many
 * timezones map cleanly to one country; we just pull the city → country
 * mapping for the common ones. The AI uses this only as a soft hint.
 */
function guessCountryFromTimezone(tz: string): string | null {
  // Lazy local table — keep narrow; the AI handles ambiguity.
  const map: Record<string, string> = {
    "Europe/Vilnius": "LT",
    "Europe/Riga": "LV",
    "Europe/Tallinn": "EE",
    "Europe/London": "GB",
    "Europe/Dublin": "IE",
    "Europe/Paris": "FR",
    "Europe/Berlin": "DE",
    "Europe/Amsterdam": "NL",
    "Europe/Brussels": "BE",
    "Europe/Madrid": "ES",
    "Europe/Lisbon": "PT",
    "Europe/Rome": "IT",
    "Europe/Athens": "GR",
    "Europe/Helsinki": "FI",
    "Europe/Stockholm": "SE",
    "Europe/Oslo": "NO",
    "Europe/Copenhagen": "DK",
    "Europe/Warsaw": "PL",
    "Europe/Prague": "CZ",
    "Europe/Budapest": "HU",
    "Europe/Vienna": "AT",
    "Europe/Zurich": "CH",
    "Europe/Bucharest": "RO",
    "Europe/Sofia": "BG",
    "Europe/Moscow": "RU",
    "Europe/Kyiv": "UA",
    "Europe/Istanbul": "TR",
    "America/New_York": "US",
    "America/Chicago": "US",
    "America/Denver": "US",
    "America/Los_Angeles": "US",
    "America/Phoenix": "US",
    "America/Toronto": "CA",
    "America/Vancouver": "CA",
    "America/Mexico_City": "MX",
    "America/Sao_Paulo": "BR",
    "America/Buenos_Aires": "AR",
    "America/Bogota": "CO",
    "America/Lima": "PE",
    "America/Santiago": "CL",
    "Asia/Tokyo": "JP",
    "Asia/Seoul": "KR",
    "Asia/Shanghai": "CN",
    "Asia/Hong_Kong": "HK",
    "Asia/Singapore": "SG",
    "Asia/Bangkok": "TH",
    "Asia/Jakarta": "ID",
    "Asia/Manila": "PH",
    "Asia/Karachi": "PK",
    "Asia/Kolkata": "IN",
    "Asia/Dubai": "AE",
    "Asia/Tehran": "IR",
    "Asia/Jerusalem": "IL",
    "Asia/Riyadh": "SA",
    "Africa/Cairo": "EG",
    "Africa/Lagos": "NG",
    "Africa/Johannesburg": "ZA",
    "Africa/Nairobi": "KE",
    "Australia/Sydney": "AU",
    "Australia/Melbourne": "AU",
    "Pacific/Auckland": "NZ",
  };
  return map[tz] ?? null;
}
