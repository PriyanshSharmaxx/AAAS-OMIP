"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Trophy, TrendingUp, Star, Users, Bot, MessageSquare,
  Crown, Flame, CheckCircle, BadgeCheck,
  ChevronUp, ThumbsUp, Shield, Key, Activity,
  Clock, Gauge, Globe, Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  CreatorStat, AgentStat, AgentReview, ApiStat,
  LeaderboardTab, LeaderboardPeriod, AgentCategory,
  MOCK_CREATORS, MOCK_AGENTS, MOCK_REVIEWS, MOCK_APIS,
  BADGE_CONFIG, PERIOD_LABELS, CATEGORY_LABELS,
  applyCreatorFilters, applyAgentFilters, applyReviewFilters, applyApiFilters,
  formatRuns, formatRevenue, formatCalls, renderStars,
  CURRENT_USER_RANK,
} from "@/lib/leaderboard-data";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={cn(
              "h-3 w-3",
              s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30",
            )}
          />
        ))}
      </div>
      <span className="text-xs font-medium">{rating.toFixed(1)}</span>
      <span className="text-xs text-muted-foreground">({count})</span>
    </div>
  );
}

function RankMedal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
      {rank}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Period + Category selectors
// ---------------------------------------------------------------------------

function PeriodSelector({
  value,
  onChange,
}: {
  value: LeaderboardPeriod;
  onChange: (v: LeaderboardPeriod) => void;
}) {
  return (
    <div className="flex gap-1 rounded-lg border bg-card p-1">
      {(["daily", "weekly", "monthly"] as LeaderboardPeriod[]).map((p) => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={cn(
            "rounded-md px-3 py-1 text-xs font-medium transition-colors",
            value === p
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {PERIOD_LABELS[p]}
        </button>
      ))}
    </div>
  );
}

function CategorySelector({
  value,
  onChange,
}: {
  value: AgentCategory;
  onChange: (v: AgentCategory) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {(Object.keys(CATEGORY_LABELS) as AgentCategory[]).map((c) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            value === c
              ? "border-primary bg-primary/10 text-primary"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground",
          )}
        >
          {CATEGORY_LABELS[c]}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-3 podium cards
// ---------------------------------------------------------------------------

function PodiumCard({ creator, rank }: { creator: CreatorStat; rank: number }) {
  const configs = {
    1: {
      gradient: "from-amber-500/20 via-amber-500/5 to-transparent",
      border: "border-amber-500/30",
      text: "text-amber-500",
      height: "h-48",
      crown: true,
    },
    2: {
      gradient: "from-slate-400/20 via-slate-400/5 to-transparent",
      border: "border-slate-400/30",
      text: "text-slate-400",
      height: "h-36",
    },
    3: {
      gradient: "from-orange-700/20 via-orange-700/5 to-transparent",
      border: "border-orange-700/30",
      text: "text-orange-700",
      height: "h-28",
    },
  }[rank] || { gradient: "from-muted/20 to-transparent", border: "border-border", text: "text-muted-foreground", height: "h-24" };

  return (
    <div className="flex flex-col items-center gap-3 flex-1 relative group">
      {/* User Info */}
      <div className="text-center z-10 transition-transform duration-300 group-hover:-translate-y-1">
        <div className={cn(
          "relative mx-auto flex items-center justify-center rounded-2xl font-bold text-2xl shadow-xl transition-all duration-300 group-hover:scale-110",
          creator.avatar_color,
          rank === 1 ? "h-20 w-20" : "h-16 w-16",
          "border-4 border-background ring-2",
          configs.border
        )}>
          {creator.avatar_initials}
          {configs.crown && (
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 animate-bounce">
              <Crown className="h-8 w-8 text-amber-500 fill-amber-500" />
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="font-bold text-sm tracking-tight">{creator.username}</p>
          <div className="flex items-center justify-center gap-1.5 mt-0.5">
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              <Activity className="h-2.5 w-2.5" />
              {formatRuns(creator.total_runs)}
            </div>
            <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold text-amber-600">
              <Star className="h-2.5 w-2.5 fill-amber-500" />
              {creator.avg_rating}
            </div>
          </div>
        </div>
      </div>

      {/* Podium Base */}
      <div className={cn(
        "w-full rounded-2xl border bg-gradient-to-b shadow-2xl transition-all duration-500",
        configs.gradient,
        configs.border,
        configs.height
      )}>
        <div className="flex h-full items-end justify-center pb-4">
          <span className={cn("text-4xl font-black opacity-40 italic", configs.text)}>
            {rank}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Creator row
// ---------------------------------------------------------------------------

function CreatorRow({ creator, rank }: { creator: CreatorStat; rank: number }) {
  return (
    <div className={cn(
      "group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
      creator.trending && "border-orange-500/20 bg-orange-500/[0.02]",
    )}>
      {/* Rank */}
      <div className="w-10 flex justify-center shrink-0">
        <RankMedal rank={rank} />
      </div>

      {/* Avatar */}
      <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white text-base font-bold shadow-inner transition-transform group-hover:scale-105", creator.avatar_color)}>
        {creator.avatar_initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm tracking-tight">{creator.username}</span>
          <div className="flex gap-1">
            {creator.badges.map((b) => {
              const cfg = BADGE_CONFIG[b];
              return (
                <span
                  key={b}
                  className={cn("inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", cfg.bgClass, cfg.colorClass)}
                >
                  {cfg.label}
                </span>
              );
            })}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Bot className="h-3 w-3" /> {creator.agent_count} Agents</span>
          <span className="flex items-center gap-1 text-emerald-500 font-medium">
            <TrendingUp className="h-3 w-3" /> {creator.success_rate}% Success
          </span>
          <span className="hidden sm:inline opacity-40">|</span>
          <span className="hidden sm:inline">Top in {creator.top_categories?.join(", ") || "Various"}</span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 px-4">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-black tracking-tight">{formatRuns(creator.total_runs)}</span>
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Runs</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">
          <ChevronUp className="h-2.5 w-2.5" />
          {creator.growth_rate || "15.0"}%
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[90px] border-l pl-4">
        <span className="text-sm font-black text-foreground">{formatRevenue(creator.revenue_usd)}</span>
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Gross Rev</span>
        <StarRating rating={creator.avg_rating} count={creator.review_count} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agent row
// ---------------------------------------------------------------------------

function AgentRow({ agent, rank }: { agent: AgentStat; rank: number }) {
  return (
    <div className={cn(
      "group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
      agent.trending && "border-orange-500/20 bg-orange-500/[0.02]",
    )}>
      <div className="w-10 flex justify-center shrink-0">
        <RankMedal rank={rank} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm tracking-tight">{agent.name}</span>
          <div className="flex gap-1">
            {agent.trending && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-600">
                Trending
              </span>
            )}
            {agent.tokens_optimized && (
              <span className="inline-flex items-center gap-0.5 rounded-md bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cyan-600">
                <Zap className="h-2.5 w-2.5" /> Eco-Mode
              </span>
            )}
          </div>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">by <span className="text-foreground font-medium">{agent.creator_name}</span></span>
          <span className="capitalize px-1.5 py-0.5 rounded bg-secondary/50">{agent.category}</span>
          <span className="hidden sm:flex items-center gap-1 text-emerald-500 font-bold">
            <Activity className="h-3 w-3" /> {agent.success_rate || "90.0"}% Success
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 px-4">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-black tracking-tight">{formatRuns(agent.total_runs)}</span>
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Runs</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
          <ChevronUp className="h-2.5 w-2.5" />
          {agent.growth_rate || "10.5"}%
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[100px] border-l pl-4">
        <StarRating rating={agent.avg_rating} count={agent.review_count} />
        <span className="text-[10px] text-muted-foreground font-medium italic mt-0.5">
          Last: {agent.last_run ? new Date(agent.last_run).toLocaleDateString() : "Recent"}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// API row
// ---------------------------------------------------------------------------

function ApiRow({ api, rank }: { api: ApiStat; rank: number }) {
  return (
    <div className={cn(
      "group flex items-center gap-4 rounded-xl border bg-card p-4 transition-all duration-300 hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5",
      api.trending && "border-orange-500/20 bg-orange-500/[0.02]",
    )}>
      <div className="w-10 flex justify-center shrink-0">
        <RankMedal rank={rank} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sm tracking-tight">{api.name}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{api.provider}</span>
          {api.is_verified && (
            <BadgeCheck className="h-3.5 w-3.5 text-blue-500" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Globe className="h-3 w-3 text-primary" /> {api.category}
          </span>
          <span className="flex items-center gap-1 text-emerald-500 font-bold">
            <Activity className="h-3 w-3" /> {api.uptime}% Uptime
          </span>
          <span className="flex items-center gap-1 text-amber-600 font-bold">
            <Clock className="h-3 w-3" /> {api.latency_ms}ms Latency
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 px-4">
        <div className="flex items-baseline gap-1">
          <span className="text-base font-black tracking-tight">{formatCalls(api.total_calls)}</span>
          <span className="text-[10px] text-muted-foreground font-bold uppercase">Calls</span>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-500 font-bold">
          <TrendingUp className="h-2.5 w-2.5" />
          {api.usage_growth}%
        </div>
      </div>

      <div className="hidden md:flex flex-col items-end gap-0.5 shrink-0 min-w-[110px] border-l pl-4">
        <div className="text-sm font-black text-foreground">
          {api.price_per_1k === 0 ? "FREE" : `$${api.price_per_1k.toFixed(3)}`}
        </div>
        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-tighter">Per 1k Tokens</span>
        <div className="flex items-center gap-1 text-[10px] text-primary font-bold mt-0.5">
          <Key className="h-2.5 w-2.5" /> {api.active_keys.toLocaleString()} Keys
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Review card
// ---------------------------------------------------------------------------

function ReviewCard({ review }: { review: AgentReview }) {
  const stars = Math.round(review.rating);
  return (
    <div className="rounded-xl border bg-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {review.reviewer_initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold">{review.reviewer_name}</span>
              {review.verified_purchase && (
                <span className="flex items-center gap-0.5 text-[10px] text-emerald-600">
                  <BadgeCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            <span className="text-[10px] text-muted-foreground">{review.agent_name}</span>
          </div>
        </div>
        <div className="flex">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} className={cn("h-3.5 w-3.5", s <= stars ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
          ))}
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">{review.title}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{review.body}</p>
      </div>

      <div className="flex items-center justify-between">
        <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          <ThumbsUp className="h-3.5 w-3.5" />
          Helpful ({review.helpful_count})
        </button>
        <span className="text-[10px] text-muted-foreground">
          {new Date(review.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Your Rank card
// ---------------------------------------------------------------------------

function YourRankCard({ tab }: { tab: LeaderboardTab }) {
  const rank = tab === "agents" ? CURRENT_USER_RANK.agent_rank : CURRENT_USER_RANK.creator_rank;
  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Trophy className="h-6 w-6" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Your Rank</p>
        <p className="text-2xl font-bold">#{rank}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
          <span>{formatRuns(CURRENT_USER_RANK.total_runs)} runs</span>
          <span>{formatRevenue(CURRENT_USER_RANK.revenue_usd)} revenue</span>
          <span>★ {CURRENT_USER_RANK.avg_rating}</span>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1 text-xs text-emerald-600">
          <ChevronUp className="h-3 w-3" />
          <span>+3 this week</span>
        </div>
        <span className="text-[10px] text-muted-foreground">vs last period</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function LeaderboardPage() {
  const [tab, setTab]           = useState<LeaderboardTab>("creators");
  const [period, setPeriod]     = useState<LeaderboardPeriod>("weekly");
  const [category, setCategory] = useState<AgentCategory>("all");
  const [minRating, setMinRating] = useState(1);

  const creators = applyCreatorFilters(MOCK_CREATORS, period);
  const agents   = applyAgentFilters(MOCK_AGENTS, period, category);
  const reviews  = applyReviewFilters(MOCK_REVIEWS, minRating);
  const apiStats = applyApiFilters(MOCK_APIS, period);

  const top3 = creators.slice(0, 3);

  const TAB_CONFIG: { key: LeaderboardTab; label: string; icon: React.ElementType; count: number }[] = [
    { key: "creators", label: "Creators", icon: Users,          count: creators.length },
    { key: "agents",   label: "Agents",   icon: Bot,            count: agents.length   },
    { key: "apis",     label: "API Keys", icon: Key,            count: MOCK_APIS.length },
    { key: "reviews",  label: "Reviews",  icon: MessageSquare,  count: reviews.length  },
  ];

  return (
    <div className="min-h-screen bg-background pt-20">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <div className="border-b bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-background">
        <div className="container mx-auto max-w-5xl px-4 py-12">
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
              <Trophy className="h-7 w-7 text-amber-500" />
            </div>
            <h1 className="text-5xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-foreground to-foreground/60">Leaderboard</h1>
            <p className="max-w-xl text-sm text-muted-foreground font-medium leading-relaxed">
              Performance metrics for the Omip ecosystem. Top creators, agents, and API providers ranked by real-time usage, reliability, and community trust.
            </p>

            {/* Quick stats */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
              <div className="flex items-center gap-1.5">
                <Users className="h-4 w-4 text-violet-500" />
                <span className="font-semibold">{MOCK_CREATORS.length}</span>
                <span className="text-muted-foreground">active creators</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Bot className="h-4 w-4 text-blue-500" />
                <span className="font-semibold">{MOCK_AGENTS.length}</span>
                <span className="text-muted-foreground">ranked agents</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold">{MOCK_REVIEWS.length}</span>
                <span className="text-muted-foreground">community reviews</span>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{formatRuns(creators.reduce((s, c) => s + c.total_runs, 0))}</span>
                <span className="text-muted-foreground">total runs</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">

        {/* ── Top 3 Podium (creators tab) ──────────────────────────────── */}
        {tab === "creators" && (
          <div className="mb-8 rounded-2xl border bg-card p-6">
            <div className="mb-4 flex items-center gap-2">
              <Crown className="h-5 w-5 text-amber-500" />
              <h2 className="font-semibold">Top Creators</h2>
              <span className="text-xs text-muted-foreground">· {PERIOD_LABELS[period]}</span>
            </div>
            <div className="flex items-end justify-center gap-3">
              {/* Reorder: 2nd, 1st, 3rd */}
              <PodiumCard creator={top3[1]} rank={2} />
              <PodiumCard creator={top3[0]} rank={1} />
              <PodiumCard creator={top3[2]} rank={3} />
            </div>
          </div>
        )}

        {/* ── Platform Overview ────────────────────────────────────────── */}
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Network Uptime", value: "99.99%", icon: Globe, color: "text-emerald-500" },
            { label: "Avg Latency", value: "142ms", icon: Clock, color: "text-blue-500" },
            { label: "Daily Compute", value: "1.2 PFlops", icon: Zap, color: "text-amber-500" },
            { label: "Active Tokens", value: "842M", icon: Activity, color: "text-violet-500" },
          ].map((stat, i) => (
            <div key={i} className="rounded-2xl border bg-card/50 p-4 backdrop-blur-sm transition-all hover:bg-card">
              <div className="flex items-center gap-3">
                <div className={cn("rounded-lg bg-secondary p-2", stat.color)}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</p>
                  <p className="text-lg font-black tracking-tight">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Your rank card ────────────────────────────────────────────── */}
        {tab !== "reviews" && (
          <div className="mb-8">
            <YourRankCard tab={tab} />
          </div>
        )}

        {/* ── Controls ─────────────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4">
          {/* Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-1 rounded-xl border bg-card p-1">
              {TAB_CONFIG.map((t) => {
                const TIcon = t.icon;
                return (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
                      tab === t.key
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <TIcon className="h-4 w-4" />
                    {t.label}
                    <span className={cn(
                      "rounded-full px-1.5 text-[10px] font-bold",
                      tab === t.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                    )}>
                      {t.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <PeriodSelector value={period} onChange={setPeriod} />
          </div>

          {/* Category filter (agents only) */}
          {tab === "agents" && (
            <CategorySelector value={category} onChange={setCategory} />
          )}

          {/* Min rating filter (reviews only) */}
          {tab === "reviews" && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground">Min rating:</span>
              {[1,2,3,4,5].map((r) => (
                <button
                  key={r}
                  onClick={() => setMinRating(r)}
                  className={cn(
                    "flex items-center gap-0.5 rounded-full px-3 py-1 text-xs border transition-colors",
                    minRating === r
                      ? "border-amber-400 bg-amber-400/10 text-amber-600"
                      : "border-border text-muted-foreground hover:border-foreground/30",
                  )}
                >
                  {"★".repeat(r)}+
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── List ─────────────────────────────────────────────────────── */}
        {tab === "creators" && (
          <div className="space-y-3">
            {creators.map((c, i) => (
              <CreatorRow key={c.id} creator={c} rank={i + 1} />
            ))}
          </div>
        )}

        {tab === "agents" && (
          <div className="space-y-3">
            {agents.length === 0 ? (
              <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
                No agents in this category.
              </div>
            ) : (
              agents.map((a, i) => (
                <AgentRow key={a.id} agent={a} rank={i + 1} />
              ))
            )}
          </div>
        )}

        {tab === "apis" && (
          <div className="space-y-3">
            {apiStats.map((api, i) => (
              <ApiRow key={api.id} api={api} rank={i + 1} />
            ))}
          </div>
        )}

        {tab === "reviews" && (
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </div>
        )}

        {/* ── Legend / badges ──────────────────────────────────────────── */}
        <Separator className="mt-10 mb-6" />
        <div className="flex flex-wrap gap-3">
          <p className="w-full text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Badge Legend</p>
          {(Object.entries(BADGE_CONFIG) as [string, typeof BADGE_CONFIG[keyof typeof BADGE_CONFIG]][]).map(([key, cfg]) => (
            <span
              key={key}
              className={cn("flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border", cfg.bgClass, cfg.colorClass)}
            >
              {cfg.emoji} {cfg.label}
            </span>
          ))}
        </div>

        {/* ── Security notice ────────────────────────────────────────── */}
        <div className="mt-6 flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
          <Shield className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Rankings are computed from verified run data. Reviews require prior agent usage to prevent fake reviews.
            Leaderboard data is cached and refreshed every hour for performance.
          </p>
        </div>
      </div>
    </div>
  );
}
