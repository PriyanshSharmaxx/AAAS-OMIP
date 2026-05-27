/**
 * src/services/agentExecutor.ts
 *
 * Core agent execution engine.
 *
 * Architecture:
 *   runAgent()
 *     └─ builds message history
 *     └─ calls LLM (via lib/llm)
 *     └─ if tool_calls → resolves tools via toolRegistry
 *     └─ appends tool results → calls LLM again (agentic loop)
 *     └─ returns AgentRunResult
 *
 * The caller (Step 6 execution API or Step 9 BullMQ worker)
 * is responsible for saving logs to the DB.
 */

import { logger } from "../lib/logger";
import { runAdapter } from "../adapters";
import { LLMMessage, callLLM, LLMUsage } from "../lib/llm";

// ---------------------------------------------------------------------------
// Input / Output types
// ---------------------------------------------------------------------------

export interface AgentRunInput {
  // Agent identity
  agentId:  string;
  agentName: string;
  // LLM config (from Agent row)
  prompt:   string;          // system prompt
  model:    string;
  config:   {
    temperature?:       number;
    maxTokens?:         number;
    topP?:              number;
    presencePenalty?:   number;
    frequencyPenalty?:  number;
  };
  tools: Array<{ name: string; enabled: boolean; config?: Record<string, unknown> }>;
  // User's request
  userInput:    string;
  mode?:        "quick" | "advanced";
  // Optional conversation history for multi-turn runs
  history?:     LLMMessage[];
  // Execution metadata
  userId?:      string;
  triggerSource?: string;
  // Safety
  maxIterations?: number;    // default 5 — prevents runaway tool loops
  timeoutMs?:     number;    // per-LLM-call timeout, default 60s
  agentFramework?: string;
  agentType?:      string;
}

export interface AgentRunStep {
  iteration: number;
  type: "llm_call" | "tool_call" | "tool_result";
  content: string;
  toolName?: string;
  toolArgs?: Record<string, unknown>;
  toolResult?: unknown;
  latencyMs?: number;
  tokens?: Partial<LLMUsage>;
}

export interface AgentRunResult {
  success:       boolean;
  output:        string;             // final text answer
  steps:         AgentRunStep[];     // full reasoning trace
  usage:         LLMUsage;           // cumulative token counts
  model:         string;
  durationMs:    number;
  iterations:    number;
  error?:        string;
  finishReason:  "stop" | "tool_calls" | "length" | "error" | "max_iterations";
}

// ---------------------------------------------------------------------------
/**
 * runAgent — legacy alias for dispatchByType, maintained for backward compatibility.
 */
export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  return dispatchByType({
    ...input,
    agentFramework: input.agentFramework || "llm",
    agentType:      input.agentType || "llm",
  });
}

// Specialized execution strategies have been moved to the adapter layer (src/adapters/*.adapter.ts)

export async function dispatchByType(
  input: AgentRunInput & { agentType?: string; agentFramework?: string },
): Promise<AgentRunResult> {
  // ── Unified Adapter Dispatch ─────────────────────────────────────────────
  // Every agent (regardless of framework or type) is now handled via an adapter.
  // Unknown frameworks fall back to the generic LLM adapter.
  
  logger.info("Dispatching via adapter layer", {
    agentId:   input.agentId,
    framework: input.agentFramework || "native",
    type:      input.agentType,
  });

  const adapterResult = await runAdapter(
    {
      id:        input.agentId,
      name:      input.agentName,
      framework: input.agentFramework || "llm", // default to llm adapter if no framework
      type:      input.agentType      || "llm",
      model:     input.model,
      prompt:    input.prompt,
      config:    input.config as any,
      tools:     input.tools || [],
    },
    input.userInput,
  );

  // ── Normalise AdapterResult → AgentRunResult ─────────────────────────────
  return {
    success:     adapterResult.success,
    output:      adapterResult.output,
    steps: adapterResult.metadata?.steps as any[] || (adapterResult.metadata
      ? [{ iteration: 1, type: "tool_result" as const, content: adapterResult.output }]
      : []),
    usage:       (adapterResult.metadata?.usage as any) || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
    model:       input.model,
    durationMs:  adapterResult.latencyMs,
    iterations:  (adapterResult.metadata?.iterations as number) || 1,
    finishReason: (adapterResult.metadata?.finishReason as any) || (adapterResult.success ? "stop" : "error"),
    ...(adapterResult.error ? { error: adapterResult.error } : {}),
  };
}

// ---------------------------------------------------------------------------
// Lightweight wrapper for testing / quick calls without a full agent row
// ---------------------------------------------------------------------------

export async function quickRun(opts: {
  systemPrompt: string;
  userMessage:  string;
  model?:       string;
  temperature?: number;
  maxTokens?:   number;
}): Promise<string> {
  const result = await callLLM({
    model:       opts.model ?? "gpt-4o-mini",
    temperature: opts.temperature ?? 0.7,
    maxTokens:   opts.maxTokens ?? 2048,
    messages: [
      { role: "system", content: opts.systemPrompt },
      { role: "user",   content: opts.userMessage  },
    ],
  });
  return result.content;
}
