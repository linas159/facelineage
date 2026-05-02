import * as React from "react";
import { cn } from "@/lib/utils";

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-bg-elevated)] p-8 shadow-[0_8px_40px_-16px_rgba(0,0,0,0.5)]",
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = "Card";

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("font-[var(--font-display)] text-2xl text-[var(--color-ivory)]", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-[var(--color-ivory-muted)] leading-relaxed", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";
