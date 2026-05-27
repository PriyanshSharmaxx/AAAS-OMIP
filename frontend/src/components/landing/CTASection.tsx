"use client";

import Link from "next/link";
import { ArrowRight, Zap, Users, Shield, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const TRUST_ITEMS = [
  { icon: Users,  label: "10K+ developers" },
  { icon: Star,   label: "4.8 avg rating" },
  { icon: Shield, label: "SOC-2 compliant" },
  { icon: Zap,    label: "99.9% uptime" },
] as const;

export function CTASection() {
  const { ref, visible } = useScrollReveal<HTMLElement>();

  return (
    <section
      ref={ref}
      className="relative z-10 px-4 py-32"
      aria-label="Call to action"
    >
      <div className="mx-auto max-w-4xl text-center">

        {/* Ambient radial glow — subtle in light, more visible in dark */}
        <div
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
          aria-hidden
        >
          <div
            className="h-[500px] w-[700px] rounded-full opacity-[0.04] dark:opacity-[0.07] blur-3xl transition-opacity duration-300"
            style={{ background: "radial-gradient(ellipse, #007AFF 0%, transparent 70%)" }}
          />
        </div>

        {/* Divider */}
        <div className="mb-16 h-px w-full bg-gradient-to-r from-transparent via-black/[0.08] dark:via-white/[0.08] to-transparent" />

        {/* Badge */}
        <div
          className={cn(
            "mb-7 inline-flex items-center gap-2 rounded-full border border-[#007AFF]/25 bg-[#007AFF]/8 px-4 py-1.5 backdrop-blur-sm transition-all duration-700",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-[#007AFF] animate-orb-breathe" />
          <span className="text-xs font-semibold text-[#007AFF]">Get started in 60 seconds</span>
        </div>

        {/* Headline */}
        <h2
          className={cn(
            "mb-6 text-4xl font-extrabold leading-[1.1] tracking-tight text-gray-900 dark:text-white sm:text-5xl lg:text-6xl transition-all duration-700 delay-100",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          Start Building or Running{" "}
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #007AFF 0%, #5856D6 50%, #34AADC 100%)",
              backgroundSize: "200% 200%",
              animation: "gradient-flow 5s ease infinite",
            }}
          >
            Agents Today
          </span>
        </h2>

        <p
          className={cn(
            "mx-auto mb-10 max-w-xl text-lg leading-relaxed text-gray-500 dark:text-white/40 transition-all duration-700 delay-200",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          Join thousands of developers and teams running AI agents at scale.
          No infrastructure to manage. No code required to start.
        </p>

        {/* Primary CTAs */}
        <div
          className={cn(
            "mb-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center transition-all duration-700 delay-300",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
          )}
        >
          <Link href="/auth/signup">
            <button className="group relative flex items-center gap-2.5 overflow-hidden rounded-xl bg-[#007AFF] px-10 py-4 text-base font-bold text-white shadow-[0_0_0_1px_rgba(0,122,255,0.4),0_8px_32px_rgba(0,122,255,0.30)] transition-all duration-300 hover:bg-[#006AE0] hover:shadow-[0_0_60px_rgba(0,122,255,0.55)] active:scale-[0.97]">
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.12] to-transparent transition-transform duration-500 group-hover:translate-x-full" />
              <Zap className="h-5 w-5 shrink-0" />
              Create Free Account
              <ArrowRight className="h-5 w-5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            </button>
          </Link>

          <Link href="/explore">
            <button className="flex items-center gap-2 rounded-xl border border-black/[0.12] dark:border-white/[0.12] bg-black/[0.04] dark:bg-white/[0.04] px-8 py-4 text-base font-semibold text-gray-700 dark:text-white/65 backdrop-blur-sm transition-all hover:border-black/[0.20] dark:hover:border-white/[0.22] hover:text-gray-900 dark:hover:text-white">
              Browse Marketplace
            </button>
          </Link>
        </div>

        {/* Trust strip */}
        <div
          className={cn(
            "flex flex-wrap items-center justify-center gap-6 transition-all duration-700 delay-500",
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4",
          )}
        >
          {TRUST_ITEMS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2">
              <Icon className="h-3.5 w-3.5 text-gray-400 dark:text-white/25" />
              <span className="text-xs text-gray-400 dark:text-white/30">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
