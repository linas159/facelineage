import { notFound } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { QuizOptions } from "./quiz-options";

/**
 * 5-step pre-quiz before photo capture. Each option's `iconSrc` points to a
 * small animated illustration in /public/quiz — see docs/visual-assets-plan.md
 * for the exact descriptions. The `emoji` is a fallback that renders if the
 * icon file is missing.
 */
type Option = {
  label: string;
  emoji: string;
  /** Optional animated illustration. If omitted, the emoji renders as the primary icon. */
  iconSrc?: string;
};

type Step = {
  id: number;
  /** Stable key used in the saved answers JSON. */
  key: string;
  q: string;
  options: Option[];
};

const QUIZ_STEPS: Step[] = [
  // ── 1 — sex (emoji-only, no illustrations) ──────────────────────────────
  {
    id: 1,
    key: "gender",
    q: "What gender do you identify as?",
    options: [
      { label: "Female", emoji: "♀", iconSrc: "/quiz/q1-female.svg" },
      { label: "Male",   emoji: "♂", iconSrc: "/quiz/q1-male.svg" },
      { label: "Other",  emoji: "⚧", iconSrc: "/quiz/q1-other.svg" },
    ],
  },

  // ── 2 — curiosity / why are you here ────────────────────────────────────
  {
    id: 2,
    key: "motivation",
    q: "What pulled you here today?",
    options: [
      { label: "I want to know where I'm really from",     emoji: "🌍", iconSrc: "/quiz/q2-globe.png" },
      { label: "I'm curious about my features",            emoji: "👁", iconSrc: "/quiz/q2-eye.png" },
      { label: "There's a family-history mystery",         emoji: "🖼", iconSrc: "/quiz/q2-photo.png" },
      { label: "Just for fun",                             emoji: "✨", iconSrc: "/quiz/q2-sparkle.png" },
    ],
  },

  // ── 3 — engaging: identity hook ─────────────────────────────────────────
  {
    id: 3,
    key: "ambiguity",
    q: "Has anyone ever asked you, “Where are you from?”",
    options: [
      { label: "All the time",        emoji: "💬", iconSrc: "/quiz/q3-many-bubbles.png" },
      { label: "Now and then",        emoji: "💭", iconSrc: "/quiz/q3-one-bubble.png" },
      { label: "Hardly ever",         emoji: "🤏", iconSrc: "/quiz/q3-tiny-bubble.png" },
      { label: "I love when they do", emoji: "🥰", iconSrc: "/quiz/q3-bubble-heart.png" },
    ],
  },

  // ── 4 — engaging: anticipation hook ─────────────────────────────────────
  {
    id: 4,
    key: "surprise",
    q: "What would surprise you most to discover?",
    options: [
      { label: "Heritage from a place I'd never expect",   emoji: "📍", iconSrc: "/quiz/q4-pin.png" },
      { label: "Noble or royal bloodline",                 emoji: "👑", iconSrc: "/quiz/q4-crown.png" },
      { label: "A trait shared with an ancient people",    emoji: "🏛", iconSrc: "/quiz/q4-temple.png" },
      { label: "More mixed than I imagined",               emoji: "🎨", iconSrc: "/quiz/q4-swirl.png" },
    ],
  },

  // ── 5 — age ─────────────────────────────────────────────────────────────
  {
    id: 5,
    key: "age",
    q: "What is your age?",
    options: [
      { label: "<18", emoji: "seed", iconSrc: "/quiz/q5-seed.png" },
      { label: "18–24", emoji: "🌱", iconSrc: "/quiz/q5-sprout.png" },
      { label: "25–34", emoji: "🌿", iconSrc: "/quiz/q5-sapling.png" },
      { label: "35–44", emoji: "🌳", iconSrc: "/quiz/q5-tree.png" },
      { label: "45–54", emoji: "🍂", iconSrc: "/quiz/q5-autumn-tree.png" },
      { label: "55+",   emoji: "🪶", iconSrc: "/quiz/q5-ancient-tree.png" },
    ],
  },
];

export default async function QuizStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);
  const data = QUIZ_STEPS.find((q) => q.id === stepNum);
  if (!data) notFound();

  const next = stepNum >= QUIZ_STEPS.length ? "/capture" : `/quiz/${stepNum + 1}`;
  const back = stepNum > 1 ? `/quiz/${stepNum - 1}` : "/";

  // Build the list of images the next page will need so we can warm them
  // in the browser cache before the user taps. If next is /capture, the
  // hero selfie illustration is the heaviest above-the-fold asset.
  let prefetchImages: string[];
  if (stepNum >= QUIZ_STEPS.length) {
    prefetchImages = ["/selfie.png"];
  } else {
    const nextStep = QUIZ_STEPS.find((q) => q.id === stepNum + 1);
    prefetchImages = (nextStep?.options ?? [])
      .map((o) => o.iconSrc)
      .filter((s): s is string => !!s);
  }

  return (
    <FunnelShell step={stepNum} totalSteps={QUIZ_STEPS.length} showBack backHref={back}>
      <div className="pt-8">
        <h2 className="mb-8 text-balance">{data.q}</h2>
        <QuizOptions
          questionKey={data.key}
          options={data.options}
          nextHref={next}
          prefetchImages={prefetchImages}
        />
      </div>
    </FunnelShell>
  );
}
