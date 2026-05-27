"use client";

import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const STATS = [
  {
    value: "1,000+",
    label: "AI Agents",
    color: "text-[#007AFF]",
    dotBg: "bg-[#007AFF]",
    glow:  "shadow-[0_0_10px_3px_rgba(0,122,255,0.55)]",
  },
  {
    value: "50K+",
    label: "Executions",
    color: "text-violet-600 dark:text-violet-400",
    dotBg: "bg-violet-500 dark:bg-violet-400",
    glow:  "shadow-[0_0_10px_3px_rgba(139,92,246,0.5)]",
  },
  {
    value: "10K+",
    label: "Active Users",
    color: "text-cyan-600 dark:text-cyan-400",
    dotBg: "bg-cyan-500 dark:bg-cyan-400",
    glow:  "shadow-[0_0_10px_3px_rgba(34,211,238,0.5)]",
  },
  {
    value: "99.9%",
    label: "Uptime SLA",
    color: "text-emerald-600 dark:text-emerald-400",
    dotBg: "bg-emerald-500 dark:bg-emerald-400",
    glow:  "shadow-[0_0_10px_3px_rgba(52,211,153,0.5)]",
  },
] as const;

export function StatsStrip() {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className={cn(
        "relative z-10 px-4 py-6 transition-all duration-700",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
      )}
      aria-label="Platform statistics"
    >
      <div className="mx-auto max-w-5xl">
        {/* Grid */}
        <div className="grid grid-cols-2 divide-x divide-black/[0.06] dark:divide-white/[0.06] overflow-hidden rounded-2xl border border-black/[0.07] dark:border-white/[0.07] bg-white/60 dark:bg-white/[0.025] backdrop-blur-xl lg:grid-cols-4">
          {STATS.map(({ value, label, color, dotBg, glow }, i) => (
            <div
              key={label}
              className="flex flex-col items-center justify-center gap-2 px-6 py-8 text-center"
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full shrink-0 animate-orb-breathe",
                    dotBg,
                    glow,
                  )}
                />
                <span className={cn("text-[28px] font-extrabold tracking-tight leading-none", color)}>
                  {value}
                </span>
              </div>
              <span className="text-xs font-medium text-gray-500 dark:text-white/35">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
