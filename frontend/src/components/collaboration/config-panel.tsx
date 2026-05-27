"use client";

import { useState } from "react";
import {
  Info, ChevronDown, ChevronUp, Play, GitBranch, Users,
  Save, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Workflow, WorkflowNode, AgentTeam } from "@/lib/collaboration-data";
import { NODE_TYPE_CONFIG, ROLE_CONFIG, STATUS_CONFIG } from "@/lib/collaboration-data";

// ── Collapsible section ───────────────────────────────────────────────────────

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground uppercase tracking-wide transition-colors"
      >
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// ── Slider input ──────────────────────────────────────────────────────────────

function SliderField({ label, value, min, max, step = 0.1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono tabular-nums">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-primary"
      />
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ConfigPanelProps {
  workflow: Workflow | null;
  selectedNode: WorkflowNode | null;
  teams: AgentTeam[];
  onWorkflowChange: (w: Workflow) => void;
  onNodeChange: (n: WorkflowNode) => void;
  onClose: () => void;
  executionLog: string[];
  isRunning: boolean;
}

// ── Panel ─────────────────────────────────────────────────────────────────────

export function ConfigPanel({
  workflow, selectedNode, teams, onWorkflowChange, onNodeChange, onClose, executionLog, isRunning,
}: ConfigPanelProps) {
  const [tab, setTab] = useState<"config" | "log" | "teams">("config");

  if (!workflow) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 border-l bg-card p-6 text-center">
        <GitBranch className="h-10 w-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Select a workflow to configure</p>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[workflow.status];

  return (
    <div className="flex h-full flex-col border-l bg-card overflow-hidden">
      {/* Panel tabs */}
      <div className="border-b px-3 py-2 flex gap-1">
        {(["config", "log", "teams"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              tab === t ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            {t === "log" ? "Exec Log" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* ── Config tab ── */}
        {tab === "config" && (
          <>
            {/* Workflow header */}
            <Section title="Workflow">
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Name</label>
                  <Input
                    value={workflow.name}
                    onChange={(e) => onWorkflowChange({ ...workflow, name: e.target.value })}
                    className="mt-1 h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Description</label>
                  <textarea
                    value={workflow.description}
                    onChange={(e) => onWorkflowChange({ ...workflow, description: e.target.value })}
                    className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    rows={2}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Mode</label>
                    <div className="mt-1 flex gap-2">
                      {(["sequential", "parallel"] as const).map((m) => (
                        <button
                          key={m}
                          onClick={() => onWorkflowChange({ ...workflow, mode: m })}
                          className={cn(
                            "flex-1 rounded-lg border py-1.5 text-[11px] font-medium capitalize transition-colors",
                            workflow.mode === m
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Status</label>
                    <div className={cn("mt-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-center", statusCfg.color)}>
                      {statusCfg.label}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Tags (comma-separated)</label>
                  <Input
                    value={workflow.tags.join(", ")}
                    onChange={(e) => onWorkflowChange({ ...workflow, tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                    className="mt-1 h-8 text-xs"
                    placeholder="research, content, automation"
                  />
                </div>
              </div>
            </Section>

            {/* Stats */}
            <Section title="Stats" defaultOpen={false}>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Runs",          value: workflow.run_count },
                  { label: "Success Rate",  value: `${Math.round(workflow.success_rate * 100)}%` },
                  { label: "Nodes",         value: workflow.nodes.length },
                  { label: "Edges",         value: workflow.edges.length },
                  { label: "Est. Duration", value: `~${workflow.estimated_duration_s}s` },
                  { label: "Mode",          value: workflow.mode },
                ].map(({ label, value }) => (
                  <div key={label} className="rounded-lg border bg-muted/30 p-2">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{label}</p>
                    <p className="mt-0.5 text-xs font-semibold capitalize">{value}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* Selected node config */}
            {selectedNode ? (
              <Section title="Selected Node">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-lg border bg-muted/30 p-2">
                    <div className={cn("rounded-lg p-1.5", NODE_TYPE_CONFIG[selectedNode.type].bgColor)}>
                      <span className={cn("text-[11px] font-bold", NODE_TYPE_CONFIG[selectedNode.type].color)}>
                        {NODE_TYPE_CONFIG[selectedNode.type].label[0]}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{selectedNode.label}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{selectedNode.type} node</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Label</label>
                    <Input
                      value={selectedNode.label}
                      onChange={(e) => onNodeChange({ ...selectedNode, label: e.target.value })}
                      className="mt-1 h-8 text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Description</label>
                    <textarea
                      value={selectedNode.description}
                      onChange={(e) => onNodeChange({ ...selectedNode, description: e.target.value })}
                      className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                      rows={2}
                    />
                  </div>

                  {selectedNode.type === "agent" && (
                    <>
                      <Separator />
                      <div className="space-y-3">
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Model</label>
                          <select
                            value={selectedNode.config.model ?? "gpt-4o"}
                            onChange={(e) => onNodeChange({ ...selectedNode, config: { ...selectedNode.config, model: e.target.value } })}
                            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                          >
                            {["gpt-4o", "gpt-4o-mini", "claude-opus-4-6", "claude-sonnet-4-6", "gemini-2.0-pro"].map((m) => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <SliderField
                          label="Temperature"
                          value={selectedNode.config.temperature ?? 0.7}
                          min={0} max={2} step={0.05}
                          onChange={(v) => onNodeChange({ ...selectedNode, config: { ...selectedNode.config, temperature: v } })}
                        />
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Max Tokens</label>
                          <Input
                            type="number"
                            value={selectedNode.config.max_tokens ?? 4096}
                            onChange={(e) => onNodeChange({ ...selectedNode, config: { ...selectedNode.config, max_tokens: parseInt(e.target.value) } })}
                            className="mt-1 h-8 text-xs"
                            min={256}
                            max={128000}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Retry Attempts</label>
                          <Input
                            type="number"
                            value={selectedNode.config.retry ?? 1}
                            onChange={(e) => onNodeChange({ ...selectedNode, config: { ...selectedNode.config, retry: parseInt(e.target.value) } })}
                            className="mt-1 h-8 text-xs"
                            min={0}
                            max={5}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  {selectedNode.type === "delay" && (
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Delay (ms)</label>
                      <Input
                        type="number"
                        value={selectedNode.config.delay_ms ?? 1000}
                        onChange={(e) => onNodeChange({ ...selectedNode, config: { ...selectedNode.config, delay_ms: parseInt(e.target.value) } })}
                        className="mt-1 h-8 text-xs"
                        min={100}
                        step={100}
                      />
                    </div>
                  )}

                  {selectedNode.type === "condition" && (
                    <div>
                      <label className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold">Condition Expression</label>
                      <Input
                        value={selectedNode.config.condition ?? ""}
                        onChange={(e) => onNodeChange({ ...selectedNode, config: { ...selectedNode.config, condition: e.target.value } })}
                        className="mt-1 h-8 font-mono text-xs"
                        placeholder='e.g. urgency === "high"'
                      />
                    </div>
                  )}
                </div>
              </Section>
            ) : (
              <div className="px-4 py-4">
                <div className="rounded-xl border border-dashed p-4 text-center">
                  <Info className="mx-auto mb-2 h-5 w-5 text-muted-foreground/40" />
                  <p className="text-[11px] text-muted-foreground">Click any node to configure it</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Execution log tab ── */}
        {tab === "log" && (
          <div className="p-4 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <Play className={cn("h-3.5 w-3.5", isRunning ? "text-blue-500 animate-pulse" : "text-muted-foreground/40")} />
              <span className="text-xs font-semibold">{isRunning ? "Execution in progress…" : "Last execution log"}</span>
            </div>
            {executionLog.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">No execution log yet. Run the workflow to see logs.</p>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-3 space-y-1 font-mono text-[10px]">
                {executionLog.map((line, i) => (
                  <div
                    key={i}
                    className={cn(
                      "leading-relaxed",
                      line.startsWith("✓") ? "text-green-600 dark:text-green-400" :
                      line.startsWith("✗") ? "text-red-500" :
                      line.startsWith("→") ? "text-primary" :
                      "text-muted-foreground"
                    )}
                  >
                    {line}
                  </div>
                ))}
                {isRunning && (
                  <div className="text-primary flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                    Processing…
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Teams tab ── */}
        {tab === "teams" && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">Agent Teams</p>
              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                <Users className="h-3 w-3" /> New Team
              </Button>
            </div>
            {teams.map((team) => (
              <div key={team.id} className="rounded-xl border p-3 space-y-2">
                <div>
                  <p className="text-xs font-semibold">{team.name}</p>
                  <p className="text-[10px] text-muted-foreground">{team.description}</p>
                </div>
                <div className="space-y-1.5">
                  {team.members.map((m) => {
                    const roleCfg = ROLE_CONFIG[m.role];
                    return (
                      <div key={m.agentId} className="flex items-center gap-2">
                        <span className="text-sm">{roleCfg.icon}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium truncate">{m.agentName}</p>
                          <p className="text-[9px] text-muted-foreground truncate">{m.description}</p>
                        </div>
                        <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize", roleCfg.color)}>
                          {m.role}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="rounded-md bg-muted/40 px-2 py-1.5 text-[10px] text-muted-foreground font-mono break-all">
                  {team.sharedContext}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer save */}
      <div className="border-t px-4 py-3 flex gap-2">
        <Button size="sm" className="flex-1 h-8 gap-1.5 text-xs">
          <Save className="h-3.5 w-3.5" /> Save
        </Button>
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
