"use client";

import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Code2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FEATURED_COLLECTIONS, MARKETPLACE_AGENTS } from "@/lib/marketplace-data";
import type { FeaturedCollection } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ElementType> = {
  Sparkles, TrendingUp, Code2, Users,
};

function CollectionCard({ col }: { col: FeaturedCollection }) {
  const Icon = ICON_MAP[col.icon] ?? Sparkles;
  const preview = MARKETPLACE_AGENTS.filter((a) => col.agentIds.includes(a.id)).slice(0, 3);

  return (
    <div
      className={cn(
        "relative flex flex-col justify-between overflow-hidden rounded-2xl border bg-gradient-to-br p-5 transition-all duration-200",
        "hover:shadow-lg hover:border-primary/20 hover:-translate-y-0.5",
        col.gradient
      )}
    >
      {/* Badge */}
      {col.badge && (
        <Badge className="absolute right-4 top-4 text-[10px]" variant="secondary">
          {col.badge}
        </Badge>
      )}

      {/* Icon + title */}
      <div className="mb-3">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm border border-border/40 shadow-sm">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <h3 className="text-base font-bold leading-tight">{col.title}</h3>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed line-clamp-2">
          {col.description}
        </p>
      </div>

      {/* Agent name pills */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {preview.map((a) => (
          <span
            key={a.id}
            className="rounded-full bg-background/60 backdrop-blur-sm border border-border/30 px-2.5 py-0.5 text-[10px] font-medium text-foreground/80"
          >
            {a.name}
          </span>
        ))}
        {col.agentIds.length > 3 && (
          <span className="rounded-full bg-background/60 border border-border/30 px-2.5 py-0.5 text-[10px] text-muted-foreground">
            +{col.agentIds.length - 3} more
          </span>
        )}
      </div>

      {/* CTA */}
      <Link href={`/explore?collection=${col.id}`}>
        <Button size="sm" variant="secondary" className="h-8 w-full gap-1.5 text-xs bg-background/70 hover:bg-background/90">
          {col.cta}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </div>
  );
}

export function FeaturedCollections({ collections = FEATURED_COLLECTIONS }: { collections?: FeaturedCollection[] }) {
  return (
    <section>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Featured Collections</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Curated agent bundles for every use case</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {collections.map((col) => (
          <CollectionCard key={col.id} col={col} />
        ))}
      </div>
    </section>
  );
}
