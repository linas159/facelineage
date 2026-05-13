import "server-only";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  REGIONS as DEMO_REGIONS,
  FACIAL_TRAITS as DEMO_TRAITS,
  CULTURAL_INSIGHTS as DEMO_INSIGHTS,
  ANCESTOR as DEMO_ANCESTOR,
  type Region,
  type FacialTrait,
  type CulturalInsight,
  type Ancestor,
} from "@/lib/report-data";

const DEMO_CONCLUSION =
  "Your features converge on a phenotype shaped most strongly in the British Isles and the wider Northwestern European cluster. Layered through it are softer Southern European traits and a faint Central Asian signature — markers of ancient trade, migration, and the long mingling of peoples across the Eurasian steppe.";

const DEMO_STORY =
  "Your ancestors walked the windswept coasts of the North Sea, fished the fjords of Scandinavia, and tended farms in the rolling hills of northern Europe. Threaded through this lineage, you carry whispers of Iberian warmth and Mediterranean sun — markers of distant journeys and ancient unions. [2000+ words]";

// The facial-trait pipeline is intentionally text-only for cost reasons.
// We reuse the static demo illustrations (by trait key) so real reports
// still show the same six images.
const TRAIT_IMAGE_BY_KEY: Record<string, string> = Object.fromEntries(
  DEMO_TRAITS.map((t) => [t.key, t.imageSrc] as const),
);

export type ReportStatus =
  | "demo"        // hardcoded fixtures
  | "idle"        // analysis exists, payment not made
  | "queued"      // payment received, waiting for pipeline
  | "running"     // pipeline in flight
  | "ready"       // all artifacts available
  | "failed"      // pipeline errored
  | "missing";    // no row found

export type UpsellSku =
  | "upsell_v2_parents"
  | "upsell_v2_ethnicity"
  | "upsell_v2_ages"
  | "upsell_v2_partner"
  | "upsell_v2_book";

export type UpsellArtifact = {
  id: string;
  sku: UpsellSku;
  artifactType: string | null; // 'image' | 'pdf' | 'pending_input' | 'pending_render' | 'json'
  url: string | null;          // signed URL when storage-backed
  variant: string | null;      // metadata.variant if present
  metadata: Record<string, unknown> | null;
};

export type ReportData = {
  status: ReportStatus;
  /** Has the user paid for this analysis? Used to distinguish unpaid drafts
   *  (idle + !isPaid → paywall) from the brief window after Stripe redirect
   *  before the webhook flips the row (idle + isPaid → "generating"). */
  isPaid: boolean;
  conclusion: string;
  heritageStory: string;
  uniquenessScore: number;
  regions: Region[];
  facialTraits: FacialTrait[];
  culturalInsights: CulturalInsight[];
  ancestor: Ancestor;
  /** Purchased add-ons grouped by SKU. */
  upsells: Partial<Record<UpsellSku, UpsellArtifact[]>>;
  /** Upsell SKUs the user has paid for but for which no artifacts exist yet. */
  upsellsGenerating: UpsellSku[];
  errorMessage?: string;
};

/** Returns the data needed to render the report page for a given analysis id. */
export async function loadReport(analysisId: string): Promise<ReportData> {
  if (analysisId === "demo") {
    return {
      status: "demo",
      isPaid: true,
      conclusion: DEMO_CONCLUSION,
      heritageStory: DEMO_STORY,
      uniquenessScore: 87,
      regions: DEMO_REGIONS,
      facialTraits: DEMO_TRAITS,
      culturalInsights: DEMO_INSIGHTS,
      ancestor: DEMO_ANCESTOR,
      upsells: {},
      upsellsGenerating: [],
    };
  }

  const sb = await createClient();
  const { data: row } = await sb
    .from("analyses")
    .select(
      "id, user_id, status, generation_status, generation_error, is_paid, conclusion, regions, facial_traits, cultural_insights, heritage_story, ancestor, uniqueness_score_v2",
    )
    .eq("id", analysisId)
    .maybeSingle();

  if (!row) {
    return blank("missing");
  }

  const gs = (row.generation_status ?? "idle") as ReportStatus;
  const isPaid = !!row.is_paid;
  const svc = createServiceClient();

  if (gs !== "ready") {
    return {
      ...blank(gs),
      isPaid,
      errorMessage: row.generation_error ?? undefined,
      // Even while the main report is generating, the user may have already
      // unlocked upsells (rare but possible). Load them so the report shows
      // them once the main report flips to ready.
      ...(await loadUpsells(svc, analysisId)),
    };
  }

  // Generated images live in the private 'generated' bucket. Sign URLs.
  const ancestorImg = await signed(svc, (row.ancestor as { image_path?: string } | null)?.image_path);
  const insightsRaw = (row.cultural_insights ?? []) as Array<CulturalInsight & { image_path?: string }>;
  const insights: CulturalInsight[] = await Promise.all(
    insightsRaw.map(async (ci) => ({
      ...ci,
      imageSrc: (await signed(svc, ci.image_path)) ?? ci.imageSrc ?? "",
    })),
  );

  const ancestor: Ancestor = {
    name: (row.ancestor as { name?: string })?.name ?? DEMO_ANCESTOR.name,
    era: (row.ancestor as { era?: string })?.era ?? DEMO_ANCESTOR.era,
    place: (row.ancestor as { place?: string })?.place ?? DEMO_ANCESTOR.place,
    description: (row.ancestor as { description?: string })?.description ?? DEMO_ANCESTOR.description,
    imageSrc: ancestorImg ?? DEMO_ANCESTOR.imageSrc,
  };

  return {
    status: "ready",
    isPaid,
    conclusion: row.conclusion ?? DEMO_CONCLUSION,
    heritageStory: row.heritage_story ?? DEMO_STORY,
    uniquenessScore: row.uniqueness_score_v2 ?? 87,
    regions: (row.regions ?? DEMO_REGIONS) as Region[],
    facialTraits: ((row.facial_traits ?? DEMO_TRAITS) as FacialTrait[]).map((t) => ({
      ...t,
      // The Claude analyzer returns supporting_regions in snake_case; the
      // existing component reads supportingRegions. Normalize.
      supportingRegions:
        (t as FacialTrait & { supporting_regions?: string[] }).supporting_regions ??
        t.supportingRegions ??
        [],
      // Fall back to the matching demo illustration when the DB row doesn't
      // carry one (pipeline doesn't generate trait images — too expensive
      // to do per-user, and these six are generic enough to reuse).
      imageSrc: t.imageSrc || TRAIT_IMAGE_BY_KEY[t.key] || "",
    })),
    culturalInsights: insights,
    ancestor,
    ...(await loadUpsells(svc, analysisId)),
  };
}

function blank(status: ReportStatus): ReportData {
  return {
    status,
    isPaid: false,
    conclusion: "",
    heritageStory: "",
    uniquenessScore: 0,
    regions: [],
    facialTraits: [],
    culturalInsights: [],
    ancestor: { ...DEMO_ANCESTOR, imageSrc: "" },
    upsells: {},
    upsellsGenerating: [],
  };
}

async function signed(
  svc: ReturnType<typeof createServiceClient>,
  path?: string | null,
  bucket = "generated",
): Promise<string | null> {
  if (!path) return null;
  const { data } = await svc.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? null;
}

async function loadUpsells(
  svc: ReturnType<typeof createServiceClient>,
  analysisId: string,
): Promise<{ upsells: ReportData["upsells"]; upsellsGenerating: UpsellSku[] }> {
  // Pull every artifact attached to this analysis.
  const { data: arts } = await svc
    .from("upsell_artifacts")
    .select("id, product_sku, artifact_type, storage_path, metadata")
    .eq("analysis_id", analysisId);

  const grouped: Partial<Record<UpsellSku, UpsellArtifact[]>> = {};
  for (const a of arts ?? []) {
    const sku = a.product_sku as UpsellSku | null;
    if (!sku) continue;
    const md = (a.metadata as Record<string, unknown> | null) ?? null;
    // Pick bucket based on artifact_type: 'pdf' lives in 'artifacts', images
    // in 'generated', placeholders carry no file at all.
    const bucket = a.artifact_type === "pdf" ? "artifacts" : "generated";
    const url = a.storage_path ? await signed(svc, a.storage_path, bucket) : null;
    const entry: UpsellArtifact = {
      id: a.id,
      sku,
      artifactType: a.artifact_type ?? null,
      url,
      variant: typeof md?.variant === "string" ? md.variant : null,
      metadata: md,
    };
    (grouped[sku] ??= []).push(entry);
  }

  // Cross-reference paid purchases — any SKU paid but with zero usable
  // artifacts goes in `generating`.
  const { data: purchases } = await svc
    .from("purchases")
    .select("product_sku, status")
    .eq("analysis_id", analysisId);

  const paidSkus = new Set<UpsellSku>(
    (purchases ?? [])
      .filter((p) => p.status === "paid")
      .map((p) => p.product_sku as UpsellSku),
  );

  const generating: UpsellSku[] = [];
  for (const sku of paidSkus) {
    const arts = grouped[sku] ?? [];
    const hasUsable = arts.some(
      (a) => a.artifactType === "image" || a.artifactType === "pdf" || a.artifactType === "json",
    );
    if (!hasUsable && (sku === "upsell_v2_ethnicity" || sku === "upsell_v2_ages" || sku === "upsell_v2_partner")) {
      generating.push(sku);
    }
  }

  return { upsells: grouped, upsellsGenerating: generating };
}
