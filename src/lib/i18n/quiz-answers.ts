import { LOCALES, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { ro } from "./dictionaries/ro";
import { pl } from "./dictionaries/pl";
import { ua } from "./dictionaries/ua";

const DICTIONARIES: Record<Locale, Dictionary> = { en, ro, pl, ua, uk: en };

/** Saved quiz question key → its section in `dict.quiz`. */
const QUESTION_DICT_KEY: Record<string, keyof Dictionary["quiz"]> = {
  gender: "q1",
  motivation: "q2",
  ambiguity: "q3",
  surprise: "q4",
  age: "q5",
  heritage_roots: "q6",
};

/**
 * Turn saved quiz answers into the canonical English labels the analysis
 * prompt is written against (e.g. "Same country as me, going back
 * generations"), whatever language the customer took the quiz in.
 *
 * The quiz saves stable option keys (`sameCountry`). Rows saved before that
 * hold the translated label instead, so those are reverse-looked-up across
 * every locale. Anything unrecognised passes through unchanged.
 */
export function canonicalQuizAnswers(
  answers: Record<string, string> | null | undefined,
): Record<string, string> | null {
  if (!answers) return null;
  const out: Record<string, string> = {};
  for (const [question, value] of Object.entries(answers)) {
    out[question] = canonicalAnswer(question, value);
  }
  return out;
}

function canonicalAnswer(question: string, value: string): string {
  const dictKey = QUESTION_DICT_KEY[question];
  if (!dictKey || typeof value !== "string") return value;
  const enSection = en.quiz[dictKey] as Record<string, string>;
  if (value !== "q" && value in enSection) return enSection[value];
  for (const locale of LOCALES) {
    const section = DICTIONARIES[locale].quiz[dictKey] as Record<string, string>;
    const optionKey = Object.keys(section).find((k) => k !== "q" && section[k] === value);
    if (optionKey && optionKey in enSection) return enSection[optionKey];
  }
  return value;
}
