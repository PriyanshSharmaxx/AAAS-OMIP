"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronUp, Tag, RefreshCw, Globe,
  Copy, CheckCircle2, Clock, User, GitMerge,
  FileText, Cpu, Plug, Settings2, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AgentCommit, VersionedAgent, LineDiff } from "@/lib/versioning-data";
import { computePromptDiff, VERSION_STATUS_CONFIG, formatBytes, formatRelativeTime } from "@/lib/versioning-data";

// ── Prompt diff view ───────────────────────────────────────────────────────────

function PromptDiff({ before, after }: { before: string; after: string }) {
  const [open, setOpen] = useState(true);
  const lines = computePromptDiff(before, after);
  const added   = lines.filter((l) => l.type === "added").length;
  const removed = lines.filter((l) => l.type === "removed").length;

  return (
    <div className="rounded-xl border overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-muted/40 px-3 py-2 text-xs hover:bg-muted/60 transition-colors"
      >
        <div className="flex items-center gap-2 font-medium">
          <FileText className="h-3.5 w-3.5 text-muted-foreground" />
          System Prompt
        </div>
        <div className="flex items-center gap-3">
          {added   > 0 && <span className="text-green-600 dark:text-green-400">+{added}</span>}
          {removed > 0 && <span className="text-red-500">−{removed}</span>}
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </div>
      </button>

      {open && (
        <div className="max-h-64 overflow-y-auto bg-muted/20 divide-y divide-border/30">
          {lines.map((line, i) => (
            <div
              key={i}
              className={cn(
                "flex items-start gap-2 px-3 py-0.5 font-mono text-[11px] leading-relaxed",
                line.type === "added"   && "bg-green-500/8 border-l-2 border-green-500",
                line.type === "removed" && "bg-red-500/8 border-l-2 border-red-400",
                line.type === "unchanged" && "text-muted-foreground"
              )}
            >
              <span className={cn(
                "shrink-0 w-4 text-center select-none",
                line.type === "added"   && "text-green-600 dark:text-green-400",
                line.type === "removed" && "text-red-500",
                line.type === "unchanged" && "text-muted-foreground/40"
              )}>
                {line.type === "added" ? "+" : line.type === "removed" ? "−" : " "}
              </span>
              <span className={cn(
                line.type === "added"   && "text-green-700 dark:text-green-300",
                line.type === "removed" && "text-red-600 dark:text-red-400",
              )}>
                {line.content || <span className="opacity-30">{"(empty)"}</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── List diff ─────────────────────────────────────────────────────────────────

function ListDiff({
  label, before, after, icon: Icon,
}: {
  label: string;
  before: string[];
  after: string[];
  icon: React.ElementType;
}) {
  const added   = after.filter((x) => !before.includes(x));
  const removed = before.filter((x) => !after.includes(x));
  const unchanged = before.filter((x) => after.includes(x));

  if (added.length === 0 && removed.length === 0) {
    return null;
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center justify-between bg-muted/40 px-3 py-2 text-xs font-medium">
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </div>
        <div className="flex items-center gap-2">
          {added.length   > 0 && <span className="text-green-600 dark:text-green-400">+{added.length}</span>}
          {removed.length > 0 && <span className="text-red-500">−{removed.length}</span>}
        </div>
      </div>
      <div className="p-3 space-y-1">
        {unchanged.map((item) => (
          <div key={item} className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="w-3 text-center text-muted-foreground/40"> </span>
            <span className="font-mono">{item}</span>
          </div>
        ))}
        {added.map((item) => (
          <div key={item} className="flex items-center gap-2 text-[11px] text-green-600 dark:text-green-400 bg-green-500/5 rounded px-1">
            <span className="w-3 text-center">+</span>
            <span className="font-mono">{item}</span>
          </div>
        ))}
        {removed.map((item) => (
          <div key={item} className="flex items-center gap-2 text-[11px] text-red-500 bg-red-500/5 rounded px-1">
            <span className="w-3 text-center">−</span>
            <span className="font-mono line-through opacity-70">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Config diff ────────────────────────────────────────────────────────────────

function ConfigDiff({
  before, after,
}: {
  before: Record<string, string | number | boolean>;
  after:  Record<string, string | number | boolean>;
}) {
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changed = allKeys.filter((k) => String(before[k]) !== String(after[k]));

  if (changed.length === 0 && !Object.keys(before).find((k) => String(before[k]) !== String(after[k]))) return null;

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="flex items-center gap-2 bg-muted/40 px-3 py-2 text-xs font-medium">
        <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
        Configuration
        {changed.length > 0 && <Badge variant="secondary" className="text-[9px]">{changed.length} changed</Badge>}
      </div>
      <div className="p-3 space-y-1.5">
        {allKeys.map((k) => {
          const didChange = String(before[k]) !== String(after[k]);
          return (
            <div key={k} className="grid grid-cols-3 gap-2 text-[11px] font-mono items-center">
              <span className="text-muted-foreground">{k}</span>
              {didChange ? (
                <>
                  <span className="text-red-500 line-through opacity-70">{String(before[k] ?? "—")}</span>
                  <span className="text-green-600 dark:text-green-400">{String(after[k] ?? "—")}</span>
                </>
              ) : (
                <>
                  <span className="text-muted-foreground col-span-2">{String(after[k] ?? "—")}</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Rollback confirmation ─────────────────────────────────────────────────────

function RollbackBanner({ commit, onConfirm, onCancel }: {
  commit: AgentCommit;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mx-4 my-3 rounded-xl border border-amber-400/30 bg-amber-500/5 p-4">
      <div className="flex items-start gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Rollback to <code className="font-mono">{commit.short_id}</code>?</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/70 mt-0.5">
            This will restore the agent to its state at <span className="font-medium">{new Date(commit.timestamp).toLocaleDateString()}</span>.
            A new commit will be created preserving the current state.
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button size="sm" className="flex-1 h-8 text-xs gap-1" onClick={onConfirm}>
          <RefreshCw className="h-3 w-3" /> Confirm Rollback
        </Button>
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

interface DiffPanelProps {
  agent: VersionedAgent | null;
  commit: AgentCommit | null;
  onRollbackConfirm: (commit: AgentCommit) => void;
  rollbackTarget: AgentCommit | null;
  onRollbackCancel: () => void;
}

export function DiffPanel({ agent, commit, onRollbackConfirm, rollbackTarget, onRollbackCancel }: DiffPanelProps) {
  const [copied, setCopied] = useState(false);

  if (!commit || !agent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a commit to view changes</p>
      </div>
    );
  }

  const parentCommit = commit.parent_id
    ? agent.commits.find((c) => c.id === commit.parent_id)
    : null;

  const prevSnapshot = parentCommit?.snapshot;
  const curSnapshot  = commit.snapshot;

  const statusCfg = VERSION_STATUS_CONFIG[commit.status];

  const handleCopy = () => {
    void navigator.clipboard.writeText(commit.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <code className="rounded bg-muted px-2 py-1 text-xs font-mono">{commit.short_id}</code>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusCfg.color)}>
              {statusCfg.label}
            </span>
          </div>
          <button onClick={handleCopy} className="text-muted-foreground hover:text-foreground transition-colors">
            {copied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <p className="text-xs font-semibold mb-2">{commit.message}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><User className="h-2.5 w-2.5" />{commit.author}</span>
          <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{new Date(commit.timestamp).toLocaleString()}</span>
          <span>{formatBytes(commit.size_bytes)}</span>
          {commit.approved_by && (
            <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
              <CheckCircle2 className="h-2.5 w-2.5" /> Approved by {commit.approved_by}
            </span>
          )}
        </div>

        {/* Tags */}
        {commit.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {commit.tags.map((t) => (
              <span key={t} className="flex items-center gap-1 rounded-full border bg-primary/5 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                <Tag className="h-2 w-2" /> {t}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Rollback banner */}
      {rollbackTarget?.id === commit.id && (
        <RollbackBanner
          commit={commit}
          onConfirm={() => onRollbackConfirm(commit)}
          onCancel={onRollbackCancel}
        />
      )}

      {/* Snapshot info */}
      <div className="border-b px-4 py-3 flex flex-wrap gap-3">
        <div className="flex items-center gap-1.5 text-[11px]">
          <Cpu className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Model:</span>
          <span className="font-mono font-medium">{curSnapshot.model}</span>
          {prevSnapshot && prevSnapshot.model !== curSnapshot.model && (
            <span className="text-muted-foreground/60 line-through font-mono text-[10px]">{prevSnapshot.model}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">Temp:</span>
          <span className="font-mono">{curSnapshot.temperature}</span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px]">
          <span className="text-muted-foreground">Max tokens:</span>
          <span className="font-mono">{curSnapshot.max_tokens.toLocaleString()}</span>
        </div>
      </div>

      {/* Diff sections */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!prevSnapshot ? (
          <div className="rounded-xl border border-dashed p-4 text-center">
            <p className="text-xs text-muted-foreground">Initial commit — no previous version to compare.</p>
          </div>
        ) : (
          <>
            {curSnapshot.prompt !== prevSnapshot.prompt && (
              <PromptDiff before={prevSnapshot.prompt} after={curSnapshot.prompt} />
            )}
            <ListDiff
              label="Tools"
              before={prevSnapshot.tools}
              after={curSnapshot.tools}
              icon={Settings2}
            />
            <ListDiff
              label="APIs"
              before={prevSnapshot.apis}
              after={curSnapshot.apis}
              icon={Plug}
            />
            <ConfigDiff before={prevSnapshot.config} after={curSnapshot.config} />
            {curSnapshot.prompt === prevSnapshot.prompt &&
              JSON.stringify(prevSnapshot.tools) === JSON.stringify(curSnapshot.tools) &&
              JSON.stringify(prevSnapshot.apis) === JSON.stringify(curSnapshot.apis) &&
              JSON.stringify(prevSnapshot.config) === JSON.stringify(curSnapshot.config) && (
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <p className="text-xs text-muted-foreground">No content changes in this commit.</p>
                </div>
            )}
          </>
        )}

        {/* Current snapshot summary */}
        <Separator />
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Snapshot Summary</p>
          <div className="space-y-2">
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="mb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">System Prompt</p>
              <p className="text-xs leading-relaxed text-foreground/80 line-clamp-4 font-mono">
                {curSnapshot.prompt}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border bg-muted/20 p-2.5">
                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">Tools ({curSnapshot.tools.length})</p>
                <div className="flex flex-wrap gap-1">
                  {curSnapshot.tools.map((t) => (
                    <span key={t} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono">{t}</span>
                  ))}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/20 p-2.5">
                <p className="mb-1 text-[10px] font-semibold text-muted-foreground">APIs ({curSnapshot.apis.length})</p>
                <div className="flex flex-wrap gap-1">
                  {curSnapshot.apis.length > 0
                    ? curSnapshot.apis.map((a) => (
                        <span key={a} className="rounded bg-muted px-1.5 py-0.5 text-[9px] font-mono">{a}</span>
                      ))
                    : <span className="text-[10px] text-muted-foreground">None</span>
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t px-4 py-3 flex gap-2">
        <Button variant="outline" size="sm" className="flex-1 h-8 text-xs gap-1">
          <RefreshCw className="h-3 w-3" /> Rollback
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
          <Tag className="h-3 w-3" /> Tag
        </Button>
        {commit.status === "stable" && (
          <Button size="sm" className="flex-1 h-8 text-xs gap-1">
            <Globe className="h-3 w-3" /> Publish
          </Button>
        )}
      </div>
    </div>
  );
}
