"use client";

import Link from "next/link";
import {
  TrendingUp,
  Star,
  Play,
  Bot,
  Code2,
  Database,
  MessageSquare,
  Zap,
  Brain,
  ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trendingAgents, type TrendingAgent } from "@/lib/trending-agents";

const categoryIcons: Record<string, React.ElementType> = {
  development: Code2,
  data: Database,
  communication: MessageSquare,
  automation: Zap,
  ai: Brain,
  productivity: Bot,
};

const categoryColors: Record<string, string> = {
  development: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  data: "bg-green-500/10 text-green-600 dark:text-green-400",
  communication: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  automation: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  ai: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  productivity: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
};

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function RankBadge({ rank }: { rank: number }) {
  const colors =
    rank === 1
      ? "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/30"
      : rank === 2
        ? "bg-slate-300/15 text-slate-500 dark:text-slate-400 border-slate-400/30"
        : rank === 3
          ? "bg-amber-700/15 text-amber-700 dark:text-amber-500 border-amber-700/30"
          : "bg-muted text-muted-foreground border-transparent";

  return (
    <span
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${colors}`}
    >
      {rank}
    </span>
  );
}

function TrendingCard({ agent }: { agent: TrendingAgent }) {
  const CategoryIcon = categoryIcons[agent.category] || Bot;
  const catColor = categoryColors[agent.category] || "bg-muted text-muted-foreground";

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/20">
      <CardContent className="p-0">
        {/* Top accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-primary/60 to-primary/20" />

        <div className="p-5">
          {/* Header row: rank + icon + name + category */}
          <div className="mb-3 flex items-start gap-3">
            <RankBadge rank={agent.trending_rank} />
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${catColor}`}>
              <CategoryIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <Link
                href={`/agents/${agent.id}`}
                className="block truncate font-semibold leading-tight hover:text-primary transition-colors"
              >
                {agent.name}
              </Link>
              <span className="text-xs text-muted-foreground">
                by {agent.creator_name}
              </span>
            </div>
            <Badge variant="outline" className="shrink-0 capitalize text-[10px]">
              {agent.execution_type.toLowerCase()}
            </Badge>
          </div>

          {/* Description */}
          <p className="mb-4 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
            {agent.description}
          </p>

          {/* Stats row */}
          <div className="mb-4 flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Play className="h-3 w-3" />
              {formatCount(agent.runs_count)} runs
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
              {agent.rating}
            </span>
            <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
              {agent.category}
            </Badge>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Link href={`/agents/${agent.id}`} className="flex-1">
              <Button variant="outline" size="sm" className="w-full text-xs">
                Details
              </Button>
            </Link>
            <Link href={`/run/${agent.id}`} className="flex-1">
              <Button size="sm" className="w-full text-xs">
                Run Agent
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TrendingAgents() {
  return (
    <section className="mb-10">
      {/* Section header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Trending Agents</h2>
            <p className="text-sm text-muted-foreground">
              Top 10 most popular agents this week
            </p>
          </div>
        </div>
        <Link href="/explore?sort=trending">
          <Button variant="ghost" size="sm" className="gap-1 text-xs">
            View All <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Top 3 featured large */}
      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        {trendingAgents.slice(0, 3).map((agent) => (
          <TrendingCard key={agent.id} agent={agent} />
        ))}
      </div>

      {/* Remaining 7 in compact grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4">
        {trendingAgents.slice(3).map((agent) => (
          <TrendingCompactCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}

function TrendingCompactCard({ agent }: { agent: TrendingAgent }) {
  const CategoryIcon = categoryIcons[agent.category] || Bot;
  const catColor = categoryColors[agent.category] || "bg-muted text-muted-foreground";

  return (
    <Card className="h-full transition-all hover:shadow-md hover:border-primary/20">
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2.5">
          <RankBadge rank={agent.trending_rank} />
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${catColor}`}>
            <CategoryIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={`/agents/${agent.id}`}
              className="block truncate text-sm font-semibold hover:text-primary transition-colors"
            >
              {agent.name}
            </Link>
            <span className="text-[11px] text-muted-foreground">
              {agent.creator_name}
            </span>
          </div>
        </div>
        <p className="mb-3 line-clamp-1 text-xs text-muted-foreground">
          {agent.description}
        </p>
        <div className="mb-3 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Play className="h-2.5 w-2.5" />
            {formatCount(agent.runs_count)}
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
            {agent.rating}
          </span>
          <Badge variant="secondary" className="ml-auto capitalize text-[9px] px-1.5 py-0">
            {agent.category}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/agents/${agent.id}`} className="flex-1">
            <Button variant="outline" size="sm" className="w-full text-[11px] h-7">
              Details
            </Button>
          </Link>
          <Link href={`/run/${agent.id}`} className="flex-1">
            <Button size="sm" className="w-full text-[11px] h-7">
              Run Agent
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
