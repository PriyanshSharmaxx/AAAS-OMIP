"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star, CheckCircle2,
  Copy, Activity, Clock,
  Loader2, KeyRound, Plus, Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge }  from "@/components/ui/badge";
import { cn }     from "@/lib/utils";
import type { ApiProduct } from "@/lib/types";
import { useSubscribeToApi } from "@/lib/queries";

// ─── Pricing config ────────────────────────────────────────────────────────────

const PRICING_COLORS: Record<string, string> = {
  free:     "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  per_call: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  monthly:  "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

export const CATEGORY_ICONS: Record<string, string> = {
  "AI/ML":         "🤖",
  "Data":          "📊",
  "Communication": "💬",
  "Finance":       "💰",
  "Search":        "🔍",
  "Storage":       "🗄️",
  "Analytics":     "📈",
  "Security":      "🔒",
  "Productivity":  "⚡",
  "Media":         "🎬",
  "general":       "🔧",
};

function formatPrice(api: ApiProduct): string {
  if (api.pricingType === "free") return "Free";
  if (api.pricingType === "per_call" && api.pricePerCall != null)
    return `$${(api.pricePerCall / 100).toFixed(3)}/call`;
  if (api.pricingType === "monthly" && api.priceMonthly != null)
    return `$${(api.priceMonthly / 100).toFixed(0)}/mo`;
  return api.pricingType;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ─── Uptime bar ────────────────────────────────────────────────────────────────

function UptimeBar({ pct }: { pct: number }) {
  const color =
    pct >= 99.9 ? "bg-green-500" : pct >= 99 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5" title={`Uptime: ${pct}%`}>
      <div className="h-1.5 w-14 overflow-hidden rounded-full bg-border">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── Endpoint types ────────────────────────────────────────────────────────────

export interface ApiEndpoint { method: string; path: string; description: string }

// ─── Standard API Card ─────────────────────────────────────────────────────────
//
//  Every card in the marketplace — grid, featured, trending — uses this one
//  component.  Layout (top→bottom):
//    1. Top accent bar
//    2. Header  (icon · name · verified · hot · subscribed · version badge)
//    3. Category label
//    4. Description (2-line clamp)
//    5. Metrics row  (calls · rating · latency · uptime)
//    6. Tags row     (pricing · free tier · category · auth)
//    7. Base-URL copy strip
//    8. Actions      [ View ]  [ Subscribe | Add to Agent ]
//

interface ApiCardProps {
  api:          ApiProduct;
  onSubscribed: (api: ApiProduct) => void;
  onAddToAgent: (api: ApiProduct) => void;
  /** Only used by the trending compact variant */
  compact?:     boolean;
  endpoints?:   ApiEndpoint[];
}

export function ApiCard({
  api,
  onSubscribed,
  onAddToAgent,
  compact = false,
  endpoints: _endpoints = [],
}: ApiCardProps) {
  const [copied, setCopied] = useState(false);
  const subscribeMutation   = useSubscribeToApi();
  const router              = useRouter();

  const handleView = () => {
    if (!api?.id) return;
    router.push(`/api-marketplace/${api.id}`);
  };

  const pricingColor = PRICING_COLORS[api.pricingType] ?? PRICING_COLORS.free;
  const catIcon      = CATEGORY_ICONS[api.category]    ?? "🔧";

  const handleCopy = () => {
    void navigator.clipboard.writeText(api.baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSubscribe = async () => {
    try {
      await subscribeMutation.mutateAsync({ apiId: api.id });
      onSubscribed(api);
    } catch {
      /* mutation surfaces errors */
    }
  };

  // ── compact (trending carousel) variant ──────────────────────────────────────
  if (compact) {
    return (
      <div className="group flex min-w-[280px] max-w-[300px] shrink-0 flex-col overflow-hidden rounded-xl border bg-card transition-all hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
        {/* accent */}
        <div className={cn(
          "h-0.5 w-full bg-gradient-to-r to-transparent",
          api.isSubscribed ? "from-green-500/60 via-green-500/20" : "from-primary/60 via-primary/20",
        )} />

        <div className="flex flex-1 flex-col p-4">
          {/* header */}
          <div className="mb-2.5 flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
              {catIcon}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <p className="truncate text-sm font-semibold">{api.name}</p>
                {api.isVerified && <CheckCircle2 className="h-3 w-3 shrink-0 text-blue-500" />}
              </div>
              <p className="text-[10px] text-muted-foreground capitalize">{api.category}</p>
            </div>
            <Badge variant="secondary" className="text-[9px] shrink-0">v{api.version}</Badge>
          </div>

          {/* description */}
          <p className="mb-2.5 line-clamp-2 text-xs text-muted-foreground leading-relaxed flex-1">
            {api.description}
          </p>

          {/* metrics */}
          <div className="mb-2.5 flex items-center gap-3 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Activity className="h-2.5 w-2.5" />
              {formatCount(api.requestCount)}
            </span>
            <span className="flex items-center gap-1">
              <Star className="h-2.5 w-2.5 fill-yellow-500 text-yellow-500" />
              {api.rating?.toFixed(1) ?? "N/A"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-2.5 w-2.5" />
              {api.latencyMs ? `${api.latencyMs}ms` : "—"}
            </span>
            <span className={cn("ml-auto shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold", pricingColor)}>
              {formatPrice(api)}
            </span>
          </div>

          {/* actions — standardised [ View ] [ Subscribe ] */}
          <div className="mt-auto flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 h-7 text-[11px] gap-1"
              onClick={handleView}
            >
              <Eye className="h-3 w-3" /> View
            </Button>

            {api.isSubscribed ? (
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-[11px] gap-1 border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10"
                onClick={() => onAddToAgent(api)}
              >
                <Plus className="h-3 w-3" /> Add to Agent
              </Button>
            ) : (
              <Button
                size="sm"
                className="flex-1 h-7 text-[11px] gap-1"
                disabled={subscribeMutation.isPending}
                onClick={handleSubscribe}
              >
                {subscribeMutation.isPending
                  ? <Loader2 className="h-3 w-3 animate-spin" />
                  : <KeyRound className="h-3 w-3" />}
                Subscribe
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── standard grid card ────────────────────────────────────────────────────────
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border bg-card transition-all duration-200 hover:shadow-md hover:border-primary/20 hover:-translate-y-0.5">
      {/* top accent bar */}
      <div className={cn(
        "h-0.5 w-full bg-gradient-to-r to-transparent",
        api.isSubscribed ? "from-green-500/60 via-green-500/20" : "from-primary/60 via-primary/20",
      )} />

      <div className="flex flex-1 flex-col p-5">
        {/* ── 1. Header ── */}
        <div className="mb-3 flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
            {catIcon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-semibold text-sm">{api.name}</span>
              {api.isVerified && (
                <span title="Verified">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                </span>
              )}
              {api.isTrending && (
                <span className="rounded-full bg-orange-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-orange-500">
                  🔥 Hot
                </span>
              )}
              {api.isSubscribed && (
                <span className="flex items-center gap-0.5 rounded-full bg-green-500/10 px-1.5 py-0.5 text-[9px] font-semibold text-green-600 dark:text-green-400">
                  <KeyRound className="h-2.5 w-2.5" /> Subscribed
                </span>
              )}
            </div>
            {/* ── 2. Category ── */}
            <p className="text-[11px] text-muted-foreground capitalize">{api.category}</p>
          </div>
          <Badge variant="secondary" className="shrink-0 text-[9px]">v{api.version}</Badge>
        </div>

        {/* ── 3. Description ── */}
        <p className="mb-3 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
          {api.description}
        </p>

        {/* ── 4. Metrics row ── */}
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            {api.requestCount ? formatCount(api.requestCount) : "—"} calls
          </span>
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
            {api.rating != null ? api.rating.toFixed(1) : "N/A"}
            <span className="opacity-60">({api.reviewsCount ?? 0})</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {api.latencyMs ? `${api.latencyMs}ms` : "—"}
          </span>
          <span className="ml-auto">
            <UptimeBar pct={api.uptimePct ?? 100} />
          </span>
        </div>

        {/* ── 5. Pricing + tags row ── */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium", pricingColor)}>
            {formatPrice(api)}
          </span>
          {api.freeCallsPerDay > 0 && (
            <span className="rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 text-[10px] font-medium">
              {api.freeCallsPerDay}/day free
            </span>
          )}
          <Badge variant="secondary" className="px-2 py-0.5 text-[10px]">
            {api.category}
          </Badge>
          <Badge variant="outline" className="px-2 py-0.5 text-[10px] capitalize">
            {api.authType?.replace("_", " ") ?? "API Key"}
          </Badge>
        </div>

        {/* ── 6. Endpoint / base-URL strip ── */}
        <div className="mb-4 flex items-center gap-1.5 rounded-md border bg-muted/40 px-3 py-1.5">
          <code className="flex-1 truncate text-[10px] font-mono text-muted-foreground">
            {api.baseUrl}
          </code>
          <button
            onClick={handleCopy}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            title="Copy URL"
          >
            {copied
              ? <CheckCircle2 className="h-3 w-3 text-green-500" />
              : <Copy className="h-3 w-3" />}
          </button>
        </div>

        {/* ── 7. Action buttons — STANDARDISED ── */}
        {/* Always: [ View (outline) ]  [ Subscribe / Add to Agent (primary) ] */}
        <div className="mt-auto flex gap-2">
          {/* LEFT — View */}
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-xs gap-1.5"
            onClick={handleView}
          >
            <Eye className="h-3.5 w-3.5" /> View
          </Button>

          {/* RIGHT — Subscribe OR Add to Agent */}
          {api.isSubscribed ? (
            <Button
              size="sm"
              variant="outline"
              className="flex-1 h-9 text-xs gap-1.5 border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10"
              onClick={() => onAddToAgent(api)}
            >
              <Plus className="h-3.5 w-3.5" /> Add to Agent
            </Button>
          ) : (
            <Button
              size="sm"
              className="flex-1 h-9 text-xs gap-1.5"
              disabled={subscribeMutation.isPending}
              onClick={handleSubscribe}
            >
              {subscribeMutation.isPending
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <KeyRound className="h-3.5 w-3.5" />}
              Subscribe
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Horizontal card (trending carousel) ──────────────────────────────────────
// Thin wrapper — delegates to ApiCard with compact=true so both share the same
// standardised button pair.

interface ApiCardHorizontalProps {
  api:          ApiProduct;
  onSubscribed: (api: ApiProduct) => void;
  onAddToAgent: (api: ApiProduct) => void;
}

export function ApiCardHorizontal({ api, onSubscribed, onAddToAgent }: ApiCardHorizontalProps) {
  return (
    <ApiCard
      api={api}
      onSubscribed={onSubscribed}
      onAddToAgent={onAddToAgent}
      compact
    />
  );
}
