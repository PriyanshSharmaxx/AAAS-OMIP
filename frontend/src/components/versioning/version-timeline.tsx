"use client";

import {
  GitCommit, Tag, CheckCircle2, Archive, FileEdit,
  Globe, Clock, User, ChevronRight, Plus, GitMerge,
  AlertCircle, Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { AgentCommit, AgentBranch, VersionedAgent } from "@/lib/versioning-data";
import {
  VERSION_STATUS_CONFIG, BRANCH_TYPE_CONFIG,
  formatRelativeTime, formatBytes,
} from "@/lib/versioning-data";

// ── Status icon ────────────────────────────────────────────────────────────────

const STATUS_ICONS: Record<string, React.ElementType> = {
  draft:     FileEdit,
  stable:    CheckCircle2,
  archived:  Archive,
  published: Globe,
};

// ── Branch selector ────────────────────────────────────────────────────────────

interface BranchSelectorProps {
  branches: AgentBranch[];
  selected: string;
  onSelect: (name: string) => void;
}

function BranchSelector({ branches, selected, onSelect }: BranchSelectorProps) {
  return (
    <div className="border-b px-4 py-3 space-y-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Branches</p>
      <div className="flex flex-wrap gap-1.5">
        {branches.map((b) => {
          const typeCfg = BRANCH_TYPE_CONFIG[b.type];
          const isActive = b.name === selected;
          return (
            <button
              key={b.name}
              onClick={() => onSelect(b.name)}
              className={cn(
                "flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-medium transition-all",
                isActive
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-border/80 hover:bg-muted/40",
                !isActive && typeCfg.color
              )}
            >
              {b.is_protected && <Lock className="h-2.5 w-2.5" />}
              <span className="font-mono">{b.name}</span>
              {b.commits_ahead > 0 && (
                <span className="rounded-full bg-primary/20 px-1 text-[9px] text-primary">
                  +{b.commits_ahead}
                </span>
              )}
            </button>
          );
        })}
        <button className="flex items-center gap-1 rounded-lg border border-dashed px-2.5 py-1 text-[11px] text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">
          <Plus className="h-2.5 w-2.5" /> New Branch
        </button>
      </div>
    </div>
  );
}

// ── Commit node ────────────────────────────────────────────────────────────────

interface CommitNodeProps {
  commit: AgentCommit;
  isSelected: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (c: AgentCommit) => void;
  onRollback: (c: AgentCommit) => void;
  onTag: (c: AgentCommit) => void;
}

function CommitNode({ commit, isSelected, isFirst, isLast, onSelect, onRollback, onTag }: CommitNodeProps) {
  const statusCfg = VERSION_STATUS_CONFIG[commit.status];
  const StatusIcon = STATUS_ICONS[commit.status] ?? FileEdit;
  const hasChanges =
    commit.diff.prompt_changed ||
    commit.diff.tools_added.length > 0 ||
    commit.diff.tools_removed.length > 0 ||
    commit.diff.apis_added.length > 0 ||
    commit.diff.apis_removed.length > 0 ||
    commit.diff.model_changed;

  return (
    <div
      onClick={() => onSelect(commit)}
      className={cn(
        "group relative flex gap-4 px-4 py-4 cursor-pointer transition-all",
        isSelected ? "bg-primary/5 border-r-2 border-r-primary" : "hover:bg-muted/30"
      )}
    >
      {/* Timeline rail */}
      <div className="flex flex-col items-center">
        {!isFirst && <div className="w-px flex-1 bg-border" />}
        <div className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 z-10 transition-all",
          isSelected
            ? "border-primary bg-primary/10"
            : "border-border bg-card group-hover:border-primary/40"
        )}>
          <StatusIcon className={cn("h-3.5 w-3.5", isSelected ? "text-primary" : "text-muted-foreground")} />
        </div>
        {!isLast && <div className="w-px flex-1 bg-border" />}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pt-1">
        {/* Message + short ID */}
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <p className={cn("text-xs font-semibold leading-relaxed", isSelected && "text-primary")}>
            {commit.message}
          </p>
          <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
            {commit.short_id}
          </code>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground mb-2">
          <span className="flex items-center gap-1">
            <User className="h-2.5 w-2.5" /> {commit.author}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> {formatRelativeTime(commit.timestamp)}
          </span>
          <span>{formatBytes(commit.size_bytes)}</span>
        </div>

        {/* Tags */}
        {commit.tags.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1">
            {commit.tags.map((t) => (
              <span
                key={t}
                className="flex items-center gap-1 rounded-full border bg-primary/5 px-2 py-0.5 text-[10px] font-semibold text-primary"
              >
                <Tag className="h-2 w-2" /> {t}
              </span>
            ))}
          </div>
        )}

        {/* Status + diff summary */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusCfg.color)}>
            {statusCfg.label}
          </span>

          {commit.diff.model_changed && (
            <span className="rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 text-[10px] font-medium">
              model changed
            </span>
          )}
          {commit.diff.prompt_changed && (
            <span className="rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 text-[10px] font-medium">
              prompt ~{commit.diff.prompt_change_pct}%
            </span>
          )}
          {commit.diff.tools_added.map((t) => (
            <span key={t} className="rounded-full bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 text-[10px] font-medium">
              +{t}
            </span>
          ))}
          {commit.diff.tools_removed.map((t) => (
            <span key={t} className="rounded-full bg-red-500/10 text-red-500 px-2 py-0.5 text-[10px] font-medium">
              -{t}
            </span>
          ))}
          {commit.diff.apis_added.map((a) => (
            <span key={a} className="rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 text-[10px] font-medium">
              API +{a}
            </span>
          ))}
        </div>

        {/* Actions — show on hover */}
        <div className={cn(
          "mt-2.5 flex gap-1.5 transition-all",
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )}>
          <button
            onClick={(e) => { e.stopPropagation(); onRollback(commit); }}
            className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            ↩ Rollback
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTag(commit); }}
            className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
          >
            <Tag className="h-2.5 w-2.5" /> Tag
          </button>
          {commit.status === "stable" && (
            <button className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20 transition-colors">
              <Globe className="h-2.5 w-2.5" /> Publish
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface VersionTimelineProps {
  agent: VersionedAgent | null;
  selectedCommitId: string | null;
  onCommitSelect: (c: AgentCommit) => void;
  onRollback: (c: AgentCommit) => void;
  onBranchSelect: (name: string) => void;
  activeBranch: string;
}

export function VersionTimeline({
  agent, selectedCommitId, onCommitSelect, onRollback, onBranchSelect, activeBranch,
}: VersionTimelineProps) {
  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center border-x">
        <div className="text-center">
          <GitCommit className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Select an agent to view version history</p>
        </div>
      </div>
    );
  }

  const branchCommits = agent.commits.filter((c) => c.branch === activeBranch);

  return (
    <div className="flex h-full flex-col border-x overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold">{agent.name}</h2>
          <div className="flex items-center gap-2">
            {agent.merge_requests.filter((mr) => mr.status === "open").length > 0 && (
              <span className="flex items-center gap-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 px-2 py-0.5 text-[10px] font-semibold">
                <GitMerge className="h-2.5 w-2.5" />
                {agent.merge_requests.filter((mr) => mr.status === "open").length} open MR
              </span>
            )}
            <Button size="sm" className="h-7 gap-1 text-[11px]">
              <GitCommit className="h-3 w-3" /> New Commit
            </Button>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {agent.total_versions} version{agent.total_versions !== 1 ? "s" : ""} · {agent.contributors.join(", ")}
        </p>
      </div>

      {/* Branch selector */}
      <BranchSelector
        branches={agent.branches}
        selected={activeBranch}
        onSelect={onBranchSelect}
      />

      {/* Commits */}
      <div className="flex-1 overflow-y-auto">
        {branchCommits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-4">
            <AlertCircle className="mb-3 h-8 w-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No commits on this branch yet.</p>
          </div>
        ) : (
          branchCommits.map((commit, i) => (
            <CommitNode
              key={commit.id}
              commit={commit}
              isSelected={commit.id === selectedCommitId}
              isFirst={i === 0}
              isLast={i === branchCommits.length - 1}
              onSelect={onCommitSelect}
              onRollback={onRollback}
              onTag={(c) => { /* future: open tag dialog */ }}
            />
          ))
        )}
      </div>
    </div>
  );
}
