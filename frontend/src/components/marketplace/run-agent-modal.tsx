"use client";

import { useState } from "react";
import { Loader2, Play, Copy, Check, RotateCcw, X, Bot, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import type { MarketplaceAgent } from "@/lib/marketplace-data";
import { cn } from "@/lib/utils";

// ── API response shape ────────────────────────────────────────────────────────

interface ExecuteResult {
  success: boolean;
  result: {
    run_id:      string;
    status:      string;
    output:      string;
    tokens_used: number;
    duration_ms: number;
    model:       string;
  };
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface RunAgentModalProps {
  agent:   MarketplaceAgent;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function RunAgentModal({ agent, onClose }: RunAgentModalProps) {
  const { isAuthenticated } = useAuthStore();

  const [input,    setInput]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState<ExecuteResult["result"] | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [copied,   setCopied]   = useState(false);

  // ── Execute ──
  const handleRun = async () => {
    if (!isAuthenticated) {
      setError("Please sign in to run agents.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await api.post<ExecuteResult>(`/agents/${agent.id}/execute`, {
        input: input.trim() || "Execute the agent task.",
      });
      setResult(res.result);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Please sign in to run agents.");
        } else if (err.status === 403) {
          setError("You don't have permission to run this agent.");
        } else if (err.status === 404) {
          setError("Agent not found. It may have been removed from the marketplace.");
        } else if (err.status === 503) {
          setError("LLM service unavailable. Please check your API key configuration.");
        } else {
          setError(err.message || "Execution failed. Please try again.");
        }
      } else {
        setError("Could not reach the server. Check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Copy output ──
  const handleCopy = async () => {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Reset ──
  const handleRetry = () => {
    setResult(null);
    setError(null);
    setInput("");
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border bg-card shadow-2xl overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 border-b px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <Bot className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-semibold text-sm">{agent.name}</p>
            <p className="text-[11px] text-muted-foreground">by {agent.creator_name}</p>
          </div>
          <Badge variant="secondary" className="text-[10px] capitalize shrink-0">
            {agent.category}
          </Badge>
          <button
            onClick={onClose}
            className="ml-1 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 space-y-4">

          {/* Input section (shown when no result yet) */}
          {!result && (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                  Task / Input
                </label>
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Describe what you want ${agent.name} to do…`}
                  rows={4}
                  className="resize-none text-sm"
                  disabled={loading}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-xs text-destructive">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              {/* Run button */}
              <Button
                className="w-full gap-2"
                onClick={handleRun}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Running agent…
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Agent
                  </>
                )}
              </Button>
            </>
          )}

          {/* Result section */}
          {result && (
            <>
              {/* Status bar */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className={cn(
                  "flex items-center gap-1 font-medium",
                  result.status === "COMPLETED" ? "text-green-600 dark:text-green-400" : "text-destructive",
                )}>
                  <span className={cn(
                    "inline-block h-1.5 w-1.5 rounded-full",
                    result.status === "COMPLETED" ? "bg-green-500" : "bg-destructive",
                  )} />
                  {result.status === "COMPLETED" ? "Completed" : result.status}
                </span>
                <span className="flex gap-3">
                  <span>{result.tokens_used} tokens</span>
                  <span>{result.duration_ms}ms</span>
                  <span className="font-mono">{result.model}</span>
                </span>
              </div>

              {/* Output */}
              <div className="relative rounded-xl border bg-muted/30 p-4">
                <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed font-sans">
                  {result.output || "(no output)"}
                </pre>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleCopy}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy Output"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 gap-1.5 text-xs"
                  onClick={handleRetry}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Run Again
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
