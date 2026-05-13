"use client";

import { useRouter } from "next/navigation";

type Option = {
  label: string;
  emoji: string;
  iconSrc?: string;
};

interface QuizOptionsProps {
  questionKey: string;   // e.g. "gender", "motivation"
  options: Option[];
  nextHref: string;
}

const STORAGE_KEY = "fl_quiz_answers";

/**
 * Renders the option tiles for a quiz step. Clicking one writes the
 * selection into sessionStorage and navigates to the next step. The capture
 * page reads STORAGE_KEY when the user uploads their selfie and includes
 * the answers in the analysis row.
 */
export function QuizOptions({ questionKey, options, nextHref }: QuizOptionsProps) {
  const router = useRouter();

  function record(label: string) {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      const obj = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      obj[questionKey] = label;
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {}
    // Capture browser timezone once.
    try {
      if (!sessionStorage.getItem("fl_timezone")) {
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (tz) sessionStorage.setItem("fl_timezone", tz);
      }
    } catch {}
    router.push(nextHref);
  }

  return (
    <div className="space-y-3">
      {options.map((opt) => (
        <button
          key={opt.label}
          type="button"
          onClick={() => record(opt.label)}
          className="group flex w-full items-center gap-4 rounded-[var(--radius-tile)] bg-white p-4 shadow-[var(--shadow-card)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-card-hover)] active:translate-y-0"
        >
          <div className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-[var(--color-orange-pale)] overflow-hidden">
            {opt.iconSrc ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={opt.iconSrc}
                  alt=""
                  aria-hidden
                  className="h-12 w-12 object-contain"
                />
                <span className="absolute -z-10 text-2xl" aria-hidden>
                  {opt.emoji}
                </span>
              </>
            ) : (
              <span className="text-3xl text-[var(--color-orange)]" aria-hidden>
                {opt.emoji}
              </span>
            )}
          </div>
          <span className="flex-1 text-left font-semibold text-[var(--color-ink)]">
            {opt.label}
          </span>
          <span className="text-[var(--color-ink-muted)] group-hover:text-[var(--color-orange)]">
            →
          </span>
        </button>
      ))}
    </div>
  );
}
