"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type FAQItem = { q: string; a: string };

export function FAQAccordion({
  heading,
  items,
}: {
  heading: string;
  items: FAQItem[];
}) {
  // Track only the *currently open* index so opening one closes the others.
  // Using state (instead of native <details>) lets us keep the open/close
  // behaviour predictable for analytics and avoids the FOUC on rehydration.
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <section className="mt-8 mb-8">
      <h2 className="mb-4 text-center text-2xl">{heading}</h2>
      <div className="space-y-2.5">
        {items.map((it, i) => {
          const open = openIdx === i;
          return (
            <div
              key={i}
              className="overflow-hidden rounded-[var(--radius-card)] bg-white shadow-[var(--shadow-chip)] ring-1 ring-[var(--color-line)]"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(open ? null : i)}
                aria-expanded={open}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
              >
                <span className="font-bold text-[var(--color-ink)]">{it.q}</span>
                <span
                  className={cn(
                    "flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-lg font-bold leading-none transition-transform",
                    open
                      ? "rotate-45 bg-[var(--color-orange)] text-white"
                      : "bg-[var(--color-bg-warm)] text-[var(--color-ink-soft)]",
                  )}
                  aria-hidden
                >
                  +
                </span>
              </button>
              {open && (
                <div className="px-4 pb-4 text-sm leading-relaxed text-[var(--color-ink-soft)]">
                  {it.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
