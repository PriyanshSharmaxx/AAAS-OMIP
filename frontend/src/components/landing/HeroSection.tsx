"use client";

import Link from "next/link";
import {
  ArrowRight, Bot, Zap, Code2, BarChart3, Sparkles,
  CheckCircle2, Clock, Activity,
} from "lucide-react";
import { GlassCard } from "./GlassCard";

/* ── Floating agent activity cards ─────────────────────────────────────────── */

const AGENT_CARDS = [
  {
    icon:        Code2,
    name:        "CodeAssistant AI",
    tag:         "Development",
    status:      "Running",
    statusColor: "bg-blue-400",
    tagColor:    "text-cyan-600 dark:text-cyan-400",
    stat:        "1,240 tokens",
    statIcon:    Activity,
    delay:       "0s",
  },
  {
    icon:        BarChart3,
    name:        "DataInsight Analyst",
    tag:         "Analytics",
    status:      "Completed",
    statusColor: "bg-emerald-500",
    tagColor:    "text-emerald-600 dark:text-emerald-400",
    stat:        "1.2s",
    statIcon:    Clock,
    delay:       "1.8s",
  },
  {
    icon:        Sparkles,
    name:        "ContentWriter Pro",
    tag:         "Marketing",
    status:      "Ready",
    statusColor: "bg-amber-400",
    tagColor:    "text-orange-600 dark:text-orange-400",
    stat:        "4.7 ★",
    statIcon:    CheckCircle2,
    delay:       "3.4s",
  },
] as const;

/* ── Component ──────────────────────────────────────────────────────────────── */

export function HeroSection() {
  return (
    <section
      className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pt-24 pb-20"
      aria-label="Hero"
    >
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col items-center gap-16 lg:flex-row lg:items-center lg:gap-12">

          {/* ── Left column ── */}
          <div className="flex-1 text-center lg:text-left">

            {/* Eyebrow */}
            <div className="mb-7 inline-flex items-center gap-2.5 rounded-full border border-[#007AFF]/25 bg-[#007AFF]/8 px-4 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] animate-orb-breathe" />
              <span className="text-xs font-semibold tracking-wide text-[#007AFF]">
                Agent-as-a-Service · AaaS Platform
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-5xl font-extrabold leading-[1.08] tracking-tight text-gray-900 dark:text-white sm:text-6xl lg:text-7xl xl:text-[80px]">
              Run Powerful{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #007AFF 0%, #5856D6 50%, #34AADC 100%)",
                  backgroundSize: "200% 200%",
                  animation: "gradient-flow 5s ease infinite",
                }}
              >
                AI Agents
              </span>
              <br />
              in Seconds
            </h1>

            {/* Sub-text */}
            <p className="mb-10 max-w-lg text-lg leading-relaxed text-gray-600 dark:text-white/45 lg:max-w-xl lg:text-xl">
              Discover, configure, and deploy intelligent AI agents — no code
              required. Build multi-agent workflows, connect APIs, and automate
              complex tasks from one unified platform.
            </p>

            {/* CTAs */}
            <div className="flex flex-col items-center gap-3 sm:flex-row lg:items-start">
              <Link href="/auth/signup">
                <button
                  className="group relative flex items-center gap-2 overflow-hidden rounded-xl bg-[#007AFF] px-8 py-3.5 text-sm font-bold text-white shadow-[0_0_0_1px_rgba(0,122,255,0.4)] transition-all duration-300 hover:bg-[#006AE0] hover:shadow-[0_0_40px_rgba(0,122,255,0.45)] active:scale-[0.97]"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent transition-transform duration-500 group-hover:translate-x-full" />
                  <Zap className="h-4 w-4 shrink-0" />
                  Start Building Free
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
                </button>
              </Link>

              <Link href="/explore">
                <button className="flex items-center gap-2 rounded-xl border border-black/[0.12] bg-black/[0.04] px-8 py-3.5 text-sm font-semibold text-gray-700 backdrop-blur-sm transition-all duration-300 hover:border-black/[0.20] hover:bg-black/[0.07] hover:text-gray-900 dark:border-white/[0.14] dark:bg-white/[0.04] dark:text-white/75 dark:hover:border-white/[0.24] dark:hover:bg-white/[0.08] dark:hover:text-white">
                  <Bot className="h-4 w-4 shrink-0" />
                  Explore Agents
                </button>
              </Link>
            </div>

            {/* Micro proof */}
            <div className="mt-8 flex items-center gap-6 justify-center lg:justify-start">
              {[
                { label: "No credit card",    dot: "bg-emerald-500" },
                { label: "Free forever plan", dot: "bg-blue-400" },
                { label: "Deploy in seconds", dot: "bg-violet-500" },
              ].map(({ label, dot }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
                  <span className="text-xs text-gray-500 dark:text-white/40">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Right column — floating agent cards ── */}
          <div className="relative flex w-full max-w-sm shrink-0 flex-col gap-3 lg:max-w-[340px]">

            {/* Ambient glow */}
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-3xl opacity-20 dark:opacity-40 blur-3xl transition-opacity duration-300"
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, rgba(0,122,255,0.4) 0%, transparent 70%)",
              }}
            />

            {AGENT_CARDS.map(
              ({ icon: Icon, name, tag, status, statusColor, tagColor, stat, statIcon: StatIcon, delay }) => (
                <GlassCard
                  key={name}
                  className="flex items-center gap-4 p-4 shadow-xl animate-float"
                  style={{ animationDelay: delay }}
                >
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.07] bg-black/[0.04] dark:border-white/[0.08] dark:bg-white/[0.06] ${tagColor}`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-semibold text-gray-900 dark:text-white">{name}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`h-1.5 w-1.5 rounded-full ${statusColor} animate-orb-breathe`} />
                        <span className="text-[10px] font-medium text-gray-400 dark:text-white/40">{status}</span>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${tagColor}`}>{tag}</span>
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-white/30">
                        <StatIcon className="h-2.5 w-2.5" />
                        {stat}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              ),
            )}

            {/* Live log strip */}
            <GlassCard className="overflow-hidden p-4">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-white/25">
                Live Execution
              </p>
              <div className="space-y-1.5 font-mono">
                {[
                  { t: "00:01", msg: "Agent initialised",  c: "text-gray-400 dark:text-white/30" },
                  { t: "00:02", msg: "Calling Groq LLM…",  c: "text-blue-500 dark:text-blue-400/70" },
                  { t: "00:04", msg: "✓ Output generated",  c: "text-emerald-600 dark:text-emerald-400/80" },
                ].map(({ t, msg, c }) => (
                  <div key={t} className="flex items-center gap-2 text-[11px]">
                    <span className="shrink-0 text-gray-300 dark:text-white/20">{t}</span>
                    <span className={c}>{msg}</span>
                  </div>
                ))}
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="shrink-0 text-gray-300 dark:text-white/20">00:05</span>
                  <span className="inline-block h-3 w-1.5 bg-[#007AFF]/70 animate-pulse" />
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 opacity-20 dark:opacity-20">
        <span className="text-[9px] uppercase tracking-[0.2em] text-gray-700 dark:text-white">Scroll</span>
        <div className="h-8 w-px bg-gradient-to-b from-gray-700/60 to-transparent dark:from-white/60" />
      </div>
    </section>
  );
}
