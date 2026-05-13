import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-card)] bg-white p-6 shadow-[var(--shadow-card)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-display text-xl font-bold text-[var(--color-ink)]", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--color-ink-soft)] leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

/** A small white "chip" pill — used for region/country tags like Origene's report */
export function Chip({
  children,
  className,
  color = "default",
}: {
  children: React.ReactNode;
  className?: string;
  color?: "default" | "orange" | "green" | "yellow" | "coral" | "violet";
}) {
  const colorMap = {
    default: "text-[var(--color-ink)]",
    orange: "text-[var(--color-orange)]",
    green: "text-[var(--color-green)]",
    yellow: "text-[#b07a00]",
    coral: "text-[var(--color-coral)]",
    violet: "text-[var(--color-violet)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-[var(--radius-chip)] bg-white px-3 py-2 text-sm font-semibold shadow-[var(--shadow-chip)]",
        colorMap[color],
        className,
      )}
    >
      {children}
    </span>
  );
}
