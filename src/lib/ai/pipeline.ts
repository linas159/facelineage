import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { analyzeFace, type AnalysisResult } from "./claude";
import { generateImage } from "./image-gen";
import { compareParents } from "./claude";

type DB = ReturnType<typeof createServiceClient>;

const PHOTOS_BUCKET = "analysis-photos";
const GENERATED_BUCKET = "generated";

/**
 * Main post-payment pipeline.
 *
 * 1. Loads the analysis row + selfie from storage
 * 2. Marks it as `running`
 * 3. Calls Claude to extract structured analysis (regions, traits, story…)
 * 4. Generates the ancestor portrait + cultural-insight images in parallel
 * 5. Persists everything and flips status to `ready`
 *
 * Designed to be called from the Stripe webhook. Errors are caught and
 * recorded on the row so the user sees a "generation failed" state instead
 * of a hung "loading…".
 */
export async function runMainPipeline(analysisId: string): Promise<void> {
  const db = createServiceClient();

  const { data: row, error } = await db
    .from("analyses")
    .select("id, user_id, photo_path, generation_status, quiz_answers, timezone, country_hint")
    .eq("id", analysisId)
    .single();
  if (error || !row) throw new Error(`Analysis ${analysisId} not found: ${error?.message}`);
  if (!row.photo_path) throw new Error(`Analysis ${analysisId} has no photo_path`);

  // Idempotency: don't rerun if we already generated.
  if (row.generation_status === "ready" || row.generation_status === "running") {
    return;
  }

  await db
    .from("analyses")
    .update({ generation_status: "running", generation_error: null })
    .eq("id", analysisId);

  try {
    // 1. Pull selfie bytes
    const selfie = await downloadFromStorage(db, PHOTOS_BUCKET, row.photo_path);
    const selfieBase64 = selfie.bytes.toString("base64");

    // 2. Run Claude analysis with quiz + location context
    const result = await analyzeFace({
      imageBase64: selfieBase64,
      mediaType: selfie.mediaType,
      context: {
        timezone: row.timezone ?? null,
        countryHint: row.country_hint ?? null,
        quizAnswers: (row.quiz_answers as Record<string, string> | null) ?? null,
      },
    });

    // 3. Generate ancestor portrait + 1 cultural insight image per insight,
    //    Only the ancestor portrait is generated per-user (high impact,
    //    1 image). Cultural insights ship text-only for now — generating
    //    3 images per report multiplies cost without a clear win. We'll
    //    swap in a pre-generated library matched by region later.
    const userId = row.user_id ?? "shared";

    const ancestorBytes = await generateImage({
      prompt: result.ancestor.image_prompt,
      referenceImageBase64: selfieBase64,
      referenceMediaType: selfie.mediaType,
      aspect: "4:5",
    });

    // 4. Upload generated images
    const ancestorPath = await uploadGenerated(
      db,
      `${userId}/${analysisId}/ancestor-${randomUUID()}.png`,
      ancestorBytes,
    );

    // Persist cultural insights without an image_path; the renderer hides
    // the image block when none is set.
    const insightsWithPaths = result.cultural_insights.map((ci) => ({
      ...ci,
      image_path: null,
    }));

    // 5. Persist everything to the analysis row
    const persistAncestor = {
      ...result.ancestor,
      image_path: ancestorPath,
    };

    const { error: upErr } = await db
      .from("analyses")
      .update({
        generation_status: "ready",
        status: "ready",
        is_paid: true,
        completed_at: new Date().toISOString(),
        conclusion: result.conclusion,
        regions: result.regions,
        facial_traits: result.facial_traits,
        cultural_insights: insightsWithPaths,
        heritage_story: result.heritage_story,
        ancestor: persistAncestor,
        uniqueness_score_v2: result.uniqueness_score,
      })
      .eq("id", analysisId);

    if (upErr) throw upErr;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db
      .from("analyses")
      .update({ generation_status: "failed", generation_error: message })
      .eq("id", analysisId);
    throw err;
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Upsell pipelines — kicked off from the webhook after each upsell purchase.
// Each writes one or more rows to upsell_artifacts.
// ────────────────────────────────────────────────────────────────────────────

export type UpsellSku =
  | "upsell_v2_parents"
  | "upsell_v2_ethnicity"
  | "upsell_v2_ages"
  | "upsell_v2_partner"
  | "upsell_v2_book";

/** Dispatches the right pipeline for the given upsell SKU. */
export async function runUpsellPipeline(opts: {
  sku: UpsellSku;
  analysisId: string;
  purchaseId: string;
}): Promise<void> {
  switch (opts.sku) {
    case "upsell_v2_ethnicity":
      return runEthnicityPipeline(opts);
    case "upsell_v2_ages":
      return runAgesPipeline(opts);
    case "upsell_v2_partner":
      return runPartnerPipeline(opts);
    case "upsell_v2_parents":
      // Parents requires extra photo uploads from the user; the artifact row
      // is created here as `pending_input`. The dedicated parents-flow page
      // (TODO) will collect the photos and run the comparison.
      return runParentsScaffold(opts);
    case "upsell_v2_book":
      // Book composes a PDF from the existing analysis data. PDF rendering
      // is a separate concern; we mark the artifact `pending` here and the
      // PDF worker (TODO) materializes it.
      return runBookScaffold(opts);
  }
}

const ETHNICITY_VARIANTS = [
  { key: "east-asia",        prompt: "the same person rendered as East Asian (Han Chinese), warm ivory skin, dark almond eyes, sleek black hair pulled back, jade-and-gold silk collar, emerald-green studio backdrop. Same face structure, same expression as the reference." },
  { key: "west-africa",      prompt: "the same person rendered as West African (Yoruba), rich dark-brown skin, close-cropped natural curls, full lips, kente-pattern fabric draped at the shoulders, deep magenta studio backdrop. Same face structure, same expression as the reference." },
  { key: "northern-europe",  prompt: "the same person rendered as Northern European (Sami), very fair pink-flushed skin, cool grey-blue eyes, pale strawberry-blonde hair in a loose updo, silver Sami pendant, slate-blue studio backdrop. Same face structure, same expression as the reference." },
  { key: "south-asia",       prompt: "the same person rendered as South Asian (Bengali), warm brown skin, large dark eyes lined with kohl, deep black hair with a single jasmine flower, red-and-gold silk drape, golden-amber studio backdrop. Same face structure, same expression as the reference." },
  { key: "andes",            prompt: "the same person rendered as Andean (Quechua), copper-brown skin, dark eyes, straight black hair in a long braid, woven aguayo cloth in red/turquoise, terracotta-coral studio backdrop. Same face structure, same expression as the reference." },
];

async function runEthnicityPipeline(opts: { analysisId: string; purchaseId: string }) {
  const db = createServiceClient();
  const { selfieBase64, selfieMediaType, userId } = await loadSelfieForAnalysis(db, opts.analysisId);

  const variantBytes = await Promise.all(
    ETHNICITY_VARIANTS.map((v) =>
      generateImage({
        prompt: v.prompt,
        referenceImageBase64: selfieBase64,
        referenceMediaType: selfieMediaType,
        aspect: "1:1",
      }),
    ),
  );

  for (let i = 0; i < ETHNICITY_VARIANTS.length; i++) {
    const v = ETHNICITY_VARIANTS[i];
    const path = await uploadGenerated(
      db,
      `${userId}/${opts.analysisId}/ethnicity-${v.key}-${randomUUID()}.png`,
      variantBytes[i],
    );
    await db.from("upsell_artifacts").insert({
      purchase_id: opts.purchaseId,
      analysis_id: opts.analysisId,
      product_sku: "upsell_v2_ethnicity",
      artifact_type: "image",
      storage_path: path,
      metadata: { variant: v.key },
    });
  }
}

const AGES_VARIANTS = [
  { key: "ancient-rome",     prompt: "the same person rendered as a Roman citizen circa 100 AD, laurel crown, white toga draped over one shoulder, marble interior backdrop, classical oil portrait style." },
  { key: "tang-china",       prompt: "the same person rendered as Tang-dynasty Chinese nobility, silk hanfu robes, jade hairpins, ink-painted mountain backdrop, classical Chinese portrait style." },
  { key: "viking-age",       prompt: "the same person rendered as a Viking-age Scandinavian, braided hair with bone beads, fur cloak, fjord backdrop, painterly historical portrait style." },
  { key: "medieval-europe",  prompt: "the same person rendered in 14th-century European garb, simple wool tunic, candlelit stone interior, oil-painted illuminated-manuscript style." },
  { key: "edo-japan",        prompt: "the same person rendered as Edo-period Japanese, kimono with cherry blossom motif, ukiyo-e woodblock print style." },
  { key: "ottoman-empire",   prompt: "the same person rendered as a 17th-century Ottoman, embroidered kaftan and turban, Iznik-tile backdrop, miniature-painting style." },
  { key: "victorian-era",    prompt: "the same person rendered in 1880s Victorian formal wear, high collar and cravat, sepia photographic style with painterly hand-tinting." },
  { key: "1920s-modern",     prompt: "the same person rendered in 1920s art-deco style, bobbed hair or slicked-back, satin and pearls or sharp three-piece suit, jazz-age portrait." },
];

async function runAgesPipeline(opts: { analysisId: string; purchaseId: string }) {
  const db = createServiceClient();
  const { selfieBase64, selfieMediaType, userId } = await loadSelfieForAnalysis(db, opts.analysisId);

  const bytes = await Promise.all(
    AGES_VARIANTS.map((v) =>
      generateImage({
        prompt: v.prompt,
        referenceImageBase64: selfieBase64,
        referenceMediaType: selfieMediaType,
        aspect: "3:4",
      }),
    ),
  );

  for (let i = 0; i < AGES_VARIANTS.length; i++) {
    const v = AGES_VARIANTS[i];
    const path = await uploadGenerated(
      db,
      `${userId}/${opts.analysisId}/ages-${v.key}-${randomUUID()}.png`,
      bytes[i],
    );
    await db.from("upsell_artifacts").insert({
      purchase_id: opts.purchaseId,
      analysis_id: opts.analysisId,
      product_sku: "upsell_v2_ages",
      artifact_type: "image",
      storage_path: path,
      metadata: { variant: v.key },
    });
  }
}

async function runPartnerPipeline(opts: { analysisId: string; purchaseId: string }) {
  const db = createServiceClient();
  const { selfieBase64, selfieMediaType, userId } = await loadSelfieForAnalysis(db, opts.analysisId);

  const prompt =
    "A complementary partner portrait — a person whose proportions, palette, and heritage would visually balance the face in the reference image. Three-quarter angle bust, soft dawn-pink-to-violet backdrop, painterly portrait style, dreamy and slightly idealized. Do NOT replicate the reference person; render the *complement* — different face but harmonious palette and bone structure.";

  const bytes = await generateImage({
    prompt,
    referenceImageBase64: selfieBase64,
    referenceMediaType: selfieMediaType,
    aspect: "4:5",
  });

  const path = await uploadGenerated(
    db,
    `${userId}/${opts.analysisId}/partner-${randomUUID()}.png`,
    bytes,
  );
  await db.from("upsell_artifacts").insert({
    purchase_id: opts.purchaseId,
    analysis_id: opts.analysisId,
    product_sku: "upsell_v2_partner",
    artifact_type: "image",
    storage_path: path,
    metadata: { variant: "partner" },
  });
}

async function runParentsScaffold(opts: { analysisId: string; purchaseId: string }) {
  const db = createServiceClient();
  await db.from("upsell_artifacts").insert({
    purchase_id: opts.purchaseId,
    analysis_id: opts.analysisId,
    product_sku: "upsell_v2_parents",
    artifact_type: "pending_input",
    metadata: { needs: "mother_photo,father_photo" },
  });
}

/**
 * Called from the parents upload action once both mother + father photos
 * are stored. Loads all 3 photos, runs Claude's compare-parents tool,
 * persists the text breakdown as a JSON artifact, and removes any
 * 'pending_input' rows.
 */
export async function runParentsComparisonPipeline(opts: {
  analysisId: string;
  motherPath: string;
  fatherPath: string;
}): Promise<void> {
  const db = createServiceClient();
  const selfie = await loadSelfieForAnalysis(db, opts.analysisId);
  const mother = await downloadFromStorage(db, "analysis-photos", opts.motherPath);
  const father = await downloadFromStorage(db, "analysis-photos", opts.fatherPath);

  const comparison = await compareParents({
    userImageBase64: selfie.selfieBase64,
    userMediaType: selfie.selfieMediaType,
    motherImageBase64: mother.bytes.toString("base64"),
    motherMediaType: mother.mediaType,
    fatherImageBase64: father.bytes.toString("base64"),
    fatherMediaType: father.mediaType,
  });

  // Replace any 'pending_input' placeholders with the real result.
  await db
    .from("upsell_artifacts")
    .delete()
    .eq("analysis_id", opts.analysisId)
    .eq("product_sku", "upsell_v2_parents")
    .eq("artifact_type", "pending_input");

  // Look up the purchase id so the artifact has a FK target.
  const { data: purchase } = await db
    .from("purchases")
    .select("id")
    .eq("analysis_id", opts.analysisId)
    .eq("product_sku", "upsell_v2_parents")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await db.from("upsell_artifacts").insert({
    purchase_id: purchase?.id ?? null,
    analysis_id: opts.analysisId,
    product_sku: "upsell_v2_parents",
    artifact_type: "json",
    metadata: comparison,
  });
}

async function runBookScaffold(opts: { analysisId: string; purchaseId: string }) {
  const db = createServiceClient();
  const BOOK_PDF_PATH = process.env.HERITAGE_BOOK_PDF_PATH ?? "shared/heritage-book.pdf";

  console.log(`runBookScaffold: inserting artifact for analysis=${opts.analysisId}`);
  const { error } = await db.from("upsell_artifacts").insert({
    purchase_id: opts.purchaseId,
    analysis_id: opts.analysisId,
    product_sku: "upsell_v2_book",
    artifact_type: "pdf",
    storage_path: BOOK_PDF_PATH,
    metadata: { format: "pdf" },
  });
  if (error) {
    console.error("runBookScaffold insert failed:", error);
    throw error;
  }
  console.log(`runBookScaffold: done for analysis=${opts.analysisId}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Storage helpers
// ────────────────────────────────────────────────────────────────────────────

async function downloadFromStorage(
  db: DB,
  bucket: string,
  path: string,
): Promise<{ bytes: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" }> {
  const { data, error } = await db.storage.from(bucket).download(path);
  if (error || !data) throw new Error(`Storage download failed: ${error?.message}`);
  const bytes = Buffer.from(await data.arrayBuffer());
  const ext = (path.split(".").pop() ?? "jpg").toLowerCase();
  const mediaType: "image/jpeg" | "image/png" | "image/webp" =
    ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return { bytes, mediaType };
}

async function uploadGenerated(db: DB, path: string, bytes: Buffer): Promise<string> {
  const { error } = await db.storage
    .from(GENERATED_BUCKET)
    .upload(path, bytes, { contentType: "image/png", upsert: false });
  if (error) throw new Error(`Storage upload failed: ${error.message}`);
  return path;
}

async function loadSelfieForAnalysis(db: DB, analysisId: string) {
  const { data: row, error } = await db
    .from("analyses")
    .select("user_id, photo_path")
    .eq("id", analysisId)
    .single();
  if (error || !row?.photo_path) throw new Error(`Analysis ${analysisId} missing photo`);
  const selfie = await downloadFromStorage(db, PHOTOS_BUCKET, row.photo_path);
  return {
    selfieBase64: selfie.bytes.toString("base64"),
    selfieMediaType: selfie.mediaType,
    userId: row.user_id ?? "shared",
  };
}
