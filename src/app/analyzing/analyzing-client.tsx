"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { TestimonialCarousel } from "@/components/testimonials";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const PHASE_MS = 6000; // 5 phases × 6s = 30s minimum analysis runtime
const TICK_MS = 50;

const PHASES = [
  { label: "Detecting facial landmarks",       color: "var(--color-orange)" },
  { label: "Mapping bone structure & skin tone", color: "var(--color-yellow)" },
  { label: "Cross-referencing 94 populations", color: "var(--color-green)" },
  { label: "Tracing migration paths",          color: "var(--color-violet)" },
  { label: "Composing your heritage story",    color: "var(--color-coral)" },
];

const MID_QUESTIONS: { q: string; options: string[] }[] = [
  {
    q: "Where did your grandparents come from?",
    options: ["The same country as me", "One was foreign-born", "Multiple countries", "I'm not sure"],
  },
  {
    q: "Did you grow up speaking another language at home?",
    options: ["Yes, fluently", "Yes, a little", "No", "I learned later"],
  },
  {
    q: "What part of your heritage matters most to you?",
    options: ["Food & traditions", "Family stories", "The migrations themselves", "Religion or beliefs"],
  },
  {
    q: "Have you taken a DNA ancestry test before?",
    options: ["Yes — 23andMe", "Yes — AncestryDNA", "Yes — another", "No, never"],
  },
];

export function AnalyzingClient({ analysisId }: { analysisId?: string }) {
  const router = useRouter();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState(0);          // 0..4
  const [phaseProgress, setPhaseProgress] = useState(0); // 0..1 within current phase
  const [paused, setPaused] = useState(false);
  const [questionIdx, setQuestionIdx] = useState<number | null>(null);

  // Keep the latest progress in a ref so cleanup doesn't snapshot stale state
  const phaseProgressRef = useRef(0);
  phaseProgressRef.current = phaseProgress;

  // ── Read the captured selfie from sessionStorage on mount ────────────────
  useEffect(() => {
    try {
      const url = sessionStorage.getItem("fl_selfie_preview");
      if (url) setPhotoUrl(url);
    } catch {}
  }, []);

  // ── Drive the per-phase progress timer; pause when modal is up ──────────
  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now() - phaseProgressRef.current * PHASE_MS;
    const interval = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const p = Math.min(elapsed / PHASE_MS, 1);
      setPhaseProgress(p);
      if (p >= 1) {
        clearInterval(interval);
        if (phase < PHASES.length - 1) {
          // Pause and show a question between phases
          setPaused(true);
          setQuestionIdx(phase);
        } else {
          // Final phase done — collect email before paywall so we know
          // who's buying before they hit Stripe (simplifies provisioning
          // and rules out post-pay "couldn't link account" failures).
          setTimeout(() => router.push("/email"), 700);
        }
      }
    }, TICK_MS);
    return () => clearInterval(interval);
  }, [phase, paused, router]);

  function answerQuestion() {
    setQuestionIdx(null);
    setPaused(false);
    setPhase((p) => p + 1);
    setPhaseProgress(0);
  }

  const overallProgress =
    ((phase + (paused ? 1 : phaseProgress)) / PHASES.length) * 100;

  return (
    <>
      {/* ── Pulsating oval with the user's selfie inside ─────────────────── */}
      <div className="flex flex-shrink-0 items-center justify-center pb-2">
        <div className="relative h-40 w-40">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-[var(--color-orange)]/35" />
          <span
            className="absolute inset-3 animate-pulse-ring rounded-full bg-[var(--color-orange-soft)]/45"
            style={{ animationDelay: "0.4s" }}
          />
          <span
            className="absolute inset-6 animate-pulse-ring rounded-full bg-[var(--color-orange-pale)]"
            style={{ animationDelay: "0.8s" }}
          />
          {/* Photo (or placeholder ring if missing) */}
          <div className="absolute inset-7 overflow-hidden rounded-full bg-[var(--color-orange-pale)] ring-2 ring-white">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt=""
                aria-hidden
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-[10px] font-bold uppercase tracking-wider text-[var(--color-ink-muted)]">
                scan
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Progress chip + heading ─────────────────────────────────────── */}
      <div className="flex flex-shrink-0 flex-col items-center">
        <div className="rounded-full bg-white px-4 py-1 text-sm font-bold text-[var(--color-orange)] shadow-[var(--shadow-chip)] tabular">
          {Math.round(overallProgress)}% complete
        </div>
        <h2 className="mt-1.5 text-center font-display text-xl font-bold">
          Analyzing your ancestry…
        </h2>
      </div>

      {/* ── Phase list ──────────────────────────────────────────────────── */}
      <Card className="mt-2 flex-shrink-0 !p-3">
        <ul className="space-y-1.5">
          {PHASES.map((p, i) => {
            const done = i < phase;
            const active = i === phase;
            return (
              <li key={p.label} className="flex items-center gap-2.5 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white",
                  )}
                  style={{
                    background: done || active ? p.color : "var(--color-line-strong)",
                  }}
                >
                  {done ? "✓" : active ? <PhaseSpinner paused={paused} /> : i + 1}
                </span>
                <span
                  className={cn(
                    done || active
                      ? "font-bold text-[var(--color-ink)]"
                      : "text-[var(--color-ink-muted)]",
                  )}
                >
                  {p.label}
                </span>
              </li>
            );
          })}
        </ul>
      </Card>

      {/* ── Testimonial carousel pinned at the bottom ───────────────────── */}
      <div className="flex flex-1 flex-col justify-end pb-6 pt-2">
        <TestimonialCarousel intervalMs={5500} />
      </div>

      {/* ── Mid-quiz question modal (pauses analysis) ───────────────────── */}
      {questionIdx !== null && (
        <QuestionSheet
          q={MID_QUESTIONS[questionIdx].q}
          options={MID_QUESTIONS[questionIdx].options}
          onAnswer={answerQuestion}
        />
      )}

      {analysisId && (
        <p className="absolute bottom-1 left-0 right-0 text-center text-[9px] text-[var(--color-ink-muted)] tabular">
          ID: {analysisId.slice(0, 8)}
        </p>
      )}
    </>
  );
}

/** Tiny rotating dot — the active-phase indicator. */
function PhaseSpinner({ paused }: { paused: boolean }) {
  return (
    <span
      className={cn(
        "block h-2 w-2 rounded-full bg-white",
        paused ? "" : "animate-pulse",
      )}
    />
  );
}

/** Bottom-sheet question modal — pauses the analyzing timer while shown. */
function QuestionSheet({
  q,
  options,
  onAnswer,
}: {
  q: string;
  options: string[];
  onAnswer: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div
        className="max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[28px] bg-white p-5 shadow-[0_-12px_40px_-12px_rgba(0,0,0,0.18)] animate-scale-in sm:rounded-[28px]"
        style={{ paddingBottom: "max(env(safe-area-inset-bottom), 20px)" }}
      >
        <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-orange)]">
          While we work — one quick question
        </p>
        <h3 className="mb-4 font-display text-lg font-bold leading-snug text-[var(--color-ink)]">
          {q}
        </h3>
        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={onAnswer}
              className="w-full rounded-[var(--radius-input)] border-2 border-[var(--color-line-strong)] bg-white px-4 py-3 text-left text-sm font-semibold text-[var(--color-ink)] transition-colors hover:border-[var(--color-orange)] hover:text-[var(--color-orange)] active:translate-y-[1px]"
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
