"use client";

import { useState } from "react";
import {
  Wand2,
  Globe,
  SkipForward,
  Plus,
  X,
  Zap,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  ApiConfigMode,
  AutoApiConfig,
  ManualApiConfig,
} from "@/hooks/useAgentRunner";
import type { AgentCostBreakdown } from "@/lib/types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ApiConfigStepProps {
  userType: "technical" | "non_technical" | null;
  saving: boolean;
  error: string;
  onSubmit: (config: ApiConfigMode) => void;
  /** Tools from the agent (string names or objects with a name field). */
  agentTools?: unknown[];
  /** Pre-fetched cost estimate from GET /api/agents/:id/cost */
  estimatedCost?: AgentCostBreakdown | null;
  /** User's current credit balance */
  userCredits?: number;
}

// ---------------------------------------------------------------------------
// Mode toggle
// ---------------------------------------------------------------------------

type SetupMode = "quick" | "advanced";
type ApiMode = "auto" | "manual" | "skip";

// ---------------------------------------------------------------------------
// Quick Run panel
// ---------------------------------------------------------------------------

function QuickRunPanel({
  agentTools,
  estimatedCost,
  userCredits,
  saving,
  onRun,
}: {
  agentTools: unknown[];
  estimatedCost: AgentCostBreakdown | null | undefined;
  userCredits: number | undefined;
  saving: boolean;
  onRun: () => void;
}) {
  const toolNames: string[] = agentTools
    .map((t) =>
      typeof t === "string"
        ? t
        : ((t as Record<string, unknown>)?.name as string | undefined) ?? "",
    )
    .filter(Boolean);

  const hasEnoughCredits =
    userCredits === undefined ||
    estimatedCost === undefined ||
    estimatedCost === null ||
    userCredits >= estimatedCost.credits;

  const creditCost = estimatedCost?.credits ?? null;

  return (
    <div className="space-y-4">
      {/* What this agent uses */}
      <div className="rounded-xl border bg-muted/20 p-4 space-y-3">
        <p className="text-sm font-medium">This agent uses:</p>
        <ul className="space-y-1.5">
          <li className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
            AI Model
          </li>
          {toolNames.length > 0 ? (
            toolNames.map((name) => (
              <li
                key={name}
                className="flex items-center gap-2 text-sm text-muted-foreground capitalize"
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
                {name}
              </li>
            ))
          ) : (
            <li className="flex items-center gap-2 text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500" />
              Built-in tools only
            </li>
          )}
        </ul>
      </div>

      {/* Cost estimate */}
      <div
        className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
          !hasEnoughCredits
            ? "border-destructive/40 bg-destructive/5"
            : "border-primary/20 bg-primary/5"
        }`}
      >
        <div className="flex items-center gap-2">
          <Zap
            className={`h-4 w-4 ${
              !hasEnoughCredits ? "text-destructive" : "text-primary"
            }`}
          />
          <span className="text-sm font-medium">Estimated Cost</span>
        </div>
        <div className="flex items-center gap-2">
          {creditCost === null ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          ) : (
            <Badge
              variant={!hasEnoughCredits ? "destructive" : "default"}
              className="font-mono"
            >
              {creditCost === 0 ? "Free" : `${creditCost} credits`}
            </Badge>
          )}
          {userCredits !== undefined && (
            <span className="text-xs text-muted-foreground">
              ({userCredits} available)
            </span>
          )}
        </div>
      </div>

      {/* Insufficient credits warning */}
      {!hasEnoughCredits && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Insufficient credits. You need{" "}
            <strong>{estimatedCost!.credits}</strong> but only have{" "}
            <strong>{userCredits}</strong>. Top up your credits to continue.
          </span>
        </div>
      )}

      <Button
        className="w-full gap-2"
        disabled={saving || !hasEnoughCredits}
        onClick={onRun}
      >
        {saving ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Preparing…
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" /> Run Agent
            {creditCost !== null && creditCost > 0 && ` (${creditCost} credits)`}
          </>
        )}
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ApiConfigStep({
  userType,
  saving,
  error,
  onSubmit,
  agentTools = [],
  estimatedCost,
  userCredits,
}: ApiConfigStepProps) {
  const [setupMode, setSetupMode] = useState<SetupMode>("quick");

  // Advanced — API sub-mode
  const [mode, setMode] = useState<ApiMode>("auto");

  // Auto config state
  const [apiType, setApiType] = useState<"public" | "paid">("public");
  const [functionality, setFunctionality] = useState("");
  const [auth, setAuth] = useState<"none" | "api_key" | "oauth">("none");
  const [dataFields, setDataFields] = useState<string[]>([""]);

  // Manual config state
  const [baseUrl, setBaseUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [endpointStructure, setEndpointStructure] = useState("");

  // ── Quick Run ──
  const handleQuickRun = () => {
    onSubmit({ mode: "skip" }); // skips external API — uses built-in tools only
  };

  // ── Advanced submit ──
  const handleAdvancedSubmit = () => {
    if (mode === "skip") {
      onSubmit({ mode: "skip" });
      return;
    }
    if (mode === "auto") {
      const config: AutoApiConfig = {
        api_type:   apiType,
        data_fields: dataFields.filter((f) => f.trim()),
        functionality,
        auth,
      };
      onSubmit({ mode: "auto", config });
      return;
    }
    const config: ManualApiConfig = {
      base_url:           baseUrl,
      api_key:            apiKey,
      endpoint_structure: endpointStructure,
    };
    onSubmit({ mode: "manual", config });
  };

  const canAdvancedSubmit = () => {
    if (mode === "skip")   return true;
    if (mode === "auto")   return functionality.trim().length > 0;
    if (mode === "manual") return baseUrl.trim().length > 0;
    return false;
  };

  const ADVANCED_MODES = [
    { id: "auto" as ApiMode,   icon: Wand2,      label: "Auto Generate", desc: "Describe what you need and we'll build the API config" },
    ...(userType === "technical"
      ? [{ id: "manual" as ApiMode, icon: Globe, label: "Manual", desc: "Provide a base URL, API key, and endpoint structure" }]
      : []),
    { id: "skip" as ApiMode,   icon: SkipForward, label: "Skip", desc: "This agent doesn't need an external API" },
  ];

  return (
    <div className="space-y-4">
      {/* ── Mode toggle ── */}
      <div className="flex gap-1 rounded-xl border bg-muted/30 p-1">
        <button
          type="button"
          onClick={() => setSetupMode("quick")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            setupMode === "quick"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Zap className="h-3.5 w-3.5" />
          Quick Run
          {setupMode === "quick" && (
            <Badge className="ml-1 px-1.5 py-0 text-[10px] bg-primary/15 text-primary">
              Default
            </Badge>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSetupMode("advanced")}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            setupMode === "advanced"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Settings2 className="h-3.5 w-3.5" />
          Advanced Setup
        </button>
      </div>

      {/* ── Quick Run panel ── */}
      {setupMode === "quick" && (
        <QuickRunPanel
          agentTools={agentTools}
          estimatedCost={estimatedCost}
          userCredits={userCredits}
          saving={saving}
          onRun={handleQuickRun}
        />
      )}

      {/* ── Advanced Setup panel (full existing API config UI) ── */}
      {setupMode === "advanced" && (
        <div className="space-y-5">
          {/* API sub-mode selector */}
          <div className="grid gap-2 sm:grid-cols-3">
            {ADVANCED_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMode(m.id)}
                className={`flex flex-col items-start rounded-xl border p-4 text-left transition-all ${
                  mode === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40"
                }`}
              >
                <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                  <m.icon className="h-4 w-4 text-primary" />
                </div>
                <span className="text-sm font-semibold">{m.label}</span>
                <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                  {m.desc}
                </p>
              </button>
            ))}
          </div>

          {/* Auto config form */}
          {mode === "auto" && (
            <div className="space-y-4 rounded-xl border p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Type</Label>
                  <Select
                    value={apiType}
                    onValueChange={(v) => setApiType(v as "public" | "paid")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Public (free)</SelectItem>
                      <SelectItem value="paid">Paid / Auth required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Auth Method</Label>
                  <Select
                    value={auth}
                    onValueChange={(v) =>
                      setAuth(v as "none" | "api_key" | "oauth")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No auth</SelectItem>
                      <SelectItem value="api_key">API Key</SelectItem>
                      <SelectItem value="oauth">OAuth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>What should this API do?</Label>
                <Textarea
                  placeholder="e.g. Fetch real-time stock prices and company financials"
                  rows={2}
                  value={functionality}
                  onChange={(e) => setFunctionality(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Data fields needed</Label>
                <div className="space-y-2">
                  {dataFields.map((field, i) => (
                    <div key={i} className="flex gap-2">
                      <Input
                        placeholder="e.g. price, volume, date"
                        value={field}
                        onChange={(e) => {
                          const next = [...dataFields];
                          next[i] = e.target.value;
                          setDataFields(next);
                        }}
                      />
                      {dataFields.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 shrink-0"
                          onClick={() =>
                            setDataFields(dataFields.filter((_, idx) => idx !== i))
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setDataFields([...dataFields, ""])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add field
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Manual config form */}
          {mode === "manual" && (
            <div className="space-y-4 rounded-xl border p-4">
              <div className="space-y-2">
                <Label>
                  Base URL <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="https://api.example.com/v1"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>API Key (optional)</Label>
                <Input
                  type="password"
                  placeholder="sk-…"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Endpoint structure (JSON, optional)</Label>
                <Textarea
                  placeholder={`{\n  "/users": "GET",\n  "/users/{id}": "GET"\n}`}
                  rows={4}
                  value={endpointStructure}
                  onChange={(e) => setEndpointStructure(e.target.value)}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          )}

          {/* Skip message */}
          {mode === "skip" && (
            <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No API configuration will be set. The agent will run using its
              built-in tools only.
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            className="w-full"
            disabled={saving || !canAdvancedSubmit()}
            onClick={handleAdvancedSubmit}
          >
            {saving
              ? "Configuring…"
              : mode === "skip"
              ? "Skip & Validate"
              : "Submit & Validate"}
          </Button>
        </div>
      )}

      {/* Error shown outside both panels */}
      {error && setupMode === "quick" && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
