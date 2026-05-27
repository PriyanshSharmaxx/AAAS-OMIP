"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  FILTER_CATEGORIES, BUSINESS_FUNCTIONS, INDUSTRIES, EXECUTION_TYPES,
} from "@/lib/marketplace-data";
import type { FilterState, AgentPricing, AgentDifficulty } from "@/lib/marketplace-data";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SidebarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  totalCount: number;
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function Section({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
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
      {open && <div className="mt-2 space-y-1.5 pb-3">{children}</div>}
      <Separator />
    </div>
  );
}

// ─── Checkbox pill ────────────────────────────────────────────────────────────

function FilterPill({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
          active ? "border-primary bg-primary" : "border-border bg-background"
        )}
      >
        {active && (
          <svg viewBox="0 0 10 8" className="h-2.5 w-2.5 stroke-primary-foreground fill-none stroke-[1.5]">
            <path d="M1 4l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      {label}
    </button>
  );
}

// ─── Toggle helpers ───────────────────────────────────────────────────────────

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export function MarketplaceSidebar({ filters, onChange, totalCount }: SidebarProps) {
  const activeCount =
    filters.categories.length +
    filters.businessFunctions.length +
    filters.pricing.length +
    filters.difficulty.length +
    filters.execution.length;

  const reset = () => onChange({
    ...filters,
    categories: [], businessFunctions: [], industries: [],
    pricing: [], difficulty: [], execution: [],
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
        {totalCount} agent{totalCount !== 1 ? "s" : ""} found
      </div>

      <Separator className="mb-2" />

      {/* Sort */}
      <Section title="Sort By">
        {(["rank", "trending", "newest", "rating", "runs"] as FilterState["sort"][]).map((s) => {
          const labels: Record<string, string> = {
            rank: "Best Match", trending: "Trending", newest: "Newest",
            rating: "Top Rated", runs: "Most Used",
          };
          return (
            <button
              key={s}
              onClick={() => onChange({ ...filters, sort: s })}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors",
                filters.sort === s
                  ? "bg-primary/10 text-primary font-semibold"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <span
                className={cn(
                  "h-2 w-2 rounded-full border transition-colors",
                  filters.sort === s ? "border-primary bg-primary" : "border-border"
                )}
              />
              {labels[s]}
            </button>
          );
        })}
      </Section>

      {/* Category */}
      <Section title="Category">
        {FILTER_CATEGORIES.map((cat) => (
          <FilterPill
            key={cat}
            label={cat}
            active={filters.categories.includes(cat)}
            onClick={() => onChange({ ...filters, categories: toggle(filters.categories, cat) })}
          />
        ))}
      </Section>

      {/* Business Function */}
      <Section title="Business Function" defaultOpen={false}>
        {BUSINESS_FUNCTIONS.map((fn) => (
          <FilterPill
            key={fn}
            label={fn}
            active={filters.businessFunctions.includes(fn)}
            onClick={() => onChange({ ...filters, businessFunctions: toggle(filters.businessFunctions, fn) })}
          />
        ))}
      </Section>

      {/* Industry */}
      <Section title="Industry" defaultOpen={false}>
        {INDUSTRIES.map((ind) => (
          <FilterPill
            key={ind}
            label={ind}
            active={filters.industries.includes(ind)}
            onClick={() => onChange({ ...filters, industries: toggle(filters.industries, ind) })}
          />
        ))}
      </Section>

      {/* Pricing */}
      <Section title="Pricing">
        {(["free", "paid", "subscription"] as AgentPricing[]).map((p) => {
          const labels = { free: "Free", paid: "Pay per use", subscription: "Subscription" };
          return (
            <FilterPill
              key={p}
              label={labels[p]}
              active={filters.pricing.includes(p)}
              onClick={() => onChange({ ...filters, pricing: toggle(filters.pricing, p) })}
            />
          );
        })}
      </Section>

      {/* Difficulty */}
      <Section title="Difficulty">
        {(["beginner", "intermediate", "advanced"] as AgentDifficulty[]).map((d) => {
          const labels = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
          return (
            <FilterPill
              key={d}
              label={labels[d]}
              active={filters.difficulty.includes(d)}
              onClick={() => onChange({ ...filters, difficulty: toggle(filters.difficulty, d) })}
            />
          );
        })}
      </Section>

      {/* Execution */}
      <Section title="Execution Type" defaultOpen={false}>
        {EXECUTION_TYPES.map((ex) => (
          <FilterPill
            key={ex}
            label={ex}
            active={filters.execution.includes(ex)}
            onClick={() => onChange({ ...filters, execution: toggle(filters.execution, ex) })}
          />
        ))}
      </Section>
    </div>
  );
}
