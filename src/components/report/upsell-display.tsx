import Link from "next/link";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { UpsellArtifact, UpsellSku } from "@/lib/report-loader";

interface Props {
  analysisId: string;
  upsells: Partial<Record<UpsellSku, UpsellArtifact[]>>;
  upsellsGenerating: UpsellSku[];
}

const ETHNICITY_LABEL: Record<string, string> = {
  "east-asia": "Han Chinese",
  "west-africa": "Yoruba",
  "northern-europe": "Sami",
  "south-asia": "Bengali",
  andes: "Quechua",
};

const AGES_LABEL: Record<string, string> = {
  "ancient-rome": "Ancient Rome",
  "tang-china": "Tang China",
  "viking-age": "Viking Age",
  "medieval-europe": "Medieval Europe",
  "edo-japan": "Edo Japan",
  "ottoman-empire": "Ottoman Empire",
  "victorian-era": "Victorian Era",
  "1920s-modern": "1920s",
};

export function UpsellDisplay({ analysisId, upsells, upsellsGenerating }: Props) {
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
          <CardTitle className="mb-1">Your add-ons are generating</CardTitle>
          <CardDescription>
            Hang tight — this usually takes under a minute. The page will refresh when they&apos;re ready.
          </CardDescription>
        </Card>
      )}

      {ethnicity.length > 0 && (
        <Section
          eyebrow="Heritage Mirror"
          title="Your face across cultures"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {ethnicity.map((a) => (
              <ImageTile
                key={a.id}
                src={a.url}
                label={ETHNICITY_LABEL[a.variant ?? ""] ?? a.variant ?? "Variation"}
              />
            ))}
          </div>
        </Section>
      )}

      {ages.length > 0 && (
        <Section
          eyebrow="Through The Ages"
          title="You, across history"
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ages.map((a) => (
              <ImageTile
                key={a.id}
                src={a.url}
                label={AGES_LABEL[a.variant ?? ""] ?? a.variant ?? "Era"}
                aspect="aspect-[3/4]"
              />
            ))}
          </div>
        </Section>
      )}

      {partner.length > 0 && (
        <Section eyebrow="Future Partner" title="The face that balances yours">
          <Card className="overflow-hidden !p-0">
            {partner[0]?.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={partner[0].url}
                alt="Future partner"
                className="block aspect-[4/5] w-full object-cover"
              />
            )}
          </Card>
        </Section>
      )}

      {parents.length > 0 && (
        <Section eyebrow="Parents Comparison" title="What each parent gave you">
          {parents.some((p) => p.artifactType === "pending_input") ? (
            <Card className="text-center">
              <CardDescription className="mb-4">
                We need a photo of each parent to run the comparison. Takes 30 seconds.
              </CardDescription>
              <Link href={`/upsell/parents?analysis=${analysisId}`}>
                <Button size="block" className="mx-auto max-w-xs">
                  Upload parents&apos; photos
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
                        <span className="font-bold text-[var(--color-ink)]">From your mother:</span> {md.mother_traits}
                      </p>
                    )}
                    {md.father_traits && (
                      <p>
                        <span className="font-bold text-[var(--color-ink)]">From your father:</span> {md.father_traits}
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
        <Section eyebrow="Heritage Guidebook" title="Your ancestry research companion">
          <Card className="text-center">
            <CardDescription className="mb-4">
              Methods, tools, and frameworks for taking your heritage discovery further — printable PDF, yours forever.
            </CardDescription>
            {book[0]?.url ? (
              <a href={book[0].url} target="_blank" rel="noopener noreferrer">
                <Button size="block" className="mx-auto max-w-xs">
                  Download guidebook (PDF)
                </Button>
              </a>
            ) : (
              <p className="text-xs text-[var(--color-ink-muted)]">
                Your guidebook is being prepared. Check back shortly.
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
