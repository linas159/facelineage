#!/usr/bin/env node
// Generate 20 Instagram/Facebook ad images from facelineage-ad-posts.txt
// using Gemini 2.5 Flash Image ("Nano Banana").
//
// Output:
//   ad-posts-output/post-01.png ... post-20.png   (one image per post)
//   ad-posts-output/posts.csv                     (post #, caption, image file)
//
// Usage:
//   1. npm install @google/genai
//   2. node --env-file=.env.local scripts/generate-ad-images.mjs
//
// Re-run safe: existing images are skipped. Delete a file to regenerate it.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI } from "@google/genai";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const POSTS_FILE = join(ROOT, "facelineage-ad-posts.txt");
const OUT_DIR = join(ROOT, "ad-posts-output");
const CSV_FILE = join(OUT_DIR, "posts.csv");

const MODEL = "gemini-2.5-flash-image";
const CONCURRENCY = 3;        // parallel generations — Gemini rate-limit friendly
const MAX_RETRIES = 3;

const API_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
if (!API_KEY) {
  console.error(
    "Missing GOOGLE_AI_API_KEY (or GEMINI_API_KEY) in env.\n" +
    "Get one at https://aistudio.google.com/apikey and add it to .env.local,\n" +
    "then run:  node --env-file=.env.local scripts/generate-ad-images.mjs"
  );
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

// ── parse the posts file ─────────────────────────────────────────────────────
function parsePosts(text) {
  const posts = [];
  // Split on the "POST N — ..." header lines (preceded by ===)
  const blocks = text.split(/={5,}\s*\nPOST\s+(\d+)[^\n]*\n={5,}/);
  // blocks[0] is the preamble; pairs after that are [number, body, number, body, ...]
  for (let i = 1; i < blocks.length; i += 2) {
    const num = parseInt(blocks[i], 10);
    const body = blocks[i + 1] ?? "";

    const captionMatch = body.match(/CAPTION:\s*\n([\s\S]*?)\n\s*IMAGE PROMPT/);
    const promptMatch = body.match(/IMAGE PROMPT[^:]*:\s*\n([\s\S]*?)(?=\n={5,}|\nEND OF FILE|$)/);
    if (!captionMatch || !promptMatch) {
      console.warn(`Skipping post ${num} — could not parse caption/prompt`);
      continue;
    }
    posts.push({
      n: num,
      caption: captionMatch[1].trim(),
      prompt: promptMatch[1].trim(),
    });
  }
  return posts;
}

// ── Gemini image gen ─────────────────────────────────────────────────────────
async function generateImage(prompt) {
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });
  const parts = response?.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    if (p.inlineData?.data) {
      return Buffer.from(p.inlineData.data, "base64");
    }
  }
  throw new Error("No image returned in response");
}

async function generateWithRetry(post) {
  const filename = `post-${String(post.n).padStart(2, "0")}.png`;
  const outPath = join(OUT_DIR, filename);

  if (existsSync(outPath)) {
    console.log(`✓ post ${post.n}: already exists, skipping`);
    return { ...post, filename, status: "skipped" };
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`→ post ${post.n}: generating (attempt ${attempt})`);
      const buf = await generateImage(post.prompt);
      writeFileSync(outPath, buf);
      console.log(`✓ post ${post.n}: saved ${filename} (${(buf.length / 1024).toFixed(0)} KB)`);
      return { ...post, filename, status: "ok" };
    } catch (err) {
      const msg = err?.message || String(err);
      console.warn(`✗ post ${post.n} attempt ${attempt}: ${msg}`);
      if (attempt === MAX_RETRIES) {
        return { ...post, filename, status: "failed", error: msg };
      }
      // exponential backoff: 2s, 4s, 8s
      await new Promise((r) => setTimeout(r, 2 ** attempt * 1000));
    }
  }
}

// ── simple concurrency limiter ───────────────────────────────────────────────
async function runWithConcurrency(items, limit, worker) {
  const results = [];
  let cursor = 0;
  async function next() {
    while (cursor < items.length) {
      const i = cursor++;
      results[i] = await worker(items[i]);
    }
  }
  await Promise.all(Array.from({ length: limit }, next));
  return results;
}

// ── CSV writer (Meta Business Suite / spreadsheet friendly) ──────────────────
function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function writeCsv(results) {
  const header = ["post_number", "image_filename", "caption", "status"].join(",");
  const lines = [header];
  for (const r of results.sort((a, b) => a.n - b.n)) {
    lines.push([
      r.n,
      r.filename,
      csvEscape(r.caption),
      r.status,
    ].join(","));
  }
  writeFileSync(CSV_FILE, lines.join("\n") + "\n");
  console.log(`📄 wrote ${CSV_FILE}`);
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  if (!existsSync(POSTS_FILE)) {
    console.error(`Missing ${POSTS_FILE}`);
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const text = readFileSync(POSTS_FILE, "utf8");
  const posts = parsePosts(text);
  console.log(`Parsed ${posts.length} posts from facelineage-ad-posts.txt`);
  if (posts.length === 0) process.exit(1);

  const results = await runWithConcurrency(posts, CONCURRENCY, generateWithRetry);

  writeCsv(results);

  const ok = results.filter((r) => r.status === "ok").length;
  const skipped = results.filter((r) => r.status === "skipped").length;
  const failed = results.filter((r) => r.status === "failed");
  console.log(`\nDone. ${ok} generated, ${skipped} skipped, ${failed.length} failed.`);
  if (failed.length) {
    console.log("Failed posts:");
    for (const f of failed) console.log(`  post ${f.n}: ${f.error}`);
    process.exit(2);
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
