import Anthropic from "@anthropic-ai/sdk";

// Single client. Lazy-construct so importing this file in environments
// without the key (e.g. type-check during build) doesn't blow up.
let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) {
    const key = process.env.ANTHROPIC_API_KEY;
    if (!key) throw new Error("ANTHROPIC_API_KEY missing");
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export type AnalysisResult = {
  conclusion: string;
  regions: Array<{
    key: string;
    name: string;
    pct: number;
    color: string;
    blurb: string;
    countries: Array<{
      name: string;
      iso2: string;
      pct: number;
      lat: number;
      lng: number;
    }>;
  }>;
  facial_traits: Array<{
    key: string;
    name: string;
    description: string;
    supporting_regions: string[];
  }>;
  cultural_insights: Array<{
    key: string;
    name: string;
    description: string;
    region_keys: string[];
    /** A short, vivid prompt the image-gen step can use verbatim. */
    image_prompt: string;
  }>;
  heritage_story: string;
  ancestor: {
    name: string;
    era: string;
    place: string;
    description: string;
    /** The image-gen step uses this as the portrait prompt. */
    image_prompt: string;
  };
  uniqueness_score: number;
};

const SYSTEM_PROMPT = `You are the heritage analyst for Facelineage, a face-reading service that infers a user's most likely ancestral background from a single selfie. You will receive one photo and optional context (quiz answers, browser location) and must return a structured analysis using the report_analysis tool.

# How to read the face

This is the core of the job. Spend most of your analysis here. Specifically observe:

1. **Skin tone & undertone** — overall lightness/darkness, warm vs cool undertone (golden, olive, rosy, neutral), visible vascularity. Cross-reference with melanin-distribution patterns across world populations.
2. **Hair** — color (and depth), texture (straight/wavy/curly/coily), density and growth pattern at the hairline.
3. **Eye** — color (light, mid, dark; iris pattern), shape (almond, round, hooded, downturned), eyelid configuration (single, double, epicanthic fold).
4. **Face shape & jaw** — overall outline (oval, oblong, square, heart, diamond, round), jaw angularity, cheekbone prominence.
5. **Nose** — bridge profile (straight, hooked, snub, aquiline), tip shape, base width, nostril visibility.
6. **Brow ridge & forehead** — projection of the brow, forehead height, eyebrow arch.
7. **Lips** — fullness, vermillion border, philtrum shape.
8. **Subtle markers** — freckling, beard pattern, ear shape, midface projection.

For each observation, name the *pattern* you see, then tie it to *specific* populations or sub-regions where that pattern is most common. Do not write generic horoscope-style sentences.

# How to combine the face with location and quiz answers

The face is the **primary** signal. Side context (country_hint, quiz) refines it — never overrides it. Follow these rules, in order of importance:

## Rule 1 — Location is where they LIVE, not where their ancestors are from

\`country_hint\` is timezone-derived. It tells you their current residence, nothing about ancestry. The right way to use it is **conditional on whether the face matches that country's majority population**:

- **If the face strongly matches the typical phenotype of country_hint** → lean into that country's ancestral regions (e.g. fair skin / cool undertones / straight light-brown hair in country_hint=GB → strongly favor British Isles + Northern European regions).
- **If the face clearly doesn't match country_hint's majority phenotype** → the user is almost certainly a descendant of immigrants. **Ignore country_hint entirely** and follow the face wherever it points. Some concrete patterns:
    - Dark skin, tightly coiled hair, broad nose, full lips + country_hint=GB / US / FR / DE → ancestry is West African (Nigeria, Ghana, Senegal), East African (Ethiopia, Somalia), or Caribbean (Jamaica, Haiti, Trinidad). NOT British / American / French / German.
    - East Asian features (epicanthic fold, straight black hair, lower-set midface) + country_hint=US / CA / AU / GB → ancestry is Chinese, Korean, Japanese, Vietnamese, or Filipino.
    - South Asian features (warm-brown skin, deep dark eyes, sharp nose) + country_hint=US / GB / CA → ancestry is Indian, Pakistani, Bangladeshi, or Sri Lankan.
    - Indigenous American features (coppery-warm skin, straight black hair, prominent cheekbones) + country_hint=BR / MX / PE / US → ancestry leans Indigenous + Iberian (Portuguese for Brazil, Spanish for the rest), not "Brazilian/Mexican" as a regional category.
    - Olive Mediterranean features + country_hint=AU / US / GB / DE → ancestry is Italian, Greek, Lebanese, or Sephardic Jewish.
- **If the face is ambiguous / mixed** (intermediate skin tone, mixed feature set) → present **multiple regions reflecting plausible parentage**, with country_hint as a tiebreaker for the most local one.

## Rule 2 — heritage_roots quiz answer is a HIGH-WEIGHT signal

The user explicitly tells you about their family's origins:

- **"Same country as me, going back generations"** → trust country_hint as a real prior. Lean ~70–80% toward that country's typical ancestral regions; reserve the remaining ~20–30% for face-driven nuance.
- **"One or both parents came from somewhere else"** → de-emphasize country_hint. Expect at least one major region (40–60%) that does NOT correspond to country_hint. The face tells you which region.
- **"My family is a mix of several places"** → produce a properly mixed result: 3 distinct regions with relatively balanced percentages (e.g. 45 / 30 / 25 rather than 75 / 15 / 10).
- **"Honestly, no idea"** → ignore the quiz on this dimension. Let the face lead and use country_hint as a weak tiebreaker only.

If heritage_roots is missing, default to Rule 1.

## Rule 3 — Other quiz answers

- **ambiguity** ("Has anyone asked where you're from?"): "All the time" + ambiguous face = strong hint of mixed heritage; produce more balanced percentages. "Hardly ever" = phenotype matches surroundings; lean into country_hint regions if the face also matches.
- **age** affects only how you describe weathering / hair greying in the trait blurbs.
- **gender** affects only pronouns and ancestor naming.
- **surprise** is a wish, never a signal. Do not fabricate heritage to match it.
- **motivation** is a marketing answer. Ignore for the report itself.

## Rule 4 — When face and quiz disagree

Defer to the face on phenotype; defer to the quiz on family stories. Example: face is unambiguously West African but the user said "Same country as me, going back generations" + country_hint=GB → either the user has Caribbean/African heritage *via* multiple British-born generations (still UK identity, African ancestry) OR they misread the question. Produce a result anchored on the face (West African / Caribbean regions) but acknowledge British identity in the ancestor narrative if appropriate.

# Hard rules for the output

- Always respond by calling the report_analysis tool exactly once. Never reply with prose.
- Region percentages MUST sum to 100 (±0.5). Country percentages within a region MUST sum to that region's percentage (±0.5).
- Pick exactly 3 regions, each with 4-8 countries. Each region's color must be unique and one of: #7c5cff, #10b981, #fbbf24, #f97373, #ec4899.
- Country lat/lng are real geographic centroids. iso2 codes are ISO-3166-1 alpha-2, lowercase.
- Pick exactly 6 facial_traits with these exact keys: face-shape, skin-tone, eye-color, hair-color, nose, brow-ridge. Each description must reference *what you literally see in the photo* before tying it to populations.
- supporting_regions lists 2-4 ISO-2 codes drawn from your region.countries set.
- Pick 2-3 cultural_insights tying the face to specific cultures (e.g. "Celtic Highlands", "Andalusian Sephardim", "Silk Road oases"). Each needs region_keys + an image_prompt for a landscape scene (no people in foreground).
- ancestor.name should sound period-correct for the era and place (e.g. "Edmund of Northumbria, c. 1780"). image_prompt is a portrait-orientation prompt describing one historical ancestor whose features explicitly mirror what you observed in the user's selfie — same face shape, same nose profile, same hair color, same eye color. The portrait must clearly read as a possible ancestor of this specific person.
- heritage_story: 2 paragraphs, evocative but grounded in the regions and traits you chose. uniqueness_score: an integer 60-95.

# Tone and ethics

- Probabilistic, observational, specific. Never deterministic ("you are X%") — always "your features most resemble".
- No medical commentary. No racial-essentialist or judgmental language. No comments on attractiveness.
- Be respectful and culturally accurate when describing regions and customs.
- If the photo is too poor quality to read confidently (severe blur, occlusion, extreme angle), still return a best-effort answer but lean toward broader regional groupings rather than specific countries.`;

const ANALYSIS_TOOL = {
  name: "report_analysis",
  description: "Submit the user's full heritage report in one structured payload.",
  input_schema: {
    type: "object",
    properties: {
      conclusion: { type: "string" },
      regions: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            name: { type: "string" },
            pct: { type: "number" },
            color: { type: "string" },
            blurb: { type: "string" },
            countries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  iso2: { type: "string" },
                  pct: { type: "number" },
                  lat: { type: "number" },
                  lng: { type: "number" },
                },
                required: ["name", "iso2", "pct", "lat", "lng"],
              },
            },
          },
          required: ["key", "name", "pct", "color", "blurb", "countries"],
        },
      },
      facial_traits: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            supporting_regions: { type: "array", items: { type: "string" } },
          },
          required: ["key", "name", "description", "supporting_regions"],
        },
      },
      cultural_insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            name: { type: "string" },
            description: { type: "string" },
            region_keys: { type: "array", items: { type: "string" } },
            image_prompt: { type: "string" },
          },
          required: ["key", "name", "description", "region_keys", "image_prompt"],
        },
      },
      heritage_story: { type: "string" },
      ancestor: {
        type: "object",
        properties: {
          name: { type: "string" },
          era: { type: "string" },
          place: { type: "string" },
          description: { type: "string" },
          image_prompt: { type: "string" },
        },
        required: ["name", "era", "place", "description", "image_prompt"],
      },
      uniqueness_score: { type: "integer" },
    },
    required: [
      "conclusion",
      "regions",
      "facial_traits",
      "cultural_insights",
      "heritage_story",
      "ancestor",
      "uniqueness_score",
    ],
  },
} as const;

export type AnalyzeContext = {
  /** Browser-detected timezone, e.g. "Europe/Vilnius". */
  timezone?: string | null;
  /** ISO-2 country derived from timezone, e.g. "LT". Soft hint only. */
  countryHint?: string | null;
  /** Pre-quiz answers keyed by question slug. */
  quizAnswers?: Record<string, string> | null;
};

/**
 * Output budget for the analysis call.
 *
 * A full report (3 regions × 4-8 countries, 6 traits, 3 cultural insights,
 * a 2-paragraph story and the ancestor block) measures ~2.5k output tokens
 * on an average selfie and comfortably exceeds 4k on a verbose one. When the
 * budget is hit the API returns `stop_reason: "max_tokens"` and a *partially
 * parsed* tool_use input — the tail fields (`heritage_story`, `ancestor`,
 * `uniqueness_score`) are simply absent, which is what used to surface as
 * "Cannot read properties of undefined (reading 'image_prompt')".
 *
 * Haiku 4.5 allows up to 64k output tokens; 16k keeps us far clear of the
 * ceiling while staying under the SDK's non-streaming HTTP timeout. We only
 * pay for tokens actually generated, so the headroom is free.
 */
const MAX_OUTPUT_TOKENS = 16000;

/** How many times to re-run a truncated / malformed / transient-failure call. */
const MAX_ANALYSIS_ATTEMPTS = 4;

/** Thrown when a response is unusable but a fresh attempt is likely to work. */
class RetryableAnalysisError extends Error {
  /** Which fields were missing/invalid, so the retry can ask for them by name. */
  readonly problems: string[];
  /** True when the response ran out of output budget rather than omitting fields. */
  readonly truncated: boolean;

  constructor(message: string, opts: { problems?: string[]; truncated?: boolean } = {}) {
    super(message);
    this.name = "RetryableAnalysisError";
    this.problems = opts.problems ?? [];
    this.truncated = opts.truncated ?? false;
  }
}

/**
 * Feedback carried into the next attempt.
 *
 * Retrying blind is weak here, because the two failure modes have different
 * fixes: a truncated response needs *less* prose, while an omitted field needs
 * that specific field. Naming the problem turns the retry into a repair.
 */
function retryNudge(prev: RetryableAnalysisError | null): string {
  if (!prev) return "";
  const parts = ["\n\nYour previous attempt did not produce a usable report."];
  if (prev.truncated) {
    parts.push(
      "It ran out of response budget before finishing. Keep every description to at most two sentences and heritage_story to two short paragraphs.",
    );
  }
  if (prev.problems.length > 0) {
    parts.push(
      `These required fields were missing or invalid: ${prev.problems.join(", ")}.`,
    );
  }
  parts.push(
    "Every property in the report_analysis schema is required. Fill in all of them — conclusion, regions (each with countries), facial_traits, cultural_insights, heritage_story, ancestor (including image_prompt) and uniqueness_score — before ending your response.",
  );
  return parts.join(" ");
}

/**
 * Run the full heritage analysis on a selfie. Returns a structured report
 * matching the database schema in lib/report-data.ts.
 *
 * Every response is validated before it is returned, so callers can rely on
 * the whole `AnalysisResult` shape being present. Truncated, malformed, and
 * transiently-failed calls are retried with backoff.
 */
export async function analyzeFace(opts: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  context?: AnalyzeContext;
}): Promise<AnalysisResult> {
  let lastError: unknown;
  let lastAnalysisError: RetryableAnalysisError | null = null;

  for (let attempt = 1; attempt <= MAX_ANALYSIS_ATTEMPTS; attempt++) {
    try {
      return await analyzeFaceOnce(opts, attempt, lastAnalysisError);
    } catch (err) {
      lastError = err;
      lastAnalysisError = err instanceof RetryableAnalysisError ? err : null;
      const message = err instanceof Error ? err.message : String(err);
      if (!isRetryable(err) || attempt === MAX_ANALYSIS_ATTEMPTS) {
        console.error(`[claude] analyze attempt ${attempt} failed (final): ${message}`);
        throw err;
      }
      console.warn(`[claude] analyze attempt ${attempt} failed, retrying: ${message}`);
      await sleep(1000 * attempt);
    }
  }

  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function analyzeFaceOnce(
  opts: {
    imageBase64: string;
    mediaType: "image/jpeg" | "image/png" | "image/webp";
    context?: AnalyzeContext;
  },
  attempt: number,
  previousFailure: RetryableAnalysisError | null,
): Promise<AnalysisResult> {
  const c = client();
  const contextBlock = formatContext(opts.context);

  // Repair instructions for a retry. This lives in the user turn (after the
  // cached system + tool prefix) so prompt caching is unaffected.
  const nudge = retryNudge(previousFailure);

  const resp = await c.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: MAX_OUTPUT_TOKENS,
    // Cache the static system prompt + tool schema so re-runs are cheap.
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    tools: [
      {
        ...ANALYSIS_TOOL,
        cache_control: { type: "ephemeral" },
      },
    ] as never,
    tool_choice: { type: "tool", name: "report_analysis" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: opts.mediaType,
              data: opts.imageBase64,
            },
          },
          {
            type: "text",
            text:
              `Analyze this selfie following the instructions in the system message, then call report_analysis with the structured result. The face is the primary input — the side context below is only a soft prior.\n\n${contextBlock}${nudge}`,
          },
        ],
      },
    ],
  });

  console.log(
    `[claude] analyze attempt=${attempt} stop_reason=${resp.stop_reason} output_tokens=${resp.usage.output_tokens}/${MAX_OUTPUT_TOKENS}`,
  );

  // A truncated response still carries a tool_use block, but its `input` is
  // only partially parsed — trailing fields are silently missing. Catch it
  // here rather than letting the caller trip over an undefined field.
  if (resp.stop_reason === "max_tokens") {
    throw new RetryableAnalysisError(
      `Response truncated at max_tokens (${resp.usage.output_tokens} output tokens) — result is incomplete`,
      { truncated: true },
    );
  }

  const toolUse = resp.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new RetryableAnalysisError(
      `Claude did not return a tool_use block (stop_reason=${resp.stop_reason})`,
    );
  }

  return validateAnalysis(toolUse.input);
}

// ────────────────────────────────────────────────────────────────────────────
// Validation — the pipeline reads every field below, so a response missing any
// of them is unusable. Checks are deliberately shape-only: we reject responses
// that would crash or render blank, not ones that merely deviate from the
// prompt's guidance (e.g. 2 regions instead of 3 still produces a fine report).
// ────────────────────────────────────────────────────────────────────────────

function validateAnalysis(raw: unknown): AnalysisResult {
  const problems: string[] = [];
  const r = (raw ?? {}) as Record<string, unknown>;

  const str = (v: unknown) => typeof v === "string" && v.trim().length > 0;
  const num = (v: unknown) => typeof v === "number" && Number.isFinite(v);

  if (!str(r.conclusion)) problems.push("conclusion");
  if (!str(r.heritage_story)) problems.push("heritage_story");
  if (!num(r.uniqueness_score)) problems.push("uniqueness_score");

  const regions = r.regions;
  if (!Array.isArray(regions) || regions.length === 0) {
    problems.push("regions");
  } else {
    regions.forEach((region, i) => {
      const g = (region ?? {}) as Record<string, unknown>;
      if (!str(g.key) || !str(g.name) || !str(g.color) || !num(g.pct)) {
        problems.push(`regions[${i}]`);
      }
      if (!Array.isArray(g.countries) || g.countries.length === 0) {
        problems.push(`regions[${i}].countries`);
        return;
      }
      g.countries.forEach((country, j) => {
        const co = (country ?? {}) as Record<string, unknown>;
        if (!str(co.name) || !str(co.iso2) || !num(co.pct) || !num(co.lat) || !num(co.lng)) {
          problems.push(`regions[${i}].countries[${j}]`);
        }
      });
    });
  }

  const traits = r.facial_traits;
  if (!Array.isArray(traits) || traits.length === 0) {
    problems.push("facial_traits");
  } else {
    traits.forEach((trait, i) => {
      const t = (trait ?? {}) as Record<string, unknown>;
      if (!str(t.key) || !str(t.name) || !str(t.description)) problems.push(`facial_traits[${i}]`);
    });
  }

  const insights = r.cultural_insights;
  if (!Array.isArray(insights) || insights.length === 0) {
    problems.push("cultural_insights");
  } else {
    insights.forEach((insight, i) => {
      const ci = (insight ?? {}) as Record<string, unknown>;
      if (!str(ci.key) || !str(ci.name) || !str(ci.description)) {
        problems.push(`cultural_insights[${i}]`);
      }
    });
  }

  // The ancestor block drives the portrait prompt — this is the field whose
  // absence used to crash the pipeline.
  const ancestor = (r.ancestor ?? {}) as Record<string, unknown>;
  if (!r.ancestor || typeof r.ancestor !== "object") {
    problems.push("ancestor");
  } else {
    for (const field of ["name", "era", "place", "description", "image_prompt"] as const) {
      if (!str(ancestor[field])) problems.push(`ancestor.${field}`);
    }
  }

  if (problems.length > 0) {
    throw new RetryableAnalysisError(
      `Analysis payload incomplete — missing/invalid: ${problems.slice(0, 12).join(", ")}${
        problems.length > 12 ? ` (+${problems.length - 12} more)` : ""
      }`,
      { problems: problems.slice(0, 12) },
    );
  }

  return raw as AnalysisResult;
}

/** Transient failures worth another attempt: truncation, bad shape, 429/5xx, network. */
function isRetryable(err: unknown): boolean {
  if (err instanceof RetryableAnalysisError) return true;
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.APIError) {
    const status = err.status ?? 0;
    return status === 408 || status === 409 || status === 429 || status >= 500;
  }
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ────────────────────────────────────────────────────────────────────────────
// Parents comparison — given a user's selfie + photos of their two parents,
// describe which features came from which parent and what slice of heritage
// each contributes. Returns text only.
// ────────────────────────────────────────────────────────────────────────────

export type ParentsComparison = {
  breakdown: string;        // 1-2 paragraph overview
  mother_traits: string;    // bullet-list-style sentence
  father_traits: string;
};

const PARENTS_SYSTEM_PROMPT = `You are Facelineage's family-resemblance analyst. Given THREE photos — the user (first image), their mother (second image), their father (third image) — produce a short, warm, observational comparison.

Hard rules:
- Always call the parents_comparison tool exactly once.
- "breakdown": 2-3 sentences naming which parent the user resembles more *overall* and why.
- "mother_traits": a single sentence listing 3-4 specific features the user inherited from the mother (e.g., "eye color, jawline, nose tip, smile").
- "father_traits": same shape, for the father.
- Be specific and observational. Mention concrete features only.
- No judgments about attractiveness. No medical or racial-essentialist language.
- If a photo is missing, of poor quality, or clearly not a parent (cartoon, animal), say so politely in "breakdown" and leave the per-parent traits as a one-sentence summary.`;

const PARENTS_TOOL = {
  name: "parents_comparison",
  description: "Submit the comparison between the user and their two parents.",
  input_schema: {
    type: "object",
    properties: {
      breakdown: { type: "string" },
      mother_traits: { type: "string" },
      father_traits: { type: "string" },
    },
    required: ["breakdown", "mother_traits", "father_traits"],
  },
} as const;

export async function compareParents(opts: {
  userImageBase64: string;
  userMediaType: "image/jpeg" | "image/png" | "image/webp";
  motherImageBase64: string;
  motherMediaType: "image/jpeg" | "image/png" | "image/webp";
  fatherImageBase64: string;
  fatherMediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<ParentsComparison> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ANALYSIS_ATTEMPTS; attempt++) {
    try {
      return await compareParentsOnce(opts);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (!isRetryable(err) || attempt === MAX_ANALYSIS_ATTEMPTS) {
        console.error(`[claude] parents attempt ${attempt} failed (final): ${message}`);
        throw err;
      }
      console.warn(`[claude] parents attempt ${attempt} failed, retrying: ${message}`);
      await sleep(1000 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function compareParentsOnce(opts: {
  userImageBase64: string;
  userMediaType: "image/jpeg" | "image/png" | "image/webp";
  motherImageBase64: string;
  motherMediaType: "image/jpeg" | "image/png" | "image/webp";
  fatherImageBase64: string;
  fatherMediaType: "image/jpeg" | "image/png" | "image/webp";
}): Promise<ParentsComparison> {
  const c = client();
  const resp = await c.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
    system: [{ type: "text", text: PARENTS_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    tools: [{ ...PARENTS_TOOL, cache_control: { type: "ephemeral" } }] as never,
    tool_choice: { type: "tool", name: "parents_comparison" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Photo 1 — the user (you):" },
          { type: "image", source: { type: "base64", media_type: opts.userMediaType, data: opts.userImageBase64 } },
          { type: "text", text: "Photo 2 — the user's mother:" },
          { type: "image", source: { type: "base64", media_type: opts.motherMediaType, data: opts.motherImageBase64 } },
          { type: "text", text: "Photo 3 — the user's father:" },
          { type: "image", source: { type: "base64", media_type: opts.fatherMediaType, data: opts.fatherImageBase64 } },
          { type: "text", text: "Compare them and call parents_comparison." },
        ],
      },
    ],
  });
  if (resp.stop_reason === "max_tokens") {
    throw new RetryableAnalysisError("Parents comparison truncated at max_tokens");
  }
  const toolUse = resp.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new RetryableAnalysisError(
      `Claude did not return parents tool_use (stop_reason=${resp.stop_reason})`,
    );
  }
  const out = (toolUse.input ?? {}) as Record<string, unknown>;
  const missing = (["breakdown", "mother_traits", "father_traits"] as const).filter(
    (k) => typeof out[k] !== "string" || (out[k] as string).trim().length === 0,
  );
  if (missing.length > 0) {
    throw new RetryableAnalysisError(`Parents comparison missing: ${missing.join(", ")}`);
  }
  return toolUse.input as ParentsComparison;
}

function formatContext(ctx?: AnalyzeContext): string {
  if (!ctx) return "Side context: none.";
  const lines: string[] = ["Side context (use as a soft prior, never to override the face):"];
  if (ctx.countryHint) lines.push(`- country_hint: ${ctx.countryHint}`);
  if (ctx.timezone) lines.push(`- timezone: ${ctx.timezone}`);
  if (ctx.quizAnswers && Object.keys(ctx.quizAnswers).length) {
    lines.push("- quiz_answers:");
    for (const [k, v] of Object.entries(ctx.quizAnswers)) {
      lines.push(`    ${k}: ${v}`);
    }
  }
  return lines.length === 1 ? "Side context: none." : lines.join("\n");
}
