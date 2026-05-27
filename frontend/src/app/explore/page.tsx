"use client";

import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Search, ArrowRight, SlidersHorizontal, X,
  Flame, LayoutGrid, List, ChevronLeft, ChevronRight, Sparkles,
  ArrowLeft, TrendingUp, Code2, Users,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

import { FeaturedCollections } from "@/components/marketplace/featured-collections";
import { MarketplaceSidebar } from "@/components/marketplace/marketplace-sidebar";
import { MarketplaceAgentCard, TrendingHorizontalCard } from "@/components/marketplace/marketplace-agent-card";
import { BestForYou } from "@/components/marketplace/best-for-you";
import { AgentRunnerDialog } from "@/components/agent-runner/AgentRunnerDialog";
import type { Agent } from "@/lib/types";

import {
  applyFilters,
  FEATURED_COLLECTIONS,
  MARKETPLACE_AGENTS,
} from "@/lib/marketplace-data";
import type { FilterState, MarketplaceAgent, FeaturedCollection } from "@/lib/marketplace-data";
import { useExplore } from "@/hooks/useExplore";

// ─── Icon map (mirrors featured-collections.tsx) ──────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, TrendingUp, Code2, Users,
};

// ─── Default filter state ─────────────────────────────────────────────────────

const DEFAULT_FILTERS: FilterState = {
  search:            "",
  categories:        [],
  businessFunctions: [],
  industries:        [],
  pricing:           [],
  difficulty:        [],
  execution:         [],
  sort:              "rank",
};

// ─── Skeleton grid ────────────────────────────────────────────────────────────

function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="h-52 rounded-xl" />
      ))}
    </div>
  );
}

// ─── Trending carousel ────────────────────────────────────────────────────────

function TrendingCarousel({
  agents,
  loading,
  onRun,
}: {
  agents: MarketplaceAgent[];
  loading: boolean;
  onRun: (agent: MarketplaceAgent) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right") => {
    ref.current?.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };

  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500/10">
            <Flame className="h-4.5 w-4.5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Trending Now</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Fastest growing agents in the last 72h
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scroll("left")}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => scroll("right")}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden pb-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-44 min-w-[260px] rounded-xl shrink-0" />
          ))}
        </div>
      ) : (
        <div
          ref={ref}
          className="flex gap-4 overflow-x-auto pb-3 scroll-smooth"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {agents.map((agent, i) => (
            <TrendingHorizontalCard key={agent.id} agent={agent} rank={i + 1} onRun={onRun} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── New arrivals ─────────────────────────────────────────────────────────────

function NewArrivals({
  agents,
  loading,
  onRun,
}: {
  agents: MarketplaceAgent[];
  loading: boolean;
  onRun: (agent: MarketplaceAgent) => void;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            New Arrivals
            <Badge variant="secondary" className="text-[10px]">Fresh</Badge>
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">Recently added to the marketplace</p>
        </div>
        <Button variant="ghost" size="sm" className="gap-1 text-xs">
          See all <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <MarketplaceAgentCard key={agent.id} agent={agent} onRun={onRun} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Curated bundles ──────────────────────────────────────────────────────────

function CuratedBundles({
  agents,
  loading,
  onRun,
}: {
  agents: MarketplaceAgent[];
  loading: boolean;
  onRun: (agent: MarketplaceAgent) => void;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-4.5 w-4.5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold flex items-center gap-2">
              Curated Bundles
              <Badge variant="secondary" className="text-[10px]">Editor&apos;s Pick</Badge>
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Top-rated agents selected for quality and impact
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <SkeletonGrid count={6} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent, i) => (
            <MarketplaceAgentCard key={agent.id} agent={agent} rank={i + 1} onRun={onRun} />
          ))}
        </div>
      )}
    </section>
  );
}

// ─── Agent grid ───────────────────────────────────────────────────────────────

function AgentGrid({
  agents,
  loading,
  view,
  onRun,
}: {
  agents:  MarketplaceAgent[];
  loading: boolean;
  view:    "grid" | "list";
  onRun:   (agent: MarketplaceAgent) => void;
}) {
  if (loading) {
    return (
      <div className={view === "grid"
        ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
        : "flex flex-col gap-3"
      }>
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-52 rounded-xl" />
        ))}
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Search className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h3 className="mb-1 text-base font-semibold">No agents found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or search terms.</p>
      </div>
    );
  }

  return (
    <div className={view === "grid"
      ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
      : "flex flex-col gap-3"
    }>
      {agents.map((agent, i) => (
        <MarketplaceAgentCard
          key={agent.id}
          agent={agent}
          rank={i + 1}
          showTrendingBadge={agent.trending_score > 1.5}
          onRun={onRun}
        />
      ))}
    </div>
  );
}

// ─── Collection view ──────────────────────────────────────────────────────────
// Shown when ?collection=<id> is present in the URL.

function CollectionView({
  collection,
  onBack,
  onRun,
  agentPool = [],
}: {
  collection: FeaturedCollection;
  onBack: () => void;
  onRun: (agent: MarketplaceAgent) => void;
  agentPool?: MarketplaceAgent[];
}) {
  const Icon = ICON_MAP[collection.icon] ?? Sparkles;

  // Resolve agents from the pool (or static catalog as fallback)
  const agents = collection.agentIds
    .map((id) => agentPool.find((a) => a.id === id) || MARKETPLACE_AGENTS.find((a) => a.id === id))
    .filter((a): a is MarketplaceAgent => Boolean(a));

  return (
    <div>
      {/* Breadcrumb + back */}
      <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-lg px-2 py-1 hover:bg-muted hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Explore
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{collection.title}</span>
      </div>

      {/* Collection header card */}
      <div className={cn(
        "mb-8 flex items-start gap-4 overflow-hidden rounded-2xl border bg-gradient-to-br p-6",
        collection.gradient,
      )}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm border border-border/40 shadow-sm">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="text-xl font-bold">{collection.title}</h2>
            {collection.badge && (
              <Badge variant="secondary" className="text-[10px]">{collection.badge}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{collection.description}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {agents.length} agent{agents.length !== 1 ? "s" : ""} in this collection
          </p>
        </div>
      </div>

      {/* Agents grid */}
      {agents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Sparkles className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="mb-1 text-base font-semibold">No agents in this collection yet</h3>
          <p className="text-sm text-muted-foreground">Check back soon.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {agents.map((agent, i) => (
            <MarketplaceAgentCard
              key={agent.id}
              agent={agent}
              rank={i + 1}
              onRun={onRun}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Inner page (reads searchParams) ─────────────────────────────────────────

function ExplorePageInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const collectionId = searchParams.get("collection");

  const { user, isAuthenticated } = useAuthStore();
  const { data: exploreData, loading: exploreLoading } = useExplore();

  const [filters,     setFilters]     = useState<FilterState>(DEFAULT_FILTERS);
  const [rawSearch,   setRawSearch]   = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [view,        setView]        = useState<"grid" | "list">("grid");
  const [page,        setPage]        = useState(0);
  const PER_PAGE = 12;

  const [runAgent, setRunAgent] = useState<MarketplaceAgent | null>(null);

  const debouncedSearch = useDebounce(rawSearch, 280);

  useEffect(() => {
    setFilters((f) => ({ ...f, search: debouncedSearch }));
    setPage(0);
  }, [debouncedSearch]);

  const handleFilterChange = useCallback((f: FilterState) => {
    setFilters(f);
    setPage(0);
  }, []);

  // Resolve active collection (if any)
  const activeCollection = collectionId
    ? (exploreData?.collections || FEATURED_COLLECTIONS).find((c) => c.id === collectionId) ?? null
    : null;

  const handleBack = useCallback(() => {
    router.push("/explore");
  }, [router]);

  const allFiltered = applyFilters(exploreData?.all || [], filters);
  const paginated   = allFiltered.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  const totalPages  = Math.ceil(allFiltered.length / PER_PAGE);

  const hasActiveFilters =
    filters.categories.length        > 0 ||
    filters.businessFunctions.length > 0 ||
    filters.pricing.length           > 0 ||
    filters.difficulty.length        > 0 ||
    filters.execution.length         > 0 ||
    filters.search.length            > 0;

  const showSections = !hasActiveFilters && page === 0 && !activeCollection;

  return (
    <div className="min-h-screen pt-20 pb-16">
      {/* ── Run modal ── */}
      {runAgent && (
        <AgentRunnerDialog
          agent={{
            id:             runAgent.id,
            name:           runAgent.name,
            description:    runAgent.description,
            category:       runAgent.category,
            icon_url:       runAgent.icon_url,
            creator_id:     runAgent.creator_id,
            is_public:      runAgent.is_public,
            version:        runAgent.version,
            execution_type: runAgent.execution_type,
            config:         {},
            permissions:    [],
            tools:          [],
            created_at:     runAgent.created_at,
            updated_at:     runAgent.updated_at,
            pricing:        runAgent.pricing,
          } as Agent}
          open={!!runAgent}
          onOpenChange={(open) => { if (!open) setRunAgent(null); }}
        />
      )}

      {/* ── Hero search banner ── */}
      <div className="border-b bg-card/60 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 text-center">
            {activeCollection ? (
              <>
                <h1 className="text-3xl font-bold tracking-tight">Featured Collections</h1>
                <p className="mt-2 text-muted-foreground">
                  Curated agent bundles for every use case
                </p>
              </>
            ) : (
              <>
                <h1 className="text-3xl font-bold tracking-tight">Agent Marketplace</h1>
                <p className="mt-2 text-muted-foreground">
                  Discover {exploreData?.all?.length || 0}+ AI agents ranked by performance, quality, and popularity
                </p>
              </>
            )}
          </div>

          {/* Search — hidden when viewing a collection */}
          {!activeCollection && (
            <div className="mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={rawSearch}
                  onChange={(e) => setRawSearch(e.target.value)}
                  placeholder="Search agents by name, category, or use case…"
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
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* ── Collection view ── */}
        {activeCollection ? (
            <CollectionView
              collection={activeCollection}
              onBack={handleBack}
              onRun={setRunAgent}
              agentPool={exploreData?.all}
            />
        ) : (
          <>
            {/* ── Discovery sections (no filters, page 0) ── */}
            {showSections && (
              <div className="mb-12 space-y-12">
                <FeaturedCollections collections={exploreData?.collections} />

                <TrendingCarousel
                  agents={exploreData?.trending || []}
                  loading={exploreLoading}
                  onRun={setRunAgent}
                />

                <CuratedBundles
                  agents={exploreData?.curated || []}
                  loading={exploreLoading}
                  onRun={setRunAgent}
                />

                <BestForYou
                  isLoggedIn={isAuthenticated}
                  agents={exploreData?.bestForYou || []}
                  onRun={setRunAgent}
                />

                <NewArrivals
                  agents={exploreData?.newArrivals || []}
                  loading={exploreLoading}
                  onRun={setRunAgent}
                />

                <Separator />
              </div>
            )}

            {/* ── All Agents layout ── */}
            <div className="flex gap-8">
              {/* Desktop sidebar */}
              <aside className="hidden lg:block w-52 shrink-0">
                <div className="sticky top-24">
                  <MarketplaceSidebar
                    filters={filters}
                    onChange={handleFilterChange}
                    totalCount={allFiltered.length}
                  />
                </div>
              </aside>

              {/* Main content */}
              <div className="flex-1 min-w-0">
                {/* Toolbar */}
                <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold">
                      {hasActiveFilters ? "Filtered Results" : "All Agents"}
                    </h2>
                    <span className="text-sm text-muted-foreground">
                      ({allFiltered.length})
                    </span>
                    {hasActiveFilters && (
                      <button
                        onClick={() => { setFilters(DEFAULT_FILTERS); setRawSearch(""); }}
                        className="flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-2.5 w-2.5" /> Clear filters
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="lg:hidden gap-1.5 h-8 text-xs"
                      onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                      <SlidersHorizontal className="h-3.5 w-3.5" />
                      Filters
                      {(filters.categories.length + filters.pricing.length + filters.difficulty.length) > 0 && (
                        <Badge variant="secondary" className="h-4 min-w-4 rounded-full px-1 text-[9px]">
                          {filters.categories.length + filters.pricing.length + filters.difficulty.length}
                        </Badge>
                      )}
                    </Button>

                    <div className="flex rounded-md border">
                      <Button
                        variant={view === "grid" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-r-none border-r"
                        onClick={() => setView("grid")}
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={view === "list" ? "secondary" : "ghost"}
                        size="icon"
                        className="h-8 w-8 rounded-l-none"
                        onClick={() => setView("list")}
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Mobile sidebar */}
                {sidebarOpen && (
                  <div className="mb-6 rounded-xl border bg-card p-4 lg:hidden">
                    <MarketplaceSidebar
                      filters={filters}
                      onChange={handleFilterChange}
                      totalCount={allFiltered.length}
                    />
                  </div>
                )}

                {/* Active filter chips */}
                {(filters.categories.length > 0 || filters.pricing.length > 0 || filters.difficulty.length > 0) && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {filters.categories.map((c) => (
                      <button
                        key={c}
                        onClick={() => handleFilterChange({ ...filters, categories: filters.categories.filter((x) => x !== c) })}
                        className="flex items-center gap-1 rounded-full border bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/20 transition-colors"
                      >
                        {c} <X className="h-2.5 w-2.5" />
                      </button>
                    ))}
                    {filters.pricing.map((p) => (
                      <button
                        key={p}
                        onClick={() => handleFilterChange({ ...filters, pricing: filters.pricing.filter((x) => x !== p) })}
                        className="flex items-center gap-1 rounded-full border bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/20 transition-colors capitalize"
                      >
                        {p} <X className="h-2.5 w-2.5" />
                      </button>
                    ))}
                    {filters.difficulty.map((d) => (
                      <button
                        key={d}
                        onClick={() => handleFilterChange({ ...filters, difficulty: filters.difficulty.filter((x) => x !== d) })}
                        className="flex items-center gap-1 rounded-full border bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary hover:bg-primary/20 transition-colors capitalize"
                      >
                        {d} <X className="h-2.5 w-2.5" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Grid */}
                <AgentGrid
                  agents={paginated}
                  loading={exploreLoading && page === 0}
                  view={view}
                  onRun={setRunAgent}
                />

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="mt-8 flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={page === 0}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Prev
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => (
                        <button
                          key={i}
                          onClick={() => setPage(i)}
                          className={cn(
                            "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition-colors",
                            page === i
                              ? "bg-primary text-primary-foreground"
                              : "hover:bg-muted text-muted-foreground"
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
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
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page (wrapped in Suspense for useSearchParams) ───────────────────────────

export default function ExplorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen pt-20 pb-16">
        <div className="border-b bg-card/60 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-8">
            <div className="mb-6 text-center">
              <Skeleton className="mx-auto h-9 w-64 rounded-lg" />
              <Skeleton className="mx-auto mt-3 h-4 w-96 rounded" />
            </div>
            <Skeleton className="mx-auto h-11 max-w-xl rounded-lg" />
          </div>
        </div>
        <div className="mx-auto max-w-6xl px-4 py-8">
          <SkeletonGrid count={6} />
        </div>
      </div>
    }>
      <ExplorePageInner />
    </Suspense>
  );
}
