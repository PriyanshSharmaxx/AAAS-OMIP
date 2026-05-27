/**
 * Dashboard hooks with mock data for demo.
 * Replace delay() calls with real API fetches when backend is ready.
 */

import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────

export interface UserStats {
  total_agents_used: number;
  total_runs: number;
  usage_hours: number;
  api_calls: number;
  success_rate: number;
}

export interface CreatorStats {
  total_agents_created: number;
  total_runs: number;
  active_users: number;
  revenue: number;
  api_calls_consumed: number;
}

export interface ChartPoint {
  label: string;
  value: number;
}

export interface ActivityItem {
  id: string;
  agent_name: string;
  agent_icon: string;
  status: "success" | "failed" | "running";
  duration: string;
  time: string;
  category: string;
}

export interface AgentMetric {
  id: string;
  name: string;
  runs: number;
  success_rate: number;
  avg_time: string;
  error_rate: number;
  revenue: number;
}

export interface RevenuePoint {
  label: string;
  total: number;
  subscription: number;
  pay_per_use: number;
}

export interface DeploymentItem {
  id: string;
  name: string;
  status: "live" | "draft" | "failed";
  version: string;
  deployed_at: string;
  runs: number;
}

export interface SavedAgent {
  id: string;
  name: string;
  category: string;
  creator: string;
  last_used: string;
}

// ── Mock data factories ────────────────────────────────────────────────────

const MOCK_USER_STATS: UserStats = {
  total_agents_used: 24,
  total_runs: 187,
  usage_hours: 41.5,
  api_calls: 2340,
  success_rate: 94.2,
};

const MOCK_CREATOR_STATS: CreatorStats = {
  total_agents_created: 8,
  total_runs: 4821,
  active_users: 312,
  revenue: 2847.5,
  api_calls_consumed: 98200,
};

const LAST_7_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const LAST_6_MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"];

const MOCK_USAGE_OVER_TIME: ChartPoint[] = LAST_7_DAYS.map((label, i) => ({
  label,
  value: [12, 19, 8, 24, 31, 15, 22][i],
}));

const MOCK_CATEGORY_USAGE: ChartPoint[] = [
  { label: "Code Gen", value: 45 },
  { label: "Analysis", value: 30 },
  { label: "Research", value: 15 },
  { label: "Writing", value: 10 },
];

const MOCK_REVENUE: RevenuePoint[] = LAST_6_MONTHS.map((label, i) => ({
  label,
  total: [820, 940, 1100, 980, 1340, 1580][i],
  subscription: [600, 700, 800, 720, 980, 1100][i],
  pay_per_use: [220, 240, 300, 260, 360, 480][i],
}));

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "1", agent_name: "AutoCoder Pro", agent_icon: "🤖", status: "success", duration: "2m 14s", time: "2 min ago", category: "Development" },
  { id: "2", agent_name: "DataInsight AI", agent_icon: "📊", status: "success", duration: "45s", time: "18 min ago", category: "Analytics" },
  { id: "3", agent_name: "ResearchBot", agent_icon: "🔬", status: "failed", duration: "1m 02s", time: "1h ago", category: "Research" },
  { id: "4", agent_name: "ContentWriter", agent_icon: "✍️", status: "success", duration: "38s", time: "3h ago", category: "Writing" },
  { id: "5", agent_name: "AutoCoder Pro", agent_icon: "🤖", status: "running", duration: "—", time: "Just now", category: "Development" },
  { id: "6", agent_name: "SEO Optimizer", agent_icon: "📈", status: "success", duration: "1m 55s", time: "5h ago", category: "Marketing" },
];

const MOCK_AGENT_METRICS: AgentMetric[] = [
  { id: "1", name: "AutoCoder Pro", runs: 1840, success_rate: 96.2, avg_time: "1m 52s", error_rate: 3.8, revenue: 1240 },
  { id: "2", name: "DataInsight AI", runs: 1102, success_rate: 98.1, avg_time: "44s", error_rate: 1.9, revenue: 820 },
  { id: "3", name: "ResearchBot", runs: 673, success_rate: 91.4, avg_time: "3m 10s", error_rate: 8.6, revenue: 480 },
  { id: "4", name: "ContentWriter", runs: 892, success_rate: 97.8, avg_time: "38s", error_rate: 2.2, revenue: 307 },
  { id: "5", name: "SEO Optimizer", runs: 314, success_rate: 93.6, avg_time: "2m 05s", error_rate: 6.4, revenue: 0 },
];

const MOCK_DEPLOYMENTS: DeploymentItem[] = [
  { id: "1", name: "AutoCoder Pro", status: "live", version: "v2.4.1", deployed_at: "Apr 2, 2026", runs: 1840 },
  { id: "2", name: "DataInsight AI", status: "live", version: "v1.8.0", deployed_at: "Mar 28, 2026", runs: 1102 },
  { id: "3", name: "ResearchBot", status: "draft", version: "v1.1.0-beta", deployed_at: "—", runs: 0 },
  { id: "4", name: "ContentWriter", status: "live", version: "v3.0.2", deployed_at: "Mar 15, 2026", runs: 892 },
  { id: "5", name: "NightOwl Agent", status: "failed", version: "v0.9.0", deployed_at: "Apr 1, 2026", runs: 0 },
];

const MOCK_SAVED_AGENTS: SavedAgent[] = [
  { id: "1", name: "AutoCoder Pro", category: "Development", creator: "DevForge Labs", last_used: "2 min ago" },
  { id: "2", name: "DataInsight AI", category: "Analytics", creator: "DataFlow Inc", last_used: "18 min ago" },
  { id: "3", name: "ContentWriter", category: "Writing", creator: "CreativeAI Co", last_used: "3h ago" },
  { id: "4", name: "SEO Optimizer", category: "Marketing", creator: "GrowthHQ", last_used: "5h ago" },
];

const MOCK_API_USAGE: ChartPoint[] = LAST_7_DAYS.map((label, i) => ({
  label,
  value: [8400, 12100, 6800, 15200, 19800, 9400, 14600][i],
}));

const MOCK_USER_RUNS_OVER_TIME: ChartPoint[] = LAST_7_DAYS.map((label) => ({
  label,
  value: 0,
}));

// ── User dashboard hook ────────────────────────────────────────────────────

export interface UserDashboardData {
  stats: UserStats;
  usageOverTime: ChartPoint[];
  categoryUsage: ChartPoint[];
  runsOverTime: ChartPoint[];
  recentActivity: ActivityItem[];
  savedAgents: SavedAgent[];
}

export function useUserDashboard() {
  const [data, setData] = useState<UserDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Backend: GET /api/stats/dashboard → { success: true, data: { agents, executions, ... } }
      const res = await api.get<{ success: boolean; data: {
        executions: { total: number; completed: number; failed: number; running: number; successRate: number };
        agents: { total: number; active: number; draft: number };
        usage: { totalTokens: number; totalDurationMs: number };
      } }>("/stats/dashboard");

      const stats = res.data ?? (res as unknown as typeof res.data);

      const totalRuns   = stats.executions?.total       ?? 0;
      const successRate = stats.executions?.successRate  ?? 100;
      const usageHours  = Math.round((stats.usage?.totalDurationMs ?? 0) / 3_600_000 * 10) / 10;

      setData({
        stats: {
          total_agents_used: stats.agents?.total       ?? 0,
          total_runs:        stats.executions?.total   ?? 0,
          usage_hours:       usageHours,
          api_calls:         stats.usage?.totalTokens  ?? 0, // using tokens as proxy for calls if not separate
          success_rate:      successRate,
        },
        usageOverTime:  MOCK_USAGE_OVER_TIME,
        categoryUsage:  MOCK_CATEGORY_USAGE,
        runsOverTime:   MOCK_USER_RUNS_OVER_TIME,
        recentActivity: [], // real activity would come from another endpoint or expanded /stats/dashboard
        savedAgents:    [],
      });
    } catch {
      // API call failed — still show the page with mock data so the UI doesn't hang
      setData({
        stats:          MOCK_USER_STATS,
        usageOverTime:  MOCK_USAGE_OVER_TIME,
        categoryUsage:  MOCK_CATEGORY_USAGE,
        runsOverTime:   MOCK_USER_RUNS_OVER_TIME,
        recentActivity: MOCK_ACTIVITY,
        savedAgents:    MOCK_SAVED_AGENTS,
      });
      setError("Could not reach server — showing demo data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// ── Creator dashboard hook ─────────────────────────────────────────────────

export interface CreatorDashboardData {
  stats: CreatorStats;
  agentMetrics: AgentMetric[];
  revenue: RevenuePoint[];
  apiUsage: ChartPoint[];
  deployments: DeploymentItem[];
  recentActivity: ActivityItem[];
}

export function useCreatorDashboard() {
  const [data, setData] = useState<CreatorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const statsRes = await api.get<any>("/stats/dashboard");
      const { agents, executions, usage, marketplace } = statsRes;

      // In a real app, these would be separate endpoints or more complex joins
      // For now, we use the dashboard stats and default empty lists/charts
      
      const agentMetrics: AgentMetric[] = []; // Empty state is better than mock for production
      
      setData({
        stats: {
          total_agents_created: agents.total || 0,
          total_runs:           executions.total || 0,
          active_users:         0, // Approximated
          revenue:              0, // Billing provided
          api_calls_consumed:   usage.totalTokens || 0,
        },
        agentMetrics,
        revenue:        [], 
        apiUsage:       [],
        deployments:    [],
        recentActivity: [],
      });
    } catch {
      setError("Failed to load creator dashboard data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
