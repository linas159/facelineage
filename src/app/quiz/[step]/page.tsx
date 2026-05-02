import Link from "next/link";
import { notFound } from "next/navigation";
import { FunnelShell } from "@/components/funnel-shell";
import { Button } from "@/components/ui/button";

const QUIZ_STEPS = [
  { id: 1, q: "What gender do you identify as?", options: ["Female", "Male", "Non-binary", "Prefer not to say"] },
  { id: 2, q: "Which age range applies to you?", options: ["18–24", "25–34", "35–44", "45–54", "55+"] },
  { id: 3, q: "What is your eye color?", options: ["Brown", "Blue", "Green", "Hazel", "Grey", "Mixed"] },
  { id: 4, q: "What is your natural hair color?", options: ["Black", "Brown", "Blonde", "Red", "Grey/White"] },
  { id: 5, q: "Where do you believe most of your ancestry is from?", options: ["Europe", "Africa", "Asia", "Americas", "Middle East", "Mixed", "I have no idea"] },
  { id: 6, q: "What draws you to discover your heritage?", options: ["Curiosity", "Family history", "Cultural connection", "Genealogy research", "Just for fun"] },
];

export default async function QuizStepPage({ params }: { params: Promise<{ step: string }> }) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);
  const data = QUIZ_STEPS.find((q) => q.id === stepNum);
  if (!data) notFound();

  const next = stepNum >= QUIZ_STEPS.length ? "/analyzing" : `/quiz/${stepNum + 1}`;

  return (
    <FunnelShell step={stepNum} totalSteps={QUIZ_STEPS.length}>
      <div className="pt-12">
        <h2 className="mb-12 text-center font-display text-3xl">{data.q}</h2>
        <div className="grid gap-4">
          {data.options.map((opt) => (
            <Link
              key={opt}
              href={next}
              className="group flex items-center justify-between rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-6 transition-all duration-300 hover:border-[var(--color-gold)] hover:bg-[var(--color-bg-warm)]"
            >
              <span className="font-display text-xl text-[var(--color-ivory)]">{opt}</span>
              <span className="font-mono text-xs text-[var(--color-muted)] group-hover:text-[var(--color-gold)]">→</span>
            </Link>
          ))}
        </div>
        <div className="mt-12 flex items-center justify-between">
          {stepNum > 1 ? (
            <Link href={`/quiz/${stepNum - 1}`}>
              <Button variant="ghost" size="sm">← Back</Button>
            </Link>
          ) : <span />}
          <span className="font-mono text-xs text-[var(--color-muted)]">Tap to continue</span>
        </div>
      </div>
    </FunnelShell>
  );
}
