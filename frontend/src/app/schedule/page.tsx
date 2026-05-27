"use client";

import { useState } from "react";
import {
  Calendar, Play, Pause, Trash2, Edit, Zap,
  CheckCircle2, XCircle, AlertCircle, Clock,
  RefreshCw, Plus, ChevronDown, ChevronUp,
  BarChart2, Activity, Shield, Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner-1";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { ScheduleDialog } from "@/components/schedule/schedule-dialog";
import { useScheduler, ScheduleFilter } from "@/hooks/useScheduler";
import {
  Schedule, ScheduleRun,
  STATUS_CONFIG, RUN_STATUS_CONFIG, SCHEDULE_TYPE_CONFIG,
  OUTPUT_ACTION_CONFIG,
  formatScheduleType, formatDuration, formatNextRun, formatLastRun, successRate,
} from "@/lib/schedule-data";

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ status }: { status: Schedule["status"] }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", cfg.bgClass, cfg.colorClass)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dotClass)} />
      {cfg.label}
    </span>
  );
}

function RunStatusBadge({ status }: { status: Schedule["last_run_status"] }) {
  if (!status) return <span className="text-xs text-muted-foreground">—</span>;
  const cfg = RUN_STATUS_CONFIG[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.bgClass, cfg.colorClass)}>
      {cfg.label}
    </span>
  );
}

function SuccessRateBar({ rate }: { rate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full",
            rate >= 90 ? "bg-emerald-500" : rate >= 70 ? "bg-amber-500" : "bg-red-500",
          )}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs tabular-nums">{rate}%</span>
    </div>
  );
}

// ── Run log viewer ──────────────────────────────────────────────────────────

function RunLogPanel({ runs }: { runs: ScheduleRun[] }) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (runs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center">
        <Activity className="h-7 w-7 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">No runs recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {runs.map((run) => {
        const runCfg = RUN_STATUS_CONFIG[run.status];
        const isExpanded = expanded === run.id;
        return (
          <div key={run.id} className="rounded-lg border overflow-hidden">
            <button
              className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/40 transition-colors"
              onClick={() => setExpanded(isExpanded ? null : run.id)}
            >
              {run.status === "success" && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />}
              {run.status === "failed"  && <XCircle      className="h-4 w-4 shrink-0 text-red-500"     />}
              {run.status === "running" && <Spinner size={14} color="hsl(var(--primary))" />}
              {run.status === "pending" && <Clock       className="h-4 w-4 shrink-0 text-amber-500"    />}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold", runCfg.colorClass)}>{runCfg.label}</span>
                  {run.retry_attempt > 0 && (
                    <span className="text-[10px] text-muted-foreground">retry #{run.retry_attempt}</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
                  {run.output_summary || run.error_message || "—"}
                </p>
              </div>

              <div className="flex flex-col items-end gap-0.5 shrink-0">
                <span className="text-[10px] text-muted-foreground">{formatDuration(run.duration_ms)}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(run.started_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {isExpanded ? <ChevronUp className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            </button>

            {isExpanded && run.logs.length > 0 && (
              <div className="border-t bg-muted/30 px-3 py-2 space-y-1 font-mono text-[11px]">
                {run.logs.map((log, i) => (
                  <div key={i} className={cn(
                    "flex gap-2",
                    log.level === "error"   ? "text-red-500" :
                    log.level === "warn"    ? "text-amber-500" :
                    log.level === "success" ? "text-emerald-600" :
                    "text-muted-foreground",
                  )}>
                    <span className="shrink-0 opacity-50">
                      {new Date(log.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    </span>
                    <span>[{log.level.toUpperCase()}]</span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Schedule card ────────────────────────────────────────────────────────────

interface ScheduleCardProps {
  schedule: Schedule;
  runs: ScheduleRun[];
  triggering: boolean;
  onPause:   () => void;
  onResume:  () => void;
  onDelete:  () => void;
  onTrigger: () => void;
  onEdit:    () => void;
}

function ScheduleCard({
  schedule: s, runs, triggering,
  onPause, onResume, onDelete, onTrigger, onEdit,
}: ScheduleCardProps) {
  const [showLogs, setShowLogs] = useState(false);
  const typeCfg = SCHEDULE_TYPE_CONFIG[s.type];
  const rate     = successRate(s);

  return (
    <div className={cn(
      "rounded-xl border bg-card overflow-hidden transition-colors",
      s.status === "failed" && "border-red-500/30",
    )}>
      {/* Card header */}
      <div className="flex items-start gap-3 p-4">
        {/* Type icon */}
        <div className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg",
          s.status === "active" ? "bg-primary/10" : "bg-muted",
        )}>
          {typeCfg.icon}
        </div>

        {/* Main info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm">{s.name}</span>
            <StatusBadge status={s.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{s.agent_name}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatScheduleType(s.type, s.day, s.day_of_month)}
            </span>
            {SCHEDULE_TYPE_CONFIG[s.type].hasTiming && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {s.time} UTC
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onTrigger}
            disabled={triggering || s.status === "failed"}
            title="Manual trigger"
          >
            {triggering ? <Spinner size={12} color="currentColor" /> : <Zap className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Edit">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          {s.status === "active" ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onPause} title="Pause">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          ) : s.status === "paused" ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-500" onClick={onResume} title="Resume">
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive/60 hover:text-destructive"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <Separator />

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 divide-x text-center">
        {[
          { label: "Next run",    value: formatNextRun(s.next_run) },
          { label: "Last run",    value: formatLastRun(s.last_run), extra: <RunStatusBadge status={s.last_run_status} /> },
          { label: "Total runs",  value: String(s.total_runs) },
          { label: "Duration",    value: formatDuration(s.last_run_duration_ms) },
        ].map((col) => (
          <div key={col.label} className="py-3 px-2 space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-medium">{col.label}</p>
            <p className="text-sm font-semibold">{col.value}</p>
            {col.extra}
          </div>
        ))}
      </div>

      <Separator />

      {/* Success rate + output actions + log toggle */}
      <div className="flex flex-wrap items-center gap-4 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Success rate</span>
          <SuccessRateBar rate={rate} />
        </div>

        <div className="flex flex-wrap gap-1">
          {s.output_actions.map((a) => (
            <span key={a} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              {OUTPUT_ACTION_CONFIG[a].label}
            </span>
          ))}
        </div>

        <button
          className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShowLogs((v) => !v)}
        >
          <Activity className="h-3 w-3" />
          Logs ({runs.length})
          {showLogs ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
      </div>

      {/* Failed alert */}
      {s.status === "failed" && (
        <>
          <Separator />
          <div className="flex items-start gap-2 bg-red-500/5 px-4 py-3 text-xs text-red-600 dark:text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            Max retries ({s.max_retries}) reached. Resolve the issue and resume manually.
          </div>
        </>
      )}

      {/* Run logs */}
      {showLogs && (
        <>
          <Separator />
          <div className="px-4 py-3">
            <RunLogPanel runs={runs} />
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Filter bar
// ---------------------------------------------------------------------------

const FILTERS: { key: ScheduleFilter; label: string }[] = [
  { key: "all",    label: "All"    },
  { key: "active", label: "Active" },
  { key: "paused", label: "Paused" },
  { key: "failed", label: "Failed" },
];

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SchedulePage() {
  const {
    filtered, filter, setFilter, stats,
    triggering, saving,
    createSchedule, pauseSchedule, resumeSchedule,
    deleteSchedule, triggerSchedule,
    getRunsForSchedule,
  } = useScheduler();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<{ agentId: string; agentName: string } | null>(null);

  function handleNewSchedule() {
    setEditTarget({ agentId: "trending-1", agentName: "ResearchBot Pro" });
    setDialogOpen(true);
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">Scheduled Agents</h1>
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Automate agent execution on a schedule or trigger.
            </p>
          </div>
          <Button onClick={handleNewSchedule} className="gap-1.5 shrink-0">
            <Plus className="h-4 w-4" /> New Schedule
          </Button>
        </div>

        {/* ── Stats row ────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total",   value: stats.total,  color: "text-foreground",    bg: "bg-muted/40" },
            { label: "Active",  value: stats.active,  color: "text-emerald-600",  bg: "bg-emerald-500/5" },
            { label: "Paused",  value: stats.paused,  color: "text-amber-600",    bg: "bg-amber-500/5"   },
            { label: "Failed",  value: stats.failed,  color: "text-red-600",      bg: "bg-red-500/5"     },
          ].map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-4 text-center", s.bg)}>
              <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {FILTERS.map((f) => {
              const count = f.key === "all" ? stats.total : stats[f.key as keyof typeof stats];
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    filter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  <span className={cn(
                    "rounded-full px-1.5 text-[10px] font-bold",
                    filter === f.key ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-muted-foreground",
                  )}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <div className="flex h-1.5 w-1.5 items-center justify-center rounded-full bg-emerald-500 animate-pulse" />
            Queue: online · Workers: 4 active
          </div>
        </div>

        {/* ── Schedule list ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed py-20 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground/25" />
              <div>
                <p className="font-medium text-muted-foreground">No schedules yet</p>
                <p className="text-sm text-muted-foreground/60">
                  {filter === "all"
                    ? "Create your first schedule to automate an agent."
                    : `No ${filter} schedules found.`}
                </p>
              </div>
              {filter === "all" && (
                <Button size="sm" onClick={handleNewSchedule} className="gap-1.5 mt-1">
                  <Plus className="h-3.5 w-3.5" /> New Schedule
                </Button>
              )}
            </div>
          ) : (
            filtered.map((s) => (
              <ScheduleCard
                key={s.id}
                schedule={s}
                runs={getRunsForSchedule(s.id)}
                triggering={triggering === s.id}
                onPause={()   => pauseSchedule(s.id)}
                onResume={()  => resumeSchedule(s.id)}
                onDelete={()  => deleteSchedule(s.id)}
                onTrigger={() => triggerSchedule(s.id)}
                onEdit={() => {
                  setEditTarget({ agentId: s.agent_id, agentName: s.agent_name });
                  setDialogOpen(true);
                }}
              />
            ))
          )}
        </div>

        {/* ── Info footer ──────────────────────────────────────────── */}
        <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 mt-4">
          <Shield className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Schedules run in isolated worker containers with automatic retries. Input data is encrypted at rest.
            Webhook endpoints are secured with HMAC-SHA256 signature verification.
          </p>
        </div>
      </div>

      {/* Schedule creation dialog */}
      {editTarget && (
        <ScheduleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          agentId={editTarget.agentId}
          agentName={editTarget.agentName}
          onSave={createSchedule}
        />
      )}
    </DashboardLayout>
  );
}
