import { GridPattern } from "@/components/ui/grid-pattern";
import { cn } from "@/lib/utils";

interface BackgroundGridProps {
  /** Opacity of the grid lines (0–1). Default: 0.5 */
  opacity?: number;
  /** Show a radial gradient mask that fades the grid towards the edges */
  fade?: boolean;
  /** Direction of the linear fade — "bottom" fades down (default), "top" fades up */
  fadeDirection?: "top" | "bottom";
  /** Show dashed grid lines */
  dashed?: boolean;
  /** Additional className applied to the wrapper */
  className?: string;
  /** Additional className applied to the SVG */
  patternClassName?: string;
  /** Squares to highlight, e.g. [[0,0],[1,2]] */
  squares?: [number, number][];
}

/**
 * Drop-in background grid.
 *
 * Usage:
 *   <div className="relative overflow-hidden">
 *     <BackgroundGrid />
 *     <YourContent />
 *   </div>
 */
export function BackgroundGrid({
  opacity = 0.5,
  fade = true,
  fadeDirection = "bottom",
  dashed = false,
  className,
  patternClassName,
  squares,
}: BackgroundGridProps) {
  return (
    <div
      className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}
      style={{ opacity }}
    >
      <GridPattern
        strokeDasharray={dashed ? "4 4" : 0}
        squares={squares}
        className={cn(
          "dark:fill-primary/5 dark:stroke-primary/10",
          "fill-primary/5 stroke-primary/10",
          patternClassName
        )}
      />

      {/* Fade mask */}
      {fade && (
        <div
          className={cn(
            "absolute inset-0",
            fadeDirection === "bottom"
              ? "bg-gradient-to-b from-transparent via-transparent to-background"
              : "bg-gradient-to-t from-transparent via-transparent to-background"
          )}
        />
      )}
    </div>
  );
}
