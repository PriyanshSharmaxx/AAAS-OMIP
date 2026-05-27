"use client";

import { useState, useRef, useCallback } from "react";
import {
  ArrowDownToLine, Brain, Globe, Wrench, GitBranch, ArrowUpFromLine,
  Plus, Trash2, ZoomIn, ZoomOut, RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { NODE_TYPES } from "@/lib/agent-frameworks";
import type { FlowData, FlowNode, FlowEdge } from "@/lib/types";

const NODE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  input: ArrowDownToLine,
  llm: Brain,
  api_call: Globe,
  tool: Wrench,
  condition: GitBranch,
  output: ArrowUpFromLine,
};

const NODE_COLORS: Record<string, string> = {
  input: "border-blue-400 bg-blue-500/10",
  llm: "border-purple-400 bg-purple-500/10",
  api_call: "border-green-400 bg-green-500/10",
  tool: "border-orange-400 bg-orange-500/10",
  condition: "border-yellow-400 bg-yellow-500/10",
  output: "border-red-400 bg-red-500/10",
};

const NODE_ICON_COLORS: Record<string, string> = {
  input: "text-blue-500",
  llm: "text-purple-500",
  api_call: "text-green-500",
  tool: "text-orange-500",
  condition: "text-yellow-500",
  output: "text-red-500",
};

function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

interface FlowCanvasProps {
  initialFlow: FlowData | null;
  onChange: (flow: FlowData) => void;
}

export function FlowCanvas({ initialFlow, onChange }: FlowCanvasProps) {
  const [nodes, setNodes] = useState<FlowNode[]>(initialFlow?.nodes ?? []);
  const [edges] = useState<FlowEdge[]>(initialFlow?.edges ?? []);
  const [selected, setSelected] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [history, setHistory] = useState<FlowNode[][]>([[]]);
  const [historyIdx, setHistoryIdx] = useState(0);

  const pushHistory = useCallback((newNodes: FlowNode[]) => {
    setHistory((h) => [...h.slice(0, historyIdx + 1), newNodes]);
    setHistoryIdx((i) => i + 1);
  }, [historyIdx]);

  const undo = () => {
    if (historyIdx === 0) return;
    const prev = history[historyIdx - 1];
    setNodes(prev);
    setHistoryIdx((i) => i - 1);
    onChange({ nodes: prev, edges });
  };

  const addNode = (type: FlowNode["type"]) => {
    const typeInfo = NODE_TYPES.find((n) => n.type === type);
    const newNode: FlowNode = {
      id: generateId(),
      type,
      label: typeInfo?.label ?? type,
      position: {
        x: 120 + nodes.length * 30,
        y: 120 + (nodes.length % 4) * 80,
      },
      config: {},
    };
    const updated = [...nodes, newNode];
    setNodes(updated);
    pushHistory(updated);
    onChange({ nodes: updated, edges });
  };

  const deleteNode = (id: string) => {
    const updated = nodes.filter((n) => n.id !== id);
    setNodes(updated);
    pushHistory(updated);
    setSelected(null);
    onChange({ nodes: updated, edges });
  };

  const handleMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelected(id);
    const node = nodes.find((n) => n.id === id);
    if (!node) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setDragging({
      id,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging || !canvasRef.current) return;
    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = (e.clientX - canvasRect.left - pan.x - dragging.offsetX) / zoom;
    const y = (e.clientY - canvasRect.top - pan.y - dragging.offsetY) / zoom;
    setNodes((ns) =>
      ns.map((n) => (n.id === dragging.id ? { ...n, position: { x, y } } : n))
    );
  };

  const handleMouseUp = () => {
    if (dragging) {
      pushHistory(nodes);
      onChange({ nodes, edges });
    }
    setDragging(null);
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-muted/20">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b bg-background px-4 py-2">
        <span className="text-xs font-medium text-muted-foreground mr-1">Add node:</span>
        {NODE_TYPES.map((nt) => {
          const Icon = NODE_ICONS[nt.type] ?? Brain;
          return (
            <Button
              key={nt.type}
              variant="outline"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => addNode(nt.type)}
            >
              <Icon className="h-3 w-3" />
              {nt.label}
            </Button>
          );
        })}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={undo} disabled={historyIdx === 0}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.min(z + 0.1, 2))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs w-10 text-center text-muted-foreground">{Math.round(zoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom((z) => Math.max(z - 0.1, 0.4))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="relative flex-1 overflow-hidden cursor-default"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={() => setSelected(null)}
        style={{ backgroundImage: "radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      >
        {nodes.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 pointer-events-none">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Empty canvas</p>
              <p className="text-xs text-muted-foreground mt-1">Click a node type above to add it</p>
            </div>
          </div>
        )}

        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            inset: 0,
          }}
        >
          {/* Edges (simple lines) */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: "visible" }}>
            {edges.map((edge) => {
              const src = nodes.find((n) => n.id === edge.source);
              const tgt = nodes.find((n) => n.id === edge.target);
              if (!src || !tgt) return null;
              const x1 = src.position.x + 80;
              const y1 = src.position.y + 28;
              const x2 = tgt.position.x;
              const y2 = tgt.position.y + 28;
              const cx = (x1 + x2) / 2;
              return (
                <path
                  key={edge.id}
                  d={`M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`}
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  fill="none"
                  strokeOpacity="0.6"
                />
              );
            })}
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const Icon = NODE_ICONS[node.type] ?? Brain;
            const isSelected = selected === node.id;
            return (
              <div
                key={node.id}
                className={`absolute flex items-center gap-2.5 rounded-xl border-2 bg-card px-4 py-3 shadow-sm cursor-grab active:cursor-grabbing select-none transition-shadow ${
                  NODE_COLORS[node.type] ?? "border-border"
                } ${isSelected ? "shadow-lg ring-2 ring-primary ring-offset-1" : "hover:shadow-md"}`}
                style={{
                  left: node.position.x,
                  top: node.position.y,
                  minWidth: 160,
                }}
                onMouseDown={(e) => handleMouseDown(e, node.id)}
                onClick={(e) => { e.stopPropagation(); setSelected(node.id); }}
              >
                <Icon className={`h-4 w-4 shrink-0 ${NODE_ICON_COLORS[node.type]}`} />
                <span className="text-sm font-medium">{node.label}</span>
                {isSelected && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 ml-auto text-destructive hover:text-destructive"
                    onClick={(e) => { e.stopPropagation(); deleteNode(node.id); }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Node count */}
      <div className="border-t bg-background px-4 py-1.5 text-xs text-muted-foreground flex items-center gap-4">
        <span>{nodes.length} nodes</span>
        <span>{edges.length} connections</span>
      </div>
    </div>
  );
}
