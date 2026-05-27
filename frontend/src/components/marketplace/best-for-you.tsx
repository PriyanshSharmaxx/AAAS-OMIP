"use client";

import Link from "next/link";
import { Sparkles, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarketplaceAgentCard } from "./marketplace-agent-card";
import type { MarketplaceAgent } from "@/lib/marketplace-data";

interface BestForYouProps {
  isLoggedIn: boolean;
  agents?: MarketplaceAgent[];
  onRun?: (agent: MarketplaceAgent) => void;
}

export function BestForYou({ isLoggedIn, agents = [], onRun }: BestForYouProps) {
  if (!isLoggedIn) {
    return (
      <section className="rounded-2xl border border-dashed bg-muted/20 p-8 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <Lock className="h-6 w-6 text-primary" />
        </div>
        <h2 className="mb-1 text-base font-bold">Best for You</h2>
        <p className="mb-4 text-sm text-muted-foreground max-w-sm mx-auto">
          Sign in to get AI-powered recommendations personalised to your role, usage patterns, and goals.
        </p>
        <Link href="/auth/login">
          <Button size="sm" className="gap-1.5">
            <Sparkles className="h-4 w-4" /> Get Personalised Picks
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-4.5 w-4.5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Best for You
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                AI Picks
              </span>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Personalised based on your role and activity
            </p>
          </div>
        </div>
        <Link href="/explore?sort=rank">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {agents.map((agent) => (
          <MarketplaceAgentCard key={agent.id} agent={agent} onRun={onRun} />
        ))}
      </div>
    </section>
  );
}
