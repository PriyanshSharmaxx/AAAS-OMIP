import { useId } from "react";
import { cn } from "@/lib/utils";

interface GridPatternProps {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  strokeDasharray?: string | number;
  squares?: [x: number, y: number][];
  className?: string;
  [key: string]: unknown;
}

/**
 * SVG grid pattern background.
 * Renders a tiled grid with optional highlighted squares.
 * Uses a unique SVG pattern id per instance so multiple patterns
 * on the same page never clash.
 */
export function GridPattern({
  width = 40,
  height = 40,
  x = -1,
  y = -1,
  strokeDasharray = 0,
  squares,
  className,
  ...props
}: GridPatternProps) {
  const id = useId();
  const patternId = `gp-${id.replace(/:/g, "")}`;

  return (
    <svg
      aria-hidden="true"
      className={cn(
        "pointer-events-none absolute inset-0 h-full w-full",
        "fill-gray-500/15 stroke-gray-500/15",
        className
      )}
      {...props}
    >
      <defs>
        <pattern
          id={patternId}
          width={width}
          height={height}
          patternUnits="userSpaceOnUse"
          x={x}
          y={y}
        >
          <path
            d={`M.5 ${height}V.5H${width}`}
            fill="none"
            strokeDasharray={strokeDasharray}
          />
        </pattern>
      </defs>

      {/* Full-area grid fill */}
      <rect width="100%" height="100%" strokeWidth={0} fill={`url(#${patternId})`} />

      {/* Highlighted squares */}
      {squares && (
        <svg x={x} y={y} className="overflow-visible">
          {squares.map(([sqX, sqY]) => (
            <rect
              key={`${sqX}-${sqY}`}
              width={width - 1}
              height={height - 1}
              x={sqX * width + 1}
              y={sqY * height + 1}
              strokeWidth={0}
            />
          ))}
        </svg>
      )}
    </svg>
  );
}
