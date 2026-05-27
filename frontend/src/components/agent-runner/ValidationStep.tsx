"use client";

import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ValidationResult } from "@/lib/types";

interface ValidationStepProps {
  validation: ValidationResult | null;
  validating: boolean;
  generatedApiEndpoint: string | null;
  onProceed: () => void;
  onBack: () => void;
}

export function ValidationStep({
  validation,
  validating,
  generatedApiEndpoint,
  onProceed,
  onBack,
}: ValidationStepProps) {
  if (validating) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div>
          <p className="font-semibold">Validating configuration…</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Checking permissions, API connectivity, and agent readiness.
          </p>
        </div>
      </div>
    );
  }

  if (!validation) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <AlertTriangle className="h-10 w-10 text-yellow-500" />
        <p className="text-sm text-muted-foreground">No validation data available.</p>
        <Button variant="outline" onClick={onBack}>Go Back</Button>
      </div>
    );
  }

  const { valid, errors, missing_permissions, api_status } = validation;

  // Build a flat list of issues to display
  const issues: string[] = [
    ...(missing_permissions ?? []).map((p) => `Missing permission: ${p}`),
    ...(errors ?? []),
  ];

  return (
    <div className="space-y-5">
      {/* Overall status */}
      <div
        className={`flex items-center gap-3 rounded-xl border p-4 ${
          valid
            ? "border-green-500/40 bg-green-500/5"
            : "border-destructive/40 bg-destructive/5"
        }`}
      >
        {valid ? (
          <CheckCircle2 className="h-6 w-6 shrink-0 text-green-500" />
        ) : (
          <XCircle className="h-6 w-6 shrink-0 text-destructive" />
        )}
        <div>
          <p className="font-semibold">
            {valid ? "All checks passed" : "Validation failed"}
          </p>
          <p className="text-sm text-muted-foreground">
            {valid
              ? "The agent is configured and ready to run."
              : "Please fix the issues below before executing."}
          </p>
        </div>
      </div>

      {/* Generated endpoint info */}
      {generatedApiEndpoint && (
        <div className="rounded-xl border bg-muted/40 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-1">Generated API endpoint</p>
          <code className="text-xs font-mono break-all">{generatedApiEndpoint}</code>
        </div>
      )}

      {/* API status */}
      {api_status && api_status !== "not_required" && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2.5">
          {api_status === "valid" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0 text-destructive" />
          )}
          <span className="text-sm">
            API status:{" "}
            <span className="font-medium capitalize">{api_status.replace(/_/g, " ")}</span>
          </span>
        </div>
      )}

      {/* Issues */}
      {issues.length > 0 && (
        <div className="space-y-2">
          {issues.map((issue, i) => (
            <div
              key={i}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
            >
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <p className="text-sm text-destructive">{issue}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onBack}>
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={!valid}
          onClick={onProceed}
        >
          Run Agent
        </Button>
      </div>
    </div>
  );
}
