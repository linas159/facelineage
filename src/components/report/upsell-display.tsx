import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UpsellArtifact, UpsellSku } from "@/lib/report-loader";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

interface Props {
  upsells: Partial<Record<UpsellSku, UpsellArtifact[]>>;
  upsellsGenerating: UpsellSku[];
  t: Dictionary["upsellDisplay"];
  /** Localized link to the parents-photo upload page. */
  parentsHref: string;
}

export function UpsellDisplay({ upsells, upsellsGenerating, t, parentsHref }: Props) {
  const ethnicityLabels: Record<string, string> = t.ethnicityVariants;
  const agesLabels: Record<string, string> = t.agesVariants;
  const ethnicity = upsells.upsell_v2_ethnicity ?? [];
  const ages = upsells.upsell_v2_ages ?? [];
  const partner = upsells.upsell_v2_partner ?? [];
  const parents = upsells.upsell_v2_parents ?? [];
  const book = upsells.upsell_v2_book ?? [];

  const nothing =
    ethnicity.length === 0 &&
    ages.length === 0 &&
    partner.length === 0 &&
    parents.length === 0 &&
    book.length === 0 &&
    upsellsGenerating.length === 0;

  if (nothing) return null;

  return (
    <div className="space-y-8">
      {upsellsGenerating.length > 0 && (
        <Card className="border-2 border-[var(--color-orange)]/30 bg-[var(--color-orange-pale)] text-center">
          <CardTitle className="mb-1">{t.generatingTitle}</CardTitle>
          <CardDescription>{t.generatingBody}</CardDescription>
        </Card>
      )}

      {ethnicity.length > 0 && (
        <Section
          eyebrow={t.ethnicityEyebrow}
          title={t.ethnicityTitle}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ethnicity.map((a) => (
              <ImageTile
                key={a.id}
                src={a.url}
                label={ethnicityLabels[a.variant ?? ""] ?? a.variant ?? t.variationFallback}
              />
            ))}
          </div>
        </Section>
      )}

      {ages.length > 0 && (
        <Section
          eyebrow={t.agesEyebrow}
          title={t.agesTitle}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ages.map((a) => (
              <ImageTile
                key={a.id}
                src={a.url}
                label={agesLabels[a.variant ?? ""] ?? a.variant ?? t.eraFallback}
                aspect="aspect-[3/4]"
              />
            ))}
          </div>
        </Section>
      )}

      {partner.length > 0 && (
        <Section eyebrow={t.partnerEyebrow} title={t.partnerTitle}>
          <Card className="overflow-hidden !p-0">
            {partner[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner[0].url}
                alt={t.partnerAlt}
                className="block aspect-[4/5] w-full object-cover"
              />
            )}
          </Card>
        </Section>
      )}

      {parents.length > 0 && (
        <Section eyebrow={t.parentsEyebrow} title={t.parentsTitle}>
          {parents.some((p) => p.artifactType === "pending_input") ? (
            <Card className="text-center">
              <CardDescription className="mb-4">
                {t.parentsNeedPhotos}
              </CardDescription>
              <Link href={parentsHref}>
                <Button size="block" className="mx-auto max-w-xs">
                  {t.parentsUploadCta}
                </Button>
              </Link>
            </Card>
          ) : (
            <Card>
              {parents.map((p) => {
                const md = p.metadata as { breakdown?: string; mother_traits?: string; father_traits?: string } | null;
                if (!md) return null;
                return (
                  <div key={p.id} className="space-y-3 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                    {md.breakdown && <p>{md.breakdown}</p>}
                    {md.mother_traits && (
                      <p>
                        <span className="font-bold text-[var(--color-ink)]">{t.fromMother}</span> {md.mother_traits}
                      </p>
                    )}
                    {md.father_traits && (
                      <p>
                        <span className="font-bold text-[var(--color-ink)]">{t.fromFather}</span> {md.father_traits}
                      </p>
                    )}
                  </div>
                );
              })}
            </Card>
          )}
        </Section>
      )}

      {book.length > 0 && (
        <Section eyebrow={t.bookEyebrow} title={t.bookTitle}>
          <Card className="text-center">
            <CardDescription className="mb-4">
              {t.bookBody}
            </CardDescription>
            {book[0]?.url ? (
              <a href={book[0].url} target="_blank" rel="noopener noreferrer">
                <Button size="block" className="mx-auto max-w-xs">
                  {t.bookDownload}
                </Button>
              </a>
            ) : (
              <p className="text-xs text-[var(--color-ink-muted)]">
                {t.bookPreparing}
              </p>
            )}
          </Card>
        </Section>
      )}
    </div>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <p className="mb-1 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--color-orange)]">
        {eyebrow}
      </p>
      <h2 className="mb-4 text-center text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function ImageTile({
  src,
  label,
  aspect = "aspect-square",
}: {
  src: string | null;
  label: string;
  aspect?: string;
}) {
  return (
    <div className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-card)]">
      <div className={`${aspect} w-full overflow-hidden bg-[var(--color-bg-warm)]`}>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="h-full w-full object-cover" />
        )}
      </div>
      <p className="px-2 py-2 text-center text-xs font-semibold text-[var(--color-ink)]">
        {label}
      </p>
    </div>
  );
}
