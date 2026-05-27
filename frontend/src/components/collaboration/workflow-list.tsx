"use client";

import { useState } from "react";
import { Plus, Search, Play, Clock, CheckCircle2, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Workflow } from "@/lib/collaboration-data";
import { STATUS_CONFIG } from "@/lib/collaboration-data";


interface WorkflowListProps {
  workflows: Workflow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRun: (id: string) => void;
}

export function WorkflowList({
  workflows, selectedId, onSelect, onCreate, onDelete, onDuplicate, onRun,
}: WorkflowListProps) {
  const [search, setSearch] = useState("");

  const filtered = workflows.filter(
    (w) =>
      w.name.toLowerCase().includes(search.toLowerCase()) ||
      w.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex h-full flex-col border-r bg-card">
      {/* Header */}
      <div className="border-b px-4 py-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold">Workflows</h2>
          <Button size="sm" className="h-7 gap-1 text-xs" onClick={onCreate}>
            <Plus className="h-3.5 w-3.5" /> New
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search workflows…"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">No workflows found.</p>
        ) : (
          filtered.map((wf) => {
            const statusCfg  = STATUS_CONFIG[wf.status];
            const isSelected = wf.id === selectedId;

            return (
              <div
                key={wf.id}
                onClick={() => onSelect(wf.id)}
                className={cn(
                  "group mx-2 mb-1 cursor-pointer rounded-xl border p-3 transition-all",
                  isSelected
                    ? "border-primary/40 bg-primary/5"
                    : "border-transparent hover:border-border hover:bg-muted/40"
                )}
              >
                {/* Name + status */}
                <div className="mb-1.5 flex items-start justify-between gap-2">
                  <p className={cn("text-xs font-semibold leading-tight flex-1 min-w-0", isSelected && "text-primary")}>
                    {wf.name}
                  </p>
                  <span className={cn("shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold", statusCfg.color)}>
                    {statusCfg.label}
                  </span>
                </div>

                {/* Description */}
                <p className="mb-2 line-clamp-2 text-[10px] text-muted-foreground leading-relaxed">
                  {wf.description}
                </p>

                {/* Tags */}
                <div className="mb-2 flex flex-wrap gap-1">
                  {wf.tags.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] text-muted-foreground">
                      {t}
                    </span>
                  ))}
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-0.5">
                      <Play className="h-2.5 w-2.5" /> {wf.run_count}
                    </span>
                    <span className="flex items-center gap-0.5">
                      <CheckCircle2 className="h-2.5 w-2.5 text-green-500" />
                      {Math.round(wf.success_rate * 100)}%
                    </span>
                    <span className="flex items-center gap-0.5">
                      <Clock className="h-2.5 w-2.5" /> ~{wf.estimated_duration_s}s
                    </span>
                  </div>
                  <span className="text-[9px]">{wf.nodes.length} nodes</span>
                </div>

                {/* Actions — shown on hover / selected */}
                <div className={cn(
                  "mt-2 flex gap-1 transition-all",
                  isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                )}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onRun(wf.id); }}
                    className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/20 transition-colors"
                  >
                    <Play className="h-2.5 w-2.5" /> Run
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDuplicate(wf.id); }}
                    className="flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-2.5 w-2.5" /> Clone
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(wf.id); }}
                    className="ml-auto flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] text-red-500/70 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer — execution mode legend */}
      <div className="border-t px-4 py-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/60">Execution Mode</p>
        <div className="flex gap-3">
          {(["sequential", "parallel"] as const).map((m) => (
            <div key={m} className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", m === "sequential" ? "bg-primary" : "bg-amber-500")} />
              <span className="text-[10px] capitalize text-muted-foreground">{m}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
