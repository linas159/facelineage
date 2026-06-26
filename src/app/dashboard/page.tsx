import Link from "next/link";
import { redirect } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle, Chip } from "@/components/ui/card";
import { UpsellSections, type UpsellId } from "@/components/upsell-sections";
import { UpsellDisplay } from "@/components/report/upsell-display";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getLocale, localized } from "@/lib/i18n/server";
import type { UpsellArtifact, UpsellSku } from "@/lib/report-loader";

export const dynamic = "force-dynamic";

type AnalysisRow = {
  id: string;
  created_at: string;
  generation_status: "idle" | "queued" | "running" | "ready" | "failed" | null;
  conclusion: string | null;
  regions: Array<{ name?: string; pct?: number; color?: string }> | null;
};

const SKU_TO_UI_ID: Record<UpsellSku, UpsellId> = {
  upsell_v2_parents: "parents",
  upsell_v2_ethnicity: "ethnicity",
  upsell_v2_ages: "ages",
  upsell_v2_partner: "partner",
  upsell_v2_book: "book",
};

export default async function DashboardPage() {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/sign-up");
  const locale = await getLocale();

  const { data } = await sb
    .from("analyses")
    .select("id, created_at, generation_status, conclusion, regions")
    .order("created_at", { ascending: false });

  const reports = (data ?? []) as AnalysisRow[];
  const latestReady = reports.find((r) => r.generation_status === "ready");

  // Pull every upsell artifact owned by this user (across all their analyses).
  // RLS goes through purchases → user; service client is simpler and safe
  // because we filter by the user's own analysis ids.
  const analysisIds = reports.map((r) => r.id);
  const svc = createServiceClient();
  const grouped: Partial<Record<UpsellSku, UpsellArtifact[]>> = {};
  const ownedSkus = new Set<UpsellSku>();
  const generatingSkus: UpsellSku[] = [];

  if (analysisIds.length > 0) {
    const { data: arts } = await svc
      .from("upsell_artifacts")
      .select("id, product_sku, artifact_type, storage_path, metadata")
      .in("analysis_id", analysisIds);

    for (const a of arts ?? []) {
      const sku = a.product_sku as UpsellSku | null;
      if (!sku) continue;
      ownedSkus.add(sku);
      const md = (a.metadata as Record<string, unknown> | null) ?? null;
      const bucket = a.artifact_type === "pdf" ? "artifacts" : "generated";
      let url: string | null = null;
      if (a.storage_path) {
        const { data } = await svc.storage.from(bucket).createSignedUrl(a.storage_path, 60 * 60);
        url = data?.signedUrl ?? null;
      }
      (grouped[sku] ??= []).push({
        id: a.id,
        sku,
        artifactType: a.artifact_type ?? null,
        url,
        variant: typeof md?.variant === "string" ? md.variant : null,
        metadata: md,
      });
    }

    // Any paid SKU with no usable artifact yet → still generating.
    const { data: purchases } = await svc
      .from("purchases")
      .select("product_sku, status")
      .in("analysis_id", analysisIds);
    for (const p of purchases ?? []) {
      const sku = p.product_sku as UpsellSku;
      if (!sku || p.status !== "paid") continue;
      const arts = grouped[sku] ?? [];
      const hasUsable = arts.some(
        (a) => a.artifactType === "image" || a.artifactType === "pdf" || a.artifactType === "json",
      );
      if (!hasUsable && (sku === "upsell_v2_ethnicity" || sku === "upsell_v2_ages" || sku === "upsell_v2_partner")) {
        generatingSkus.push(sku);
        ownedSkus.add(sku);
      }
    }
  }

  // Buy-CTA list = the 5 upsell UI ids minus whatever the user already owns.
  const allUiIds: UpsellId[] = ["parents", "ethnicity", "ages", "partner", "book"];
  const buyableUiIds = allUiIds.filter((id) => {
    const sku = Object.keys(SKU_TO_UI_ID).find(
      (k) => SKU_TO_UI_ID[k as UpsellSku] === id,
    ) as UpsellSku | undefined;
    return sku ? !ownedSkus.has(sku) : true;
  });

  return (
    <FunnelShell>
      <div className="pt-6">
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
          My library
        </p>
        <div className="mb-6 flex items-end justify-between">
          <h1>Your reports</h1>
        </div>

        {reports.length === 0 ? (
          <Card>
            <CardTitle>No reports yet</CardTitle>
            <CardDescription className="mt-1">
              Take the quiz, snap a selfie, and we&apos;ll get started.
            </CardDescription>
          </Card>
        ) : (
          <div className="flex flex-col gap-4">
            {reports.map((r) => {
              const top = r.regions?.[0];
              const inFlight =
                r.generation_status === "queued" || r.generation_status === "running";
              return (
                <Link key={r.id} href={localized(`/report/${r.id}`, locale)}>
                  <Card className="cursor-pointer transition-transform hover:-translate-y-0.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>
                          {top?.name ?? (inFlight ? "Generating…" : "Untitled")}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {new Date(r.created_at).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      {top?.pct ? (
                        <Chip color="orange">{top.pct.toFixed(0)}%</Chip>
                      ) : inFlight ? (
                        <Chip color="yellow">In progress</Chip>
                      ) : r.generation_status === "failed" ? (
                        <Chip color="coral">Failed</Chip>
                      ) : null}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}

        <div className="mt-8 grid gap-3">
          <Link href={localized("/quiz/1", locale)}>
            <Button size="block">+ New analysis</Button>
          </Link>
          <Link href={localized("/account", locale)}>
            <Button size="block" variant="secondary">Account & subscription</Button>
          </Link>
        </div>

        {/* Owned add-ons (download / view) */}
        {latestReady && ownedSkus.size > 0 && (
          <div className="mt-10">
            <p className="mb-1 text-center text-xs font-bold uppercase tracking-wider text-[var(--color-orange)]">
              Your add-ons
            </p>
            <h2 className="mb-4 text-center text-2xl">Unlocked for you</h2>
            <UpsellDisplay
              analysisId={latestReady.id}
              upsells={grouped}
              upsellsGenerating={generatingSkus}
            />
          </div>
        )}

        {/* Buy-CTAs for everything the user doesn't already own */}
        {latestReady && buyableUiIds.length > 0 && (
          <UpsellSections analysisId={latestReady.id} ids={buyableUiIds} />
        )}
      </div>
    </FunnelShell>
  );
}
