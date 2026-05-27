"use client";

import { useState } from "react";
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { CATEGORY_ICONS } from "@/components/api-marketplace/api-card";

// ── Shared filter-state type (generic string arrays — no legacy data dependency) ──

export interface ApiFilterState {
  search:     string;
  categories: string[];
  pricing:    string[];
  auth_type:  string[];
  min_rating: number;
  sort:       string;
}

const API_CATEGORIES = [
  "AI/ML", "Data", "Communication", "Finance", "Search",
  "Storage", "Analytics", "Security", "Productivity", "Media",
] as const;

// ── Collapsible section ────────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: {
  title: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="mt-1.5 space-y-1 pb-3">{children}</div>}
      <Separator />
    </div>
  );
}

// ── Filter pill ────────────────────────────────────────────────────────────────

function FilterPill({ label, active, onClick, prefix }: {
  label: string; active: boolean; onClick: () => void; prefix?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors",
        active ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        active ? "border-primary bg-primary" : "border-border bg-background"
      )}>
        {active && (
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 stroke-primary-foreground fill-none stroke-[1.5]">
            <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {prefix && <span>{prefix}</span>}
      {label}
    </button>
  );
}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

// ── Sidebar component ─────────────────────────────────────────────────────────

interface ApiFiltersSidebarProps {
  filters: ApiFilterState;
  onChange: (f: ApiFilterState) => void;
  totalCount: number;
}

export function ApiFiltersSidebar({ filters, onChange, totalCount }: ApiFiltersSidebarProps) {
  const activeCount =
    filters.categories.length +
    filters.pricing.length +
    filters.auth_type.length +
    (filters.min_rating > 0 ? 1 : 0);

  const reset = () => onChange({
    ...filters,
    categories: [],
    pricing: [],
    auth_type: [],
    min_rating: 0,
  });

  return (
    <div className="w-full space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Filters</span>
          {activeCount > 0 && (
            <Badge variant="secondary" className="h-5 min-w-5 rounded-full px-1.5 text-[10px]">
              {activeCount}
            </Badge>
          )}
        </div>
        {activeCount > 0 && (
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-muted-foreground" onClick={reset}>
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground pb-2">
        {totalCount} API{totalCount !== 1 ? "s" : ""} found
      </div>

      <Separator className="mb-2" />

      {/* Sort */}
      <Section title="Sort By">
        {([
          { value: "trending",  label: "Trending" },
          { value: "rating",    label: "Top Rated" },
          { value: "newest",    label: "Newest" },
          { value: "most_used", label: "Most Used" },
          { value: "price_asc", label: "Price: Low → High" },
        ] as const).map(({ value, label }) => (
          <button
            key={value}
            onClick={() => onChange({ ...filters, sort: value })}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors",
              filters.sort === value
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full border transition-colors",
              filters.sort === value ? "border-primary bg-primary" : "border-border"
            )} />
            {label}
          </button>
        ))}
      </Section>

      {/* Category */}
      <Section title="Category">
        {API_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat}
            label={cat}
            prefix={CATEGORY_ICONS[cat]}
            active={filters.categories.includes(cat)}
            onClick={() => onChange({ ...filters, categories: toggle(filters.categories, cat) })}
          />
        ))}
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        {([
          { value: "free",         label: "Free" },
          { value: "usage",        label: "Usage-based" },
          { value: "subscription", label: "Subscription" },
          { value: "paid",         label: "One-time" },
        ] as const).map(({ value, label }) => (
          <FilterPill
            key={value}
            label={label}
            active={filters.pricing.includes(value)}
            onClick={() => onChange({ ...filters, pricing: toggle(filters.pricing, value) })}
          />
        ))}
      </Section>

      {/* Auth type */}
      <Section title="Authentication" defaultOpen={false}>
        {([
          { value: "api_key", label: "API Key" },
          { value: "oauth",   label: "OAuth 2.0" },
          { value: "bearer",  label: "Bearer Token" },
          { value: "none",    label: "No Auth" },
        ] as const).map(({ value, label }) => (
          <FilterPill
            key={value}
            label={label}
            active={filters.auth_type.includes(value)}
            onClick={() => onChange({ ...filters, auth_type: toggle(filters.auth_type, value) })}
          />
        ))}
      </Section>

      {/* Min rating */}
      <Section title="Min Rating" defaultOpen={false}>
        {[4.5, 4.0, 3.5, 0].map((r) => (
          <button
            key={r}
            onClick={() => onChange({ ...filters, min_rating: r })}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors",
              filters.min_rating === r
                ? "bg-primary/10 text-primary font-semibold"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            )}
          >
            <span className={cn(
              "h-2 w-2 rounded-full border transition-colors",
              filters.min_rating === r ? "border-primary bg-primary" : "border-border"
            )} />
            {r === 0 ? "Any rating" : `⭐ ${r}+`}
          </button>
        ))}
      </Section>
    </div>
  );
}
