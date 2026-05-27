"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Plus, ZoomIn, ZoomOut, Maximize2,
  Play, Trash2, GitBranch, Timer, LogIn, LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkflowNode, WorkflowEdge, NodeType } from "@/lib/collaboration-data";
import { NODE_TYPE_CONFIG } from "@/lib/collaboration-data";

// ── Constants ─────────────────────────────────────────────────────────────────

const NODE_W = 160;
const NODE_H = 72;
const PORT_R = 6;
const GRID   = 20;

// ── Port hit-test ─────────────────────────────────────────────────────────────

function outPortCenter(node: WorkflowNode) {
  return { x: node.position.x + NODE_W, y: node.position.y + NODE_H / 2 };
}
function inPortCenter(node: WorkflowNode) {
  return { x: node.position.x, y: node.position.y + NODE_H / 2 };
}

function snap(v: number) {
  return Math.round(v / GRID) * GRID;
}

// ── Bezier path between two points ────────────────────────────────────────────

function bezierPath(x1: number, y1: number, x2: number, y2: number) {
  const dx = Math.abs(x2 - x1) * 0.5;
  return `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
}

// ── Node type icon map ────────────────────────────────────────────────────────

const TYPE_ICONS: Record<NodeType, React.ElementType> = {
  input:     LogIn,
  agent:     GitBranch,
  output:    LogOut,
  condition: GitBranch,
  delay:     Timer,
};

// ── Node card ─────────────────────────────────────────────────────────────────

interface NodeCardProps {
  node: WorkflowNode;
  selected: boolean;
  running?: boolean;
  completed?: boolean;
  onMouseDown: (e: React.MouseEvent, id: string) => void;
  onSelect: (id: string) => void;
  onPortMouseDown: (e: React.MouseEvent, nodeId: string) => void;
  onPortMouseUp: (e: React.MouseEvent, nodeId: string) => void;
}

function NodeCard({
  node, selected, running, completed,
  onMouseDown, onSelect, onPortMouseDown, onPortMouseUp,
}: NodeCardProps) {
  const cfg  = NODE_TYPE_CONFIG[node.type];
  const Icon = TYPE_ICONS[node.type];

  const borderColor = selected
    ? "stroke-primary"
    : running
    ? "stroke-blue-400"
    : completed
    ? "stroke-green-500"
    : "stroke-border";

  const ringWidth = selected ? 2 : 1.5;

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      style={{ cursor: "grab" }}
      onMouseDown={(e) => { e.stopPropagation(); onMouseDown(e, node.id); onSelect(node.id); }}
    >
      {/* Shadow */}
      <rect
        x={2} y={3}
        width={NODE_W} height={NODE_H}
        rx={10}
        fill="rgba(0,0,0,0.06)"
      />

      {/* Card bg */}
      <rect
        x={0} y={0}
        width={NODE_W} height={NODE_H}
        rx={10}
        stroke="currentColor"
        strokeWidth={ringWidth}
        className={cn("fill-card transition-all", borderColor)}
      />

      {/* Top accent bar */}
      <rect
        x={0} y={0}
        width={NODE_W} height={4}
        rx={10}
        className={cn(
          "transition-colors",
          running   ? "fill-blue-400" :
          completed ? "fill-green-500" :
          selected  ? "fill-primary" :
          node.type === "input"     ? "fill-sky-400" :
          node.type === "agent"     ? "fill-violet-500" :
          node.type === "output"    ? "fill-emerald-500" :
          node.type === "condition" ? "fill-amber-500" :
          "fill-slate-400"
        )}
      />

      {/* Icon bg circle */}
      <foreignObject x={10} y={14} width={28} height={28}>
        <div
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-lg text-xs",
            cfg.bgColor, cfg.color
          )}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
      </foreignObject>

      {/* Text */}
      <foreignObject x={44} y={10} width={NODE_W - 50} height={52}>
        <div className="flex flex-col justify-center h-full pr-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground leading-none mb-0.5">
            {NODE_TYPE_CONFIG[node.type].label}
          </p>
          <p className="text-xs font-semibold text-foreground leading-tight line-clamp-2">
            {node.label}
          </p>
        </div>
      </foreignObject>

      {/* Status indicator */}
      {(running || completed) && (
        <circle
          cx={NODE_W - 10}
          cy={10}
          r={4}
          className={running ? "fill-blue-400" : "fill-green-500"}
        />
      )}

      {/* Input port — hidden for "input" type */}
      {node.type !== "input" && (
        <circle
          cx={0}
          cy={NODE_H / 2}
          r={PORT_R}
          className="fill-background stroke-border cursor-crosshair hover:fill-primary hover:stroke-primary transition-colors"
          strokeWidth={1.5}
          onMouseUp={(e) => { e.stopPropagation(); onPortMouseUp(e, node.id); }}
        />
      )}

      {/* Output port — hidden for "output" type */}
      {node.type !== "output" && (
        <circle
          cx={NODE_W}
          cy={NODE_H / 2}
          r={PORT_R}
          className="fill-background stroke-border cursor-crosshair hover:fill-primary hover:stroke-primary transition-colors"
          strokeWidth={1.5}
          onMouseDown={(e) => { e.stopPropagation(); onPortMouseDown(e, node.id); }}
        />
      )}
    </g>
  );
}

// ── Toolbar ───────────────────────────────────────────────────────────────────

interface ToolbarProps {
  onAdd: (type: NodeType) => void;
  onDelete: () => void;
  hasSelection: boolean;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onRun: () => void;
  running: boolean;
}

function CanvasToolbar({
  onAdd, onDelete, hasSelection, zoom, onZoomIn, onZoomOut, onFit, onRun, running,
}: ToolbarProps) {
  const ADD_TYPES: { type: NodeType; label: string; icon: React.ElementType }[] = [
    { type: "input",     label: "Input",     icon: LogIn },
    { type: "agent",     label: "Agent",     icon: GitBranch },
    { type: "output",    label: "Output",    icon: LogOut },
    { type: "condition", label: "Condition", icon: GitBranch },
    { type: "delay",     label: "Delay",     icon: Timer },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-xl border bg-card/95 backdrop-blur p-1.5 shadow-lg">
      {ADD_TYPES.map(({ type, label, icon: Icon }) => {
        const cfg = NODE_TYPE_CONFIG[type];
        return (
          <button
            key={type}
            onClick={() => onAdd(type)}
            title={`Add ${label}`}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors",
              "hover:bg-muted border border-transparent hover:border-border",
              cfg.color
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        );
      })}

      <div className="mx-1 h-5 w-px bg-border" />

      <button
        onClick={onDelete}
        disabled={!hasSelection}
        title="Delete selected"
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] text-red-500 hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      <button onClick={onZoomOut} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Zoom out">
        <ZoomOut className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <span className="px-1 text-[11px] text-muted-foreground tabular-nums w-10 text-center">
        {Math.round(zoom * 100)}%
      </span>
      <button onClick={onZoomIn} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Zoom in">
        <ZoomIn className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <button onClick={onFit} className="rounded-lg p-1.5 hover:bg-muted transition-colors" title="Fit to screen">
        <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      <div className="mx-1 h-5 w-px bg-border" />

      <button
        onClick={onRun}
        disabled={running}
        className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
      >
        <Play className="h-3 w-3" />
        {running ? "Running…" : "Run"}
      </button>
    </div>
  );
}

// ── Canvas ────────────────────────────────────────────────────────────────────

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onNodeSelect: (id: string | null) => void;
  onNodesChange: (nodes: WorkflowNode[]) => void;
  onEdgesChange: (edges: WorkflowEdge[]) => void;
  onRun: () => void;
  running: boolean;
  completedNodes?: Set<string>;
}

export function WorkflowCanvas({
  nodes, edges, selectedNodeId, onNodeSelect,
  onNodesChange, onEdgesChange, onRun, running, completedNodes = new Set(),
}: WorkflowCanvasProps) {
  const svgRef   = useRef<SVGSVGElement>(null);
  const [zoom, setZoom]     = useState(1);
  const [pan, setPan]       = useState({ x: 40, y: 40 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart  = useRef({ x: 0, y: 0, px: 0, py: 0 });

  // Drag node state
  const dragRef = useRef<{ id: string; startMx: number; startMy: number; startNx: number; startNy: number } | null>(null);

  // Edge drawing state
  const edgeDraw = useRef<{ sourceId: string; mx: number; my: number } | null>(null);
  const [tempEdge, setTempEdge] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

  // SVG coordinate helper
  const svgCoords = useCallback((e: React.MouseEvent | MouseEvent) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top  - pan.y) / zoom,
    };
  }, [pan, zoom]);

  // ── Add node ──
  const addNode = useCallback((type: NodeType) => {
    const cx = (400 - pan.x) / zoom;
    const cy = (300 - pan.y) / zoom;
    const newNode: WorkflowNode = {
      id:   `n${Date.now()}`,
      type,
      label: `New ${NODE_TYPE_CONFIG[type].label}`,
      description: NODE_TYPE_CONFIG[type].description,
      position: { x: snap(cx), y: snap(cy) },
      config: {},
    };
    onNodesChange([...nodes, newNode]);
  }, [nodes, onNodesChange, pan, zoom]);

  // ── Delete selected ──
  const deleteSelected = useCallback(() => {
    if (!selectedNodeId) return;
    onNodesChange(nodes.filter((n) => n.id !== selectedNodeId));
    onEdgesChange(edges.filter((e) => e.sourceId !== selectedNodeId && e.targetId !== selectedNodeId));
    onNodeSelect(null);
  }, [selectedNodeId, nodes, edges, onNodesChange, onEdgesChange, onNodeSelect]);

  // ── Zoom ──
  const zoomIn  = () => setZoom((z) => Math.min(2, z + 0.1));
  const zoomOut = () => setZoom((z) => Math.max(0.3, z - 0.1));
  const fitView = useCallback(() => {
    if (nodes.length === 0) return;
    const minX = Math.min(...nodes.map((n) => n.position.x));
    const minY = Math.min(...nodes.map((n) => n.position.y));
    setZoom(0.85);
    setPan({ x: -minX * 0.85 + 60, y: -minY * 0.85 + 60 });
  }, [nodes]);

  // ── Mouse handlers ──
  const handleSvgMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (e.button === 1 || e.altKey) {
      // Middle click or alt+drag → pan
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
      e.preventDefault();
      return;
    }
    // Click on empty canvas → deselect
    onNodeSelect(null);
  };

  const handleNodeMouseDown = useCallback((e: React.MouseEvent, id: string) => {
    if (e.button !== 0) return;
    const { x, y } = svgCoords(e);
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    dragRef.current = { id, startMx: x, startMy: y, startNx: node.position.x, startNy: node.position.y };
  }, [nodes, svgCoords]);

  const handlePortMouseDown = useCallback((e: React.MouseEvent, sourceId: string) => {
    e.stopPropagation();
    const src = nodes.find((n) => n.id === sourceId);
    if (!src) return;
    const out = outPortCenter(src);
    edgeDraw.current = { sourceId, mx: out.x, my: out.y };
    setTempEdge({ x1: out.x, y1: out.y, x2: out.x, y2: out.y });
  }, [nodes]);

  const handlePortMouseUp = useCallback((_e: React.MouseEvent, targetId: string) => {
    if (!edgeDraw.current || edgeDraw.current.sourceId === targetId) {
      edgeDraw.current = null;
      setTempEdge(null);
      return;
    }
    const existing = edges.find(
      (ed) => ed.sourceId === edgeDraw.current!.sourceId && ed.targetId === targetId
    );
    if (!existing) {
      const newEdge: WorkflowEdge = {
        id: `e${Date.now()}`,
        sourceId: edgeDraw.current.sourceId,
        targetId,
      };
      onEdgesChange([...edges, newEdge]);
    }
    edgeDraw.current = null;
    setTempEdge(null);
  }, [edges, onEdgesChange]);

  // Global mouse move / up
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (isPanning) {
        setPan({
          x: panStart.current.px + (e.clientX - panStart.current.x),
          y: panStart.current.py + (e.clientY - panStart.current.y),
        });
        return;
      }
      if (dragRef.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const mx = (e.clientX - rect.left - pan.x) / zoom;
        const my = (e.clientY - rect.top  - pan.y) / zoom;
        const dx = mx - dragRef.current.startMx;
        const dy = my - dragRef.current.startMy;
        const nx = snap(dragRef.current.startNx + dx);
        const ny = snap(dragRef.current.startNy + dy);
        onNodesChange(
          nodes.map((n) =>
            n.id === dragRef.current!.id ? { ...n, position: { x: nx, y: ny } } : n
          )
        );
        return;
      }
      if (edgeDraw.current) {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const mx = (e.clientX - rect.left - pan.x) / zoom;
        const my = (e.clientY - rect.top  - pan.y) / zoom;
        const src = nodes.find((n) => n.id === edgeDraw.current!.sourceId);
        if (!src) return;
        const out = outPortCenter(src);
        setTempEdge({ x1: out.x, y1: out.y, x2: mx, y2: my });
      }
    };

    const onUp = () => {
      dragRef.current  = null;
      edgeDraw.current = null;
      setTempEdge(null);
      setIsPanning(false);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isPanning, nodes, onNodesChange, pan, zoom]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((z) => Math.min(2, Math.max(0.3, z + delta)));
  };

  return (
    <div className="relative flex-1 overflow-hidden rounded-xl border bg-muted/20">
      {/* Grid background */}
      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: isPanning ? "grabbing" : "default" }}
        onMouseDown={handleSvgMouseDown}
        onWheel={handleWheel}
      >
        <defs>
          <pattern id="grid" width={GRID * zoom} height={GRID * zoom} patternUnits="userSpaceOnUse"
            x={pan.x % (GRID * zoom)} y={pan.y % (GRID * zoom)}>
            <circle cx={0} cy={0} r={0.8} className="fill-border/60" />
          </pattern>
          <marker id="arrow" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary/60" />
          </marker>
          <marker id="arrow-temp" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" className="fill-primary" />
          </marker>
        </defs>

        {/* Dot grid */}
        <rect width="100%" height="100%" fill="url(#grid)" />

        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Edges */}
          {edges.map((edge) => {
            const src = nodes.find((n) => n.id === edge.sourceId);
            const tgt = nodes.find((n) => n.id === edge.targetId);
            if (!src || !tgt) return null;
            const out = outPortCenter(src);
            const inp = inPortCenter(tgt);
            const isSelected = src.id === selectedNodeId || tgt.id === selectedNodeId;
            return (
              <g key={edge.id}>
                {/* Hit area */}
                <path
                  d={bezierPath(out.x, out.y, inp.x, inp.y)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={12}
                  className="cursor-pointer"
                />
                {/* Visible edge */}
                <path
                  d={bezierPath(out.x, out.y, inp.x, inp.y)}
                  fill="none"
                  className={cn(
                    "transition-all",
                    isSelected ? "stroke-primary" : "stroke-muted-foreground/40"
                  )}
                  strokeWidth={isSelected ? 2 : 1.5}
                  markerEnd="url(#arrow)"
                  strokeDasharray={isSelected ? "none" : "none"}
                />
                {/* Data key label */}
                {edge.dataKey && (
                  <text
                    x={(out.x + inp.x) / 2}
                    y={(out.y + inp.y) / 2 - 6}
                    textAnchor="middle"
                    className="fill-muted-foreground text-[9px]"
                    fontSize={9}
                  >
                    {edge.dataKey}
                  </text>
                )}
              </g>
            );
          })}

          {/* Temp edge while drawing */}
          {tempEdge && (
            <path
              d={bezierPath(tempEdge.x1, tempEdge.y1, tempEdge.x2, tempEdge.y2)}
              fill="none"
              className="stroke-primary"
              strokeWidth={1.5}
              strokeDasharray="6 3"
              markerEnd="url(#arrow-temp)"
            />
          )}

          {/* Nodes */}
          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              running={running && !completedNodes.has(node.id)}
              completed={completedNodes.has(node.id)}
              onMouseDown={handleNodeMouseDown}
              onSelect={onNodeSelect}
              onPortMouseDown={handlePortMouseDown}
              onPortMouseUp={handlePortMouseUp}
            />
          ))}
        </g>
      </svg>

      {/* Toolbar */}
      <CanvasToolbar
        onAdd={addNode}
        onDelete={deleteSelected}
        hasSelection={!!selectedNodeId}
        zoom={zoom}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFit={fitView}
        onRun={onRun}
        running={running}
      />

      {/* Empty state */}
      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-border">
            <Plus className="h-6 w-6 text-muted-foreground/40" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">Add nodes from the toolbar above</p>
          <p className="text-xs text-muted-foreground/60">Drag to move · Alt+drag to pan · Scroll to zoom</p>
        </div>
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-3 right-3 rounded-lg border bg-card/80 backdrop-blur px-2 py-1 text-[10px] text-muted-foreground">
        {Math.round(zoom * 100)}% · {nodes.length} node{nodes.length !== 1 ? "s" : ""} · {edges.length} edge{edges.length !== 1 ? "s" : ""}
      </div>
    </div>
  );
}
