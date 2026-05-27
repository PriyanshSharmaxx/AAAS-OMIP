"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Search, X, Flame, Star, Store, SlidersHorizontal,
  ChevronLeft, ChevronRight, Activity, TrendingUp,
  CheckCircle2, KeyRound, Plus, Loader2, BarChart2, Eye,
} from "lucide-react";
import { Input }     from "@/components/ui/input";
import { Button }    from "@/components/ui/button";
import { Badge }     from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { cn }           from "@/lib/utils";
import { useDebounce }  from "@/hooks/use-debounce";
import { ApiCard, ApiCardHorizontal, CATEGORY_ICONS } from "@/components/api-marketplace/api-card";
import { ApiFiltersSidebar } from "@/components/api-marketplace/api-filters-sidebar";
import {
  useApiProducts,
  useAddApiToAgent,
  useAgents,
  useSubscribeToApi as useSubscribeToApiInPage,
} from "@/lib/queries";
import type { ApiProduct } from "@/lib/types";

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search:     string;
  categories: string[];
  pricing:    string[];
  auth_type:  string[];
  min_rating: number;
  sort:       string;
}

const DEFAULT_FILTERS: FilterState = {
  search:     "",
  categories: [],
  pricing:    [],
  auth_type:  [],
  min_rating: 0,
  sort:       "trending",
};

// ─── Subscribed toast ─────────────────────────────────────────────────────────

function SubscribedToast({ api, onDismiss }: { api: ApiProduct; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 4000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-xl border bg-card shadow-lg px-4 py-3 animate-in slide-in-from-bottom-4">
      <KeyRound className="h-5 w-5 text-green-500" />
      <div>
        <p className="text-sm font-medium">
          Subscribed to <span className="text-primary">{api.name}</span>
        </p>
        <p className="text-xs text-muted-foreground">Your API key is ready — view it in Dashboard → API Keys</p>
      </div>
      <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground ml-2">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

// ─── Add-to-Agent modal ───────────────────────────────────────────────────────

function AddToAgentModal({
  api,
  open,
  onOpenChange,
}: {
  api: ApiProduct | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { data: agentsData } = useAgents();
  const addMutation          = useAddApiToAgent();
  const [added, setAdded]    = useState<string | null>(null);

  if (!api) return null;

  const agents = agentsData?.agents ?? [];

  const handleAdd = async (agentId: string) => {
    try {
      await addMutation.mutateAsync({ agentId, apiId: api.id });
      setAdded(agentId);
    } catch {
      // error handled by mutation
    }
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
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto py-1">
            {agents.map((agent) => {
              const isAdded = added === agent.id;
              const loading = addMutation.isPending && addMutation.variables?.agentId === agent.id;
              return (
                <div
                  key={agent.id}
                  className="flex items-center justify-between rounded-xl border bg-muted/30 px-3 py-2.5"
                >
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

// ─── Featured card ────────────────────────────────────────────────────────────

const CATEGORY_GRADIENTS: Record<string, string> = {
  "AI/ML":         "from-violet-500/10 to-violet-500/5",
  "Data":          "from-blue-500/10 to-blue-500/5",
  "Finance":       "from-green-500/10 to-green-500/5",
  "Communication": "from-amber-500/10 to-amber-500/5",
  "Search":        "from-cyan-500/10 to-cyan-500/5",
  "Security":      "from-red-500/10 to-red-500/5",
  "Storage":       "from-slate-500/10 to-slate-500/5",
  "Analytics":     "from-indigo-500/10 to-indigo-500/5",
  "Productivity":  "from-pink-500/10 to-pink-500/5",
};

function FeaturedApiCard({
  api,
  onSubscribed,
  onAddToAgent,
}: {
  api: ApiProduct;
  onSubscribed: (a: ApiProduct) => void;
  onAddToAgent: (a: ApiProduct) => void;
}) {
  const gradient        = CATEGORY_GRADIENTS[api.category] ?? "from-primary/10 to-primary/5";
  const subscribeMutation = useSubscribeToApiInPage();
  const router          = useRouter();

  const handleView = () => router.push(`/api-marketplace/${api.id}`);

  const handleSubscribe = async () => {
    try {
      await subscribeMutation.mutateAsync({ apiId: api.id });
      onSubscribed(api);
    } catch { /* mutation surfaces errors */ }
  };

  return (
    <div className={cn(
      "relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5",
      gradient,
    )}>
      {api.isVerified && (
        <Badge className="absolute right-4 top-4 text-[10px] gap-1" variant="secondary">
          <CheckCircle2 className="h-3 w-3 text-blue-500" /> Verified
        </Badge>
      )}
      <div className="mb-4">
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm border border-border/40 shadow-sm text-2xl">
          {CATEGORY_ICONS[api.category] ?? "🔧"}
        </div>
        <h3 className="text-base font-bold">{api.name}</h3>
        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{api.description}</p>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {[
          { label: "Uptime",  value: `${api.uptimePct}%` },
          { label: "Latency", value: `${api.latencyMs}ms` },
          { label: "Rating",  value: `⭐ ${api.rating.toFixed(1)}` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-lg bg-background/60 border border-border/30 px-2 py-1.5 text-center">
            <p className="text-[10px] text-muted-foreground">{label}</p>
            <p className="text-xs font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap gap-1.5">
        {api.tags.slice(0, 4).map((t) => (
          <span key={t} className="rounded-full bg-background/60 border border-border/30 px-2 py-0.5 text-[10px] font-medium">
            {t}
          </span>
        ))}
      </div>

      {/* Standardised [ View ] [ Subscribe ] buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-9 gap-1.5 text-xs bg-background/60" onClick={handleView}>
          <Eye className="h-3.5 w-3.5" /> View
        </Button>
        {api.isSubscribed ? (
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-9 gap-1.5 text-xs border-green-500/40 text-green-600 dark:text-green-400 hover:bg-green-500/10 bg-background/60"
            onClick={() => onAddToAgent(api)}
          >
            <Plus className="h-3.5 w-3.5" /> Add to Agent
          </Button>
        ) : (
          <Button
            size="sm"
            className="flex-1 h-9 gap-1.5 text-xs"
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
  );
}

// ─── Trending carousel ────────────────────────────────────────────────────────

function TrendingCarousel({
  apis,
  onSubscribed,
  onAddToAgent,
}: {
  apis: ApiProduct[];
  onSubscribed: (a: ApiProduct) => void;
  onAddToAgent: (a: ApiProduct) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") =>
    ref.current?.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className="h-4.5 w-4.5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Trending APIs</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Most-used this week</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div ref={ref} className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {apis.map((api) => (
          <ApiCardHorizontal key={api.id} api={api} onSubscribed={onSubscribed} onAddToAgent={onAddToAgent} />
        ))}
      </div>
    </section>
  );
}

// ─── Category strip ───────────────────────────────────────────────────────────

const ALL_CATEGORIES = [
  "AI/ML", "Data", "Communication", "Finance", "Search",
  "Storage", "Analytics", "Security", "Productivity", "Media",
];

function CategoryStrip({ onFilter, counts }: { onFilter: (cat: string) => void; counts: Record<string, number> }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-bold">Browse by Category</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
        {ALL_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => onFilter(cat)}
            className="flex items-center gap-3 rounded-xl border bg-card p-3 text-left transition-all hover:border-primary/40 hover:bg-primary/5 hover:-translate-y-0.5 hover:shadow-sm"
          >
            <span className="text-xl">{CATEGORY_ICONS[cat] ?? "🔧"}</span>
            <div>
              <p className="text-xs font-semibold">{cat}</p>
              <p className="text-[10px] text-muted-foreground">{counts[cat] ?? 0} API{counts[cat] !== 1 ? "s" : ""}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

// ─── Creator banner ───────────────────────────────────────────────────────────

function CreatorBanner() {
  return (
    <section className="rounded-2xl border border-dashed bg-gradient-to-r from-primary/5 to-violet-500/5 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
            <TrendingUp className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-bold">Publish Your API</h3>
            <p className="text-sm text-muted-foreground">Reach 10k+ developers and monetize your APIs on the marketplace.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-6 text-center">
            {[
              { label: "Avg Revenue",      value: "$2.4k/mo" },
              { label: "Avg Integrations", value: "340" },
              { label: "Uptime SLA",       value: "99.9%" },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-sm font-bold">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <Button className="gap-1.5 ml-4">
            <Plus className="h-4 w-4" /> Publish API
          </Button>
        </div>
      </div>
    </section>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="flex flex-col rounded-xl border bg-card p-4 gap-3 animate-pulse">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-xl bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-2/3 rounded bg-muted" />
          <div className="h-2.5 w-1/3 rounded bg-muted" />
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="h-2.5 w-full rounded bg-muted" />
        <div className="h-2.5 w-4/5 rounded bg-muted" />
      </div>
      <div className="h-8 w-full rounded bg-muted" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiMarketplacePage() {
  const [filters,      setFilters]      = useState<FilterState>(DEFAULT_FILTERS);
  const [rawSearch,    setRawSearch]    = useState("");
  const [sidebarOpen,  setSidebarOpen]  = useState(false);
  const [page,         setPage]         = useState(0);
  const [subscribedApi, setSubscribedApi] = useState<ApiProduct | null>(null);
  const [addToAgentApi, setAddToAgentApi] = useState<ApiProduct | null>(null);
  const [addModalOpen,  setAddModalOpen]  = useState(false);
  const PER_PAGE = 12;

  const debouncedSearch = useDebounce(rawSearch, 280);

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch }));
    setPage(0);
  }, [debouncedSearch]);

  // Fetch real data
  const queryParams = {
    ...(filters.search     ? { search:   filters.search } : {}),
    ...(filters.categories.length === 1 ? { category: filters.categories[0] } : {}),
    ...(filters.pricing.length    === 1 ? { pricing:  filters.pricing[0] as "free" | "per_call" | "monthly" } : {}),
    page:  page + 1,
    limit: PER_PAGE,
  };

  const { data, isLoading } = useApiProducts(queryParams);

  const allProducts   = data?.products ?? [];
  const totalCount    = data?.total    ?? 0;
  const totalPages    = data?.pages    ?? 0;
  const featuredApis  = allProducts.filter((a) => a.isFeatured).slice(0, 4);
  const trendingApis  = allProducts.filter((a) => a.isTrending).slice(0, 10);

  const hasActiveFilters =
    filters.categories.length > 0 ||
    filters.pricing.length > 0 ||
    filters.auth_type.length > 0 ||
    filters.min_rating > 0 ||
    filters.search.length > 0;

  const showSections = !hasActiveFilters && page === 0;

  // Category counts from current result set
  const categoryCounts = allProducts.reduce<Record<string, number>>((acc, a) => {
    acc[a.category] = (acc[a.category] ?? 0) + 1;
    return acc;
  }, {});

  const handleSubscribed = useCallback((api: ApiProduct) => {
    setSubscribedApi(api);
  }, []);

  const handleAddToAgent = useCallback((api: ApiProduct) => {
    setAddToAgentApi(api);
    setAddModalOpen(true);
  }, []);

  const handleCategoryFilter = useCallback((cat: string) => {
    setFilters((f) => ({ ...f, categories: [cat] }));
    setPage(0);
    window.scrollTo({ top: 600, behavior: "smooth" });
  }, []);

  // Platform stats
  const totalRequests = allProducts.reduce((s, a) => s + a.requestCount, 0);
  const avgUptime     = allProducts.length
    ? allProducts.reduce((s, a) => s + a.uptimePct, 0) / allProducts.length
    : 99.9;
  const avgLatency    = allProducts.length
    ? Math.round(allProducts.reduce((s, a) => s + a.latencyMs, 0) / allProducts.length)
    : 0;

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* ── Hero banner ── */}
      <div className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <div className="mb-6 text-center">
            <div className="mb-3 flex items-center justify-center gap-2">
              <Store className="h-7 w-7 text-primary" />
              <h1 className="text-3xl font-bold tracking-tight">API Marketplace</h1>
            </div>
            <p className="mt-2 text-muted-foreground max-w-lg mx-auto">
              Discover, subscribe to, and integrate APIs into your agents — from AI models to real-time data feeds.
            </p>
          </div>

          {/* Platform stats */}
          <div className="mb-6 flex justify-center gap-8">
            {[
              { icon: Activity,  label: "API Calls",   value: totalRequests > 0 ? `${(totalRequests / 1_000_000).toFixed(1)}M+` : "—" },
              { icon: Star,      label: "Avg Uptime",  value: `${avgUptime.toFixed(1)}%` },
              { icon: BarChart2, label: "Avg Latency", value: avgLatency > 0 ? `${avgLatency}ms` : "—" },
              { icon: Store,     label: "APIs Listed", value: totalCount || "—" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-bold leading-none">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="mx-auto max-w-xl">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="Search APIs by name, category, or tag…"
                className="h-11 pl-10 pr-10 text-sm bg-background"
              />
              {rawSearch && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setRawSearch("")}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ── Discovery sections (no filters, page 0) ── */}
        {showSections && !isLoading && (
          <div className="mb-12 space-y-12">
            {featuredApis.length > 0 && (
              <section>
                <div className="mb-5">
                  <h2 className="text-lg font-bold">Featured APIs</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Curated picks for AI agent builders</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {featuredApis.map((api) => (
                    <FeaturedApiCard key={api.id} api={api} onSubscribed={handleSubscribed} onAddToAgent={handleAddToAgent} />
                  ))}
                </div>
              </section>
            )}

            {trendingApis.length > 0 && (
              <TrendingCarousel apis={trendingApis} onSubscribed={handleSubscribed} onAddToAgent={handleAddToAgent} />
            )}

            <CategoryStrip onFilter={handleCategoryFilter} counts={categoryCounts} />
            <CreatorBanner />
            <Separator />
          </div>
        )}

        {/* ── All APIs layout ── */}
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-52 shrink-0">
            <div className="sticky top-24">
              <ApiFiltersSidebar
                filters={filters as Parameters<typeof ApiFiltersSidebar>[0]["filters"]}
                onChange={(f) => { setFilters(f as FilterState); setPage(0); }}
                totalCount={totalCount}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold">
                  {hasActiveFilters ? "Filtered Results" : "All APIs"}
                </h2>
                <span className="text-sm text-muted-foreground">({totalCount})</span>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setFilters({ ...DEFAULT_FILTERS }); setRawSearch(""); setPage(0); }}
                    className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-2.5 w-2.5" /> Clear filters
                  </button>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="lg:hidden gap-1.5 h-8 text-xs"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                Filters
              </Button>
            </div>

            {/* Mobile sidebar */}
            {sidebarOpen && (
              <div className="mb-6 rounded-xl border bg-card p-4 lg:hidden">
                <ApiFiltersSidebar
                  filters={filters as Parameters<typeof ApiFiltersSidebar>[0]["filters"]}
                  onChange={(f) => { setFilters(f as FilterState); setPage(0); }}
                  totalCount={totalCount}
                />
              </div>
            )}

            {/* Active filter chips */}
            {filters.categories.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-1.5">
                {filters.categories.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilters((f) => ({ ...f, categories: f.categories.filter((x) => x !== c) }))}
                    className="flex items-center gap-1 rounded-full border bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/20"
                  >
                    {CATEGORY_ICONS[c] ?? "🔧"} {c} <X className="h-2.5 w-2.5" />
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            {isLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
              </div>
            ) : allProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h3 className="mb-1 text-base font-semibold">No APIs found</h3>
                <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {allProducts.map((api) => (
                  <ApiCard
                    key={api.id}
                    api={api}
                    onSubscribed={handleSubscribed}
                    onAddToAgent={handleAddToAgent}
                  />
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i)}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                        page === i ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground",
                      )}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
                <Button
                  variant="outline" size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="gap-1"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Subscribe success toast ── */}
      {subscribedApi && (
        <SubscribedToast api={subscribedApi} onDismiss={() => setSubscribedApi(null)} />
      )}

      {/* ── Add to Agent modal ── */}
      <AddToAgentModal
        api={addToAgentApi}
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
      />
    </div>
  );
}
