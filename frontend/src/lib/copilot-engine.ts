/**
 * AI Agent Copilot Engine
 *
 * Fully local, rule-based analysis engine. In demo mode this runs in the
 * browser. When a real backend is wired, replace `analyzeAgent()` with a
 * `POST /api/copilot/analyze` call; the shape of `CopilotAnalysis` stays
 * identical so the UI requires no changes.
 */

import type { AgentDraft } from "./types";

// ─── Public types ────────────────────────────────────────────────────────────

export type SuggestionCategory =
  | "prompt_optimization"
  | "model_optimization"
  | "cost_reduction"
  | "error_debug"
  | "performance";

export type ImpactLevel = "high" | "medium" | "low";

export interface SuggestionChange {
  /** Partial config object to deep-merge into draft.config */
  config?: Record<string, unknown>;
  description?: string;
  tags?: string[];
  name?: string;
}

export interface CopilotSuggestion {
  id: string;
  category: SuggestionCategory;
  title: string;
  description: string;
  impact: ImpactLevel;
  effort: "low" | "medium" | "high";
  /** Text shown in the "before" pane of the diff viewer */
  before?: string;
  /** Text shown in the "after" pane of the diff viewer */
  after?: string;
  /** Partial draft update applied when the user clicks Apply */
  change: SuggestionChange;
  savings?: {
    tokens?: number;
    costLabel?: string;   // e.g. "-$0.006/run"
    latencyLabel?: string; // e.g. "~200ms faster"
  };
}

export interface CopilotAnalysis {
  intents: SuggestionCategory[];
  summary: string;
  suggestions: CopilotSuggestion[];
  /** 0-100 score for the current config */
  performance_score: number;
  /** Human-readable estimate, e.g. "$0.012 / run" */
  cost_estimate: string;
}

export type CopilotMessageRole = "user" | "copilot";

export interface CopilotMessage {
  id: string;
  role: CopilotMessageRole;
  text: string;
  analysis?: CopilotAnalysis;
  timestamp: Date;
}

// ─── Intent detection ────────────────────────────────────────────────────────

const INTENT_PATTERNS: [SuggestionCategory, RegExp][] = [
  ["performance",        /faster|speed|latency|slow|performance|quick/i],
  ["cost_reduction",     /cheap|cost|expen|money|price|token|budget|save/i],
  ["error_debug",        /fix|error|bug|fail|broken|crash|issue|problem|debug/i],
  ["prompt_optimization",/prompt|output|quality|better|improv|clear|accurate|result/i],
  ["model_optimization", /model|gpt|claude|llm|switch|change model|openai|anthropic/i],
];

function detectIntents(input: string): SuggestionCategory[] {
  const found = INTENT_PATTERNS
    .filter(([, re]) => re.test(input))
    .map(([cat]) => cat);

  // If the user just says "optimize" or "make it better" with no specific area
  if (found.length === 0) {
    return ["prompt_optimization", "cost_reduction", "performance"];
  }
  return [...new Set(found)];
}

// ─── Helper: extract known config values ────────────────────────────────────

function getModel(config: Record<string, unknown>): string | null {
  return (
    (config.model as string) ??
    (config.llm_model as string) ??
    (config.ai_model as string) ??
    null
  );
}

function getPrompt(draft: AgentDraft): string {
  const c = draft.config;
  return (
    (c.system_prompt as string) ??
    (c.prompt as string) ??
    (c.system_message as string) ??
    draft.description ??
    ""
  );
}

function getMaxTokens(config: Record<string, unknown>): number | null {
  const v = config.max_tokens ?? config.maxTokens;
  return typeof v === "number" ? v : null;
}

function getTemperature(config: Record<string, unknown>): number | null {
  const v = config.temperature;
  return typeof v === "number" ? v : null;
}

// ─── Suggestion factories ────────────────────────────────────────────────────

function promptOptimizationSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  const currentPrompt = getPrompt(draft);
  if (currentPrompt.length > 200) return null; // already detailed

  const improved = currentPrompt.length === 0
    ? `You are an intelligent ${draft.category ?? "AI"} agent named ${draft.name}.\n\nYour primary objective is to [specific goal here].\n\nGuidelines:\n- Be concise and accurate\n- Cite sources when available\n- If uncertain, say so\n- Output in structured JSON when requested`
    : `${currentPrompt}\n\n[Improved clarity]:\n- Break tasks into numbered steps\n- Explicitly state the expected output format\n- Add context about the domain: ${draft.category ?? "general"}\n- Include error-handling instructions`;

  const tokensSaved = Math.max(0, improved.length / 4 - currentPrompt.length / 4) * -1;
  // Improved prompts may be longer but save tokens by getting right answers on first try

  return {
    id: `ps-${Date.now()}`,
    category: "prompt_optimization",
    title: "Optimize System Prompt",
    description:
      currentPrompt.length === 0
        ? "No system prompt detected. A clear system prompt dramatically improves output quality and consistency."
        : "Your system prompt is brief. Expanding it with explicit guidelines will reduce failed runs and retry costs.",
    impact: "high",
    effort: "low",
    before: currentPrompt || "(empty system prompt)",
    after: improved,
    change: {
      config: { system_prompt: improved },
      description: draft.description || `${draft.name} — optimized AI agent`,
    },
    savings: {
      tokens: Math.abs(Math.round(tokensSaved)),
      costLabel: "-$0.003/run (fewer retries)",
    },
  };
}

function modelOptimizationSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  const model = getModel(draft.config);
  if (!model) return null;

  const expensive = ["gpt-4", "gpt-4-turbo", "claude-3-opus", "claude-opus"];
  const isExpensive = expensive.some((m) => model.toLowerCase().includes(m));
  if (!isExpensive) return null;

  const recommended = model.toLowerCase().includes("claude")
    ? "claude-3-5-haiku-20241022"
    : "gpt-4o-mini";

  return {
    id: `mo-${Date.now()}`,
    category: "model_optimization",
    title: "Switch to a Cheaper Model",
    description: `You are using ${model} which costs ~10× more than ${recommended}. For most agent tasks, the lighter model achieves 92%+ of the quality at a fraction of the cost.`,
    impact: "high",
    effort: "low",
    before: `"model": "${model}"`,
    after: `"model": "${recommended}"`,
    change: {
      config: { model: recommended },
    },
    savings: {
      tokens: 0,
      costLabel: "Up to -90% per run",
      latencyLabel: "~400ms faster",
    },
  };
}

function tokenReductionSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  const maxTokens = getMaxTokens(draft.config);
  if (!maxTokens || maxTokens <= 1024) return null;

  const recommended = Math.min(1024, Math.round(maxTokens * 0.4));

  return {
    id: `tr-${Date.now()}`,
    category: "cost_reduction",
    title: "Reduce Max Output Tokens",
    description: `max_tokens is set to ${maxTokens}. Most agent tasks need far fewer. Setting it to ${recommended} will cut output costs significantly while rarely hitting the limit.`,
    impact: "medium",
    effort: "low",
    before: `"max_tokens": ${maxTokens}`,
    after: `"max_tokens": ${recommended}`,
    change: {
      config: { max_tokens: recommended },
    },
    savings: {
      tokens: maxTokens - recommended,
      costLabel: `-$${(((maxTokens - recommended) / 1000) * 0.002).toFixed(4)}/run`,
    },
  };
}

function temperatureSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  const temp = getTemperature(draft.config);
  if (temp === null || temp <= 0.3) return null;

  const isCreative = ["content", "writing", "creative"].some((c) =>
    draft.category?.toLowerCase().includes(c)
  );
  if (isCreative && temp <= 0.8) return null;

  const recommended = isCreative ? 0.7 : 0.2;

  return {
    id: `tm-${Date.now()}`,
    category: "performance",
    title: "Lower Temperature for Consistency",
    description: `Temperature ${temp} introduces high randomness. For a ${draft.category ?? "task"} agent, ${recommended} gives more predictable, reliable outputs — especially important for structured data tasks.`,
    impact: "medium",
    effort: "low",
    before: `"temperature": ${temp}`,
    after: `"temperature": ${recommended}`,
    change: {
      config: { temperature: recommended },
    },
    savings: {
      costLabel: "Fewer retry calls",
      latencyLabel: "Consistent outputs",
    },
  };
}

function cachingSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  if (draft.config.cache_enabled || draft.config.caching) return null;
  // Only suggest if the agent has no tools (pure LLM tasks are cacheable)
  if (draft.tools && draft.tools.length > 3) return null;

  return {
    id: `ca-${Date.now()}`,
    category: "cost_reduction",
    title: "Enable Response Caching",
    description:
      "Identical or similar inputs will return cached results instantly, reducing LLM calls by up to 60% for repetitive workloads.",
    impact: "medium",
    effort: "low",
    before: `"cache_enabled": false`,
    after: `"cache_enabled": true,\n"cache_ttl_seconds": 3600`,
    change: {
      config: { cache_enabled: true, cache_ttl_seconds: 3600 },
    },
    savings: {
      costLabel: "Up to -60% on repeat queries",
      latencyLabel: "<10ms cached responses",
    },
  };
}

function retryLogicSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  if (draft.config.retry_attempts || draft.config.max_retries) return null;

  return {
    id: `rl-${Date.now()}`,
    category: "error_debug",
    title: "Add Retry Logic",
    description:
      "No retry configuration detected. Transient API failures will cause the entire run to fail. Exponential backoff retries recover from ~80% of temporary errors automatically.",
    impact: "high",
    effort: "low",
    before: `(no retry config)`,
    after: `"retry_attempts": 3,\n"retry_backoff": "exponential",\n"retry_delay_ms": 1000`,
    change: {
      config: {
        retry_attempts: 3,
        retry_backoff: "exponential",
        retry_delay_ms: 1000,
      },
    },
    savings: {
      costLabel: "Fewer failed billing events",
    },
  };
}

function parallelExecutionSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  if (!draft.tools || draft.tools.length < 2) return null;
  if (draft.config.parallel_tools) return null;

  return {
    id: `pe-${Date.now()}`,
    category: "performance",
    title: "Enable Parallel Tool Calls",
    description: `Your agent has ${draft.tools.length} tools. Calling them sequentially wastes time. Enabling parallel execution can cut total latency by up to 60% when tools are independent.`,
    impact: "medium",
    effort: "low",
    before: `"parallel_tools": false`,
    after: `"parallel_tools": true,\n"max_parallel": 3`,
    change: {
      config: { parallel_tools: true, max_parallel: 3 },
    },
    savings: {
      latencyLabel: `~${draft.tools.length * 300}ms saved per run`,
    },
  };
}

function tagsAndMetaSuggestion(draft: AgentDraft): CopilotSuggestion | null {
  if (draft.tags && draft.tags.length >= 3) return null;

  const autoTags = [
    draft.framework,
    draft.category,
    "ai-agent",
    getModel(draft.config) ? "llm-powered" : null,
  ].filter(Boolean) as string[];

  return {
    id: `tm2-${Date.now()}`,
    category: "prompt_optimization",
    title: "Improve Agent Discoverability",
    description:
      "Adding relevant tags and a detailed description helps users find your agent in the marketplace and gives the runtime more context for better performance.",
    impact: "low",
    effort: "low",
    before: `tags: [${(draft.tags ?? []).map((t) => `"${t}"`).join(", ")}]`,
    after: `tags: [${autoTags.map((t) => `"${t}"`).join(", ")}]`,
    change: {
      tags: [...new Set([...(draft.tags ?? []), ...autoTags])],
    },
    savings: {},
  };
}

// ─── Score calculation ───────────────────────────────────────────────────────

function calculateScore(draft: AgentDraft, suggestions: CopilotSuggestion[]): number {
  let score = 80; // baseline
  const highImpact = suggestions.filter((s) => s.impact === "high").length;
  const midImpact  = suggestions.filter((s) => s.impact === "medium").length;
  score -= highImpact * 12;
  score -= midImpact * 5;
  if (draft.tags && draft.tags.length > 2) score += 5;
  if (draft.description && draft.description.length > 80) score += 5;
  return Math.max(20, Math.min(100, score));
}

function estimateCost(draft: AgentDraft): string {
  const model = getModel(draft.config)?.toLowerCase() ?? "";
  const maxTokens = getMaxTokens(draft.config) ?? 512;
  let pricePerK = 0.002; // default gpt-4o-mini rate
  if (model.includes("gpt-4-turbo")) pricePerK = 0.03;
  if (model.includes("gpt-4o") && !model.includes("mini")) pricePerK = 0.015;
  if (model.includes("opus")) pricePerK = 0.075;
  if (model.includes("sonnet")) pricePerK = 0.015;
  if (model.includes("haiku")) pricePerK = 0.00025;
  const estCost = (maxTokens / 1000) * pricePerK;
  return `~$${estCost.toFixed(4)} / run`;
}

// ─── Summary builder ─────────────────────────────────────────────────────────

function buildSummary(
  intents: SuggestionCategory[],
  suggestions: CopilotSuggestion[],
  draft: AgentDraft,
  score: number
): string {
  const highCount = suggestions.filter((s) => s.impact === "high").length;
  const intentLabels: Record<SuggestionCategory, string> = {
    prompt_optimization: "prompt quality",
    model_optimization: "model selection",
    cost_reduction: "cost efficiency",
    error_debug: "error resilience",
    performance: "execution speed",
  };
  const focusAreas = intents.map((i) => intentLabels[i]).join(", ");

  const opening =
    score >= 75
      ? `**${draft.name}** is in good shape (score: ${score}/100).`
      : score >= 50
      ? `**${draft.name}** has room for improvement (score: ${score}/100).`
      : `**${draft.name}** needs attention (score: ${score}/100).`;

  if (suggestions.length === 0) {
    return `${opening} No optimizations found for ${focusAreas}. Your configuration looks solid!`;
  }

  return (
    `${opening} I analyzed your agent for ${focusAreas} and found **${suggestions.length} optimization${suggestions.length > 1 ? "s"  : ""}**` +
    (highCount > 0 ? `, including **${highCount} high-impact** change${highCount > 1 ? "s" : ""}` : "") +
    `. Apply them below to improve your agent's ${intents.includes("cost_reduction") ? "cost and " : ""}performance.`
  );
}

// ─── Main export ─────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function analyzeAgent(
  instruction: string,
  draft: AgentDraft
): Promise<CopilotAnalysis> {
  // Simulate LLM latency — replace with actual API call when backend ready
  await delay(1400 + Math.random() * 600);

  const intents = detectIntents(instruction);

  // Run all applicable analyzers
  const allSuggestions: (CopilotSuggestion | null)[] = [];

  if (intents.includes("prompt_optimization")) {
    allSuggestions.push(promptOptimizationSuggestion(draft));
    allSuggestions.push(tagsAndMetaSuggestion(draft));
  }
  if (intents.includes("model_optimization") || intents.includes("cost_reduction")) {
    allSuggestions.push(modelOptimizationSuggestion(draft));
    allSuggestions.push(tokenReductionSuggestion(draft));
    allSuggestions.push(cachingSuggestion(draft));
  }
  if (intents.includes("performance")) {
    allSuggestions.push(temperatureSuggestion(draft));
    allSuggestions.push(parallelExecutionSuggestion(draft));
  }
  if (intents.includes("error_debug")) {
    allSuggestions.push(retryLogicSuggestion(draft));
  }

  // Deduplicate and filter nulls
  const seen = new Set<string>();
  const suggestions = allSuggestions.filter((s): s is CopilotSuggestion => {
    if (!s) return false;
    const key = s.category + s.title;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const performance_score = calculateScore(draft, suggestions);
  const cost_estimate = estimateCost(draft);
  const summary = buildSummary(intents, suggestions, draft, performance_score);

  return { intents, summary, suggestions, performance_score, cost_estimate };
}
