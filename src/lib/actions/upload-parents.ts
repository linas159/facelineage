"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { runParentsComparisonPipeline } from "@/lib/ai/pipeline";

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export async function uploadParentPhotos(formData: FormData) {
  const analysisId = formData.get("analysisId");
  const mother = formData.get("mother");
  const father = formData.get("father");

  if (typeof analysisId !== "string" || !analysisId) return { error: "Missing analysis" };
  if (!(mother instanceof File) || !(father instanceof File)) return { error: "Both photos required" };

  for (const [name, f] of [["mother", mother], ["father", father]] as const) {
    if (f.size > MAX_BYTES) return { error: `${name} photo is too large (max 10MB)` };
    if (!ACCEPTED.includes(f.type)) return { error: `${name} photo has unsupported type` };
  }

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: "Not signed in" };

  // Verify the analysis is theirs (RLS would catch it, but a clear error is friendlier).
  const { data: analysis } = await sb
    .from("analyses")
    .select("id")
    .eq("id", analysisId)
    .maybeSingle();
  if (!analysis) return { error: "Analysis not found" };

  const motherPath = `${user.id}/${analysisId}/parent-mother-${randomUUID()}.${ext(mother.name)}`;
  const fatherPath = `${user.id}/${analysisId}/parent-father-${randomUUID()}.${ext(father.name)}`;

  const { error: m1 } = await sb.storage
    .from("analysis-photos")
    .upload(motherPath, mother, { contentType: mother.type, upsert: false });
  if (m1) return { error: `Mother upload failed: ${m1.message}` };

  const { error: m2 } = await sb.storage
    .from("analysis-photos")
    .upload(fatherPath, father, { contentType: father.type, upsert: false });
  if (m2) return { error: `Father upload failed: ${m2.message}` };

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

  redirect(`/report/${analysisId}`);
}

function ext(name: string): string {
  const last = name.split(".").pop();
  return last && last.length <= 4 ? last : "jpg";
}
