/**
 * useExplore
 *
 * Fetches explore data from GET /api/agents/explore.
 * Strictly uses real API data.
 */

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { type MarketplaceAgent, type FeaturedCollection } from "@/lib/marketplace-data";

export interface ExploreData {
  curated:     MarketplaceAgent[];
  newArrivals: MarketplaceAgent[];
  bestForYou:  MarketplaceAgent[];
  trending:    MarketplaceAgent[];
  all:         MarketplaceAgent[];
  collections: FeaturedCollection[];
}

export function useExplore() {
  const [data, setData]       = useState<ExploreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    api
      .get<{ success: boolean; data: ExploreData }>("/agents/explore")
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setError(null);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message || "Failed to load marketplace data");
          setData(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
