"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { LineChart, BarChart, DonutChart } from "@/components/dashboard/mini-chart";
import { ActivityList } from "@/components/dashboard/activity-list";
import { useUserDashboard } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bot, Zap, Clock, Cpu, TrendingUp,
  Bookmark, RefreshCw, Download, Lightbulb, ArrowRight, Calendar,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

// ── Section wrapper ────────────────────────────────────────────────────────

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

// ── Skeleton grid ──────────────────────────────────────────────────────────

function SkeletonGrid({ count, h = "h-24" }: { count: number; h?: string }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-${count <= 4 ? count : 4}`}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={`${h} rounded-xl`} />
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function UserDashboardPage() {
  const { data, loading, refetch } = useUserDashboard();
  const user = useAuthStore((s) => s.user);

  return (
    <DashboardLayout>
      <div className="space-y-8 max-w-7xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              Good day, {user?.username ?? "there"} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Here&apos;s a summary of your agent activity.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
          </div>
        </div>

        {/* ── Overview stats ── */}
        {loading || !data ? (
          <SkeletonGrid count={5} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Agents Used"
              value={data.stats.total_agents_used}
              subtitle="unique agents"
              icon={<Bot className="h-4 w-4" />}
              trend={{ value: 12, label: "vs last month" }}
              accent="primary"
            />
            <StatCard
              title="Total Runs"
              value={data.stats.total_runs}
              subtitle="all time"
              icon={<Zap className="h-4 w-4" />}
              trend={{ value: 8.4, label: "vs last month" }}
              accent="green"
            />
            <StatCard
              title="Usage Time"
              value={`${data.stats.usage_hours}h`}
              subtitle="this month"
              icon={<Clock className="h-4 w-4" />}
              trend={{ value: 5.1, label: "vs last month" }}
              accent="purple"
            />
            <StatCard
              title="API Calls"
              value={data.stats.api_calls.toLocaleString()}
              subtitle="this month"
              icon={<Cpu className="h-4 w-4" />}
              trend={{ value: 14.7, label: "vs last month" }}
              accent="orange"
            />
            <StatCard
              title="Success Rate"
              value={`${data.stats.success_rate}%`}
              subtitle="overall"
              icon={<TrendingUp className="h-4 w-4" />}
              trend={{ value: 2.1, label: "vs last month" }}
              accent="green"
            />
          </div>
        )}

        {/* ── Charts row ── */}
        {loading || !data ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-52 rounded-xl lg:col-span-2" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {/* Usage over time */}
            <div className="lg:col-span-2 rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm font-semibold">Runs Over Time</p>
                  <p className="text-xs text-muted-foreground">Last 7 days</p>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {data.stats.total_runs} total
                </Badge>
              </div>
              <LineChart data={data.runsOverTime} height={140} showGrid />
            </div>

            {/* Category donut */}
            <div className="rounded-xl border bg-card p-5">
              <p className="text-sm font-semibold mb-1">By Category</p>
              <p className="text-xs text-muted-foreground mb-4">Agent usage split</p>
              <DonutChart data={data.categoryUsage} size={100} />
            </div>
          </div>
        )}

        {/* ── Activity + Saved Agents ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Recent activity */}
          <div className="lg:col-span-2">
            <Section
              title="Recent Activity"
              action={
                <Link href="/dashboard/history">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              }
            >
              {loading || !data ? (
                <Skeleton className="h-64 rounded-xl" />
              ) : (
                <ActivityList items={data.recentActivity} />
              )}
            </Section>
          </div>

          {/* Saved agents */}
          <div>
            <Section
              title="Saved Agents"
              action={
                <Link href="/dashboard/saved">
                  <Button variant="ghost" size="sm" className="gap-1 text-xs h-7">
                    View all <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              }
            >
              {loading || !data ? (
                <Skeleton className="h-64 rounded-xl" />
              ) : (
                <div className="rounded-xl border bg-card divide-y overflow-hidden">
                  {data.savedAgents.map((agent) => (
                    <div key={agent.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                      <Bookmark className="h-4 w-4 shrink-0 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{agent.name}</p>
                        <p className="text-xs text-muted-foreground">{agent.category} · {agent.last_used}</p>
                      </div>
                      <Link href={`/agents/${agent.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0">Run</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        </div>

        {/* ── Usage analytics chart ── */}
        {loading || !data ? (
          <Skeleton className="h-48 rounded-xl" />
        ) : (
          <Section title="Daily API Usage">
            <div className="rounded-xl border bg-card p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-muted-foreground">Last 7 days</p>
                <Badge variant="secondary" className="text-xs">
                  {data.stats.api_calls.toLocaleString()} total calls
                </Badge>
              </div>
              <BarChart data={data.usageOverTime} height={120} />
            </div>
          </Section>
        )}

        {/* ── Quick Actions ── */}
        <Section title="Quick Actions">
          <div className="grid gap-3 sm:grid-cols-3">
            <Link href="/explore">
              <div className="flex items-center gap-3 rounded-xl border p-4 hover:bg-secondary/40 transition-colors cursor-pointer">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Bot className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Browse Agents</p>
                  <p className="text-xs text-muted-foreground">Explore the marketplace</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
            <Link href="/schedule">
              <div className="flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 hover:bg-primary/10 transition-colors cursor-pointer">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Schedules</p>
                  <p className="text-xs text-muted-foreground">Automate agent runs</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-primary" />
              </div>
            </Link>
            <Link href="/dashboard/runs">
              <div className="flex items-center gap-3 rounded-xl border p-4 hover:bg-secondary/40 transition-colors cursor-pointer">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Zap className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Run History</p>
                  <p className="text-xs text-muted-foreground">View past executions</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        </Section>

        {/* ── AI Insights ── */}
        <Section title="Personal Insights">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                icon: "🤖",
                title: "Most Used Agent",
                value: "AutoCoder Pro",
                detail: "Used 47 times this month",
                accent: "bg-primary/5 border-primary/20",
              },
              {
                icon: "💡",
                title: "Suggested for You",
                value: "DataInsight AI",
                detail: "Based on your usage pattern",
                accent: "bg-green-500/5 border-green-500/20",
              },
              {
                icon: "📈",
                title: "Peak Usage Day",
                value: "Thursdays",
                detail: "You run 2x more agents mid-week",
                accent: "bg-purple-500/5 border-purple-500/20",
              },
            ].map((ins) => (
              <div key={ins.title} className={`rounded-xl border p-4 ${ins.accent}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{ins.icon}</span>
                  <Lightbulb className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">{ins.title}</p>
                <p className="text-sm font-semibold mt-0.5">{ins.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{ins.detail}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </DashboardLayout>
  );
}
