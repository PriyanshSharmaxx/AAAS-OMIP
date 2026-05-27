"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { LineChart, StackedBarChart } from "@/components/dashboard/mini-chart";
import { ActivityList } from "@/components/dashboard/activity-list";
import { AgentMetricsTable, DeploymentTable } from "@/components/dashboard/agent-metrics-table";
import { useCreatorDashboard } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Users, DollarSign, Cpu, Zap,
  RefreshCw, Download, Plus, ArrowRight,
  Rocket, AlertTriangle, CheckCircle2, FileCode2,
} from "lucide-react";
import Link from "next/link";

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, subtitle, action, children }: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function CreatorDashboardPage() {
  const { data, loading, refetch } = useCreatorDashboard();

  const liveCount = data?.deployments.filter((d) => d.status === "live").length ?? 0;
  const draftCount = data?.deployments.filter((d) => d.status === "draft").length ?? 0;
  const failedCount = data?.deployments.filter((d) => d.status === "failed").length ?? 0;

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Creator Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Performance, revenue, and analytics for your agents.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Link href="/agent-space">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> New Agent
              </Button>
            </Link>
          </div>
        </div>

        {/* ── Overview stats ── */}
        {loading || !data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Agents Created"
              value={data.stats.total_agents_created}
              subtitle="all time"
              icon={<Bot className="h-4 w-4" />}
              trend={{ value: 25, label: "vs last month" }}
              accent="primary"
            />
            <StatCard
              title="Total Runs"
              value={data.stats.total_runs.toLocaleString()}
              subtitle="across all agents"
              icon={<Zap className="h-4 w-4" />}
              trend={{ value: 18.4, label: "vs last month" }}
              accent="green"
            />
            <StatCard
              title="Active Users"
              value={data.stats.active_users}
              subtitle="this month"
              icon={<Users className="h-4 w-4" />}
              trend={{ value: 11.2, label: "vs last month" }}
              accent="purple"
            />
            <StatCard
              title="Revenue"
              value={`$${data.stats.revenue.toLocaleString()}`}
              subtitle="this month"
              icon={<DollarSign className="h-4 w-4" />}
              trend={{ value: 22.8, label: "vs last month" }}
              accent="orange"
            />
            <StatCard
              title="API Calls"
              value={`${(data.stats.api_calls_consumed / 1000).toFixed(1)}k`}
              subtitle="consumed"
              icon={<Cpu className="h-4 w-4" />}
              trend={{ value: -3.2, label: "vs last month" }}
              accent="red"
            />
          </div>
        )}

        {/* ── Charts row ── */}
        {loading || !data ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-56 rounded-xl lg:col-span-2" />
            <Skeleton className="h-56 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Revenue chart */}
            <div className="lg:col-span-2 rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">Revenue</p>
                  <p className="text-xs text-muted-foreground">Last 6 months</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-primary" /> Subscription
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-sm bg-primary/35" /> Pay-per-use
                  </span>
                </div>
              </div>
              <StackedBarChart data={data.revenue} height={160} />
            </div>

            {/* API usage sparkline */}
            <div className="rounded-xl border bg-card p-5">
              <div className="mb-4">
                <p className="text-sm font-semibold">API Usage</p>
                <p className="text-xs text-muted-foreground">Calls per day (last 7 days)</p>
              </div>
              <LineChart data={data.apiUsage} height={120} color="#a855f7" showGrid />
              <div className="mt-3 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Rate limit</span>
                <Badge variant="secondary">
                  {Math.round((data.stats.api_calls_consumed / 100000) * 100)}% used
                </Badge>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-purple-500 transition-all"
                  style={{ width: `${Math.round((data.stats.api_calls_consumed / 100000) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ── Agent performance ── */}
        <Section
          title="Agent Performance"
          subtitle="Per-agent metrics across all deployments"
          action={
            <Link href="/agent-space">
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                Manage agents <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          }
        >
          {loading || !data ? (
            <Skeleton className="h-48 rounded-xl" />
          ) : (
            <AgentMetricsTable metrics={data.agentMetrics} showRevenue />
          )}
        </Section>

        {/* ── Activity + Deployment ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent activity */}
          <Section title="Recent Executions">
            {loading || !data ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <ActivityList items={data.recentActivity.slice(0, 5)} />
            )}
          </Section>

          {/* Deployment status */}
          <Section
            title="Deployment Status"
            action={
              <div className="flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1 text-green-500">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {liveCount} live
                </span>
                <span className="flex items-center gap-1 text-yellow-500">
                  <FileCode2 className="h-3.5 w-3.5" /> {draftCount} draft
                </span>
                {failedCount > 0 && (
                  <span className="flex items-center gap-1 text-destructive">
                    <AlertTriangle className="h-3.5 w-3.5" /> {failedCount} failed
                  </span>
                )}
              </div>
            }
          >
            {loading || !data ? (
              <Skeleton className="h-64 rounded-xl" />
            ) : (
              <DeploymentTable deployments={data.deployments} />
            )}
          </Section>
        </div>

        {/* ── Error monitoring ── */}
        <Section title="Error Monitoring" subtitle="High-level overview of failed executions">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Auth Errors", count: 14, pct: 38, color: "bg-red-500" },
              { label: "Timeout Errors", count: 9, pct: 24, color: "bg-orange-500" },
              { label: "API Failures", count: 7, pct: 19, color: "bg-yellow-500" },
              { label: "Rate Limits", count: 5, pct: 14, color: "bg-purple-500" },
              { label: "Parse Errors", count: 2, pct: 5, color: "bg-blue-500" },
            ].map((err) => (
              <div key={err.label} className="rounded-xl border bg-card p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium">{err.label}</p>
                  <Badge variant="destructive" className="text-[10px] px-1.5">{err.count}</Badge>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full ${err.color}`} style={{ width: `${err.pct}%` }} />
                </div>
                <p className="mt-1 text-[10px] text-muted-foreground">{err.pct}% of all errors</p>
              </div>
            ))}
            <div className="rounded-xl border bg-card p-4 flex items-center justify-center">
              <Link href="/dashboard/deployments">
                <Button variant="ghost" size="sm" className="gap-1.5 text-xs">
                  <Rocket className="h-3.5 w-3.5" /> View full logs
                </Button>
              </Link>
            </div>
          </div>
        </Section>

        {/* ── User engagement ── */}
        <Section title="User Engagement">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { title: "Active Users", value: "312", subtitle: "this month", trend: "+11.2%", up: true },
              { title: "Retention Rate", value: "68%", subtitle: "30-day", trend: "+4.1%", up: true },
              { title: "Repeat Usage", value: "2.8x", subtitle: "avg sessions/user", trend: "+0.3x", up: true },
            ].map((m) => (
              <div key={m.title} className="rounded-xl border bg-card p-5">
                <p className="text-xs text-muted-foreground">{m.title}</p>
                <p className="mt-1 text-2xl font-bold">{m.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{m.subtitle}</p>
                <p className={`mt-2 text-xs font-medium ${m.up ? "text-green-500" : "text-destructive"}`}>
                  {m.trend} vs last month
                </p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}
