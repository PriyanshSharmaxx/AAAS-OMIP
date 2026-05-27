/**
 * src/adapters/index.ts
 *
 * Adapter Router — dispatches agent execution to the correct framework adapter
 * based on agent.framework, with Redis result caching for repeated identical calls.
 *
 * Routing table:
 *   "Groq" | "LlamaIndex" | default LLM  → groqAdapter
 *   "n8n Workflow"                         → n8nAdapter
 *   "LangChain"                            → langchainAdapter
 *   "Node.js Agent" | "Python Agent"       → pythonAdapter
 *   "CrewAI" | "AutoGen" | "multi-agent"   → multiAgentAdapter
 *
 * Redis caching:
 *   Key:  adapter:cache:{agentId}:{sha256(input)}
 *   TTL:  300s (5 minutes) — only successful results are cached
 *   Skip: frameworks that are non-deterministic by nature (n8n, Python)
 *         can be opted out via agent.config.disableCache = true
 */

import crypto from "crypto";
import { redis } from "../lib/redis";
import { logger } from "../lib/logger";

import { runLLMAdapter }        from "./llm.adapter";
import { runN8NAdapter }        from "./n8n.adapter";
import { runLangChainAdapter }  from "./langchain.adapter";
import { runPythonAdapter }     from "./python.adapter";
import { runMultiAgentAdapter } from "./multiagent.adapter";
import { runWorkflowAdapter }   from "./workflow.adapter";
import { runRAGAdapter }         from "./rag.adapter";
import { runAPIAdapter }         from "./api.adapter";

import type { AgentRecord, AdapterResult, FrameworkAdapter } from "./types";

export type { AgentRecord, AdapterResult };

// ---------------------------------------------------------------------------
// Framework → Adapter mapping
// ---------------------------------------------------------------------------

const ADAPTER_MAP: Record<string, FrameworkAdapter> = {
  // LLM-based agents (default fallback)
  "Groq":            runLLMAdapter,
  "OpenAI":          runLLMAdapter,
  "Anthropic":       runLLMAdapter,
  "groq":            runLLMAdapter,
  "openai":          runLLMAdapter,
  "anthropic":       runLLMAdapter,
  "llm":             runLLMAdapter,

  // Specialized Types (mapped via framework field for consistency)
  "rag":             runRAGAdapter,
  "api":             runAPIAdapter,
  "REST Agent":      runAPIAdapter,

  // n8n workflow automation
  "n8n Workflow":    runN8NAdapter,
  "n8n":             runN8NAdapter,

  // LangChain (Node.js native implementation)
  "LangChain":       runLangChainAdapter,
  "langchain":       runLangChainAdapter,

  // Python microservice
  "Python Agent":    runPythonAdapter,
  "Node.js Agent":   runPythonAdapter,
  "Custom REST Agent": runAPIAdapter,

  // Workflow engine
  "Workflow":        runWorkflowAdapter,
  "workflow":        runWorkflowAdapter,

  // Multi-agent orchestration
  "CrewAI":          runMultiAgentAdapter,
  "AutoGen":         runMultiAgentAdapter,
  "multi-agent":     runMultiAgentAdapter,
};

// Frameworks for which caching is disabled by default (side-effecting)
const NO_CACHE_FRAMEWORKS = new Set(["n8n Workflow", "n8n", "Python Agent", "Node.js Agent"]);

const CACHE_TTL_SECS = 300;

// ---------------------------------------------------------------------------
// Cache helpers
// ---------------------------------------------------------------------------

function cacheKey(agentId: string, input: string): string {
  const hash = crypto.createHash("sha256").update(input).digest("hex").slice(0, 16);
  return `adapter:cache:${agentId}:${hash}`;
}

async function getCached(key: string): Promise<AdapterResult | null> {
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as AdapterResult) : null;
  } catch {
    return null; // Redis miss/error — proceed without cache
  }
}

async function setCached(key: string, result: AdapterResult): Promise<void> {
  try {
    await redis.setex(key, CACHE_TTL_SECS, JSON.stringify(result));
  } catch {
    // Non-fatal — caching is best-effort
  }
}

// ---------------------------------------------------------------------------
// runAdapter — main entry point used by agentExecutor
// ---------------------------------------------------------------------------

export async function runAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const framework = agent.framework ?? "";

  // Select the adapter — fall back to Groq for unknown frameworks
  const adapter: FrameworkAdapter = ADAPTER_MAP[framework] ?? runLLMAdapter;

  const shouldCache =
    !NO_CACHE_FRAMEWORKS.has(framework) &&
    !(agent.config["disableCache"] as boolean | undefined);

  const key = cacheKey(agent.id, userInput);

  // ── Cache read ────────────────────────────────────────────────────────────
  if (shouldCache) {
    const cached = await getCached(key);
    if (cached) {
      logger.debug("Adapter cache hit", { agentId: agent.id, framework });
      return { ...cached, metadata: { ...cached.metadata, fromCache: true } };
    }
  }

  // ── Execute ───────────────────────────────────────────────────────────────
  logger.info("Adapter executing", { agentId: agent.id, framework, adapter: adapter.name });

  const result = await adapter(agent, userInput);

  // ── Cache write (successful results only) ─────────────────────────────────
  if (shouldCache && result.success) {
    void setCached(key, result);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Utility — list all registered framework names (for API docs / UI dropdown)
// ---------------------------------------------------------------------------

export function listSupportedFrameworks(): string[] {
  return [...new Set(Object.keys(ADAPTER_MAP))].sort();
}
