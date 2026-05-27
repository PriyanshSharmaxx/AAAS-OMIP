"use client";

import {
  CheckCircle2, XCircle, AlertTriangle, Shield,
  Clock, FileText, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner-1";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/types";
import type { GrantEntry, AuditLogEntry, PermissionValidation } from "@/hooks/useAgentRunner";

interface PermissionReviewStepProps {
  integrations: Integration[];
  grants: Record<string, GrantEntry>;
  auditLog: AuditLogEntry[];
  validating: boolean;
  validation: PermissionValidation | null;
  onConfirm: () => void;
  onBack: () => void;
}

const SENSITIVE_LABEL: Record<string, string> = {
  none: "Safe", low: "Low Risk", medium: "Moderate", high: "Sensitive",
};

export function PermissionReviewStep({
  integrations,
  grants,
  auditLog,
  validating,
  validation,
  onConfirm,
  onBack,
}: PermissionReviewStepProps) {
  const [auditOpen, setAuditOpen] = useState(false);

  const granted  = integrations.filter((i) => grants[i.name]?.granted === true);
  const denied   = integrations.filter((i) => grants[i.name]?.granted === false);
  const sensitive = granted.filter((i) => i.sensitiveLevel === "high" || i.sensitiveLevel === "medium");

  const canProceed = !validating && (validation === null || validation.valid);

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Review your permission choices below. Once confirmed, the agent will request
          OAuth tokens for any integrations that require them.
        </span>
      </div>

      {/* Granted permissions */}
      {granted.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            Granted ({granted.length})
          </h3>
          <div className="rounded-xl border divide-y overflow-hidden">
            {granted.map((integ) => {
              const scope = grants[integ.name]?.scope ?? "read";
              return (
                <div key={integ.name} className="flex items-center justify-between px-4 py-3 bg-green-500/3 hover:bg-green-500/5 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{integ.label}</span>
                        {integ.sensitiveLevel !== "none" && integ.sensitiveLevel !== "low" && (
                          <span className={cn(
                            "rounded-full px-2 py-0 text-[10px] font-medium border",
                            integ.sensitiveLevel === "high"
                              ? "bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/20"
                              : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/20"
                          )}>
                            {SENSITIVE_LABEL[integ.sensitiveLevel]}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground capitalize">{scope} access</p>
                    </div>
                  </div>
                  {integ.oauthRequired && (
                    <Badge variant="secondary" className="text-[10px]">OAuth pending</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Denied permissions */}
      {denied.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
            <XCircle className="h-3.5 w-3.5 text-red-400" />
            Denied ({denied.length})
          </h3>
          <div className="rounded-xl border divide-y overflow-hidden">
            {denied.map((integ) => (
              <div key={integ.name} className="flex items-center gap-3 px-4 py-3 bg-red-500/3">
                <XCircle className="h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{integ.label}</span>
                    {integ.required && (
                      <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">Required</Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">Access denied</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sensitive access warnings */}
      {sensitive.length > 0 && (
        <div className="rounded-xl border border-amber-400/30 bg-amber-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">Elevated Access Warning</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc">
            {sensitive.map((i) => (
              <li key={i.name} className="text-xs text-amber-700 dark:text-amber-300">
                <span className="font-medium">{i.label}</span> — {i.purpose}
              </li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-600/80 dark:text-amber-400/80 pt-1">
            By confirming, you acknowledge that this agent will have the above elevated access during execution.
          </p>
        </div>
      )}

      {/* Validation result */}
      {validation && !validation.valid && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/5 p-4 space-y-2">
          <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
            <XCircle className="h-4 w-4 shrink-0" />
            <span className="text-sm font-semibold">Validation Failed</span>
          </div>
          <ul className="space-y-1 pl-6 list-disc">
            {validation.blockers.map((b, i) => (
              <li key={i} className="text-xs text-red-600 dark:text-red-400">{b}</li>
            ))}
          </ul>
          <Button variant="outline" size="sm" className="mt-2 w-full text-xs" onClick={onBack}>
            Go Back & Fix
          </Button>
        </div>
      )}

      {/* Audit log (collapsible) */}
      {auditLog.length > 0 && (
        <div className="rounded-xl border overflow-hidden">
          <button
            onClick={() => setAuditOpen(!auditOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs text-muted-foreground hover:bg-muted/40 transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              Consent Audit Log
            </span>
            {auditOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {auditOpen && (
            <div className="border-t divide-y bg-muted/20">
              {auditLog.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2 text-[11px]">
                  <div className="flex items-center gap-2">
                    {entry.granted
                      ? <CheckCircle2 className="h-3 w-3 text-green-500" />
                      : <XCircle className="h-3 w-3 text-red-400" />
                    }
                    <span className="font-medium">{entry.integration}</span>
                    <span className="text-muted-foreground capitalize">({entry.scope})</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(entry.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-1">
        <Button variant="outline" size="sm" onClick={onBack} disabled={validating} className="flex-1">
          ← Edit
        </Button>
        <Button
          className="flex-2 flex-grow gap-2"
          onClick={onConfirm}
          disabled={validating || (validation !== null && !validation.valid)}
        >
          {validating ? (
            <>
              <Spinner size={14} color="currentColor" /> Validating…
            </>
          ) : (
            "Confirm & Continue"
          )}
        </Button>
      </div>
    </div>
  );
}
