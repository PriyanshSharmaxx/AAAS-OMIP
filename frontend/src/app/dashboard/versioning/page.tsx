"use client";

import { useState, useCallback } from "react";
import {
  GitCommit, GitBranch, Tag, Search, Filter,
  TrendingUp, Clock, Users, GitMerge,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { VersionTimeline } from "@/components/versioning/version-timeline";
import { DiffPanel } from "@/components/versioning/diff-panel";
import {
  MOCK_VERSIONED_AGENTS,
  type VersionedAgent, type AgentCommit,
  formatRelativeTime,
} from "@/lib/versioning-data";

// ─── Agent list (left panel) ──────────────────────────────────────────────────

function AgentVersionList({
  agents,
  selectedId,
  onSelect,
}: {
  agents: VersionedAgent[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <h2 className="mb-3 text-sm font-bold">Versioned Agents</h2>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.map((agent) => {
          const headCommit = agent.commits[0];
          const openMRs = agent.merge_requests.filter((mr) => mr.status === "open").length;

          return (
            <div
              key={agent.id}
              onClick={() => onSelect(agent.id)}
              className={cn(
                "group mx-2 mb-1 cursor-pointer rounded-xl border p-3 transition-all",
                agent.id === selectedId
                  ? "border-primary/40 bg-primary/5"
                  : "border-transparent hover:border-border hover:bg-muted/30"
              )}
            >
              {/* Name + branch */}
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className={cn("text-xs font-semibold truncate flex-1", agent.id === selectedId && "text-primary")}>
                  {agent.name}
                </p>
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-mono text-muted-foreground">
                  {agent.current_branch}
                </span>
              </div>

              {/* Category + contributors */}
              <div className="mb-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{agent.category}</Badge>
                <span className="flex items-center gap-0.5">
                  <Users className="h-2.5 w-2.5" /> {agent.contributors.length}
                </span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <GitCommit className="h-2.5 w-2.5" /> {agent.total_versions}
                </span>
                <span className="flex items-center gap-0.5">
                  <GitBranch className="h-2.5 w-2.5" /> {agent.branches.length}
                </span>
                {openMRs > 0 && (
                  <span className="flex items-center gap-0.5 text-violet-500">
                    <GitMerge className="h-2.5 w-2.5" /> {openMRs}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-0.5">
                  <Clock className="h-2.5 w-2.5" />
                  {formatRelativeTime(agent.last_commit_at)}
                </span>
              </div>

              {/* Latest commit message */}
              {headCommit && (
                <p className="mt-1.5 text-[10px] text-muted-foreground/70 truncate italic">
                  "{headCommit.message}"
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="border-t px-4 py-3 grid grid-cols-3 gap-2 text-center">
        {[
          { label: "Agents",    value: agents.length },
          { label: "Branches",  value: agents.reduce((s, a) => s + a.branches.length, 0) },
          { label: "Versions",  value: agents.reduce((s, a) => s + a.total_versions, 0) },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs font-bold">{value}</p>
            <p className="text-[9px] text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function VersioningPage() {
  const [agents, setAgents]         = useState<VersionedAgent[]>(MOCK_VERSIONED_AGENTS);
  const [selectedAgentId, setSelectedAgentId] = useState<string>(MOCK_VERSIONED_AGENTS[0].id);
  const [selectedCommitId, setSelectedCommitId] = useState<string>(MOCK_VERSIONED_AGENTS[0].commits[0].id);
  const [activeBranch, setActiveBranch] = useState<string>("main");
  const [rollbackTarget, setRollbackTarget] = useState<AgentCommit | null>(null);

  const activeAgent = agents.find((a) => a.id === selectedAgentId) ?? null;
  const selectedCommit = activeAgent?.commits.find((c) => c.id === selectedCommitId) ?? null;

  const handleAgentSelect = useCallback((id: string) => {
    const agent = agents.find((a) => a.id === id);
    if (!agent) return;
    setSelectedAgentId(id);
    setActiveBranch(agent.current_branch);
    setSelectedCommitId(agent.commits[0]?.id ?? "");
    setRollbackTarget(null);
  }, [agents]);

  const handleCommitSelect = useCallback((commit: AgentCommit) => {
    setSelectedCommitId(commit.id);
    setRollbackTarget(null);
  }, []);

  const handleRollback = useCallback((commit: AgentCommit) => {
    setSelectedCommitId(commit.id);
    setRollbackTarget(commit);
  }, []);

  const handleRollbackConfirm = useCallback((commit: AgentCommit) => {
    if (!activeAgent) return;
    // Simulate creating a new rollback commit
    const rollbackCommit: AgentCommit = {
      id: `rollback-${Date.now()}`,
      short_id: `rb${Date.now().toString(36).slice(-5)}`,
      branch: activeBranch,
      agent_id: activeAgent.id,
      author: "Demo User",
      author_email: "demo@aas.com",
      message: `revert: rollback to ${commit.short_id} (${commit.message})`,
      timestamp: new Date().toISOString(),
      tags: [],
      status: "draft",
      parent_id: activeAgent.commits[0].id,
      size_bytes: commit.size_bytes,
      snapshot: { ...commit.snapshot },
      diff: {
        prompt_changed: true,
        prompt_change_pct: 100,
        tools_added: [],
        tools_removed: [],
        apis_added: [],
        apis_removed: [],
        config_changed: [],
        model_changed: false,
      },
    };
    setAgents((prev) => prev.map((a) =>
      a.id === activeAgent.id
        ? { ...a, commits: [rollbackCommit, ...a.commits], total_versions: a.total_versions + 1 }
        : a
    ));
    setSelectedCommitId(rollbackCommit.id);
    setRollbackTarget(null);
  }, [activeAgent, activeBranch]);

  // Stats
  const totalVersions = agents.reduce((s, a) => s + a.total_versions, 0);
  const openMRs = agents.reduce((s, a) => s + a.merge_requests.filter((mr) => mr.status === "open").length, 0);
  const publishedCount = agents.reduce((s, a) => s + a.commits.filter((c) => c.status === "published").length, 0);

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-4rem)] flex-col">
        {/* Header bar */}
        <div className="border-b bg-card/60 backdrop-blur px-6 py-4 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <GitCommit className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Version Control</h1>
              <p className="text-xs text-muted-foreground">Git-like versioning for your AI agents</p>
            </div>
          </div>

          {/* Stats strip */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { icon: GitCommit,   label: "Versions",  value: totalVersions },
              { icon: GitMerge,    label: "Open MRs",  value: openMRs },
              { icon: Tag,         label: "Published",  value: publishedCount },
              { icon: TrendingUp,  label: "Agents",     value: agents.length },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-bold leading-none">{value}</p>
                  <p className="text-[10px] text-muted-foreground">{label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Three-panel layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Agent list */}
          <div className="w-60 shrink-0 overflow-hidden">
            <AgentVersionList
              agents={agents}
              selectedId={selectedAgentId}
              onSelect={handleAgentSelect}
            />
          </div>

          {/* Center: Version timeline */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <VersionTimeline
              agent={activeAgent}
              selectedCommitId={selectedCommitId}
              onCommitSelect={handleCommitSelect}
              onRollback={handleRollback}
              onBranchSelect={(branch) => {
                setActiveBranch(branch);
                const firstOnBranch = activeAgent?.commits.find((c) => c.branch === branch);
                if (firstOnBranch) setSelectedCommitId(firstOnBranch.id);
              }}
              activeBranch={activeBranch}
            />
          </div>

          {/* Right: Diff panel */}
          <div className="w-80 shrink-0 overflow-hidden">
            <DiffPanel
              agent={activeAgent}
              commit={selectedCommit}
              onRollbackConfirm={handleRollbackConfirm}
              rollbackTarget={rollbackTarget}
              onRollbackCancel={() => setRollbackTarget(null)}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
