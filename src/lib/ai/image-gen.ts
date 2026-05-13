import Replicate from "replicate";

// Image generation via Google's gemini-2.5-flash-image (a.k.a. nano-banana).
// Preserves the user's identity better than DALL-E or Imagen, ~$0.04/image,
// ~5-10 s latency.
//
// Two backends:
//   1. GOOGLE_AI_API_KEY  → call Google AI Studio directly (cheaper, fewer hops)
//   2. REPLICATE_API_TOKEN → run via Replicate (already in scaffolding)
//
// We pick whichever is configured, preferring Google direct.

let _replicate: Replicate | null = null;
function replicate(): Replicate {
  if (!_replicate) {
    const auth = process.env.REPLICATE_API_TOKEN;
    if (!auth) throw new Error("REPLICATE_API_TOKEN missing");
    _replicate = new Replicate({ auth });
  }
  return _replicate;
}

export type AspectRatio = "1:1" | "3:4" | "4:5" | "16:9";

export type GenerateOptions = {
  /** The instructional text the model uses to render the image. */
  prompt: string;
  /** Optional reference image (base64-encoded). Used for "this person, in <scene>" prompts. */
  referenceImageBase64?: string;
  referenceMediaType?: "image/jpeg" | "image/png" | "image/webp";
  aspect?: AspectRatio;
};

/**
 * Generate an image. Returns the raw bytes, ready to upload to Supabase
 * Storage. Caller is responsible for storing + persisting the path.
 */
export async function generateImage(opts: GenerateOptions): Promise<Buffer> {
  if (process.env.GOOGLE_AI_API_KEY) {
    return generateViaGoogle(opts);
  }
  return generateViaReplicate(opts);
}

// ────────────────────────────────────────────────────────────────────────────
// Backend: Google AI Studio (preferred when key set)
// ────────────────────────────────────────────────────────────────────────────

async function generateViaGoogle({
  prompt,
  referenceImageBase64,
  referenceMediaType = "image/jpeg",
  aspect = "1:1",
}: GenerateOptions): Promise<Buffer> {
  const key = process.env.GOOGLE_AI_API_KEY!;
  const model = "gemini-2.5-flash-image";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    key,
  )}`;

  const parts: Array<Record<string, unknown>> = [{ text: enrichPrompt(prompt, aspect) }];
  if (referenceImageBase64) {
    parts.unshift({
      inline_data: { mime_type: referenceMediaType, data: referenceImageBase64 },
    });
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseModalities: ["IMAGE"] },
    }),
  });
  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Google AI image-gen failed: ${res.status} ${detail.slice(0, 400)}`);
  }
  // Google returns `inlineData` (camelCase) in v1beta responses, but older
  // docs and snake_case clients still see `inline_data`. Accept either.
  type GeminiPart = {
    inlineData?: { data: string; mimeType?: string };
    inline_data?: { data: string; mime_type?: string };
  };
  const json = (await res.json()) as {
    candidates?: Array<{
      finishReason?: string;
      safetyRatings?: unknown[];
      content?: { parts?: GeminiPart[] };
    }>;
    promptFeedback?: { blockReason?: string; safetyRatings?: unknown[] };
  };
  const part = json.candidates?.[0]?.content?.parts?.find(
    (p) => p.inlineData?.data || p.inline_data?.data,
  );
  const inline = part?.inlineData ?? part?.inline_data;
  if (!inline?.data) {
    const c0 = json.candidates?.[0];
    const reason =
      json.promptFeedback?.blockReason ??
      c0?.finishReason ??
      "no inline image data; likely tier or safety filter";
    // Log the raw response for offline debugging without leaking to the user.
    console.error("Google AI returned no image. Reason:", reason, JSON.stringify(json).slice(0, 800));
    throw new Error(`Google AI returned no image data (${reason})`);
  }
  return Buffer.from(inline.data, "base64");
}

// ────────────────────────────────────────────────────────────────────────────
// Backend: Replicate (fallback)
// ────────────────────────────────────────────────────────────────────────────

async function generateViaReplicate({
  prompt,
  referenceImageBase64,
  referenceMediaType = "image/jpeg",
  aspect = "1:1",
}: GenerateOptions): Promise<Buffer> {
  const input: Record<string, unknown> = {
    prompt: enrichPrompt(prompt, aspect),
    aspect_ratio: aspect,
    output_format: "png",
  };
  if (referenceImageBase64) {
    input.image_input = [`data:${referenceMediaType};base64,${referenceImageBase64}`];
  }

  // Replicate model id for nano-banana (Google's gemini-2.5-flash-image).
  // Pinned model — bump when Replicate rolls a newer hosted version.
  const output = await replicate().run("google/nano-banana", { input });

  // Replicate returns either a string URL or a ReadableStream depending on
  // model schema. Normalize to bytes.
  if (typeof output === "string") {
    const r = await fetch(output);
    if (!r.ok) throw new Error(`Replicate output fetch failed: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  if (Array.isArray(output) && typeof output[0] === "string") {
    const r = await fetch(output[0]);
    if (!r.ok) throw new Error(`Replicate output fetch failed: ${r.status}`);
    return Buffer.from(await r.arrayBuffer());
  }
  if (output instanceof ReadableStream) {
    const reader = output.getReader();
    const chunks: Uint8Array[] = [];
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
    }
    return Buffer.concat(chunks);
  }
  throw new Error("Replicate returned unexpected output shape");
}

function enrichPrompt(prompt: string, aspect: AspectRatio): string {
  // The model handles aspect natively, but adding a soft hint reduces aspect
  // mistakes when the model sees an asymmetric prompt.
  return `${prompt}\n\nAspect: ${aspect}. Style: painterly digital illustration with soft brushwork, brand-coherent muted lavender shadows.`;
}
