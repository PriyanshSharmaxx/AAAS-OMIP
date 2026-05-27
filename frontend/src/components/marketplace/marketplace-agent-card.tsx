"use client";

import Link from "next/link";
import {
  Star, Play, Flame, Zap, DollarSign, Crown,
  Bot, Code2, Database, MessageSquare, BarChart2,
  Users, Briefcase, Shield, FileText, Search,
  Gauge, TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { MarketplaceAgent } from "@/lib/marketplace-data";

// ─── Category icon map ────────────────────────────────────────────────────────

const CAT_ICONS: Record<string, React.ElementType> = {
  Development: Code2,
  DevOps:      Shield,
  Analytics:   BarChart2,
  Marketing:   TrendingUp,
  Sales:       Briefcase,
  HR:          Users,
  Productivity: Zap,
  Finance:     DollarSign,
  Support:     MessageSquare,
  Research:    Search,
  Automation:  Gauge,
};

const CAT_COLORS: Record<string, string> = {
  Development: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  DevOps:      "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  Analytics:   "bg-green-500/10 text-green-600 dark:text-green-400",
  Marketing:   "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  Sales:       "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  HR:          "bg-pink-500/10 text-pink-600 dark:text-pink-400",
  Productivity:"bg-violet-500/10 text-violet-600 dark:text-violet-400",
  Finance:     "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  Support:     "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  Research:    "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  Automation:  "bg-teal-500/10 text-teal-600 dark:text-teal-400",
};

const PRICING_STYLES = {
  free:         "bg-green-500/10 text-green-600 dark:text-green-400 border-green-300/30",
  paid:         "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-300/30",
  subscription: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-300/30",
};

const DIFFICULTY_STYLES = {
  beginner:     "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  advanced:     "bg-red-500/10 text-red-600 dark:text-red-400",
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function RankBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 80 ? "bg-green-500" :
    pct >= 60 ? "bg-amber-500" :
    "bg-muted-foreground/40";

  return (
    <div className="flex items-center gap-1.5" title={`Rank score: ${pct}/100`}>
      <div className="h-1 w-12 overflow-hidden rounded-full bg-border">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{pct}</span>
    </div>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface MarketplaceAgentCardProps {
  agent: MarketplaceAgent;
  showTrendingBadge?: boolean;
  rank?: number;
  onRun?: (agent: MarketplaceAgent) => void;
}

export function MarketplaceAgentCard({ agent, showTrendingBadge, rank, onRun }: MarketplaceAgentCardProps) {
  const Icon = CAT_ICONS[agent.category] ?? Bot;
  const catColor = CAT_COLORS[agent.category] ?? "bg-muted text-muted-foreground";
  const isTrending = agent.trending_score > 1.4;

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
      {/* Top accent */}
      <div className="h-0.5 w-full bg-gradient-to-r from-primary/50 via-primary/20 to-transparent" />

      <div className="flex flex-1 flex-col p-4">
        {/* Header */}
        <div className="mb-3 flex items-start gap-3">
          {/* Icon */}
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", catColor)}>
            <Icon className="h-5 w-5" />
          </div>

          {/* Name + creator */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              {rank && rank <= 3 && (
                <Crown className={cn("h-3.5 w-3.5 shrink-0",
                  rank === 1 ? "text-yellow-500" :
                  rank === 2 ? "text-slate-400" : "text-amber-600"
                )} />
              )}
              <Link
                href={`/agents/${agent.id}`}
                className="truncate font-semibold text-sm leading-tight hover:text-primary transition-colors"
              >
                {agent.name}
              </Link>
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">by {agent.creator_name}</p>
          </div>

          {/* Trending flame */}
          {(isTrending || showTrendingBadge) && (
            <span className="flex shrink-0 items-center gap-0.5 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-500">
              <Flame className="h-2.5 w-2.5" /> Hot
            </span>
          )}
        </div>

        {/* Description */}
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed flex-1">
          {agent.description}
        </p>

        {/* Stats row */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Play className="h-3 w-3" />
            {formatCount(agent.runs_count)} runs
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            {agent.rating.toFixed(1)}
            <span className="opacity-60">({formatCount(agent.reviews_count)})</span>
          </span>
          <span className="ml-auto">
            <RankBar score={agent.rank_score} />
          </span>
        </div>

        {/* Tags row */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", PRICING_STYLES[agent.pricing])}>
            {agent.pricing_label}
          </span>
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", DIFFICULTY_STYLES[agent.difficulty])}>
            {agent.difficulty}
          </span>
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 capitalize">
            {agent.category}
          </Badge>
        </div>

        {/* Actions */}
        <div className="mt-auto flex gap-2">
          <Link href={`/agents/${agent.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full h-8 text-xs">
              Details
            </Button>
          </Link>
          {onRun ? (
            <Button
              size="sm"
              className="flex-1 h-8 text-xs gap-1"
              onClick={() => onRun(agent)}
            >
              <Play className="h-3 w-3" /> Run
            </Button>
          ) : (
            <Link href={`/agents/${agent.id}`} className="flex-1">
              <Button size="sm" className="w-full h-8 text-xs gap-1">
                <Play className="h-3 w-3" /> Run
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Compact horizontal card (for trending carousel) ─────────────────────────

export function TrendingHorizontalCard({ agent, rank, onRun }: { agent: MarketplaceAgent; rank: number; onRun?: (agent: MarketplaceAgent) => void }) {
  const Icon = CAT_ICONS[agent.category] ?? Bot;
  const catColor = CAT_COLORS[agent.category] ?? "bg-muted text-muted-foreground";

  return (
    <div className="group flex min-w-[260px] max-w-[280px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card p-4 transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
      <div className="mb-3 flex items-center gap-3">
        <span className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold border",
          rank === 1 ? "bg-yellow-500/15 text-yellow-600 border-yellow-400/30" :
          rank === 2 ? "bg-slate-300/15 text-slate-500 border-slate-400/30" :
          rank === 3 ? "bg-amber-700/15 text-amber-700 border-amber-600/30" :
          "bg-muted text-muted-foreground border-transparent"
        )}>
          {rank}
        </span>
        <div className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", catColor)}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{agent.name}</p>
          <p className="text-[10px] text-muted-foreground">{agent.creator_name}</p>
        </div>
        <span className="flex shrink-0 items-center gap-0.5 text-[10px] font-semibold text-orange-500">
          <Flame className="h-3 w-3" />
          {((agent.trending_score - 1) * 100).toFixed(0)}%
        </span>
      </div>

      <p className="mb-3 line-clamp-2 text-xs text-muted-foreground">{agent.description}</p>

      <div className="mb-3 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1"><Play className="h-2.5 w-2.5" />{formatCount(agent.runs_count)}</span>
        <span className="flex items-center gap-1"><Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />{agent.rating}</span>
        <Badge variant="secondary" className="ml-auto text-[9px] capitalize px-1.5 py-0">{agent.category}</Badge>
      </div>

      <div className="flex gap-1.5">
        <Link href={`/agents/${agent.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full h-7 text-[11px]">View</Button>
        </Link>
        {onRun ? (
          <Button size="sm" className="flex-1 h-7 text-[11px]" onClick={() => onRun(agent)}>Run</Button>
        ) : (
          <Link href={`/agents/${agent.id}`} className="flex-1">
            <Button size="sm" className="w-full h-7 text-[11px]">Run</Button>
          </Link>
        )}
      </div>
    </div>
  );
}
