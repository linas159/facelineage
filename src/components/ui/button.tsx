import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none active:translate-y-[2px]",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-orange)] text-white hover:bg-[var(--color-orange-deep)] shadow-[var(--shadow-cta)] active:shadow-[var(--shadow-cta-active)]",
        secondary:
          "bg-white text-[var(--color-ink)] border-2 border-[var(--color-line-strong)] hover:border-[var(--color-orange)] hover:text-[var(--color-orange)]",
        ghost:
          "text-[var(--color-ink-soft)] hover:bg-[var(--color-bg-warm)] hover:text-[var(--color-ink)]",
        outline:
          "border-2 border-[var(--color-orange)] text-[var(--color-orange)] hover:bg-[var(--color-orange)] hover:text-white",
        green:
          "bg-[var(--color-green)] text-white hover:brightness-105 shadow-[0_4px_0_0_rgba(64,120,20,0.3)] active:shadow-[0_1px_0_0_rgba(64,120,20,0.3)]",
      },
      size: {
        sm: "h-10 px-4 text-sm rounded-[var(--radius-pill)]",
        md: "h-12 px-6 text-base rounded-[var(--radius-pill)]",
        lg: "h-14 px-8 text-base rounded-[var(--radius-pill)]",
        xl: "h-16 px-10 text-lg rounded-[var(--radius-pill)]",
        // Horizontal padding keeps long localized labels (e.g. Romanian price
        // strings ending in "RON/zi") from bumping right up against the pill
        // edges.
        block: "h-14 w-full px-4 text-base rounded-[var(--radius-pill)]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { buttonVariants };
