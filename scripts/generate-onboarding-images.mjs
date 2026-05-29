#!/usr/bin/env node
// Generate the 3 onboarding-carousel hero visuals with Gemini 2.5 Flash Image
// ("Nano Banana"). Composition mirrors the competitor's onboarding slides, but
// recolored to Facelineage's lavender/violet brand palette.
//
// Output: public/onboarding/slide-1.png … slide-3.png  (1:1, ~square)
//
// Usage:
//   node --env-file=.env.local scripts/generate-onboarding-images.mjs
//
// Re-run safe: existing images are skipped. Delete a file to regenerate it.

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "public", "onboarding");

const MODEL = "gemini-2.5-flash-image";
const MAX_RETRIES = 3;

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error(
    "Missing GOOGLE_AI_API_KEY (or GEMINI_API_KEY) in env.\n" +
      "Add it to .env.local, then run:\n" +
      "  node --env-file=.env.local scripts/generate-onboarding-images.mjs",
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// Shared style spec — keeps the three slides visually consistent and on-brand.
// We deliberately avoid baked-in WORDS (the app is multilingual; headlines are
// real translated HTML). Decorative chips use flag circles, pie/donut charts,
// and plain percentage numbers only — which stay language-neutral.
const STYLE = `
STYLE: flat, modern, friendly vector illustration — soft gradients, gentle
rounded shapes, smooth clean lines, warm approachable characters with simple
facial features and rosy cheeks (Duolingo / onboarding-app aesthetic).
PALETTE: electric violet #7c5cff as the hero color, soft lavender #e9e0fc and
#b39ddb supporting tones, mint #10b981, amber #fbbf24 and coral #f97373 as
small accents. BACKGROUND: a solid soft lavender field (#f4f0fc) edge to edge,
optionally with a faint lighter lavender rounded panel behind the subject — no
hard rectangular borders, no drop-shadow frame around the whole image.
Floating UI chips are clean white rounded-rectangle pills with soft shadows.
Square 1:1 composition, subject centered.
`.trim();

const SLIDES = [
  {
    n: 1,
    prompt: `
A friendly illustrated young woman with violet/blue hair, smiling, facing
forward from the chest up, centered. A delicate glowing face-scan mesh of thin
light lines and small nodes is overlaid on her face (face-recognition look),
and thin violet corner brackets frame her like a camera viewfinder.

Around her float FOUR fairly LARGE white rounded pill chips (generous size,
clearly readable, two on the left, two on the right). Each chip contains, side
by side: a small CIRCULAR national flag on the left, then a short bold label of
a percentage + nationality. The four chips MUST use four DIFFERENT countries
with four visually DISTINCT flags — do not repeat any flag or country. Use
exactly these four, each flag drawn accurately:
  • Romania flag = THREE EQUAL VERTICAL bands, left BLUE, middle YELLOW,
    right RED (like France but blue-yellow-red). Chip text: "38% Romanian"
  • India flag = three HORIZONTAL bands (saffron top, white middle with a navy
    blue 24-spoke wheel, green bottom). Chip text: "32% Indian"
  • Brazil flag = green field with a yellow diamond and a blue globe in the
    center. Chip text: "22% Brazilian"
  • Thailand flag = five HORIZONTAL bands red, white, BLUE (thick center band),
    white, red. Chip text: "8% Thai"
Render the chip text large, crisp and perfectly legible. Spell each word
EXACTLY and correctly: "Romanian", "Indian", "Brazilian", "Thai". Double check
there are no misspellings and no doubled letters. ("Vietnamese" is avoided on
purpose — the model misspells it consistently; "Thai" renders reliably.)

A small colorful pie/donut chart (violet, mint, amber, coral slices) sits near
the center-bottom. The whole scene reads as "AI analyzing a face to reveal a
heritage breakdown".
${STYLE}`.trim(),
  },
  {
    n: 2,
    prompt: `
A 2x2 grid of four friendly illustrated portraits of warm, smiling people from
different world cultures, each from the shoulders up, wearing simple culturally
inspired traditional clothing in tasteful flat-illustration form (for example:
South Asian, East Asian, West African, and Eastern European looks). The four
portraits sit over a faint lavender silhouette of a world globe. Each portrait
has a small white rounded pill chip near it containing only a tiny circular
country flag. Keep these chips text-free (flag only) — no words. The scene
reads as "the same person reimagined across different cultures".
${STYLE}`.trim(),
  },
  {
    n: 3,
    prompt: `
A friendly illustrated young woman with violet/blue hair, smiling, centered and
highlighted inside a soft glowing amber/violet circular halo, standing out
brightly from a crowd of many muted, faceless silhouette people behind her
rendered in soft lavender, violet, mint and coral tones. Above her head floats
a white rounded pill chip containing a small green donut/pie chart and the
number "92%" (this is the ONLY chip with text). A few more small white rounded
pill chips float around her at lower opacity — leave those blank, no text
inside. The scene reads as "one unique face compared against the whole world".
${STYLE}`.trim(),
  },
];

async function generateImage(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p.inlineData?.data) return Buffer.from(p.inlineData.data, "base64");
  }
  throw new Error("No image returned in response");
}

async function generateWithRetry(slide) {
  const filename = `slide-${slide.n}.png`;
  const outPath = join(OUT_DIR, filename);
  if (existsSync(outPath)) {
    console.log(`✓ slide ${slide.n}: already exists, skipping`);
    return;
  }
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`→ slide ${slide.n}: generating (attempt ${attempt})`);
      const buf = await generateImage(slide.prompt);
      writeFileSync(outPath, buf);
      console.log(
        `✓ slide ${slide.n}: saved ${filename} (${(buf.length / 1024).toFixed(0)} KB)`,
      );
      return;
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn(`✗ slide ${slide.n} attempt ${attempt}: ${msg}`);
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  for (const slide of SLIDES) {
    await generateWithRetry(slide);
  }
  console.log("\nDone. Onboarding visuals are in public/onboarding/.");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
