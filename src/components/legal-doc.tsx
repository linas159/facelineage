import "server-only";
import Link from "next/link";
import { getLocale, localized } from "@/lib/i18n/server";
import { LegalShell } from "@/components/legal-shell";
import type { Locale } from "@/lib/i18n/config";
import type { LegalBlock, LegalDoc, LegalUi } from "@/lib/i18n/legal/types";

/**
 * Renders the inline-markdown subset documented in `legal/types.ts`:
 * `**bold**` and `[label](href)`. Internal hrefs (starting with `/`) are run
 * through `localized()` so a reader in /pl stays in /pl when they follow a
 * link; mailto/http links are left untouched.
 */
function Inline({ text, locale }: { text: string; locale: Locale }) {
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\(([^)]+)\)/g;
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={key++}>{m[1]}</strong>);
    } else {
      const label = m[2];
      const href = m[3];
      if (href.startsWith("/")) {
        nodes.push(
          <Link
            key={key++}
            href={localized(href, locale)}
            className="font-semibold text-[var(--color-orange)] hover:underline"
          >
            {label}
          </Link>,
        );
      } else {
        const external = href.startsWith("http");
        nodes.push(
          <a
            key={key++}
            href={href}
            {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="font-semibold text-[var(--color-orange)] hover:underline"
          >
            {label}
          </a>,
        );
      }
    }
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

function Block({ block, locale }: { block: LegalBlock; locale: Locale }) {
  switch (block.kind) {
    case "h":
      return <h2>{block.text}</h2>;
    case "h3":
      return <h3>{block.text}</h3>;
    case "p":
      return (
        <p>
          <Inline text={block.text} locale={locale} />
        </p>
      );
    case "ul":
      return (
        <ul>
          {block.items.map((item, i) => (
            <li key={i}>
              <Inline text={item} locale={locale} />
            </li>
          ))}
        </ul>
      );
    case "note":
      return (
        <p className="rounded-lg border border-[var(--color-line)] bg-white/60 px-4 py-3 text-[var(--color-ink)]">
          <Inline text={block.text} locale={locale} />
        </p>
      );
  }
}

/**
 * Server component that renders a full localized legal document inside the
 * shared LegalShell chrome. The page files just pick the right `doc` for the
 * current locale and hand it here.
 */
export async function LegalDocPage({
  doc,
  ui,
}: {
  doc: LegalDoc;
  ui: LegalUi;
}) {
  const locale = await getLocale();
  return (
    <LegalShell
      title={doc.title}
      lastUpdated={doc.lastUpdated}
      homeHref={localized("/", locale)}
      ui={ui}
    >
      {doc.blocks.map((block, i) => (
        <Block key={i} block={block} locale={locale} />
      ))}
    </LegalShell>
  );
}
