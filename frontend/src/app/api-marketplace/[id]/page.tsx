"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, CheckCircle2, Copy, KeyRound, Plus,
  Activity, Clock, Star, Shield, Loader2, AlertCircle,
  ExternalLink, Zap,
} from "lucide-react";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Skeleton }  from "@/components/ui/skeleton";
import { cn }        from "@/lib/utils";
import {
  useApiProduct,
  useSubscribeToApi,
  useAddApiToAgent,
  useAgents,
} from "@/lib/queries";
import type { ApiProduct } from "@/lib/types";
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
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

const PRICING_COLORS: Record<string, string> = {
  free:     "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  per_call: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  monthly:  "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400",
};

function formatPrice(api: ApiProduct): string {
  if (api.pricingType === "free") return "Free";
  if (api.pricingType === "per_call" && api.pricePerCall != null)
    return `$${(api.pricePerCall / 100).toFixed(3)} / call`;
  if (api.pricingType === "monthly" && api.priceMonthly != null)
    return `$${(api.priceMonthly / 100).toFixed(0)} / month`;
  return api.pricingType;
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k`;
  return String(n);
}

// ─── Add-to-Agent modal ───────────────────────────────────────────────────────

function AddToAgentModal({
  api,
  open,
  onOpenChange,
}: {
  api: ApiProduct;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: agentsData } = useAgents();
  const addMutation          = useAddApiToAgent();
  const [added, setAdded]    = useState<string | null>(null);
  const agents               = agentsData?.agents ?? [];

  const handleAdd = async (agentId: string) => {
    try {
      await addMutation.mutateAsync({ agentId, apiId: api.id });
      setAdded(agentId);
    } catch { /* mutation surfaces error */ }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { onOpenChange(o); setAdded(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Agent</DialogTitle>
          <DialogDescription>
            Choose which agent should use <strong>{api.name}</strong>.
          </DialogDescription>
        </DialogHeader>
        {agents.length === 0 ? (
          <div className="flex flex-col items-center py-8 gap-3 text-center">
            <p className="text-sm text-muted-foreground">You have no agents yet.</p>
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Close</Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto py-1">
            {agents.map((agent) => {
              const isAdded = added === agent.id;
              const loading = addMutation.isPending && addMutation.variables?.agentId === agent.id;
              return (
                <div key={agent.id} className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{agent.name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{agent.category}</p>
                  </div>
                  <Button
                    size="sm"
                    variant={isAdded ? "outline" : "default"}
                    className={cn("h-8 gap-1.5 ml-3", isAdded && "border-green-500/40 text-green-600 dark:text-green-400")}
                    disabled={loading || isAdded}
                    onClick={() => handleAdd(agent.id)}
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : isAdded ? (
                      <><CheckCircle2 className="h-3.5 w-3.5" /> Added</>
                    ) : (
                      <><Plus className="h-3.5 w-3.5" /> Add</>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Uptime bar ───────────────────────────────────────────────────────────────

function UptimeBar({ pct }: { pct: number }) {
  const color = pct >= 99.9 ? "bg-green-500" : pct >= 99 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-32 overflow-hidden rounded-full bg-border">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium">{pct}%</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id }  = use(params);
  const router  = useRouter();

  const { data: api, isLoading, isError } = useApiProduct(id);

  const subscribeMutation = useSubscribeToApi();
  const [subscribed,   setSubscribed]   = useState(false);
  const [copiedUrl,    setCopiedUrl]    = useState(false);
  const [copiedKey,    setCopiedKey]    = useState(false);
  const [agentModalOpen, setAgentModalOpen] = useState(false);

  const handleCopyUrl = () => {
    if (!api?.baseUrl) return;
    void navigator.clipboard.writeText(api.baseUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 1500);
  };

  const handleCopyKey = () => {
    if (!api?.apiKey) return;
    void navigator.clipboard.writeText(api.apiKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 1500);
  };

  const handleSubscribe = async (planId?: string) => {
    if (!api) return;
    try {
      await subscribeMutation.mutateAsync({ apiId: api.id, planId });
      setSubscribed(true);
    } catch { /* mutation surfaces error */ }
  };

  const isNowSubscribed = subscribed || api?.isSubscribed;

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen pt-20 pb-16">
        <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
          <Skeleton className="h-8 w-48 rounded-lg" />
          <div className="rounded-2xl border bg-card p-6 space-y-4">
            <div className="flex gap-4">
              <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-1/3 rounded" />
                <Skeleton className="h-4 w-1/5 rounded" />
              </div>
            </div>
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
            <div className="grid grid-cols-4 gap-4 pt-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────────
  if (isError || !api) {
    return (
      <div className="min-h-screen pt-20 pb-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <AlertCircle className="mx-auto h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-semibold">API not found</h2>
          <p className="text-sm text-muted-foreground">
            This API doesn&apos;t exist or is no longer available.
          </p>
          <Button variant="outline" onClick={() => router.push("/api-marketplace")} className="gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Back to Marketplace
          </Button>
        </div>
      </div>
    );
  }

  const catIcon      = CATEGORY_ICONS[api.category] ?? "🔧";
  const pricingColor = PRICING_COLORS[api.pricingType] ?? PRICING_COLORS.free;

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button
            onClick={() => router.push("/api-marketplace")}
            className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> API Marketplace
          </button>
          <span>/</span>
          <span className="text-foreground font-medium truncate">{api.name}</span>
        </div>

        {/* ── Hero card ── */}
        <div className="rounded-2xl border bg-card overflow-hidden">
          {/* top accent */}
          <div className={cn(
            "h-1 w-full bg-gradient-to-r to-transparent",
            isNowSubscribed ? "from-green-500/70 via-green-500/30" : "from-primary/70 via-primary/30",
          )} />

          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-3xl">
                {catIcon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold">{api.name}</h1>
                  {api.isVerified && (
                    <span title="Verified"><CheckCircle2 className="h-4 w-4 text-blue-500 shrink-0" /></span>
                  )}
                  {api.isTrending && (
                    <span className="rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-semibold text-orange-500">
                      🔥 Hot
                    </span>
                  )}
                  {isNowSubscribed && (
                    <span className="flex items-center gap-0.5 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-600 dark:text-green-400">
                      <KeyRound className="h-2.5 w-2.5" /> Subscribed
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground capitalize">{api.category}</p>
              </div>
              <Badge variant="secondary" className="shrink-0">v{api.version}</Badge>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              {api.description}
            </p>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", pricingColor)}>
                {formatPrice(api)}
              </span>
              {api.freeCallsPerDay > 0 && (
                <span className="rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-2.5 py-1 text-xs font-medium">
                  {api.freeCallsPerDay} free calls/day
                </span>
              )}
              <Badge variant="secondary" className="px-2.5 py-1 text-xs">{api.category}</Badge>
              <Badge variant="outline" className="px-2.5 py-1 text-xs capitalize">
                {api.authType.replace("_", " ")}
              </Badge>
              {api.tags.map((tag) => (
                <Badge key={tag} variant="outline" className="px-2.5 py-1 text-xs text-muted-foreground">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total Calls",  value: formatCount(api.requestCount), icon: Activity },
            { label: "Rating",       value: `⭐ ${api.rating?.toFixed(1) ?? "N/A"}`, icon: Star },
            { label: "Avg Latency",  value: api.latencyMs ? `${api.latencyMs}ms` : "—", icon: Clock },
            { label: "Uptime",       value: `${api.uptimePct ?? 100}%`, icon: Zap },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                <p className="text-[11px] text-muted-foreground">{label}</p>
              </div>
              <p className="text-lg font-bold">{value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* ── Main Info ── */}
          <div className="md:col-span-2 space-y-6">
            {/* ── Plans ── */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Subscription Plans
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {api.plans.map((plan) => {
                  const isActive = api.activePlan?.id === plan.id;
                  return (
                    <div key={plan.id} className={cn(
                      "rounded-2xl border bg-card p-5 transition-all",
                      isActive ? "ring-2 ring-primary border-primary" : "hover:border-primary/30"
                    )}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-bold">{plan.name}</h3>
                          <p className="text-2xl font-black mt-1">
                            ${(plan.price / 100).toFixed(0)}
                            <span className="text-xs font-normal text-muted-foreground">/mo</span>
                          </p>
                        </div>
                        {isActive && <Badge className="bg-primary">Current</Badge>}
                      </div>
                      <ul className="space-y-2 mb-6">
                        <li className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                          {plan.limit.toLocaleString()} calls / day
                        </li>
                        {plan.features.map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            {f}
                          </li>
                        ))}
                      </ul>
                      {!isNowSubscribed ? (
                        <Button 
                          variant={plan.price === 0 ? "outline" : "default"} 
                          className="w-full" 
                          size="sm"
                          onClick={() => handleSubscribe(plan.id)}
                          disabled={subscribeMutation.isPending}
                        >
                          {plan.price === 0 ? "Get Started" : "Select Plan"}
                        </Button>
                      ) : !isActive && (
                        <Button variant="ghost" className="w-full" size="sm" onClick={() => handleSubscribe(plan.id)}>
                          Switch to this plan
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Reliability ── */}
            <div className="rounded-2xl border bg-card p-6">
              <h2 className="text-base font-semibold mb-4">Reliability</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <UptimeBar pct={api.uptimePct ?? 100} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Latency</span>
                  <span className="text-sm font-medium">{api.latencyMs}ms</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={cn(
                    "flex items-center gap-1.5 text-sm font-medium",
                    api.isActive ? "text-green-600 dark:text-green-400" : "text-red-500",
                  )}>
                    <span className={cn(
                      "inline-block h-2 w-2 rounded-full",
                      api.isActive ? "bg-green-500" : "bg-red-500",
                    )} />
                    {api.isActive ? "Operational" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Sidebar ── */}
          <div className="space-y-6">
            {/* ── Provider ── */}
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="text-sm font-bold mb-4">Provider</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                  {api.provider.displayName?.[0] || api.provider.username[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-bold">{api.provider.displayName || api.provider.username}</p>
                  <p className="text-[10px] text-muted-foreground">Member since {new Date(api.createdAt).getFullYear()}</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {api.provider.bio || "This provider has not added a bio yet."}
              </p>
              <Button variant="outline" size="sm" className="w-full">View Profile</Button>
            </div>

            {/* ── Endpoints ── */}
            <div className="rounded-2xl border bg-card p-6 space-y-4">
              <h2 className="text-base font-semibold flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                Connectivity
              </h2>
              <div>
                <p className="mb-1.5 text-xs text-muted-foreground font-medium">Base URL</p>
                <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5">
                  <code className="flex-1 truncate text-xs font-mono">
                    {api.baseUrl}
                  </code>
                  <button onClick={handleCopyUrl} className="shrink-0 text-muted-foreground hover:text-foreground">
                    {copiedUrl ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              {isNowSubscribed && api.apiKey && (
                <div>
                  <p className="mb-1.5 text-xs text-muted-foreground font-medium">Your API Key</p>
                  <div className="flex items-center gap-2 rounded-lg border border-green-500/30 bg-green-500/5 px-3 py-2.5">
                    <code className="flex-1 truncate text-xs font-mono text-green-700 dark:text-green-300">
                      {api.apiKey}
                    </code>
                    <button onClick={handleCopyKey} className="shrink-0 text-green-600">
                      {copiedKey ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {isNowSubscribed ? (
            <Button
              className="flex-1 h-11 gap-2 border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10"
              variant="outline"
              onClick={() => setAgentModalOpen(true)}
            >
              <Plus className="h-4 w-4" /> Add to Agent
            </Button>
          ) : (
            <Button
              className="flex-1 h-11 gap-2"
              disabled={subscribeMutation.isPending}
              onClick={() => handleSubscribe()}
            >
              {subscribeMutation.isPending
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <KeyRound className="h-4 w-4" />}
              Quick Subscribe
            </Button>
          )}
          <Button
            variant="outline"
            className="flex-1 h-11 gap-2"
            onClick={() => router.push("/api-marketplace")}
          >
            <ArrowLeft className="h-4 w-4" /> Back to Marketplace
          </Button>
        </div>
      </div>

      {/* Add-to-agent modal */}
      {api && (
        <AddToAgentModal
          api={api}
          open={agentModalOpen}
          onOpenChange={setAgentModalOpen}
        />
      )}
    </div>
  );
}
