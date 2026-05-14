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

# How to use the quiz answers and location

The user supplies a small amount of side context. **Use it to refine — never to override what the face tells you.** Specifically:
- The user's **country_hint** (timezone-derived) is a soft prior on where they live, *not* on where their ancestors are from. People in a country often have heritage from elsewhere.
- The **age** answer affects how you describe traits (younger faces have less weathering, etc.).
- The **gender** answer affects pronouns and ancestor naming, nothing else.
- The **surprise** answer is a wish — do *not* fabricate heritage to match it.
- If the face clearly contradicts a quiz answer (e.g. user said female, face reads as a strong masculine phenotype), defer to the face.

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
 * Run the full heritage analysis on a selfie. Returns a structured report
 * matching the database schema in lib/report-data.ts.
 */
export async function analyzeFace(opts: {
  imageBase64: string;
  mediaType: "image/jpeg" | "image/png" | "image/webp";
  context?: AnalyzeContext;
}): Promise<AnalysisResult> {
  const c = client();
  const contextBlock = formatContext(opts.context);

  const resp = await c.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 4096,
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
              `Analyze this selfie following the instructions in the system message, then call report_analysis with the structured result. The face is the primary input — the side context below is only a soft prior.\n\n${contextBlock}`,
          },
        ],
      },
    ],
  });

  const toolUse = resp.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error("Claude did not return a tool_use block");
  }
  return toolUse.input as AnalysisResult;
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
  const c = client();
  const resp = await c.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
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
  const toolUse = resp.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") throw new Error("Claude did not return parents tool_use");
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
