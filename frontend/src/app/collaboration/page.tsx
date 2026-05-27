"use client";

import { useState, useCallback, useEffect } from "react";
import { GitBranch, Users, Zap, BarChart2, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, Maximize2, Minimize2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WorkflowCanvas } from "@/components/collaboration/workflow-canvas";
import { WorkflowList } from "@/components/collaboration/workflow-list";
import { ConfigPanel } from "@/components/collaboration/config-panel";
import {
  MOCK_WORKFLOWS, MOCK_TEAMS,
  type Workflow, type WorkflowNode, type WorkflowEdge,
} from "@/lib/collaboration-data";

// ─── Execution mock ───────────────────────────────────────────────────────────

async function mockRunWorkflow(
  workflow: Workflow,
  onLog: (line: string) => void,
  onNodeComplete: (id: string) => void,
): Promise<void> {
  const delay = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  onLog(`→ Starting workflow: "${workflow.name}"`);
  onLog(`→ Mode: ${workflow.mode} | Nodes: ${workflow.nodes.length}`);
  await delay(400);

  const ordered =
    workflow.mode === "sequential"
      ? workflow.nodes
      : [...workflow.nodes].sort((a, b) => a.position.x - b.position.x);

  for (const node of ordered) {
    onLog(`→ Executing: ${node.label} (${node.type})`);
    await delay(700 + Math.random() * 600);

    if (node.type === "agent") {
      onLog(`  model=${node.config.model ?? "gpt-4o"} temp=${node.config.temperature ?? 0.7}`);
      await delay(400);
    }

    onLog(`✓ Completed: ${node.label}`);
    onNodeComplete(node.id);
    await delay(200);
  }

  await delay(300);
  onLog(`✓ Workflow "${workflow.name}" completed successfully.`);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CollaborationPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(MOCK_WORKFLOWS);
  const [selectedId, setSelectedId] = useState<string>(MOCK_WORKFLOWS[0].id);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  // ── Panel visibility ──
  const [leftOpen, setLeftOpen]         = useState(true);
  const [rightOpen, setRightOpen]       = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Hide site footer + copilot fab while on this canvas page
  useEffect(() => {
    document.body.setAttribute("data-hide-footer", "true");
    return () => document.body.removeAttribute("data-hide-footer");
  }, []);

  // Keyboard shortcuts: [ ] F
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "[") setLeftOpen((v) => !v);
      if (e.key === "]") setRightOpen((v) => !v);
      if (e.key === "f" || e.key === "F") setIsFullscreen((v) => !v);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const activeWorkflow = workflows.find((w) => w.id === selectedId) ?? null;

  // ── Workflow CRUD ──
  const handleCreate = useCallback(() => {
    const newWf: Workflow = {
      id: `wf-${Date.now()}`,
      name: "Untitled Workflow",
      description: "A new workflow — add nodes and connect them.",
      status: "draft",
      mode: "sequential",
      nodes: [],
      edges: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      run_count: 0,
      success_rate: 0,
      estimated_duration_s: 0,
      creator: "Demo User",
      tags: [],
    };
    setWorkflows((prev) => [newWf, ...prev]);
    setSelectedId(newWf.id);
    setSelectedNodeId(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    if (selectedId === id) {
      setSelectedId(workflows.find((w) => w.id !== id)?.id ?? "");
    }
  }, [selectedId, workflows]);

  const handleDuplicate = useCallback((id: string) => {
    const orig = workflows.find((w) => w.id === id);
    if (!orig) return;
    const clone: Workflow = {
      ...orig,
      id: `wf-${Date.now()}`,
      name: `${orig.name} (copy)`,
      status: "draft",
      run_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setWorkflows((prev) => [clone, ...prev]);
    setSelectedId(clone.id);
  }, [workflows]);

  const handleWorkflowChange = useCallback((updated: Workflow) => {
    setWorkflows((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
  }, []);

  const handleNodesChange = useCallback((nodes: WorkflowNode[]) => {
    if (!activeWorkflow) return;
    handleWorkflowChange({ ...activeWorkflow, nodes, updated_at: new Date().toISOString() });
  }, [activeWorkflow, handleWorkflowChange]);

  const handleEdgesChange = useCallback((edges: WorkflowEdge[]) => {
    if (!activeWorkflow) return;
    handleWorkflowChange({ ...activeWorkflow, edges, updated_at: new Date().toISOString() });
  }, [activeWorkflow, handleWorkflowChange]);

  const handleNodeChange = useCallback((node: WorkflowNode) => {
    if (!activeWorkflow) return;
    handleWorkflowChange({
      ...activeWorkflow,
      nodes: activeWorkflow.nodes.map((n) => (n.id === node.id ? node : n)),
    });
  }, [activeWorkflow, handleWorkflowChange]);

  const handleRun = useCallback(async () => {
    if (!activeWorkflow || isRunning) return;
    setIsRunning(true);
    setCompletedNodes(new Set());
    setExecutionLog([]);
    handleWorkflowChange({ ...activeWorkflow, status: "running" });
    try {
      await mockRunWorkflow(
        activeWorkflow,
        (line) => setExecutionLog((prev) => [...prev, line]),
        (nodeId) => setCompletedNodes((prev) => new Set([...prev, nodeId])),
      );
      handleWorkflowChange({
        ...activeWorkflow,
        status: "active",
        run_count: activeWorkflow.run_count + 1,
        last_run: new Date().toISOString(),
        success_rate: Math.min(1, activeWorkflow.success_rate + 0.01),
      });
    } catch {
      handleWorkflowChange({ ...activeWorkflow, status: "failed" });
      setExecutionLog((prev) => [...prev, "✗ Execution failed."]);
    } finally {
      setIsRunning(false);
    }
  }, [activeWorkflow, isRunning, handleWorkflowChange]);

  // ── Stats ──
  const totalRuns   = workflows.reduce((s, w) => s + w.run_count, 0);
  const totalNodes  = workflows.reduce((s, w) => s + w.nodes.length, 0);
  const activeCount = workflows.filter((w) => w.status === "active").length;

  return (
    <div
      className={`flex flex-col bg-background transition-all duration-300 ${
        isFullscreen ? "fixed inset-0 z-[60]" : "h-screen pt-16"
      }`}
    >
      {/* ── Header ── */}
      <div className="border-b bg-card/60 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-4 shrink-0">
        {/* Left side */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLeftOpen((v) => !v)}
            title={leftOpen ? "Collapse workflow list  [" : "Expand workflow list  ["}
          >
            {leftOpen
              ? <PanelLeftClose className="h-4 w-4" />
              : <PanelLeftOpen  className="h-4 w-4" />}
          </Button>

          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
              <GitBranch className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">Multi-Agent Collaboration</h1>
              <p className="text-[10px] text-muted-foreground">Build, chain, and run AI agent workflows visually</p>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="hidden md:flex items-center gap-5">
          {[
            { icon: GitBranch, label: "Workflows",   value: workflows.length },
            { icon: Zap,       label: "Active",      value: activeCount },
            { icon: BarChart2, label: "Total Runs",  value: totalRuns },
            { icon: Users,     label: "Total Nodes", value: totalNodes },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-1.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <div>
                <p className="text-xs font-bold leading-none">{value}</p>
                <p className="text-[10px] text-muted-foreground">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1">
          {/* Keyboard hint */}
          <span className="hidden xl:flex items-center gap-1 text-[10px] text-muted-foreground/50 mr-2 select-none">
            <kbd className="rounded border px-1 py-0.5 text-[9px] bg-muted font-mono">[</kbd>
            <kbd className="rounded border px-1 py-0.5 text-[9px] bg-muted font-mono">]</kbd>
            <kbd className="rounded border px-1 py-0.5 text-[9px] bg-muted font-mono">F</kbd>
            <span className="ml-0.5">toggle panels / fullscreen</span>
          </span>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setRightOpen((v) => !v)}
            title={rightOpen ? "Collapse config panel  ]" : "Expand config panel  ]"}
          >
            {rightOpen
              ? <PanelRightClose className="h-4 w-4" />
              : <PanelRightOpen  className="h-4 w-4" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit fullscreen  F" : "Fullscreen  F"}
          >
            {isFullscreen
              ? <Minimize2 className="h-4 w-4" />
              : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* ── Three-panel layout ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div
          className="shrink-0 overflow-y-auto border-r transition-[width,opacity] duration-300 ease-in-out"
          style={{ width: leftOpen ? 256 : 0, opacity: leftOpen ? 1 : 0 }}
        >
          <div style={{ width: 256, minHeight: "100%" }}>
            <WorkflowList
              workflows={workflows}
              selectedId={selectedId}
              onSelect={(id) => {
                setSelectedId(id);
                setSelectedNodeId(null);
                setCompletedNodes(new Set());
                setExecutionLog([]);
              }}
              onCreate={handleCreate}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
              onRun={(id) => { setSelectedId(id); void handleRun(); }}
            />
          </div>
        </div>

        {/* Center canvas */}
        <div className="flex flex-1 flex-col overflow-hidden p-3 gap-2 bg-background min-w-0">
          {activeWorkflow && (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-sm font-semibold truncate">{activeWorkflow.name}</span>
              <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
                {activeWorkflow.mode}
              </Badge>
              {isRunning && (
                <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] text-blue-600 dark:text-blue-400 font-semibold shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                  Running…
                </span>
              )}
              {/* Quick panel toggle chips */}
              <div className="ml-auto flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setLeftOpen((v) => !v)}
                  className="rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {leftOpen ? "‹ Hide list" : "› Show list"}
                </button>
                <button
                  onClick={() => setRightOpen((v) => !v)}
                  className="rounded-md border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {rightOpen ? "Hide config ›" : "Show config ‹"}
                </button>
              </div>
            </div>
          )}

          {activeWorkflow ? (
            <WorkflowCanvas
              nodes={activeWorkflow.nodes}
              edges={activeWorkflow.edges}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
              onNodesChange={handleNodesChange}
              onEdgesChange={handleEdgesChange}
              onRun={handleRun}
              running={isRunning}
              completedNodes={completedNodes}
            />
          ) : (
            <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed">
              <p className="text-sm text-muted-foreground">
                Select a workflow or create one to get started
              </p>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div
          className="shrink-0 overflow-y-auto border-l transition-[width,opacity] duration-300 ease-in-out"
          style={{ width: rightOpen ? 288 : 0, opacity: rightOpen ? 1 : 0 }}
        >
          <div style={{ width: 288, minHeight: "100%" }}>
            <ConfigPanel
              workflow={activeWorkflow}
              selectedNode={activeWorkflow?.nodes.find((n) => n.id === selectedNodeId) ?? null}
              teams={MOCK_TEAMS}
              onWorkflowChange={handleWorkflowChange}
              onNodeChange={handleNodeChange}
              onClose={() => setSelectedNodeId(null)}
              executionLog={executionLog}
              isRunning={isRunning}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
