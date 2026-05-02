import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-gold)] text-[var(--color-bg-base)] hover:bg-[var(--color-gold-glow)] shadow-[0_4px_20px_-8px_rgba(201,169,97,0.5)]",
        secondary:
          "bg-[var(--color-bg-elevated)] text-[var(--color-ivory)] border border-[var(--color-border-gold)] hover:border-[var(--color-gold)]",
        ghost: "text-[var(--color-ivory)] hover:bg-[var(--color-bg-elevated)]",
        outline:
          "border border-[var(--color-gold)] text-[var(--color-gold)] hover:bg-[var(--color-gold)] hover:text-[var(--color-bg-base)]",
      },
      size: {
        sm: "h-9 px-4 text-xs tracking-wide",
        md: "h-11 px-6 text-sm tracking-wide",
        lg: "h-14 px-10 text-base tracking-wider uppercase",
        xl: "h-16 px-14 text-base tracking-wider uppercase",
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
