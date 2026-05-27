"use client";

import {
  Shield, AlertTriangle, CheckCircle2, Database, Mail,
  FileText, Code2, MessageSquare, Calendar, HardDrive,
  Cpu, Key, Wifi,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Integration } from "@/lib/types";
import type { GrantEntry } from "@/hooks/useAgentRunner";

// ── Tool icon map ─────────────────────────────────────────────────────────────

const TOOL_ICONS: Record<string, React.ElementType> = {
  code:      Code2,
  database:  Database,
  email:     Mail,
  file:      FileText,
  messaging: MessageSquare,
  calendar:  Calendar,
  crm:       HardDrive,
  api:       Cpu,
};

// ── Sensitive level config ────────────────────────────────────────────────────

const SENSITIVE_CONFIG = {
  none:   { label: "Safe",      class: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-400/20" },
  low:    { label: "Low Risk",  class: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-400/20" },
  medium: { label: "Moderate",  class: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-400/20" },
  high:   { label: "Sensitive", class: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-400/20" },
};

const CARD_BORDER = {
  none:   "",
  low:    "",
  medium: "border-amber-400/30",
  high:   "border-red-400/40",
};

const ACCESS_TYPE_COLORS: Record<string, string> = {
  read:    "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  write:   "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  execute: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface PermissionStepProps {
  integrations: Integration[];
  grants: Record<string, GrantEntry>;
  error: string;
  saving: boolean;
  onGrant: (name: string, granted: boolean) => void;
  onScope: (name: string, scope: string) => void;
  onConnect: (slug: string) => void;
  onSubmit: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function PermissionStep({
  integrations,
  grants,
  error,
  saving,
  onGrant,
  onScope,
  onConnect,
  onSubmit,
}: PermissionStepProps) {
  if (integrations.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-10 text-center">
          <CheckCircle2 className="mb-3 h-10 w-10 text-green-500" />
          <p className="font-medium">No permissions required</p>
          <p className="mt-1 text-sm text-muted-foreground">
            This agent doesn&apos;t need any external integrations.
          </p>
        </div>
        <Button className="w-full" onClick={onSubmit} disabled={saving}>
          Continue
        </Button>
      </div>
    );
  }

  const allDecided = integrations.every((i) => grants[i.name]?.granted !== null && grants[i.name]?.granted !== undefined);
  const sensitiveCount = integrations.filter((i) => i.sensitiveLevel === "high" || i.sensitiveLevel === "medium").length;

  return (
    <div className="space-y-4">
      {/* Banner */}
      <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground flex items-start gap-2">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          Review each permission carefully. Required integrations must be granted to run this agent.
          {sensitiveCount > 0 && (
            <span className="ml-1 text-amber-600 dark:text-amber-400 font-medium">
              {sensitiveCount} permission{sensitiveCount > 1 ? "s" : ""} require elevated access.
            </span>
          )}
        </span>
      </div>

      {/* Permission cards */}
      <div className="space-y-3">
        {integrations.map((integ) => {
          const grant = grants[integ.name];
          const granted = grant?.granted;
          const scope = grant?.scope ?? integ.scopes[0] ?? "read";
          const Icon = TOOL_ICONS[integ.toolType] ?? Wifi;
          const sensConfig = SENSITIVE_CONFIG[integ.sensitiveLevel];
          const cardBorder = CARD_BORDER[integ.sensitiveLevel];

          return (
            <div
              key={integ.name}
              className={cn(
                "rounded-xl border p-4 transition-all duration-200",
                granted === true
                  ? "border-green-500/40 bg-green-500/5"
                  : granted === false
                  ? "border-red-500/30 bg-red-500/5"
                  : cardBorder || "border-border",
                "hover:shadow-sm"
              )}
            >
              {/* Header row */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {/* Tool icon */}
                  <div className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    granted === true ? "bg-green-500/10" :
                    granted === false ? "bg-red-500/10" :
                    "bg-muted"
                  )}>
                    {granted === true ? (
                      <CheckCircle2 className="h-4.5 w-4.5 text-green-500" />
                    ) : granted === false ? (
                      <AlertTriangle className="h-4.5 w-4.5 text-red-400" />
                    ) : (
                      <Icon className="h-4.5 w-4.5 text-muted-foreground" />
                    )}
                  </div>

                  {/* Name + badges */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-semibold text-sm">{integ.label}</span>
                      {integ.required && (
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                          Required
                        </Badge>
                      )}
                      <span className={cn(
                        "rounded-full border px-2 py-0 text-[10px] font-medium",
                        sensConfig.class
                      )}>
                        {sensConfig.label}
                      </span>
                      {integ.oauthRequired && (
                        <span className="flex items-center gap-0.5 rounded-full bg-muted px-2 py-0 text-[10px] text-muted-foreground border">
                          <Key className="h-2.5 w-2.5" /> OAuth
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">{integ.description}</p>
                  </div>
                </div>

                {/* Grant toggle */}
                <Switch
                  checked={granted === true}
                  onCheckedChange={(v) => onGrant(integ.name, v)}
                  disabled={saving}
                />
              </div>

              {/* Purpose + access types */}
              <div className="mt-3 pl-12 space-y-2">
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground border border-border/50">
                  <span className="font-medium text-foreground">Purpose: </span>
                  {integ.purpose}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-muted-foreground">Access:</span>
                  {integ.accessTypes.map((at) => (
                    <span
                      key={at}
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
                        ACCESS_TYPE_COLORS[at]
                      )}
                    >
                      {at}
                    </span>
                  ))}
                </div>
              </div>

              {/* Scope selector when granted */}
              {granted === true && integ.scopes.length > 1 && (
                <div className="mt-3 pl-12 flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">Access level:</span>
                  <Select
                    value={scope}
                    onValueChange={(v) => onScope(integ.name, v)}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-7 w-36 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {integ.scopes.map((s) => (
                        <SelectItem key={s} value={s} className="text-xs capitalize">
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* OAuth notice when granted */}
              {granted === true && integ.oauthRequired && (
                <div className="mt-3 pl-12 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary flex-1">
                    <Key className="h-3 w-3 shrink-0" />
                    Account connection required.
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] gap-1.5"
                    onClick={() => onConnect(integ.name)}
                  >
                    <Key className="h-3 w-3" />
                    Connect Account
                  </Button>
                </div>
              )}

              {/* Sensitive warning when granted */}
              {granted === true && integ.sensitiveLevel === "high" && (
                <div className="mt-3 pl-12">
                  <div className="flex items-center gap-2 rounded-md border border-red-400/30 bg-red-500/5 px-3 py-2 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    This integration has elevated access to critical systems. Proceed carefully.
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-sm text-destructive flex items-center gap-1.5">
          <AlertTriangle className="h-3.5 w-3.5" /> {error}
        </p>
      )}

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={saving || !allDecided}
      >
        {saving ? "Processing…" : "Review Permissions →"}
      </Button>
    </div>
  );
}
