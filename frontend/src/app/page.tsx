/**
 * Landing page — Omip AaaS Platform
 *
 * Dark-first layout ("Liquid Glass" / Adaptive Minimalism design system).
 * Wrapping the entire page in className="dark" ensures that all child
 * components pick up dark-mode CSS variable values via the
 * `@custom-variant dark (&:is(.dark *))` rule in globals.css.
 *
 * Sections:
 *   1. HeroSection      — headline + floating agent-card preview
 *   2. StatsStrip       — glowing platform metrics
 *   3. FeaturesSection  — six frosted-glass feature cards
 *   4. AgentPreviewSection — showcase of seeded agents
 *   5. CTASection       — conversion block
 *   6. LandingFooter    — dark minimal footer (replaces root Footer on "/")
 */

import { MeshBackground }       from "@/components/landing/MeshBackground";
import { HeroSection }          from "@/components/landing/HeroSection";
import { StatsStrip }           from "@/components/landing/StatsStrip";
import { FeaturesSection }      from "@/components/landing/FeaturesSection";
import { AgentPreviewSection }  from "@/components/landing/AgentPreviewSection";
import { CTASection }           from "@/components/landing/CTASection";
import { LandingFooter }        from "@/components/landing/LandingFooter";

export default function LandingPage() {
  return (
    /* `dark` class cascades dark-mode CSS variables to all children */
    <div className="relative min-h-screen overflow-x-hidden">

      {/* Fixed animated mesh background — z-0, pointer-events: none */}
      <MeshBackground />

      {/* Page sections — z-10, stacked above the mesh */}
      <HeroSection />
      <StatsStrip />
      <FeaturesSection />
      <AgentPreviewSection />
      <CTASection />
      <LandingFooter />
    </div>
  );
}
