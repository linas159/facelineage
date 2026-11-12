"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runParentsComparisonPipeline } from "@/lib/ai/pipeline";
import { fmt, getDictionary, getLocale, localized } from "@/lib/i18n/server";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadParentPhotos(formData: FormData) {
  const analysisId = formData.get("analysisId");
  const mother = formData.get("mother");
  const father = formData.get("father");

  const t = (await getDictionary()).parentsUpload;

  if (typeof analysisId !== "string" || !analysisId) return { error: t.errorMissing };
  if (!(mother instanceof File) || !(father instanceof File)) return { error: t.errorBothRequired };

  for (const [label, f] of [[t.mother, mother], [t.father, father]] as const) {
    if (f.size > MAX_BYTES) return { error: fmt(t.errorTooLarge, { label }) };
    if (!ACCEPTED.includes(f.type)) return { error: fmt(t.errorBadType, { label }) };
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: t.errorSignedOut };

  // Verify the analysis is theirs (RLS would catch it, but a clear error is friendlier).
  const { data: analysis } = await sb
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) return { error: t.errorNotFound };

  const motherPath = `${user.id}/${analysisId}/parent-mother-${randomUUID()}.${ext(mother.name)}`;
  const fatherPath = `${user.id}/${analysisId}/parent-father-${randomUUID()}.${ext(father.name)}`;

  const { error: m1 } = await sb.storage
    .from("analysis-photos")
    .upload(motherPath, mother, { contentType: mother.type, upsert: false });
  if (m1) {
    console.error("[upload-parents] mother upload failed:", m1.message);
    return { error: t.uploadFailed };
  }

  const { error: m2 } = await sb.storage
    .from("analysis-photos")
    .upload(fatherPath, father, { contentType: father.type, upsert: false });
  if (m2) {
    console.error("[upload-parents] father upload failed:", m2.message);
    return { error: t.uploadFailed };
  }

  // Record the source photos for traceability + the cron purge.
  const svc = createServiceClient();
  await svc.from("family_photos").insert([
    { analysis_id: analysisId, relation: "mother", photo_path: motherPath },
    { analysis_id: analysisId, relation: "father", photo_path: fatherPath },
  ]);

  // Fire the comparison pipeline asynchronously — the page will show the
  // result on next load once Claude returns (~3-5 s).
  runParentsComparisonPipeline({ analysisId, motherPath, fatherPath }).catch((err) => {
    console.error("Parents comparison failed:", err);
  });

  redirect(localized(`/report/${analysisId}`, await getLocale()));
}

function ext(name: string): string {
  const last = name.split(".").pop();
  return last && last.length <= 4 ? last : "jpg";
}
