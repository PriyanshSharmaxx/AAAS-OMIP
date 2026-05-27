/**
 * useAgentRunner
 * Centralized state machine for the Agent Runner Dialog.
 * All API calls are mocked for demo — swap mock* functions for real api.*
 * calls when the backend is ready.
 */

import { useState, useRef, useCallback } from "react";
import { api, ApiError } from "@/lib/api";
import type {
  Agent,
  AgentCostBreakdown,
  Integration,
  ValidationResult,
  ExecutionResult,
  ExecutionLog,
} from "@/lib/types";

// ── Step type ──────────────────────────────────────────────────────────────

export type RunnerStep =
  | "init"
  | "permissions"
  | "permission_review"
  | "user_type"
  | "api_config"
  | "validation"
  | "execution"
  | "result";

// ── Permission grant map ───────────────────────────────────────────────────

export interface GrantEntry {
  granted: boolean | null;
  scope: string;
}

// ── API config ─────────────────────────────────────────────────────────────

export interface AutoApiConfig {
  api_type: "public" | "paid";
  data_fields: string[];
  functionality: string;
  auth: "none" | "api_key" | "oauth";
}

export interface ManualApiConfig {
  base_url: string;
  api_key: string;
  endpoint_structure: string;
}

export type ApiConfigMode =
  | { mode: "auto"; config: AutoApiConfig }
  | { mode: "manual"; config: ManualApiConfig }
  | { mode: "skip" };

// ── Hook return type ───────────────────────────────────────────────────────

export interface AuditLogEntry {
  timestamp: string;
  integration: string;
  granted: boolean;
  scope: string;
}

export interface PermissionValidation {
  valid: boolean;
  warnings: string[];
  blockers: string[];
}

export interface AgentRunnerState {
  step: RunnerStep;
  integrations: Integration[];
  grants: Record<string, GrantEntry>;
  permissionsError: string;
  permissionsSaving: boolean;
  permissionValidating: boolean;
  permissionValidation: PermissionValidation | null;
  auditLog: AuditLogEntry[];
  userType: "technical" | "non_technical" | null;
  userTypeSaving: boolean;
  apiConfigMode: ApiConfigMode | null;
  apiConfigSaving: boolean;
  apiConfigError: string;
  generatedApiEndpoint: string | null;
  validation: ValidationResult | null;
  validating: boolean;
  executing: boolean;
  executionLogs: ExecutionLog[];
  result: ExecutionResult | null;
  initError: string;
  sessionId: string | null;
  /** Credit cost fetched from GET /api/agents/:id/cost */
  estimatedCost: AgentCostBreakdown | null;
  /** User's current credit balance fetched from GET /api/user/credits */
  userCredits: number | undefined;
}

export interface AgentRunnerActions {
  initialise: (agent: Agent) => Promise<void>;
  setGrant: (name: string, granted: boolean) => void;
  setScope: (name: string, scope: string) => void;
  savePermissions: () => Promise<void>;
  connectIntegration: (slug: string) => Promise<void>;
  confirmPermissions: () => Promise<void>;
  selectUserType: (type: "technical" | "non_technical") => Promise<void>;
  submitApiConfig: (config: ApiConfigMode) => Promise<void>;
  proceedToExecution: () => Promise<void>;
  retry: () => void;
  reset: () => void;
}

// ── Initial state ──────────────────────────────────────────────────────────

const INITIAL: AgentRunnerState = {
  step: "init",
  integrations: [],
  grants: {},
  permissionsError: "",
  permissionsSaving: false,
  permissionValidating: false,
  permissionValidation: null,
  auditLog: [],
  userType: null,
  userTypeSaving: false,
  apiConfigMode: null,
  apiConfigSaving: false,
  apiConfigError: "",
  generatedApiEndpoint: null,
  validation: null,
  validating: false,
  executing: false,
  executionLogs: [],
  result: null,
  initError: "",
  sessionId: null,
  estimatedCost: null,
  userCredits: undefined,
};

// ── Mock helpers ──────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

const MOCK_INTEGRATIONS: Integration[] = [
  {
    name: "GitHub",
    label: "GitHub",
    description: "Read repositories and create pull requests on your behalf.",
    purpose: "Analyze your codebase and submit automated code improvements via pull requests.",
    scopes: ["read", "write"],
    icon: "github",
    required: true,
    sensitiveLevel: "medium",
    toolType: "code",
    accessTypes: ["read", "write"],
    oauthRequired: true,
  },
  {
    name: "OpenAI",
    label: "OpenAI API",
    description: "Use GPT models to generate code and explanations.",
    purpose: "Power the AI reasoning engine that analyses and transforms your code.",
    scopes: ["read"],
    icon: "openai",
    required: true,
    sensitiveLevel: "low",
    toolType: "api",
    accessTypes: ["execute"],
    oauthRequired: false,
  },
  {
    name: "Slack",
    label: "Slack",
    description: "Post notifications and run summaries to your workspace.",
    purpose: "Send you a summary report and alerts when the agent completes its run.",
    scopes: ["read", "write"],
    icon: "slack",
    required: false,
    sensitiveLevel: "low",
    toolType: "messaging",
    accessTypes: ["write"],
    oauthRequired: true,
  },
  {
    name: "GoogleDrive",
    label: "Google Drive",
    description: "Read and write files in your Google Drive folders.",
    purpose: "Store generated reports, logs, and output artifacts for later retrieval.",
    scopes: ["read", "write"],
    icon: "gdrive",
    required: false,
    sensitiveLevel: "medium",
    toolType: "file",
    accessTypes: ["read", "write"],
    oauthRequired: true,
  },
  {
    name: "Database",
    label: "Internal Database",
    description: "Query and update records in the connected database.",
    purpose: "Persist execution state, cache results, and write output data.",
    scopes: ["read", "write", "execute"],
    icon: "database",
    required: false,
    sensitiveLevel: "high",
    toolType: "database",
    accessTypes: ["read", "write", "execute"],
    oauthRequired: false,
  },
];

const MOCK_LOGS: Array<{ level: string; message: string }> = [
  { level: "info",    message: "Initializing agent runtime environment…" },
  { level: "info",    message: "Loading agent configuration and tools…" },
  { level: "debug",   message: "Connecting to GitHub API…" },
  { level: "success", message: "GitHub integration authenticated successfully." },
  { level: "info",    message: "Fetching repository list…" },
  { level: "debug",   message: "Analyzing codebase structure…" },
  { level: "info",    message: "Running LLM inference on selected files…" },
  { level: "debug",   message: "Tokens used: 2,847 / 8,192" },
  { level: "info",    message: "Generating code suggestions…" },
  { level: "success", message: "Code generation complete. 3 files modified." },
  { level: "info",    message: "Creating pull request draft…" },
  { level: "success", message: "Pull request #42 created successfully." },
  { level: "info",    message: "Agent execution completed." },
];

// ── Hook ───────────────────────────────────────────────────────────────────

export function useAgentRunner(): [AgentRunnerState, AgentRunnerActions] {
  const [state, setState] = useState<AgentRunnerState>(INITIAL);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const sessionRef = useRef<string | null>(null);
  const agentRef   = useRef<Agent | null>(null);

  const set = useCallback((patch: Partial<AgentRunnerState>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // ── Initialise ──
  const initialise = useCallback(async (agent: Agent) => {
    set({ step: "init", initError: "" });
    agentRef.current = agent;
    
    const sessionId = `session-${agent.id}-${Date.now()}`;
    sessionRef.current = sessionId;

    try {
      // 1. Fetch validation data (contains integrations)
      const valRes = await api.get<{ success: boolean; data: any }>(`/agents/${agent.id}/validate`);
      const valData = valRes.data;

      // 2. Fetch cost and credits
      const [costRes, creditsRes] = await Promise.allSettled([
        api.get<{ success: boolean; data: AgentCostBreakdown }>(`/agents/${agent.id}/cost`),
        api.get<{ success: boolean; data: { credits: number; totalCreditsUsed: number } }>("/user/credits"),
      ]);

      const integrations = (valData.integrations || []).map((i: any) => ({
        name: i.slug,
        label: i.name,
        description: `Integration for ${i.name}`,
        purpose: `Used by agent tools`,
        scopes: ["use"],
        icon: i.slug,
        required: true,
        sensitiveLevel: "medium",
        toolType: "api",
        accessTypes: ["execute"],
        oauthRequired: !i.connected,
      }));

      const grants: Record<string, GrantEntry> = {};
      for (const integ of integrations) {
        grants[integ.name] = { 
          granted: valData.integrations.find((vi: any) => vi.slug === integ.name)?.granted ? true : null, 
          scope: "use" 
        };
      }

      set({
        sessionId,
        integrations,
        grants,
        step: integrations.length > 0 ? "permissions" : "user_type",
        initError: "",
        estimatedCost: costRes.status === "fulfilled" ? costRes.value.data : null,
        userCredits: creditsRes.status === "fulfilled" ? creditsRes.value.data.credits : undefined,
        permissionValidation: {
          valid: valData.valid,
          warnings: [],
          blockers: valData.blockers || []
        }
      });
    } catch (err) {
      set({ initError: "Failed to initialize agent runner. Please try again." });
    }
  }, [set]);

  // ── Set grant ──
  const setGrant = useCallback((name: string, granted: boolean) => {
    setState((prev) => ({
      ...prev,
      grants: { ...prev.grants, [name]: { ...prev.grants[name], granted } },
    }));
  }, []);

  // ── Set scope ──
  const setScope = useCallback((name: string, scope: string) => {
    setState((prev) => ({
      ...prev,
      grants: { ...prev.grants, [name]: { ...prev.grants[name], scope } },
    }));
  }, []);

  // ── Save permissions (POST /api/integrations/:slug/grant-agent) ──
  const savePermissions = useCallback(async () => {
    const { integrations, grants } = state;
    const agentId = agentRef.current?.id;
    if (!agentId) return;

    const undecided = integrations.filter((i) => grants[i.name]?.granted === null);
    if (undecided.length > 0) {
      set({ permissionsError: "Grant or deny every permission before continuing." });
      return;
    }

    set({ permissionsSaving: true, permissionsError: "" });

    try {
      // Save grants to backend
      for (const integ of integrations) {
        if (grants[integ.name]?.granted === true) {
          await api.post(`/integrations/${integ.name}/grant-agent`, { agentId });
        }
      }

      // Build local audit log for UI
      const now = new Date().toISOString();
      const auditLog: AuditLogEntry[] = integrations.map((i) => ({
        timestamp: now,
        integration: i.name,
        granted: grants[i.name]?.granted === true,
        scope: grants[i.name]?.scope ?? "use",
      }));

      set({ step: "permission_review", permissionsSaving: false, auditLog });
    } catch (err) {
      set({ 
        permissionsSaving: false, 
        permissionsError: "Failed to save permissions. One or more integrations might need re-connection." 
      });
    }
  }, [state, set]);

  // ── Connect integration (OAuth) ──
  const connectIntegration = useCallback(async (slug: string) => {
    try {
      const res = await api.get<{ success: boolean; data: { url: string } }>(`/integrations/${slug}/auth-url`);
      const { url } = res.data;
      
      // Open in new window
      const win = window.open(url, "_blank", "width=600,height=700");
      
      if (win) {
        // Poll for window close or just wait for focus to re-validate
        const timer = setInterval(() => {
          if (win.closed) {
            clearInterval(timer);
            if (agentRef.current) initialise(agentRef.current);
          }
        }, 1000);
      }
    } catch (err) {
      set({ permissionsError: "Failed to start OAuth flow. Please try again." });
    }
  }, [initialise, set]);

  // ── Confirm permissions (POST /api/agents/:id/validate) ──
  const confirmPermissions = useCallback(async () => {
    if (!agentRef.current) return;
    set({ permissionValidating: true });

    try {
      const res = await api.get<{ success: boolean; data: any }>(`/agents/${agentRef.current.id}/validate`);
      const val = res.data;

      const warnings: string[] = [];
      const blockers: string[] = [];

      if (!val.valid) {
        blockers.push("You do not have permission to run this agent.");
      }
      if (val.missingTools && val.missingTools.length > 0) {
        blockers.push(`Missing tool configurations: ${val.missingTools.join(", ")}`);
      }
      if (val.agentStatus === "ARCHIVED") {
        blockers.push("This agent is archived and cannot be run.");
      }

      set({
        permissionValidating: false,
        permissionValidation: { valid: blockers.length === 0, warnings, blockers },
      });

      if (blockers.length === 0) {
        await delay(300);
        set({ step: "user_type" });
      }
    } catch (err) {
      set({
        permissionValidating: false,
        permissionValidation: {
          valid: false,
          warnings: [],
          blockers: ["Failed to validate agent status. Please try again."],
        },
      });
    }
  }, [set]);

  // ── Select user type (mock) ──
  const selectUserType = useCallback(async (type: "technical" | "non_technical") => {
    set({ userTypeSaving: true });
    await delay(400);
    set({ userType: type, userTypeSaving: false, step: "api_config" });
  }, [set]);

  // ── Submit API config (mock) ──
  const submitApiConfig = useCallback(async (config: ApiConfigMode) => {
    set({ apiConfigSaving: true, apiConfigError: "" });
    await delay(900);

    let generatedEndpoint: string | null = null;
    if (config.mode === "auto") {
      generatedEndpoint = "https://api.omip.dev/v1/execute";
    } else if (config.mode === "manual") {
      if (config.config.endpoint_structure.trim()) {
        try {
          JSON.parse(config.config.endpoint_structure);
        } catch {
          set({ apiConfigError: "Endpoint structure must be valid JSON.", apiConfigSaving: false });
          return;
        }
      }
      generatedEndpoint = config.config.base_url || null;
    }

    set({
      apiConfigMode: config,
      apiConfigSaving: false,
      step: "validation",
      validating: true,
      generatedApiEndpoint: generatedEndpoint,
    });

    await delay(1200);

    const mockValidation: ValidationResult = {
      valid: true,
      missing_permissions: [],
      requires_api: config.mode !== "skip",
      api_status: config.mode === "skip" ? "not_required" : "valid",
      errors: [],
    };

    set({ validation: mockValidation, validating: false });
  }, [set]);

  // ── Proceed to execution (POST /api/agents/run) ──
  const proceedToExecution = useCallback(async () => {
    if (!state.validation?.valid || !agentRef.current) return;

    const agentId = agentRef.current.id;
    set({ step: "execution", executing: true, executionLogs: [] });

    try {
      const res = await api.post<{ success: boolean; data: any }>("/agents/run", {
        agentId,
        userInput: "Execute the agent task.",
        mode: state.apiConfigMode?.mode === "manual" ? "advanced" : "quick",
      });

      const execResult = res.data;
      
      // Simulation of log playback for better UX
      const steps = execResult.metadata?.steps || [];
      if (steps.length > 0) {
        for (const step of steps) {
          const log: ExecutionLog = {
            timestamp: new Date().toISOString(),
            level:     step.type === "tool_result" ? "success" : "info",
            message:   step.type === "llm_call" ? "LLM Thinking..." : `Tool: ${step.toolName || "action"}`,
            step:      "execution",
          };
          setState((prev) => ({ ...prev, executionLogs: [...prev.executionLogs, log] }));
          await delay(600); // progressive reveal
        }
      } else {
        // Fallback logs if no steps returned
        const log: ExecutionLog = {
          timestamp: new Date().toISOString(),
          level: "info",
          message: "Execution finished.",
          step: "execution",
        };
        setState((prev) => ({ ...prev, executionLogs: [...prev.executionLogs, log] }));
      }

      set({
        executing: false,
        step: "result",
        result: {
          session_id:      execResult.executionId || "unknown",
          run_id:          execResult.executionId,
          status:          execResult.status,
          output_data:     execResult.output,
          api_endpoint:    state.generatedApiEndpoint,
          api_credentials: null,
          logs:            state.executionLogs,
          error:           execResult.error || (execResult.status === "FAILED" ? "Execution failed." : null),
        },
      });
    } catch (err) {
      let message = "Execution failed.";
      if (err instanceof ApiError && err.status === 402) {
        message = err.message;
      } else if (err instanceof Error) {
        message = err.message;
      }

      set({
        executing: false,
        step: "result",
        result: {
          session_id:      "error",
          run_id:          null,
          status:          "FAILED",
          output_data:     null,
          api_endpoint:    null,
          api_credentials: null,
          logs:            [],
          error:           message,
        },
      });
    }
  }, [state.validation, state.apiConfigMode, state.generatedApiEndpoint, set]);

  // ── Retry ──
  const retry = useCallback(() => {
    stopPolling();
    set({ step: "permissions", result: null, validation: null, executionLogs: [], executing: false });
  }, [set, stopPolling]);

  // ── Reset ──
  const reset = useCallback(() => {
    stopPolling();
    sessionRef.current = null;
    setState(INITIAL);
  }, [stopPolling]);

  return [
    state,
    { initialise, setGrant, setScope, savePermissions, connectIntegration, confirmPermissions, selectUserType, submitApiConfig, proceedToExecution, retry, reset },
  ];
}
