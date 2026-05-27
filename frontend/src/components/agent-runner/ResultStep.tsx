"use client";

import { CheckCircle2, XCircle, RefreshCw, ExternalLink, Copy, Check } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ExecutionResult } from "@/lib/types";

interface ResultStepProps {
  result: ExecutionResult | null;
  agentName: string;
  onRetry: () => void;
  onClose: () => void;
}

export function ResultStep({ result, agentName, onRetry, onClose }: ResultStepProps) {
  const [copied, setCopied] = useState(false);

  if (!result) {
    return (
      <div className="py-10 text-center text-sm text-muted-foreground">
        No result available.
      </div>
    );
  }

  const success = result.status === "COMPLETED";

  const outputJson = result.output_data
    ? JSON.stringify(result.output_data, null, 2)
    : null;

  const handleCopy = () => {
    if (!outputJson) return;
    navigator.clipboard.writeText(outputJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5">
      {/* Status card */}
      <div
        className={`flex items-start gap-4 rounded-xl border p-5 ${
          success
            ? "border-green-500/40 bg-green-500/5"
            : "border-destructive/40 bg-destructive/5"
        }`}
      >
        {success ? (
          <CheckCircle2 className="mt-0.5 h-8 w-8 shrink-0 text-green-500" />
        ) : (
          <XCircle className="mt-0.5 h-8 w-8 shrink-0 text-destructive" />
        )}
        <div>
          <p className="font-bold text-lg">
            {success ? "Run Completed!" : "Run Failed"}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {success
              ? `${agentName} finished successfully.`
              : result.error ?? "An error occurred during execution."}
          </p>
          {result.run_id && (
            <p className="mt-2 text-xs text-muted-foreground font-mono">
              Run ID: {result.run_id}
            </p>
          )}
        </div>
      </div>

      {/* API endpoint used */}
      {result.api_endpoint && (
        <div className="rounded-xl border bg-muted/30 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">API endpoint used</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs font-mono break-all">{result.api_endpoint}</code>
            <a
              href={result.api_endpoint}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0"
            >
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        </div>
      )}

      {/* Output data */}
      {outputJson && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Output</p>
            <Button variant="ghost" size="sm" className="gap-1.5 h-7 text-xs" onClick={handleCopy}>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <pre className="max-h-52 overflow-auto rounded-xl border bg-black/80 p-3 text-xs font-mono text-green-300 leading-relaxed">
            {outputJson}
          </pre>
        </div>
      )}

      {/* Log count badge */}
      {result.logs && result.logs.length > 0 && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {result.logs.length} log{result.logs.length !== 1 ? "s" : ""}
          </Badge>
          <span className="text-xs text-muted-foreground">captured during execution</span>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!success && (
          <Button variant="outline" className="flex-1 gap-1.5" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        )}
        <Button className="flex-1" onClick={onClose}>
          {success ? "Done" : "Close"}
        </Button>
      </div>
    </div>
  );
}
