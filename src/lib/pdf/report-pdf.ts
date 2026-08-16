import "server-only";
import {
  PDFDocument,
  PDFFont,
  PDFImage,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";
import type { ReportData } from "@/lib/report-loader";

/**
 * Renders a finished report as a real, downloadable PDF.
 *
 * Deliberately dependency-light: pdf-lib is pure JS (no headless Chrome, no
 * native binaries), so this runs inside an ordinary Node function in a few
 * hundred milliseconds. The trade-off is that layout is hand-rolled — hence
 * the small flow engine below, which keeps a cursor and breaks the page when
 * the next block no longer fits.
 *
 * The only bitmap pulled in is the ancestor portrait. Everything else is
 * drawn (bars, rules, the cover band), which keeps the file small and means a
 * slow or expired image URL degrades to a portrait-less PDF rather than a
 * failed download.
 */

const PAGE = { w: 595.28, h: 841.89 }; // A4 portrait, in points
const MARGIN = 54;
const CONTENT_W = PAGE.w - MARGIN * 2;
const BOTTOM_LIMIT = MARGIN + 24; // leaves room for the footer

function hex(value: string | undefined, fallback?: RGB): RGB {
  const m = /^#?([0-9a-f]{6})$/i.exec(value?.trim() ?? "");
  if (!m) return fallback ?? rgb(0, 0, 0);
  const n = parseInt(m[1], 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

// Brand palette, mirrored from globals.css. (The CSS vars are still named
// "orange" for historical reasons; the brand colour is violet.)
const VIOLET = hex("#7c5cff");
const VIOLET_DEEP = hex("#6b46c1");
const PALE = hex("#e9e0fc");
const INK = hex("#2a2540");
const INK_SOFT = hex("#4f4660");
const INK_MUTED = hex("#847ba0");
const LINE = hex("#e6e1f5");
const GREEN = hex("#10b981");
const WHITE = rgb(1, 1, 1);

export type BuildPdfOptions = {
  /** Printed on the cover so a re-download years later still dates itself. */
  generatedAt?: Date;
};

export async function buildReportPdf(
  report: ReportData,
  { generatedAt = new Date() }: BuildPdfOptions = {},
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Facelineage - Heritage Report");
  pdf.setAuthor("Facelineage");
  pdf.setSubject("Facial heritage analysis");
  pdf.setCreator("Facelineage");

  const fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };

  const doc = new Flow(pdf, fonts);
  const portrait = await embedRemoteImage(pdf, report.ancestor?.imageSrc);

  drawCover(doc, report, generatedAt, portrait);
  drawConclusion(doc, report);
  drawEthnicity(doc, report);
  drawTraits(doc, report);
  drawAncestor(doc, report, portrait);
  drawCulture(doc, report);
  drawStory(doc, report);
  drawScore(doc, report);

  doc.finish();
  return pdf.save();
}

// ────────────────────────────────────────────────────────────────────────────
// Sections
// ────────────────────────────────────────────────────────────────────────────

function drawCover(doc: Flow, report: ReportData, when: Date, portrait: PDFImage | null) {
  const bandH = 320;
  doc.page.drawRectangle({
    x: 0,
    y: PAGE.h - bandH,
    width: PAGE.w,
    height: bandH,
    color: VIOLET,
  });

  doc.y = PAGE.h - 62;
  doc.tracked("FACELINEAGE", { size: 12, font: doc.fonts.bold, color: WHITE, tracking: 3.2 });

  doc.y = PAGE.h - 132;
  doc.text("Your heritage", { size: 38, font: doc.fonts.bold, color: WHITE, lineGap: 1.15 });
  doc.text("report", { size: 38, font: doc.fonts.bold, color: WHITE, lineGap: 1.15 });
  doc.gap(16);
  doc.text("The story written into your features — read from a single photograph.", {
    size: 11.5,
    color: WHITE,
    maxWidth: CONTENT_W - 190,
  });

  // Portrait medallion, sitting on the edge of the band. The white frame is
  // sized to the fitted image so portraits of any aspect ratio look framed
  // rather than letterboxed.
  let anchor = PAGE.h - bandH - 56;
  if (portrait) {
    const fit = containFit(portrait, 150, 188);
    const x = PAGE.w - MARGIN - fit.width;
    const y = PAGE.h - bandH - fit.height / 2;
    doc.page.drawRectangle({
      x: x - 7,
      y: y - 7,
      width: fit.width + 14,
      height: fit.height + 14,
      color: WHITE,
    });
    doc.page.drawImage(portrait, { x, y, width: fit.width, height: fit.height });
    anchor = y - 36;
  }

  doc.y = anchor;
  doc.rule();
  doc.gap(24);

  const top = report.regions[0];
  if (top) {
    doc.label("Strongest signal");
    doc.text(`${top.name} — ${fmtPct(top.pct)}`, { size: 20, font: doc.fonts.bold, color: INK });
    doc.gap(16);
  }

  doc.label("Facial uniqueness");
  doc.text(`${report.uniquenessScore}/100`, { size: 20, font: doc.fonts.bold, color: GREEN });
  doc.gap(16);

  doc.label("Prepared");
  doc.text(
    when.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    { size: 11.5, color: INK_SOFT },
  );
}

function drawConclusion(doc: Flow, report: ReportData) {
  // Unconditional break: the cover owns page 1 on its own, and the ethnicity
  // section below continues on this page whether or not there's a conclusion.
  doc.newPage();
  if (!report.conclusion) return;
  doc.heading("Your heritage at a glance", "Conclusion");
  doc.panel(report.conclusion);
  doc.gap(28);
}

function drawEthnicity(doc: Flow, report: ReportData) {
  if (report.regions.length === 0) return;
  doc.heading("Where your features come from", "Ethnicity breakdown");

  for (const region of report.regions) {
    // Name, bar and blurb read as one unit — keep them on the same page.
    doc.ensure(76);
    doc.text(region.name, { size: 13, font: doc.fonts.bold, color: INK });
    doc.gap(6);
    doc.bar(region.pct, hex(region.color, VIOLET));
    doc.gap(8);
    if (region.blurb) doc.text(region.blurb, { size: 9.5, color: INK_MUTED, lineGap: 1.35 });

    const countries = (region.countries ?? []).slice(0, 6);
    if (countries.length > 0) {
      doc.gap(5);
      doc.text(countries.map((c) => `${c.name} ${fmtPct(c.pct)}`).join("  ·  "), {
        size: 8.5,
        color: INK_MUTED,
      });
    }
    doc.gap(16);
  }
}

function drawTraits(doc: Flow, report: ReportData) {
  if (report.facialTraits.length === 0) return;
  doc.newPage();
  doc.heading("Six features, six clues", "Facial traits");

  for (const trait of report.facialTraits) {
    doc.ensure(72);
    doc.text(trait.name, { size: 13, font: doc.fonts.bold, color: INK });
    if (trait.supportingRegions?.length) {
      doc.gap(4);
      doc.tracked(trait.supportingRegions.map((r) => r.toUpperCase()).join(" · "), {
        size: 8.5,
        font: doc.fonts.bold,
        color: VIOLET_DEEP,
        tracking: 0.8,
      });
    }
    doc.gap(6);
    doc.text(trait.description, { size: 10.5, color: INK_SOFT });
    doc.gap(18);
  }
}

function drawAncestor(doc: Flow, report: ReportData, portrait: PDFImage | null) {
  const a = report.ancestor;
  if (!a?.name) return;
  doc.newPage();
  doc.heading("A face from your line", "Your ancestor");
  if (portrait) doc.image(portrait, 330);

  doc.text(a.name, { size: 20, font: doc.fonts.bold, color: INK });
  doc.gap(6);
  doc.tracked([a.era, a.place].filter(Boolean).join("  ·  "), {
    size: 9.5,
    font: doc.fonts.bold,
    color: VIOLET_DEEP,
    tracking: 1.1,
  });
  doc.gap(12);
  if (a.description) doc.text(a.description, { size: 10.5, color: INK_SOFT });
}

function drawCulture(doc: Flow, report: ReportData) {
  if (report.culturalInsights.length === 0) return;
  doc.newPage();
  doc.heading("Where your face feels at home", "Cultural insights");

  for (const insight of report.culturalInsights) {
    doc.ensure(72);
    doc.text(insight.name, { size: 13, font: doc.fonts.bold, color: INK });
    doc.gap(6);
    doc.text(insight.description, { size: 10.5, color: INK_SOFT });
    doc.gap(18);
  }
}

function drawStory(doc: Flow, report: ReportData) {
  if (!report.heritageStory) return;
  doc.newPage();
  doc.heading("Your heritage story", "Narrative");

  for (const para of report.heritageStory.split(/\n{2,}/)) {
    const trimmed = para.trim();
    if (!trimmed) continue;
    doc.text(trimmed, { size: 11, color: INK_SOFT, lineGap: 1.55 });
    doc.gap(12);
  }
}

function drawScore(doc: Flow, report: ReportData) {
  doc.ensure(170);
  doc.gap(20);
  doc.rule();
  doc.gap(26);
  doc.label("Facial uniqueness score");
  doc.text(`${report.uniquenessScore}/100`, { size: 44, font: doc.fonts.bold, color: GREEN });
  doc.gap(10);
  doc.text(
    `Your combination of features is rarer than ${report.uniquenessScore}% of the analyses we have run.`,
    { size: 10.5, color: INK_SOFT },
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Flow engine — a cursor that knows how to break pages
// ────────────────────────────────────────────────────────────────────────────

type Fonts = { regular: PDFFont; bold: PDFFont };

type TextOptions = {
  size?: number;
  font?: PDFFont;
  color?: RGB;
  /** Multiple of the font size used as the line box height. */
  lineGap?: number;
  maxWidth?: number;
};

class Flow {
  page: PDFPage;
  y: number;
  private readonly pages: PDFPage[] = [];

  constructor(
    private pdf: PDFDocument,
    readonly fonts: Fonts,
  ) {
    this.page = this.addPage();
    this.y = PAGE.h - MARGIN;
  }

  private addPage(): PDFPage {
    const page = this.pdf.addPage([PAGE.w, PAGE.h]);
    this.pages.push(page);
    return page;
  }

  newPage(): void {
    this.page = this.addPage();
    this.y = PAGE.h - MARGIN;
  }

  /** Break to a new page unless `height` still fits below the cursor. */
  ensure(height: number): void {
    if (this.y - height < BOTTOM_LIMIT) this.newPage();
  }

  gap(h: number): void {
    this.y -= h;
  }

  text(raw: string, opts: TextOptions = {}): void {
    const {
      size = 11,
      font = this.fonts.regular,
      color = INK_SOFT,
      lineGap = 1.45,
      maxWidth = CONTENT_W,
    } = opts;

    const lineHeight = size * lineGap;
    for (const line of wrap(sanitize(raw), font, size, maxWidth)) {
      this.ensure(lineHeight);
      this.y -= lineHeight;
      this.page.drawText(line, { x: MARGIN, y: this.y + lineHeight * 0.25, size, font, color });
    }
  }

  /**
   * Letter-spaced single line. pdf-lib has no tracking option, so the glyphs
   * are placed one at a time — fine for the short all-caps labels that need
   * it, not something to run over body copy.
   */
  tracked(
    raw: string,
    { size = 9, font = this.fonts.bold, color = VIOLET, tracking = 1.5 }: TextOptions & { tracking?: number },
  ): void {
    const line = sanitize(raw).replace(/\s+/g, " ").trim();
    if (!line) return;
    const lineHeight = size * 1.45;
    this.ensure(lineHeight);
    this.y -= lineHeight;

    let x = MARGIN;
    for (const ch of line) {
      this.page.drawText(ch, { x, y: this.y + lineHeight * 0.25, size, font, color });
      x += font.widthOfTextAtSize(ch, size) + tracking;
    }
  }

  /** Small violet all-caps eyebrow, matching the on-screen report. */
  label(text: string): void {
    this.tracked(text.toUpperCase(), { size: 8.5, font: this.fonts.bold, color: VIOLET, tracking: 1.4 });
    this.gap(5);
  }

  heading(title: string, eyebrow?: string): void {
    this.ensure(76);
    if (eyebrow) this.label(eyebrow);
    this.text(title, { size: 22, font: this.fonts.bold, color: INK, lineGap: 1.2 });
    this.gap(14);
  }

  rule(): void {
    this.ensure(2);
    this.page.drawRectangle({ x: MARGIN, y: this.y, width: CONTENT_W, height: 1, color: LINE });
  }

  /** A pale slab of body copy — the PDF echo of the on-screen card. */
  panel(body: string): void {
    const size = 11;
    const lineHeight = size * 1.5;
    const lines = wrap(sanitize(body), this.fonts.regular, size, CONTENT_W - 40);
    const boxH = lines.length * lineHeight + 36;
    this.ensure(boxH);

    this.page.drawRectangle({
      x: MARGIN,
      y: this.y - boxH,
      width: CONTENT_W,
      height: boxH,
      color: PALE,
    });

    let cursor = this.y - 26;
    for (const line of lines) {
      this.page.drawText(line, {
        x: MARGIN + 20,
        y: cursor,
        size,
        font: this.fonts.regular,
        color: INK,
      });
      cursor -= lineHeight;
    }
    this.y -= boxH;
  }

  /** Horizontal percentage bar with the value printed at the right. */
  bar(pct: number, color: RGB): void {
    const h = 12;
    const labelW = 54;
    const trackW = CONTENT_W - labelW;
    this.ensure(h + 4);
    this.y -= h;

    this.page.drawRectangle({ x: MARGIN, y: this.y, width: trackW, height: h, color: LINE });
    const filled = Math.max(2, (clamp(pct, 0, 100) / 100) * trackW);
    this.page.drawRectangle({ x: MARGIN, y: this.y, width: filled, height: h, color });
    this.page.drawText(fmtPct(pct), {
      x: MARGIN + trackW + 10,
      y: this.y + 3,
      size: 10,
      font: this.fonts.bold,
      color: INK,
    });
  }

  /** Full-width image, contained inside `maxHeight` and centred. */
  image(img: PDFImage, maxHeight: number): void {
    const fit = containFit(img, CONTENT_W, maxHeight);
    this.ensure(fit.height + 18);
    this.y -= fit.height;
    this.page.drawImage(img, {
      x: MARGIN + fit.dx,
      y: this.y,
      width: fit.width,
      height: fit.height,
    });
    this.gap(18);
  }

  /** Stamp the footer on every page, once the page count is known. */
  finish(): void {
    this.pages.forEach((page, i) => {
      page.drawText("Facelineage - your heritage report", {
        x: MARGIN,
        y: MARGIN - 24,
        size: 8,
        font: this.fonts.regular,
        color: INK_MUTED,
      });
      const label = `${i + 1} / ${this.pages.length}`;
      const w = this.fonts.regular.widthOfTextAtSize(label, 8);
      page.drawText(label, {
        x: PAGE.w - MARGIN - w,
        y: MARGIN - 24,
        size: 8,
        font: this.fonts.regular,
        color: INK_MUTED,
      });
    });
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const width = (s: string) => font.widthOfTextAtSize(s, size);
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (width(candidate) <= maxWidth) {
        line = candidate;
        continue;
      }
      if (line) lines.push(line);
      if (width(word) > maxWidth) {
        // A single word wider than the column (a long URL, say) is broken by
        // character so it can't run off the page.
        let chunk = "";
        for (const ch of word) {
          if (chunk && width(chunk + ch) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        line = chunk;
      } else {
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.length > 0 ? lines : [""];
}

/**
 * The 14 standard PDF fonts are WinAnsi-encoded and pdf-lib throws on any
 * character it can't encode. Model output is full of smart quotes, dashes and
 * ellipses, so fold those to ASCII and drop anything else outside Latin-1
 * rather than failing the whole download.
 */
const SUBSTITUTIONS: Record<string, string> = {
  "‘": "'", "’": "'", "‚": ",", "‛": "'",
  "“": '"', "”": '"', "„": '"',
  "–": "-", "—": "-", "―": "-", "−": "-",
  "…": "...", "•": "-", "→": "->",
  "′": "'", "″": '"', "‹": "<", "›": ">",
  " ": " ", " ": " ", " ": " ", "​": "",
  "™": "(TM)",
};

function sanitize(text: string): string {
  let out = "";
  for (const ch of text ?? "") {
    const sub = SUBSTITUTIONS[ch];
    if (sub !== undefined) {
      out += sub;
      continue;
    }
    const code = ch.codePointAt(0)!;
    if (ch === "\n" || (code >= 0x20 && code <= 0x7e) || (code >= 0xa0 && code <= 0xff)) {
      out += ch;
    }
    // Everything else (emoji, CJK, combining marks) is dropped.
  }
  return out;
}

/** Scale an image to fit inside a box without cropping, centred in it. */
function containFit(image: PDFImage, boxW: number, boxH: number) {
  const scale = Math.min(boxW / image.width, boxH / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { width, height, dx: (boxW - width) / 2, dy: (boxH - height) / 2 };
}

async function embedRemoteImage(pdf: PDFDocument, url?: string): Promise<PDFImage | null> {
  if (!url || !/^https?:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const bytes = new Uint8Array(await res.arrayBuffer());
    // Sniff the container rather than trusting the URL — the pipeline writes
    // PNG today, but a signed URL carries no reliable hint.
    const isPng =
      bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
    return isPng ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch (err) {
    console.warn(
      `[report-pdf] portrait embed skipped: ${err instanceof Error ? err.message : String(err)}`,
    );
    return null;
  }
}

function fmtPct(pct: number): string {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "";
  return `${n >= 10 ? n.toFixed(1) : n.toFixed(2)}%`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}
