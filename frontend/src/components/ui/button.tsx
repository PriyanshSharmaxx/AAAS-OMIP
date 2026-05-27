import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Spotlight hover effect is baked into the base class as a CSS ::before
 * pseudo-element. Works on all variants. Key requirements:
 *   • `relative`        — positioning context for ::before
 *   • `overflow-hidden` — clips the glow to the button shape
 *   • `before:pointer-events-none` — prevents the pseudo from eating clicks
 *
 * Light-mode: uses a semi-transparent primary-tinted glow
 * Dark-mode:  uses a white glow (more contrast against dark surfaces)
 */
const SPOTLIGHT =
  // positioning
  "before:absolute before:left-1/2 before:top-0 " +
  "before:-translate-x-1/2 before:-translate-y-1/2 " +
  // shape — tall oval to simulate a light beam from above
  "before:w-3/4 before:h-28 " +
  // gradient — primary-tinted in light mode, white in dark mode
  "before:bg-gradient-to-b " +
  "before:from-primary/25 before:to-transparent " +
  "dark:before:from-white/30 dark:before:to-transparent " +
  // blur + transition
  "before:blur-xl before:rounded-full " +
  "before:opacity-0 hover:before:opacity-100 " +
  "before:transition-opacity before:duration-300 " +
  "before:pointer-events-none";

const buttonVariants = cva(
  cn(
    // Layout & typography
    "relative inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium",
    // Transitions
    "transition-colors duration-200",
    // Overflow for spotlight clip
    "overflow-hidden",
    // Focus ring
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
    // Disabled
    "disabled:pointer-events-none disabled:opacity-50",
    // SVG children
    "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
    // Spotlight
    SPOTLIGHT
  ),
  {
    variants: {
      variant: {
        default:
          // Light: solid primary. Dark: DESIGN.md CTA gradient (#ADC6FF → #4B8EFF)
          "bg-primary text-primary-foreground shadow hover:bg-primary/90 " +
          "dark:bg-[linear-gradient(135deg,#ADC6FF_0%,#4B8EFF_100%)] dark:text-[#0E0E0E] dark:shadow-[0_0_18px_rgba(75,142,255,0.30)] dark:hover:opacity-90 dark:hover:shadow-[0_0_28px_rgba(75,142,255,0.45)]",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline overflow-visible before:hidden",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm:      "h-8 rounded-md px-3 text-xs",
        lg:      "h-10 rounded-md px-8",
        icon:    "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
