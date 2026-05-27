"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";

export interface BillingPlanView {
  id: string;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  displayFeatures: string[];
  normalizedFeatures: {
    maxAgents: number | null;
    monthlyCredits: number;
    maxRunsPerMonth: number | null;
    monthlyApiCalls: number | null;
    teamMembers: number | null;
    prioritySupport: boolean;
    support: string;
  };
}

export interface BillingInvoiceView {
  id: string;
  amount: number;
  status: string;
  currency: string;
  createdAt: string;
  items?: Array<{
    id: string;
    amount: number;
    description: string;
    quantity: number;
  }>;
}

export interface BillingStatusView {
  subscription: {
    id: string;
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    plan: BillingPlanView;
  } | null;
  lifecycle: {
    status: string;
    isActive: boolean;
    isInGracePeriod: boolean;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: string | null;
    graceEndsAt: string | null;
  };
  effectivePlan: BillingPlanView;
  quotas: {
    credits: {
      remaining: number;
      lifetimeUsed: number;
      includedPerPeriod: number;
    };
    agents: { used: number; limit: number | null; remaining: number | null };
    runs: { used: number; limit: number | null; remaining: number | null };
    apiCalls: { used: number; limit: number | null; remaining: number | null };
  };
  invoices: BillingInvoiceView[];
  creditLogs: Array<{
    id: string;
    amount: number;
    type: string;
    note: string | null;
    createdAt: string;
  }>;
}

export interface CreatorBillingSummary {
  totals: {
    activeListings: number;
    subscriptions: number;
    billableRuns: number;
    grossRevenue: number;
    netRevenue: number;
    pendingPayouts: number;
    processedPayouts: number;
  };
  monthlyRevenue: Array<{
    label: string;
    grossRevenue: number;
    netRevenue: number;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    status: string;
    createdAt: string;
    periodStart: string;
    periodEnd: string;
  }>;
}

export function useBillingOverview() {
  const { isAuthenticated, user } = useAuthStore();
  const [plans, setPlans] = useState<BillingPlanView[]>([]);
  const [status, setStatus] = useState<BillingStatusView | null>(null);
  const [creatorSummary, setCreatorSummary] = useState<CreatorBillingSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const planRes = await api.get<{ success: boolean; data: BillingPlanView[] }>("/billing/plans");
      setPlans(planRes.data);

      if (isAuthenticated) {
        const statusRes = await api.get<{ success: boolean; data: BillingStatusView }>("/billing/status");
        setStatus(statusRes.data);

        if (user?.role === "CREATOR" || user?.role === "ADMIN") {
          const creatorRes = await api.get<{ success: boolean; data: CreatorBillingSummary }>("/billing/creator-summary");
          setCreatorSummary(creatorRes.data);
        } else {
          setCreatorSummary(null);
        }
      } else {
        setStatus(null);
        setCreatorSummary(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load billing data.");
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, user?.role]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const subscribeToPlan = useCallback(async (planId: string) => {
    setActionLoading(`subscribe:${planId}`);
    try {
      await api.post("/billing/subscribe", { planId });
      await refresh();
    } finally {
      setActionLoading(null);
    }
  }, [refresh]);

  const cancelSubscription = useCallback(async () => {
    setActionLoading("cancel");
    try {
      await api.post("/billing/cancel", {});
      await refresh();
    } finally {
      setActionLoading(null);
    }
  }, [refresh]);

  const topupCredits = useCallback(async (amount: number) => {
    setActionLoading(`topup:${amount}`);
    try {
      await api.post("/billing/credits/topup", { amount });
      await refresh();
    } finally {
      setActionLoading(null);
    }
  }, [refresh]);

  return {
    plans,
    status,
    creatorSummary,
    loading,
    actionLoading,
    error,
    refresh,
    subscribeToPlan,
    cancelSubscription,
    topupCredits,
    isAuthenticated,
    role: user?.role ?? null,
  };
}
