"use client";

import {
  Store, GitBranch, Plug, Bot, Activity, Shield,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface Feature {
  icon:       LucideIcon;
  title:      string;
  description: string;
  accent:     string;
  iconBg:     string;
  topAccent:  string;
  glowRgba:   string;
}

const FEATURES: Feature[] = [
  {
    icon:        Store,
    title:       "Agent Marketplace",
    description:
      "Discover and deploy pre-built AI agents across research, marketing, finance, and development — all curated for quality and real-world performance.",
    accent:    "text-[#007AFF]",
    iconBg:    "bg-[#007AFF]/10 border-[#007AFF]/20",
    topAccent: "from-[#007AFF]/40 via-[#007AFF]/10 to-transparent",
    glowRgba:  "rgba(0,122,255,0.35)",
  },
  {
    icon:        GitBranch,
    title:       "Multi-Agent Workflows",
    description:
      "Chain agents into powerful pipelines with conditional logic, parallel execution, and smart routing — no code required.",
    accent:    "text-violet-600 dark:text-violet-400",
    iconBg:    "bg-violet-500/10 border-violet-500/20",
    topAccent: "from-violet-500/40 via-violet-500/10 to-transparent",
    glowRgba:  "rgba(139,92,246,0.35)",
  },
  {
    icon:        Plug,
    title:       "API Integrations",
    description:
      "Connect to Groq, OpenAI, and 200+ APIs under one unified interface with automatic key management and encrypted secrets storage.",
    accent:    "text-cyan-600 dark:text-cyan-400",
    iconBg:    "bg-cyan-500/10 border-cyan-500/20",
    topAccent: "from-cyan-500/40 via-cyan-500/10 to-transparent",
    glowRgba:  "rgba(34,211,238,0.35)",
  },
  {
    icon:        Bot,
    title:       "No-Code Automation",
    description:
      "Configure and trigger agents with natural language. Describe what you need — the platform handles the rest, from scheduling to output delivery.",
    accent:    "text-emerald-600 dark:text-emerald-400",
    iconBg:    "bg-emerald-500/10 border-emerald-500/20",
    topAccent: "from-emerald-500/40 via-emerald-500/10 to-transparent",
    glowRgba:  "rgba(52,211,153,0.35)",
  },
  {
    icon:        Activity,
    title:       "Real-Time Execution Logs",
    description:
      "Monitor every agent run live. Full execution traces, token usage, latency breakdowns, and error diagnostics in a single unified view.",
    accent:    "text-amber-600 dark:text-amber-400",
    iconBg:    "bg-amber-500/10 border-amber-500/20",
    topAccent: "from-amber-500/40 via-amber-500/10 to-transparent",
    glowRgba:  "rgba(245,158,11,0.35)",
  },
  {
    icon:        Shield,
    title:       "Enterprise Security",
    description:
      "Role-based access control, AES-256 encrypted secrets, full audit logs, sandboxed execution, and SOC-2 ready infrastructure.",
    accent:    "text-pink-600 dark:text-pink-400",
    iconBg:    "bg-pink-500/10 border-pink-500/20",
    topAccent: "from-pink-500/40 via-pink-500/10 to-transparent",
    glowRgba:  "rgba(236,72,153,0.35)",
  },
];

export function FeaturesSection() {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className="relative z-10 px-4 py-28"
      aria-label="Platform features"
    >
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div
          className={cn(
            "mb-16 text-center transition-all duration-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/40">
              Platform Capabilities
            </span>
          </div>

          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
            Everything You Need to{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, #007AFF 0%, #34AADC 100%)" }}
            >
              Build with AI
            </span>
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-gray-500 dark:text-white/40">
            A complete platform for discovering, building, and scaling AI agents —
            from single-task bots to enterprise-grade multi-agent workflows.
          </p>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, accent, iconBg, topAccent, glowRgba }, i) => (
            <GlassCard
              key={title}
              hoverable
              className={cn(
                "group flex flex-col overflow-hidden p-6 transition-all duration-700",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
              )}
              style={{ transitionDelay: `${100 + i * 90}ms` }}
            >
              {/* Coloured top accent bar */}
              <div className={cn("absolute inset-x-0 top-0 h-px bg-gradient-to-r", topAccent)} />

              {/* Icon */}
              <div className={cn("mb-5 flex h-11 w-11 items-center justify-center rounded-xl border", iconBg, accent)}>
                <Icon className="h-5 w-5" />
              </div>

              <h3 className="mb-2.5 text-[15px] font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm leading-relaxed text-gray-500 dark:text-white/40">{description}</p>

              {/* Corner hover glow */}
              <div
                className="pointer-events-none absolute -bottom-6 -right-6 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-50"
                style={{ background: glowRgba }}
              />
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
