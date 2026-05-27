"use client";

/**
 * Pure SVG charts — no external library needed.
 * LineChart, BarChart, DonutChart.
 */

import type { ChartPoint } from "@/hooks/useDashboard";
import { cn } from "@/lib/utils";

// ── Shared helpers ──────────────────────────────────────────────────────────

function normalize(values: number[]): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  return values.map((v) => (v - min) / range);
}

// ── Line Chart ──────────────────────────────────────────────────────────────

interface LineChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  className?: string;
  showLabels?: boolean;
  showGrid?: boolean;
}

export function LineChart({
  data,
  height = 160,
  color = "hsl(var(--primary))",
  className,
  showLabels = true,
  showGrid = true,
}: LineChartProps) {
  if (!data.length) return null;

  const W = 100;
  const H = height;
  const PAD = { top: 8, right: 8, bottom: showLabels ? 24 : 8, left: 8 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const norm = normalize(values);

  const pts = norm.map((n, i) => ({
    x: PAD.left + (i / (data.length - 1)) * plotW,
    y: PAD.top + (1 - n) * plotH,
  }));

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const area = `${path} L ${pts[pts.length - 1].x} ${H - PAD.bottom} L ${pts[0].x} ${H - PAD.bottom} Z`;

  const gridLines = showGrid ? [0.25, 0.5, 0.75, 1] : [];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((frac) => {
        const y = PAD.top + (1 - frac) * plotH;
        return (
          <line key={frac} x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
            stroke="currentColor" strokeWidth="0.3" className="text-border" strokeDasharray="2 2" />
        );
      })}

      {/* Area fill */}
      <path d={area} fill="url(#lg)" />

      {/* Line */}
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* Dots */}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2" fill={color} />
      ))}

      {/* Labels */}
      {showLabels && data.map((d, i) => (
        <text
          key={i}
          x={pts[i].x}
          y={H - 4}
          textAnchor="middle"
          fontSize="5"
          className="fill-muted-foreground"
          style={{ fill: "var(--muted-foreground)" }}
        >
          {d.label}
        </text>
      ))}
    </svg>
  );
}

// ── Bar Chart ──────────────────────────────────────────────────────────────

interface BarChartProps {
  data: ChartPoint[];
  height?: number;
  color?: string;
  className?: string;
  showLabels?: boolean;
}

export function BarChart({
  data,
  height = 160,
  color = "hsl(var(--primary))",
  className,
  showLabels = true,
}: BarChartProps) {
  if (!data.length) return null;

  const W = 100;
  const H = height;
  const PAD = { top: 8, right: 4, bottom: showLabels ? 24 : 4, left: 4 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const values = data.map((d) => d.value);
  const norm = normalize(values);
  const barW = (plotW / data.length) * 0.6;
  const gap = plotW / data.length;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("w-full", className)}
      style={{ height }}
    >
      {data.map((d, i) => {
        const barH = norm[i] * plotH;
        const x = PAD.left + i * gap + (gap - barW) / 2;
        const y = PAD.top + plotH - barH;

        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx="1.5" fill={color} opacity="0.85" />
            {showLabels && (
              <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="5" style={{ fill: "var(--muted-foreground)" }}>
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Multi-line / stacked bar ───────────────────────────────────────────────

interface StackedBarChartProps {
  data: Array<{ label: string; total: number; subscription: number; pay_per_use: number }>;
  height?: number;
  className?: string;
}

export function StackedBarChart({ data, height = 180, className }: StackedBarChartProps) {
  if (!data.length) return null;

  const W = 100;
  const H = height;
  const PAD = { top: 8, right: 4, bottom: 24, left: 4 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...data.map((d) => d.total));
  const barW = (plotW / data.length) * 0.6;
  const gap = plotW / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className={cn("w-full", className)} style={{ height }}>
      {data.map((d, i) => {
        const x = PAD.left + i * gap + (gap - barW) / 2;
        const subH = (d.subscription / maxVal) * plotH;
        const ppuH = (d.pay_per_use / maxVal) * plotH;

        return (
          <g key={i}>
            {/* subscription (bottom) */}
            <rect x={x} y={PAD.top + plotH - subH - ppuH} width={barW} height={subH} rx="0" fill="hsl(var(--primary))" opacity="0.8" />
            {/* pay per use (top) */}
            <rect x={x} y={PAD.top + plotH - ppuH} width={barW} height={ppuH} rx="1.5" fill="hsl(var(--primary))" opacity="0.35" />
            <text x={x + barW / 2} y={H - 4} textAnchor="middle" fontSize="5" style={{ fill: "var(--muted-foreground)" }}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut Chart ────────────────────────────────────────────────────────────

const DONUT_COLORS = [
  "hsl(var(--primary))",
  "#22c55e",
  "#a855f7",
  "#f97316",
  "#06b6d4",
];

interface DonutChartProps {
  data: ChartPoint[];
  size?: number;
  className?: string;
}

export function DonutChart({ data, size = 120, className }: DonutChartProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.35;
  const strokeW = size * 0.14;

  let cumulative = 0;

  const slices = data.map((d, i) => {
    const pct = d.value / total;
    const start = cumulative;
    cumulative += pct;
    return { ...d, pct, start, color: DONUT_COLORS[i % DONUT_COLORS.length] };
  });

  function polarToXY(frac: number, radius: number) {
    const angle = frac * 2 * Math.PI - Math.PI / 2;
    return {
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
    };
  }

  function arcPath(start: number, end: number) {
    const s = polarToXY(start, r);
    const e = polarToXY(end, r);
    const large = end - start > 0.5 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y}`;
  }

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        {slices.map((s, i) => (
          <path
            key={i}
            d={arcPath(s.start, s.start + s.pct)}
            fill="none"
            stroke={s.color}
            strokeWidth={strokeW}
            strokeLinecap="butt"
          />
        ))}
      </svg>

      <div className="space-y-1.5 min-w-0">
        {slices.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-xs min-w-0">
            <div className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
            <span className="truncate text-muted-foreground">{s.label}</span>
            <span className="ml-auto font-medium shrink-0">{Math.round(s.pct * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
