import { notFound } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { QuizOptions } from "./quiz-options";
import { QuizEntryGate } from "./quiz-entry-gate";
import { getDictionary, localized } from "@/lib/i18n/server";
import { getLocale } from "@/lib/i18n/server";
import type { Dictionary } from "@/lib/i18n/dictionaries/en";

/**
 * 6-step pre-quiz before photo capture. Localized via `src/lib/i18n`.
 * The step definitions here are language-agnostic — they specify which
 * keys in the dictionary to render. To translate, edit the dictionaries.
 */
/**
 * Each option references a string key under the step's section of the
 * dictionary (e.g. step 1 uses `quiz.q1.female`). We don't try to type-link
 * which optionKeys belong to which dictKey — keep it as a plain string and
 * resolve at render time.
 */
type Option = {
  optionKey: string;
  emoji: string;
  iconSrc?: string;
};

type Step = {
  id: number;
  /** Stable key persisted into the saved answers JSON. */
  key: string;
  /** Dictionary subkey under `quiz`, e.g. "q1". */
  dictKey: keyof Dictionary["quiz"];
  options: Option[];
};

const QUIZ_STEPS: Step[] = [
  {
    id: 1,
    key: "gender",
    dictKey: "q1",
    options: [
      { optionKey: "female", emoji: "♀", iconSrc: "/quiz/q1-female.svg" },
      { optionKey: "male", emoji: "♂", iconSrc: "/quiz/q1-male.svg" },
    ],
  },
  {
    id: 2,
    key: "motivation",
    dictKey: "q2",
    options: [
      { optionKey: "whereFrom", emoji: "🌍", iconSrc: "/quiz/q2-globe.png" },
      { optionKey: "features", emoji: "👁", iconSrc: "/quiz/q2-eye.png" },
      { optionKey: "mystery", emoji: "🖼", iconSrc: "/quiz/q2-photo.png" },
      { optionKey: "fun", emoji: "✨", iconSrc: "/quiz/q2-sparkle.png" },
    ],
  },
  {
    id: 3,
    key: "ambiguity",
    dictKey: "q3",
    options: [
      { optionKey: "allTheTime", emoji: "💬", iconSrc: "/quiz/q3-many-bubbles.png" },
      { optionKey: "nowAndThen", emoji: "💭", iconSrc: "/quiz/q3-one-bubble.png" },
      { optionKey: "hardlyEver", emoji: "🤏", iconSrc: "/quiz/q3-tiny-bubble.png" },
      { optionKey: "loveIt", emoji: "🥰", iconSrc: "/quiz/q3-bubble-heart.png" },
    ],
  },
  {
    id: 4,
    key: "surprise",
    dictKey: "q4",
    options: [
      { optionKey: "unexpected", emoji: "📍", iconSrc: "/quiz/q4-pin.png" },
      { optionKey: "royal", emoji: "👑", iconSrc: "/quiz/q4-crown.png" },
      { optionKey: "ancient", emoji: "🏛", iconSrc: "/quiz/q4-temple.png" },
      { optionKey: "mixed", emoji: "🎨", iconSrc: "/quiz/q4-swirl.png" },
    ],
  },
  {
    id: 5,
    key: "age",
    dictKey: "q5",
    options: [
      { optionKey: "under18", emoji: "seed", iconSrc: "/quiz/q5-seed.png" },
      { optionKey: "a18_24", emoji: "🌱", iconSrc: "/quiz/q5-sprout.png" },
      { optionKey: "a25_34", emoji: "🌿", iconSrc: "/quiz/q5-sapling.png" },
      { optionKey: "a35_44", emoji: "🌳", iconSrc: "/quiz/q5-tree.png" },
      { optionKey: "a45_54", emoji: "🍂", iconSrc: "/quiz/q5-autumn-tree.png" },
      { optionKey: "a55plus", emoji: "🪶", iconSrc: "/quiz/q5-ancient-tree.png" },
    ],
  },
  {
    id: 6,
    key: "heritage_roots",
    dictKey: "q6",
    options: [
      { optionKey: "sameCountry", emoji: "🏡", iconSrc: "/quiz/q6-roots.png" },
      { optionKey: "parentsMoved", emoji: "✈️", iconSrc: "/quiz/q6-suitcase.png" },
      { optionKey: "mix", emoji: "🎨", iconSrc: "/quiz/q4-swirl.png" },
      { optionKey: "noIdea", emoji: "❔", iconSrc: "/quiz/q6-question.png" },
    ],
  },
];

export default async function QuizStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);
  const data = QUIZ_STEPS.find((q) => q.id === stepNum);
  if (!data) notFound();

  const locale = await getLocale();
  const dict = await getDictionary();
  const stepDict = dict.quiz[data.dictKey];

  const next = stepNum >= QUIZ_STEPS.length ? "/capture" : `/quiz/${stepNum + 1}`;
  const back = stepNum > 1 ? `/quiz/${stepNum - 1}` : "/";

  // Warm next-page images.
  let prefetchImages: string[];
  if (stepNum >= QUIZ_STEPS.length) {
    prefetchImages = ["/selfie.png"];
  } else {
    const nextStep = QUIZ_STEPS.find((q) => q.id === stepNum + 1);
    prefetchImages = (nextStep?.options ?? [])
      .map((o) => o.iconSrc)
      .filter((s): s is string => !!s);
  }

  // Resolve localized labels for the options.
  const resolvedOptions = data.options.map((o) => ({
    label: (stepDict as Record<string, string>)[o.optionKey] ?? o.optionKey,
    emoji: o.emoji,
    iconSrc: o.iconSrc,
  }));

  const content = (
    <div className="pt-8">
      <h2 className="mb-8 text-balance">{(stepDict as { q: string }).q}</h2>
      <QuizOptions
        questionKey={data.key}
        options={resolvedOptions}
        nextHref={localized(next, locale)}
        prefetchImages={prefetchImages}
      />
    </div>
  );

  return (
    <FunnelShell
      step={stepNum}
      totalSteps={QUIZ_STEPS.length}
      showBack
      backHref={localized(back, locale)}
    >
      {/* Step 1 is the funnel entry — gate it through the home-funnel flag so
          ad traffic deep-linking here still respects the onboarding test. */}
      {stepNum === 1 ? (
        <QuizEntryGate onboardingHref={localized("/onboarding/1", locale)}>
          {content}
        </QuizEntryGate>
      ) : (
        content
      )}
    </FunnelShell>
  );
}
