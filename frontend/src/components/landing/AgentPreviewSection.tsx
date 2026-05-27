"use client";

import Link from "next/link";
import {
  Play, Star, ArrowRight, Search, Code2, BarChart3,
  TrendingUp, Briefcase, Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GlassCard } from "./GlassCard";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

interface PreviewAgent {
  name:        string;
  description: string;
  category:    string;
  rating:      number;
  icon:        LucideIcon;
  accent:      string;
  iconBg:      string;
  runs:        string;
}

const PREVIEW_AGENTS: PreviewAgent[] = [
  {
    name:        "ResearchBot",
    description:
      "Deep research assistant that provides comprehensive analysis on any topic with structured insights and clear reasoning.",
    category: "Research",
    rating:   4.8,
    icon:     Search,
    accent:   "text-indigo-600 dark:text-indigo-400",
    iconBg:   "bg-indigo-500/10 border-indigo-500/20",
    runs:     "2.4k",
  },
  {
    name:        "CodeAssistant AI",
    description:
      "AI-powered coding assistant that reviews code, generates implementations, explains concepts, and fixes bugs across 20+ languages.",
    category: "Development",
    rating:   4.9,
    icon:     Code2,
    accent:   "text-cyan-600 dark:text-cyan-400",
    iconBg:   "bg-cyan-500/10 border-cyan-500/20",
    runs:     "8.1k",
  },
  {
    name:        "ContentWriter Pro",
    description:
      "Generates SEO-optimised blog posts, marketing copy, and email campaigns tailored to your brand voice and audience.",
    category: "Marketing",
    rating:   4.7,
    icon:     TrendingUp,
    accent:   "text-orange-600 dark:text-orange-400",
    iconBg:   "bg-orange-500/10 border-orange-500/20",
    runs:     "5.3k",
  },
  {
    name:        "DataInsight Analyst",
    description:
      "Business intelligence agent that analyses data, identifies trends, and surfaces actionable insights in plain language.",
    category: "Analytics",
    rating:   4.6,
    icon:     BarChart3,
    accent:   "text-green-600 dark:text-green-400",
    iconBg:   "bg-green-500/10 border-green-500/20",
    runs:     "3.7k",
  },
  {
    name:        "EmailGenius",
    description:
      "Drafts personalised, high-converting email campaigns, cold outreach sequences, and A/B test subject lines automatically.",
    category: "Sales",
    rating:   4.5,
    icon:     Briefcase,
    accent:   "text-blue-600 dark:text-blue-400",
    iconBg:   "bg-blue-500/10 border-blue-500/20",
    runs:     "4.9k",
  },
  {
    name:        "ProductivityCoach",
    description:
      "AI productivity coach that creates task plans, prioritises work, and gives personalised advice to maximise your output.",
    category: "Productivity",
    rating:   4.6,
    icon:     Zap,
    accent:   "text-violet-600 dark:text-violet-400",
    iconBg:   "bg-violet-500/10 border-violet-500/20",
    runs:     "6.2k",
  },
];

function AgentCard({ agent }: { agent: PreviewAgent }) {
  const { icon: Icon, name, description, category, rating, accent, iconBg, runs } = agent;

  return (
    <GlassCard hoverable glow className="group flex flex-col overflow-hidden p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/[0.06] dark:via-white/[0.08] to-transparent" />

      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", iconBg, accent)}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[13px] font-semibold leading-tight text-gray-900 dark:text-white">{name}</p>
            <span className={cn("text-[11px] font-medium", accent)}>{category}</span>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <Star className="h-3 w-3 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{rating.toFixed(1)}</span>
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 flex-1 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-white/38">
        {description}
      </p>

      {/* Footer */}
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-white/25">
          <Play className="h-2.5 w-2.5" />
          {runs} runs
        </span>
        <span className="rounded-full border border-emerald-500/25 bg-emerald-500/8 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
          Free
        </span>
      </div>

      {/* CTA */}
      <Link href="/explore">
        <button className="group/btn flex w-full items-center justify-center gap-2 rounded-xl border border-[#007AFF]/20 bg-[#007AFF]/8 py-2.5 text-xs font-semibold text-[#007AFF] transition-all duration-200 hover:border-[#007AFF]/50 hover:bg-[#007AFF] hover:text-white hover:shadow-[0_0_20px_rgba(0,122,255,0.3)]">
          <Play className="h-3 w-3" />
          Run Agent
          <ArrowRight className="h-3 w-3 opacity-0 -translate-x-1 transition-all duration-200 group-hover/btn:opacity-100 group-hover/btn:translate-x-0" />
        </button>
      </Link>
    </GlassCard>
  );
}

export function AgentPreviewSection() {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className="relative z-10 px-4 py-28"
      aria-label="Featured agents"
    >
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div
          className={cn(
            "mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end transition-all duration-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.04] dark:bg-white/[0.04] px-4 py-1.5 backdrop-blur-sm">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500 dark:text-white/40">
                Agent Showcase
              </span>
            </div>
            <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-5xl">
              Meet Your{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #5856D6 0%, #007AFF 60%, #34AADC 100%)",
                }}
              >
                AI Team
              </span>
            </h2>
            <p className="mt-3 max-w-lg text-base text-gray-500 dark:text-white/38">
              Ready-to-run agents built for real-world tasks — click to explore the full marketplace.
            </p>
          </div>

          <Link href="/explore">
            <button className="flex shrink-0 items-center gap-2 rounded-xl border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.04] dark:bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-white/60 backdrop-blur-sm transition-all hover:border-black/[0.16] dark:hover:border-white/[0.20] hover:text-gray-900 dark:hover:text-white">
              Browse all <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>

        {/* Grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PREVIEW_AGENTS.map((agent, i) => (
            <div
              key={agent.name}
              className={cn(
                "transition-all duration-700",
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
              )}
              style={{ transitionDelay: `${120 + i * 80}ms` }}
            >
              <AgentCard agent={agent} />
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div
          className={cn(
            "mt-12 text-center transition-all duration-700 delay-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          <Link href="/explore">
            <button className="group inline-flex items-center gap-2 rounded-xl border border-black/[0.10] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.03] px-8 py-3 text-sm font-semibold text-gray-500 dark:text-white/50 backdrop-blur-sm transition-all hover:border-[#007AFF]/40 hover:bg-[#007AFF]/8 hover:text-[#007AFF]">
              Explore full marketplace
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </Link>
        </div>
      </div>
    </section>
  );
}
