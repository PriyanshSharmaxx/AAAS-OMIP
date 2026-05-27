"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  Bot,
  Calendar,
  Tag,
  Star,
  Play,
  Bookmark,
  Share2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Globe,
  DollarSign,
  Users,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AgentToolsList } from "@/components/agent/agent-tools-list";
import { DownloadButtons } from "@/components/agent/download-buttons";
import { AgentRunnerDialog } from "@/components/agent-runner/AgentRunnerDialog";
import { ScheduleDialog } from "@/components/schedule/schedule-dialog";
import { useScheduler } from "@/hooks/useScheduler";
import { useAgent } from "@/lib/queries";
import { trendingAgents, type TrendingAgent } from "@/lib/trending-agents";
import type { Agent } from "@/lib/types";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export default function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: apiAgent, isLoading } = useAgent(id, { retry: false });
  const trendingMatch = trendingAgents.find((a) => a.id === id);
  const agent: (Agent & Partial<TrendingAgent>) | undefined = apiAgent || trendingMatch;

  const [bookmarked, setBookmarked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const { createSchedule } = useScheduler();

  useEffect(() => { setMounted(true); }, []);

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading && !trendingMatch) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-24">
        <Skeleton className="mb-2 h-8 w-16" />
        <Skeleton className="mb-4 h-10 w-3/4" />
        <Skeleton className="mb-2 h-6 w-full" />
        <Skeleton className="mb-8 h-6 w-2/3" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
        <Skeleton className="mt-6 h-48" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="container mx-auto max-w-4xl px-4 py-24 text-center">
        <Bot className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-4 text-2xl font-bold">Agent Not Found</h1>
        <p className="text-muted-foreground">The agent you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/explore"><Button className="mt-6">Back to Explore</Button></Link>
      </div>
    );
  }

  const isTrending = "trending_rank" in agent;
  const tr = agent as TrendingAgent;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-24">
      {/* Back */}
      <Link href="/explore" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Explore
      </Link>

      {/* ============================================================= */}
      {/* Header */}
      {/* ============================================================= */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            {agent.icon_url ? (
              <img src={agent.icon_url} alt={agent.name} className="h-10 w-10 rounded-lg" />
            ) : (
              <Bot className="h-8 w-8 text-primary" />
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{agent.name}</h1>
            {isTrending && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                by <span className="font-medium text-foreground">{tr.creator_name}</span>
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                <Tag className="mr-1 h-3 w-3" />
                {agent.category}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {agent.execution_type?.toLowerCase()}
              </Badge>
              <Badge variant="outline">v{agent.version || "1.0"}</Badge>
              {isTrending && (
                <>
                  <span className="flex items-center gap-1 text-sm font-medium">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    {tr.rating}
                    <span className="text-xs text-muted-foreground">({formatCount(tr.reviews_count)} reviews)</span>
                  </span>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Play className="h-3 w-3" /> {formatCount(tr.runs_count)} runs
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <div className="flex gap-2 w-full sm:w-auto">
            <Button size="lg" className="flex-1 sm:flex-none gap-2" onClick={() => setRunnerOpen(true)}>
              <Play className="h-4 w-4" /> Run Agent
            </Button>
            <Button size="lg" variant="outline" className="flex-1 sm:flex-none gap-2" onClick={() => setScheduleOpen(true)}>
              <Calendar className="h-4 w-4" /> Schedule
            </Button>
          </div>
          {mounted && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => setBookmarked(!bookmarked)}
              >
                <Bookmark className={`h-3.5 w-3.5 ${bookmarked ? "fill-current" : ""}`} />
                {bookmarked ? "Saved" : "Save"}
              </Button>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
                {copied ? <Check className="h-3.5 w-3.5" /> : <Share2 className="h-3.5 w-3.5" />}
                {copied ? "Copied!" : "Share"}
              </Button>
            </div>
          )}
        </div>
      </div>

      <Separator className="my-8" />

      {/* ============================================================= */}
      {/* Description */}
      {/* ============================================================= */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">About this Agent</h2>
        <p className="leading-relaxed text-muted-foreground">{agent.description}</p>
      </div>

      {/* ============================================================= */}
      {/* Use Cases + Configuration grid */}
      {/* ============================================================= */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Use Cases */}
        {isTrending && tr.use_cases && tr.use_cases.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Use Cases</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {tr.use_cases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>{uc}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Configuration */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Execution Type</dt>
                <dd className="font-medium capitalize">{agent.execution_type?.toLowerCase()}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Version</dt>
                <dd className="font-medium">{agent.version || "1.0"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Visibility</dt>
                <dd className="font-medium">{agent.is_public ? "Public" : "Private"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Category</dt>
                <dd className="font-medium capitalize">{agent.category}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Requires API</dt>
                <dd className="font-medium">{isTrending ? (tr.requires_api ? "Yes" : "No") : "Varies"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Last Updated</dt>
                <dd className="font-medium">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(agent.updated_at || agent.created_at).toLocaleDateString()}
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Pricing */}
        {isTrending && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4" /> Pricing
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge
                  variant={tr.pricing === "free" ? "secondary" : "default"}
                  className="text-sm capitalize"
                >
                  {tr.pricing}
                </Badge>
                <span className="text-lg font-bold">{tr.pricing_label}</span>
              </div>
              {tr.pricing === "subscription" && (
                <p className="mt-2 text-xs text-muted-foreground">Billed monthly. Cancel anytime.</p>
              )}
              {tr.pricing === "paid" && (
                <p className="mt-2 text-xs text-muted-foreground">Pay per use. No subscription needed.</p>
              )}
              {tr.pricing === "free" && (
                <p className="mt-2 text-xs text-muted-foreground">Completely free. Community supported.</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Permissions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" /> Required Permissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agent.permissions && agent.permissions.length > 0 ? (
              <ul className="space-y-2.5">
                {agent.permissions.map((perm, i) => {
                  const isSensitive = isTrending && tr.sensitive_permissions?.includes(perm.name);
                  return (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      {isSensitive ? (
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                      ) : (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{perm.name}</span>
                          {perm.required && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Required</Badge>
                          )}
                          {isSensitive && (
                            <Badge variant="outline" className="border-yellow-500/50 text-[10px] text-yellow-600 dark:text-yellow-400 px-1.5 py-0">Sensitive</Badge>
                          )}
                        </div>
                        {perm.description && (
                          <p className="mt-0.5 text-muted-foreground">{perm.description}</p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No special permissions required.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============================================================= */}
      {/* Ratings */}
      {/* ============================================================= */}
      {isTrending && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" /> Ratings & Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-4xl font-bold">{tr.rating}</div>
                <div className="mt-1 flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < Math.floor(tr.rating) ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{formatCount(tr.reviews_count)} reviews</p>
              </div>
              <Separator orientation="vertical" className="h-16" />
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map((stars) => {
                  // Simulated distribution weighted toward the rating
                  const pct = stars === Math.round(tr.rating) ? 68 : stars === Math.round(tr.rating) - 1 ? 20 : stars >= 4 ? 8 : 2;
                  return (
                    <div key={stars} className="flex items-center gap-2 text-xs">
                      <span className="w-3 text-right">{stars}</span>
                      <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                        <div className="h-full rounded-full bg-yellow-500" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-8 text-right text-muted-foreground">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================================= */}
      {/* Tools */}
      {/* ============================================================= */}
      {agent.tools && agent.tools.length > 0 && (
        <div className="mt-6">
          <AgentToolsList tools={agent.tools} />
        </div>
      )}

      {/* ============================================================= */}
      {/* Downloads */}
      {/* ============================================================= */}
      <div className="mt-6">
        <DownloadButtons
          agentId={agent.id}
          agentName={agent.name}
          pricing={agent.pricing}
        />
      </div>

      {/* ============================================================= */}
      {/* Bottom CTA */}
      {/* ============================================================= */}
      <div className="mt-8 rounded-xl border bg-secondary/30 p-6 text-center">
        <h3 className="mb-2 text-lg font-semibold">Ready to use {agent.name}?</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          The Master Agent Runner will guide you through permissions, API configuration, and execution.
        </p>
        <Button size="lg" className="gap-2" onClick={() => setRunnerOpen(true)}>
          <Play className="h-4 w-4" /> Run Agent Now
        </Button>
      </div>

      {/* Agent Runner Dialog — all 8 steps as sequential modals */}
      {agent && (
        <AgentRunnerDialog
          agent={agent as Agent}
          open={runnerOpen}
          onOpenChange={setRunnerOpen}
        />
      )}

      {/* Schedule Dialog */}
      {agent && (
        <ScheduleDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          agentId={agent.id}
          agentName={agent.name}
          onSave={createSchedule}
        />
      )}
    </div>
  );
}
