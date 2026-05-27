import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Add a soft blue edge-glow (dark only — subtle in light) */
  glow?: boolean;
  /** Enable hover lift + brighter border */
  hoverable?: boolean;
}

/**
 * GlassCard — theme-aware frosted glass surface.
 *
 * Light: bg-white/70  · border-black/[0.07]  · shadow-sm
 * Dark:  bg-white/[0.04] · border-white/[0.08] · no shadow
 *
 * Uses Tailwind dark: prefix so it responds to the html.dark class
 * set by next-themes — no forced dark wrapper required.
 */
export const GlassCard = forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, glow, hoverable, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        // glass base — light
        "relative rounded-2xl border border-black/[0.07] bg-white/70 backdrop-blur-xl shadow-sm",
        // glass base — dark overrides
        "dark:border-white/[0.08] dark:bg-white/[0.04] dark:shadow-none",
        // optional glow (barely visible in light, subtle in dark)
        glow && "shadow-[0_0_24px_rgba(0,122,255,0.06)] dark:shadow-[0_0_30px_rgba(0,122,255,0.07)]",
        // hover elevation
        hoverable && [
          "cursor-pointer transition-all duration-300 ease-out",
          // light hover
          "hover:-translate-y-[3px] hover:border-black/[0.13] hover:bg-white/90 hover:shadow-md",
          // dark hover
          "dark:hover:border-white/[0.16] dark:hover:bg-white/[0.07] dark:hover:shadow-[0_10px_48px_rgba(0,122,255,0.13)]",
        ],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  ),
);

GlassCard.displayName = "GlassCard";
