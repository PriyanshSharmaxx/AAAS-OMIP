"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Bot, Send, Sparkles, Zap, TrendingDown, AlertTriangle,
  Gauge, Cpu, RotateCcw, ChevronDown, ChevronUp,
  CheckCircle2, X, DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { DiffViewer } from "./diff-viewer";
import { useCopilot } from "@/hooks/useCopilot";
import { cn } from "@/lib/utils";
import type { CopilotMessage, CopilotSuggestion, SuggestionCategory, ImpactLevel } from "@/lib/copilot-engine";
import type { AgentDraft } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CopilotPanelProps {
  draft: AgentDraft;
  onApplyChanges: (change: Partial<AgentDraft>) => Promise<void>;
}

// ─── Category metadata ───────────────────────────────────────────────────────

const CATEGORY_META: Record<SuggestionCategory, { label: string; icon: typeof Sparkles; color: string }> = {
  prompt_optimization: { label: "Prompt",      icon: Sparkles,      color: "text-violet-500" },
  model_optimization:  { label: "Model",       icon: Cpu,           color: "text-blue-500"   },
  cost_reduction:      { label: "Cost",        icon: DollarSign,    color: "text-green-500"  },
  error_debug:         { label: "Debug",       icon: AlertTriangle, color: "text-amber-500"  },
  performance:         { label: "Performance", icon: Gauge,         color: "text-cyan-500"   },
};

const IMPACT_STYLES: Record<ImpactLevel, string> = {
  high:   "bg-red-500/10 text-red-600 dark:text-red-400 border-red-300/30",
  medium: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300/30",
  low:    "bg-green-500/10 text-green-600 dark:text-green-400 border-green-300/30",
};

// ─── Quick-prompt chips ──────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: "Make it faster",      icon: Gauge },
  { label: "Reduce cost",         icon: TrendingDown },
  { label: "Fix errors",          icon: AlertTriangle },
  { label: "Improve output",      icon: Sparkles },
  { label: "Optimize everything", icon: Zap },
];

// ─── Performance score ring ──────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-12 w-12 items-center justify-center">
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={radius} stroke="currentColor" strokeWidth="3" fill="none" className="text-border" />
        <circle
          cx="24" cy="24" r={radius}
          stroke={color} strokeWidth="3" fill="none"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <span className="absolute text-xs font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Suggestion card ─────────────────────────────────────────────────────────

function SuggestionCard({
  suggestion,
  applied,
  dismissed,
  onApply,
  onDismiss,
}: {
  suggestion: CopilotSuggestion;
  applied: boolean;
  dismissed: boolean;
  onApply: () => void;
  onDismiss: () => void;
}) {
  const [applying, setApplying] = useState(false);
  const meta = CATEGORY_META[suggestion.category];
  const Icon = meta.icon;

  if (dismissed) return null;

  const handleApply = async () => {
    setApplying(true);
    try {
      await onApply();
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border bg-card/80 p-3.5 shadow-sm transition-all",
        applied && "border-green-500/40 bg-green-500/5 opacity-75"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={cn("shrink-0 rounded-md bg-muted p-1.5", meta.color)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <span className="text-sm font-semibold leading-tight truncate">
            {suggestion.title}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize", IMPACT_STYLES[suggestion.impact])}>
            {suggestion.impact} impact
          </span>
          {!applied && (
            <button
              onClick={onDismiss}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss suggestion"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="text-xs text-muted-foreground leading-relaxed mb-2">
        {suggestion.description}
      </p>

      {/* Savings chips */}
      {suggestion.savings && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {suggestion.savings.costLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
              <DollarSign className="h-2.5 w-2.5" /> {suggestion.savings.costLabel}
            </span>
          )}
          {suggestion.savings.latencyLabel && (
            <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-600 dark:text-cyan-400">
              <Gauge className="h-2.5 w-2.5" /> {suggestion.savings.latencyLabel}
            </span>
          )}
          {suggestion.savings.tokens != null && suggestion.savings.tokens > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-600 dark:text-violet-400">
              <Sparkles className="h-2.5 w-2.5" /> {suggestion.savings.tokens} tokens saved
            </span>
          )}
        </div>
      )}

      {/* Diff viewer */}
      {suggestion.before != null && suggestion.after != null && (
        <DiffViewer before={suggestion.before} after={suggestion.after} />
      )}

      {/* Actions */}
      <div className="mt-3 flex gap-2">
        {applied ? (
          <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
            <CheckCircle2 className="h-4 w-4" /> Applied
          </div>
        ) : (
          <Button
            size="sm"
            className="h-7 text-xs gap-1.5 flex-1"
            onClick={handleApply}
            disabled={applying}
          >
            {applying ? (
              <>
                <span className="h-3 w-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Zap className="h-3.5 w-3.5" /> Apply Changes
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Message renderer ────────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  // Minimal bold/italic renderer — avoids a heavy library dependency
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    // Handle line breaks
    return part.split("\n").map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

function ChatMessage({
  message,
  appliedIds,
  dismissedIds,
  onApply,
  onDismiss,
}: {
  message: CopilotMessage;
  appliedIds: Set<string>;
  dismissedIds: Set<string>;
  onApply: (s: CopilotSuggestion) => Promise<void>;
  onDismiss: (id: string) => void;
}) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
      {/* Avatar */}
      {!isUser && (
        <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 mt-0.5">
          <Bot className="h-4 w-4 text-primary" />
        </div>
      )}

      <div className={cn("flex flex-col gap-2 min-w-0 max-w-[90%]", isUser && "items-end")}>
        {/* Bubble */}
        <div
          className={cn(
            "rounded-xl px-3 py-2 text-sm leading-relaxed",
            isUser
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted/60 text-foreground rounded-tl-sm"
          )}
        >
          {renderMarkdown(message.text)}
        </div>

        {/* Analysis results */}
        {message.analysis && message.analysis.suggestions.length > 0 && (
          <div className="w-full space-y-2">
            {/* Metrics row */}
            <div className="flex items-center gap-3 px-1">
              <ScoreRing score={message.analysis.performance_score} />
              <div>
                <p className="text-xs font-medium">Health Score</p>
                <p className="text-[10px] text-muted-foreground">
                  {message.analysis.cost_estimate}
                </p>
              </div>
              <Separator orientation="vertical" className="h-8 ml-1" />
              <div className="flex flex-wrap gap-1">
                {message.analysis.intents.map((intent) => {
                  const m = CATEGORY_META[intent];
                  return (
                    <Badge key={intent} variant="secondary" className="text-[10px] gap-1">
                      <m.icon className={cn("h-2.5 w-2.5", m.color)} />
                      {m.label}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Suggestion cards */}
            <div className="space-y-2">
              {message.analysis.suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  applied={appliedIds.has(s.id)}
                  dismissed={dismissedIds.has(s.id)}
                  onApply={() => onApply(s)}
                  onDismiss={() => onDismiss(s.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground px-1">
          {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div className="flex gap-2.5">
      <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 mt-0.5">
        <Bot className="h-4 w-4 text-primary" />
      </div>
      <div className="flex items-center gap-1 rounded-xl rounded-tl-sm bg-muted/60 px-3 py-2.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main panel ──────────────────────────────────────────────────────────────

export function CopilotPanel({ draft, onApplyChanges }: CopilotPanelProps) {
  const [input, setInput] = useState("");
  const [logsOpen, setLogsOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages, isAnalyzing, autoFix, appliedIds, dismissedIds,
    setAutoFix, send, apply, dismiss, clear,
  } = useCopilot({ draft, onApply: onApplyChanges });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isAnalyzing]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isAnalyzing) return;
    setInput("");
    await send(text);
  }, [input, isAnalyzing, send]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Mock execution logs (in a real system, these come from the run session)
  const MOCK_LOGS = [
    { level: "INFO",  text: "Agent initialized successfully",       time: "00:00.000" },
    { level: "INFO",  text: "Loading model configuration",          time: "00:00.142" },
    { level: "WARN",  text: "Retry attempt 1/3 for tool call",      time: "00:01.883" },
    { level: "ERROR", text: "Tool 'web_search' returned 429",       time: "00:02.104" },
    { level: "INFO",  text: "Backoff: retrying in 1000ms",          time: "00:03.110" },
    { level: "INFO",  text: "Tool call succeeded on retry 2",       time: "00:04.220" },
    { level: "INFO",  text: "Generating final response",            time: "00:04.780" },
    { level: "INFO",  text: "Run completed — 4.9s, 1847 tokens",    time: "00:04.930" },
  ];

  const LOG_LEVEL_STYLE: Record<string, string> = {
    INFO:  "text-muted-foreground",
    WARN:  "text-amber-500",
    ERROR: "text-destructive",
  };

  return (
    <div className="flex h-full flex-col bg-background">
      {/* ── Header ── */}
      <div className="flex shrink-0 items-center justify-between border-b px-4 py-2.5 bg-card/60">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">AI Copilot</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Analyzing: <span className="font-medium text-foreground">{draft.name}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Auto-fix toggle */}
          <div className="flex items-center gap-1.5">
            <Switch
              id="autofix"
              checked={autoFix}
              onCheckedChange={setAutoFix}
              className="h-4 w-7"
            />
            <label htmlFor="autofix" className="text-xs text-muted-foreground cursor-pointer select-none">
              Auto-fix
            </label>
          </div>

          {/* Clear */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clear}
            title="Clear conversation"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Chat area ── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.map((msg) => (
          <ChatMessage
            key={msg.id}
            message={msg}
            appliedIds={appliedIds}
            dismissedIds={dismissedIds}
            onApply={apply}
            onDismiss={dismiss}
          />
        ))}

        {isAnalyzing && <TypingIndicator />}
      </div>

      {/* ── Logs viewer (collapsible) ── */}
      <div className="shrink-0 border-t">
        <button
          className="flex w-full items-center justify-between px-4 py-2 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
          onClick={() => setLogsOpen(!logsOpen)}
        >
          <span className="font-medium">Execution Logs</span>
          {logsOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        </button>

        {logsOpen && (
          <div className="max-h-36 overflow-y-auto bg-muted/20 border-t">
            <div className="px-4 py-2 space-y-0.5 font-mono">
              {MOCK_LOGS.map((log, i) => (
                <div key={i} className="flex gap-2 text-[10px] leading-relaxed">
                  <span className="shrink-0 text-muted-foreground/60">{log.time}</span>
                  <span className={cn("shrink-0 font-medium w-10", LOG_LEVEL_STYLE[log.level])}>
                    {log.level}
                  </span>
                  <span className="text-muted-foreground">{log.text}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Quick prompts ── */}
      <div className="shrink-0 border-t bg-card/40 px-3 py-2">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {QUICK_PROMPTS.map(({ label, icon: Icon }) => (
            <button
              key={label}
              onClick={() => { setInput(label); textareaRef.current?.focus(); }}
              className="shrink-0 flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <Icon className="h-3 w-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input box ── */}
      <div className="shrink-0 border-t bg-card/60 px-3 py-3">
        <div className="flex gap-2 items-end">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type an instruction… (Enter to send)"
            rows={1}
            className="min-h-[36px] max-h-[120px] resize-none text-sm py-2 bg-background border-muted focus-visible:ring-1 overflow-y-auto"
            disabled={isAnalyzing}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={!input.trim() || isAnalyzing}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[10px] text-muted-foreground">
          Shift+Enter for new line · All changes require your approval
        </p>
      </div>
    </div>
  );
}
