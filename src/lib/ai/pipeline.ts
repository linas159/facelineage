import { randomUUID } from "crypto";
import { createServiceClient } from "@/lib/supabase/server";
import { analyzeFace } from "./claude";
import { generateImage } from "./image-gen";
import { compareParents } from "./claude";

type DB = ReturnType<typeof createServiceClient>;

const PHOTOS_BUCKET = "analysis-photos";
const GENERATED_BUCKET = "generated";

/**
 * A `running` claim older than this is assumed dead — the serverless
 * invocation that made it was killed, timed out, or crashed without ever
 * reaching the catch block. Longer than the worst realistic run (Claude with
 * retries + portrait with retries ≈ 3 min), short enough that a waiting
 * customer is not stuck for long.
 */
const STALE_RUNNING_MS = 8 * 60 * 1000;

/**
 * Cap on automatic attempts, so a genuinely broken analysis (corrupt photo,
 * revoked API key) can't spin forever. A manual retry ignores this.
 */
const MAX_PIPELINE_ATTEMPTS = 5;

/**
 * Is this analysis stuck in a state a re-run could fix?
 *
 * `failed` and `queued` are obvious. A `running` row whose claim has gone
 * stale is the subtle one: nothing else will ever pick it up, because the
 * invocation that claimed it is gone.
 */
export function isRecoverable(row: {
  status: string | null;
  startedAt: string | null;
  attempts: number | null;
}): boolean {
  if ((row.attempts ?? 0) >= MAX_PIPELINE_ATTEMPTS) return false;
  if (row.status === "failed" || row.status === "queued") return true;
  if (row.status === "running") {
    const startedAt = row.startedAt ? Date.parse(row.startedAt) : 0;
    return !startedAt || Date.now() - startedAt > STALE_RUNNING_MS;
  }
  return false;
}

type StoredAncestor = {
  name?: string;
  era?: string;
  place?: string;
  description?: string;
  image_prompt?: string;
  image_path?: string | null;
};

/**
 * Main post-payment pipeline.
 *
 * 1. Claims the row (reclaiming stale `running` rows left by dead invocations)
 * 2. Calls Claude for the structured analysis, then persists the text report
 *    immediately — before touching the image model
 * 3. Generates and attaches the ancestor portrait
 * 4. Flips status to `ready`
 *
 * Two properties make this safe to call repeatedly from any entry point
 * (webhook, /payment-complete, /api/intro-charge, the repair endpoint):
 *
 *   - **Resumable.** The text report is persisted the moment it exists, so a
 *     later failure (or a re-run) never re-pays for the Claude call, and a
 *     re-run only redoes the step that actually failed.
 *   - **Degrades instead of failing.** If the portrait can't be generated the
 *     report still goes `ready` with everything else intact — a paying
 *     customer gets their report, and the portrait is filled in on a later
 *     pass. Only a failure that leaves nothing to show marks the row `failed`.
 */
export async function runMainPipeline(
  analysisId: string,
  opts: { force?: boolean } = {},
): Promise<void> {
  console.log(`[pipeline] start analysis=${analysisId}${opts.force ? " (forced)" : ""}`);
  const db = createServiceClient();

  const { data: row, error } = await db
    .from("analyses")
    .select(
      "id, user_id, photo_path, generation_status, generation_started_at, generation_attempts, quiz_answers, timezone, country_hint, conclusion, ancestor",
    )
    .eq("id", analysisId)
    .single();
  console.log(
    `[pipeline] loaded row, photo_path=${row?.photo_path ?? "(none)"} status=${row?.generation_status} attempts=${row?.generation_attempts ?? 0}`,
  );
  if (error || !row) throw new Error(`Analysis ${analysisId} not found: ${error?.message}`);

  const storedAncestor = (row.ancestor ?? null) as StoredAncestor | null;
  // The text report is already on the row and only the portrait is missing —
  // a re-run can skip Claude entirely and just finish the image step.
  const textAlreadyDone = !!row.conclusion && !!storedAncestor?.image_prompt;
  const portraitAlreadyDone = !!storedAncestor?.image_path;

  if (row.generation_status === "ready" && portraitAlreadyDone) {
    console.log(`[pipeline] already ready — skipping`);
    return;
  }

  // A live claim from another invocation: leave it alone. A stale one means
  // that invocation died; take it over.
  if (row.generation_status === "running") {
    const startedAt = row.generation_started_at ? Date.parse(row.generation_started_at) : 0;
    const ageMs = Date.now() - startedAt;
    if (startedAt && ageMs < STALE_RUNNING_MS) {
      console.log(`[pipeline] already running (${Math.round(ageMs / 1000)}s ago) — skipping`);
      return;
    }
    console.warn(`[pipeline] reclaiming stale running claim (${Math.round(ageMs / 1000)}s old)`);
  }

  const attempts = row.generation_attempts ?? 0;
  if (!opts.force && attempts >= MAX_PIPELINE_ATTEMPTS) {
    console.error(`[pipeline] attempts exhausted (${attempts}) — not retrying automatically`);
    return;
  }

  if (!textAlreadyDone && !row.photo_path) {
    // Nothing to analyze and nothing already stored — record it rather than
    // throwing into a void, so support can see why.
    await db
      .from("analyses")
      .update({
        generation_status: "failed",
        generation_error: "Source photo is missing — cannot generate the report.",
      })
      .eq("id", analysisId);
    throw new Error(`Analysis ${analysisId} has no photo_path`);
  }

  // Optimistic lock: `generation_attempts` doubles as a version counter, so
  // when several entry points fire at once exactly one of them claims the run.
  const { data: claimed } = await db
    .from("analyses")
    .update({
      generation_status: "running",
      generation_error: null,
      generation_started_at: new Date().toISOString(),
      generation_attempts: attempts + 1,
    })
    .eq("id", analysisId)
    .eq("generation_attempts", attempts)
    .select("id")
    .maybeSingle();
  if (!claimed) {
    console.log(`[pipeline] lost the claim race — another run is handling this`);
    return;
  }
  console.log(`[pipeline] status → running (attempt ${attempts + 1})`);

  try {
    const userId = row.user_id ?? "shared";

    // 1. Pull selfie bytes. Only strictly needed when we still have to run
    // Claude; for a portrait-only repair it's a nice-to-have reference image.
    let selfie: { bytes: Buffer; mediaType: "image/jpeg" | "image/png" | "image/webp" } | null =
      null;
    if (row.photo_path) {
      try {
        selfie = await downloadFromStorage(db, PHOTOS_BUCKET, row.photo_path);
        console.log(`[pipeline] selfie downloaded, ${selfie.bytes.length} bytes`);
      } catch (err) {
        if (!textAlreadyDone) throw err;
        console.warn(
          `[pipeline] selfie unavailable for portrait repair: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // 2. Run Claude analysis with quiz + location context, then persist the
    // text report straight away so it survives any later failure.
    let ancestorPrompt: string;
    if (textAlreadyDone) {
      console.log(`[pipeline] text report already persisted — resuming at the portrait step`);
      ancestorPrompt = storedAncestor!.image_prompt!;
    } else {
      if (!selfie) throw new Error(`Analysis ${analysisId} has no readable selfie`);
      console.log(`[pipeline] calling Claude…`);
      const claudeStart = Date.now();
      const result = await analyzeFace({
        imageBase64: selfie.bytes.toString("base64"),
        mediaType: selfie.mediaType,
        context: {
          timezone: row.timezone ?? null,
          countryHint: row.country_hint ?? null,
          quizAnswers: (row.quiz_answers as Record<string, string> | null) ?? null,
        },
      });
      console.log(
        `[pipeline] Claude done in ${Date.now() - claudeStart}ms, regions=${result.regions.length}`,
      );

      console.log(`[pipeline] persisting text report…`);
      const { error: textErr } = await db
        .from("analyses")
        .update({
          conclusion: result.conclusion,
          regions: result.regions,
          facial_traits: result.facial_traits,
          // Cultural insights stay text-only for now (per-user images for
          // those would be too costly).
          cultural_insights: result.cultural_insights.map((ci) => ({ ...ci, image_path: null })),
          heritage_story: result.heritage_story,
          ancestor: { ...result.ancestor, image_path: null },
          uniqueness_score_v2: result.uniqueness_score,
        })
        .eq("id", analysisId);
      if (textErr) throw textErr;
      ancestorPrompt = result.ancestor.image_prompt;
    }

    // 3. Ancestor portrait. Non-fatal: a report without the generated
    // portrait is still a report (the loader falls back to a stock image),
    // and a later pass can fill it in.
    let ancestorPath: string | null = null;
    let portraitError: string | null = null;
    try {
      console.log(`[pipeline] generating ancestor portrait…`);
      const imgStart = Date.now();
      const ancestorBytes = await generateImage({
        prompt: ancestorPrompt,
        referenceImageBase64: selfie?.bytes.toString("base64"),
        referenceMediaType: selfie?.mediaType,
        aspect: "4:5",
      });
      console.log(`[pipeline] portrait done in ${Date.now() - imgStart}ms, ${ancestorBytes.length} bytes`);

      ancestorPath = await uploadGenerated(
        db,
        `${userId}/${analysisId}/ancestor-${randomUUID()}.png`,
        ancestorBytes,
      );
      console.log(`[pipeline] portrait uploaded → ${ancestorPath}`);
    } catch (err) {
      portraitError = err instanceof Error ? err.message : String(err);
      console.error(`[pipeline] portrait generation failed (non-fatal): ${portraitError}`);
    }

    // 4. Finalize. Re-read the ancestor block so we patch whatever is
    // currently stored rather than clobbering it.
    const { data: fresh } = await db
      .from("analyses")
      .select("ancestor")
      .eq("id", analysisId)
      .maybeSingle();
    const finalAncestor = {
      ...((fresh?.ancestor ?? {}) as StoredAncestor),
      image_path: ancestorPath ?? ((fresh?.ancestor ?? {}) as StoredAncestor).image_path ?? null,
    };

    console.log(`[pipeline] finalizing analysis row…`);
    const { error: upErr } = await db
      .from("analyses")
      .update({
        generation_status: "ready",
        status: "ready",
        is_paid: true,
        completed_at: new Date().toISOString(),
        ancestor: finalAncestor,
        // Surfaced only in logs/support tooling — a `ready` report never
        // renders this to the customer.
        generation_error: portraitError ? `portrait: ${portraitError}` : null,
      })
      .eq("id", analysisId);

    if (upErr) throw upErr;
    console.log(
      `[pipeline] DONE analysis=${analysisId}${portraitError ? " (portrait pending retry)" : ""}`,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`[pipeline] FAILED analysis=${analysisId}: ${message}`);
    if (err instanceof Error && err.stack) console.error(err.stack);
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
  // Idempotency guard: if artifacts already exist for this sku on this
  // analysis, the pipeline has already run (likely via the webhook OR via
  // the /api/upsell-charge fallback). Skip — both paths can safely race.
  const db = createServiceClient();
  const { data: existing } = await db
    .from("upsell_artifacts")
    .select("id")
    .eq("analysis_id", opts.analysisId)
    .eq("product_sku", opts.sku)
    .limit(1);
  if (existing && existing.length > 0) {
    console.log(
      `[runUpsellPipeline] artifacts already exist for ${opts.sku} on ${opts.analysisId} — skipping`,
    );
    return;
  }

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
