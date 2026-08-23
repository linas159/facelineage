// scripts/eval-analysis.mjs
//
// Scores how often the heritage analysis gets *checkable* facts right.
//
// Eye colour and hair colour are the only two fields a customer can verify by
// looking in a mirror, which is why they are the ones that generate refund
// emails. Ancestry percentages are unfalsifiable; these are not. So these are
// what we measure.
//
//   # 1. point it at a folder of selfies + a labels file
//   # 2. run the app with the harness route enabled
//   ANALYSIS_EVAL_ENABLED=1 npm run dev
//   # 3. score it
//   npm run eval:analysis
//   npm run eval:analysis -- --dir ./eval/faces --runs 2
//
// eval/faces/labels.json maps each filename to what is actually true:
//
//   [
//     { "file": "01.jpg", "eye_color": "blue",  "hair_color": "dark blond" },
//     { "file": "02.jpg", "eye_color": "brown", "hair_color": "black",
//       "context": { "countryHint": "GB" } }
//   ]
//
// Grading is done by a Claude judge rather than keyword matching, because the
// model writes prose ("a mid-tone hazel with a green inner ring") and a
// substring test would score that against "hazel" as a miss.

import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : fallback;
};

const BASE = flag("base", "http://localhost:3000").replace(/\/$/, "");
const DIR = path.resolve(flag("dir", "./eval/faces"));
// Repeat runs surface *instability* — the same photo scored right once and
// wrong the next time is a different problem from one scored wrong every time.
const RUNS = Number(flag("runs", "1"));

const GRADED_TRAITS = [
  { key: "eye-color", label: "eye_color", name: "Eye colour" },
  { key: "hair-color", label: "hair_color", name: "Hair colour" },
];

const JUDGE_MODEL = "claude-opus-5";

const JUDGE_TOOL = {
  name: "grade",
  description: "Record whether the description matches the ground-truth value.",
  input_schema: {
    type: "object",
    properties: {
      verdict: {
        type: "string",
        enum: ["match", "close", "miss"],
        description:
          "'match' = same colour. 'close' = adjacent shade a reasonable person would accept (dark blond vs light brown). 'miss' = a different colour.",
      },
      reason: { type: "string", description: "One short sentence." },
    },
    required: ["verdict", "reason"],
    additionalProperties: false,
  },
  strict: true,
};

const anthropic = new Anthropic();

async function judge({ traitName, truth, description }) {
  const stream = anthropic.beta.messages.stream({
    model: JUDGE_MODEL,
    max_tokens: 4000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low" },
    tools: [JUDGE_TOOL],
    tool_choice: { type: "tool", name: "grade" },
    messages: [
      {
        role: "user",
        content:
          `${traitName}.\n\nGround truth: "${truth}"\n\n` +
          `What the analysis wrote: "${description}"\n\n` +
          `Does the description identify the same colour as the ground truth? ` +
          `Judge only the colour — ignore any claims about ancestry, populations or regions. ` +
          `Call the grade tool.`,
      },
    ],
  });
  const resp = await stream.finalMessage();
  const use = resp.content.find((b) => b.type === "tool_use");
  if (!use) return { verdict: "miss", reason: "judge returned no verdict" };
  return use.input;
}

async function analyze(entry) {
  const file = path.join(DIR, entry.file);
  const ext = path.extname(file).toLowerCase();
  const mediaType =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

  const res = await fetch(`${BASE}/api/dev/analysis-eval`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      imageBase64: fs.readFileSync(file).toString("base64"),
      mediaType,
      context: entry.context ?? {},
    }),
  });

  if (res.status === 404) {
    throw new Error(
      `${BASE}/api/dev/analysis-eval returned 404 — start the app with ANALYSIS_EVAL_ENABLED=1`,
    );
  }
  if (!res.ok) throw new Error(`Harness returned HTTP ${res.status}`);
  return res.json();
}

function loadLabels() {
  const labelsPath = path.join(DIR, "labels.json");
  if (!fs.existsSync(labelsPath)) {
    console.error(`No labels file at ${labelsPath}`);
    console.error(
      `Create it as a JSON array of { "file", "eye_color", "hair_color" } — see the header of this script.`,
    );
    process.exit(1);
  }
  const labels = JSON.parse(fs.readFileSync(labelsPath, "utf8"));
  const missing = labels.filter((l) => !fs.existsSync(path.join(DIR, l.file)));
  if (missing.length) {
    console.error(`Missing image files: ${missing.map((m) => m.file).join(", ")}`);
    process.exit(1);
  }
  return labels;
}

const MARK = { match: "✓", close: "~", miss: "✗" };

async function main() {
  const labels = loadLabels();
  console.log(
    `Scoring ${labels.length} photo(s) × ${RUNS} run(s) against ${BASE}\n`,
  );

  const tally = Object.fromEntries(
    GRADED_TRAITS.map((t) => [t.key, { match: 0, close: 0, miss: 0 }]),
  );
  const errors = [];
  const latencies = [];

  for (const entry of labels) {
    for (let run = 1; run <= RUNS; run++) {
      const tag = RUNS > 1 ? `${entry.file} (run ${run})` : entry.file;
      let out;
      try {
        out = await analyze(entry);
      } catch (err) {
        console.log(`  ${tag.padEnd(28)} ERROR  ${err.message}`);
        errors.push({ file: tag, error: err.message });
        continue;
      }

      if (!out.ok) {
        console.log(`  ${tag.padEnd(28)} FAILED ${out.error}`);
        errors.push({ file: tag, error: out.error });
        continue;
      }

      latencies.push(out.elapsedMs);
      const traits = out.result.facial_traits ?? [];
      const marks = [];

      for (const trait of GRADED_TRAITS) {
        const truth = entry[trait.label];
        if (!truth) continue;
        const written = traits.find((t) => t.key === trait.key)?.description;
        if (!written) {
          tally[trait.key].miss++;
          marks.push(`${trait.name}: ✗ (field absent)`);
          continue;
        }
        const { verdict, reason } = await judge({
          traitName: trait.name,
          truth,
          description: written,
        });
        tally[trait.key][verdict]++;
        marks.push(`${trait.name}: ${MARK[verdict]} ${verdict === "match" ? "" : reason}`);
      }

      console.log(
        `  ${tag.padEnd(28)} ${String(Math.round(out.elapsedMs / 1000)).padStart(3)}s  ${marks.join("  |  ")}`,
      );
    }
  }

  console.log(`\n${"─".repeat(72)}`);
  for (const trait of GRADED_TRAITS) {
    const t = tally[trait.key];
    const total = t.match + t.close + t.miss;
    if (!total) continue;
    // `close` counts toward acceptable: "dark blond" vs "light brown" does not
    // generate a complaint, and holding the bar at exact-match would hide the
    // difference between a real regression and vocabulary drift.
    const pct = (n) => `${((n / total) * 100).toFixed(0)}%`;
    console.log(
      `${trait.name.padEnd(14)} ${pct(t.match + t.close).padStart(4)} acceptable  ` +
        `(${t.match} exact, ${t.close} close, ${t.miss} wrong of ${total})`,
    );
  }

  if (latencies.length) {
    const sorted = [...latencies].sort((a, b) => a - b);
    const p50 = sorted[Math.floor(sorted.length * 0.5)];
    const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
    console.log(
      `\nLatency        p50 ${Math.round(p50 / 1000)}s   p95 ${Math.round(p95 / 1000)}s   ` +
        `(Vercel ceiling is 300s)`,
    );
  }

  const attempted = labels.length * RUNS;
  console.log(
    `Completed      ${attempted - errors.length}/${attempted}` +
      (errors.length ? `  — ${errors.length} failed to produce a report` : "  — no failures"),
  );

  // A photo that never produced a report is the failure that matters most:
  // an inaccurate report is a complaint, a missing one is a refund.
  if (errors.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
