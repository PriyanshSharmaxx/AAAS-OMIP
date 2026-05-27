// ---------------------------------------------------------------------------
// Shared LLM types — provider-agnostic contracts used by agentExecutor
// ---------------------------------------------------------------------------

export type LLMProvider = "openai" | "anthropic" | "groq";

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;   // for tool result messages
  name?: string;           // tool name (OpenAI format)
}

export interface LLMToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description?: string;
      enum?: string[];
    }>;
    required?: string[];
  };
}

export interface LLMToolCall {
  id:        string;
  name:      string;
  arguments: Record<string, unknown>;
}

export interface LLMUsage {
  promptTokens:     number;
  completionTokens: number;
  totalTokens:      number;
}

export interface LLMResponse {
  content:    string;
  toolCalls:  LLMToolCall[];
  usage:      LLMUsage;
  finishReason: "stop" | "tool_calls" | "length" | "error";
  model:      string;
  provider:   LLMProvider;
  latencyMs:  number;
}

export interface LLMRequestOptions {
  model:       string;
  messages:    LLMMessage[];
  tools?:      LLMToolDefinition[];
  temperature?: number;
  maxTokens?:  number;
  topP?:       number;
  presencePenalty?:  number;
  frequencyPenalty?: number;
  timeoutMs?:  number;
}

// ---------------------------------------------------------------------------
// Resolve which provider to use from a model name
// ---------------------------------------------------------------------------

export function resolveProvider(model: string): LLMProvider {
  if (model.startsWith("claude-"))   return "anthropic";
  if (model.startsWith("groq-") || GROQ_MODELS.has(model)) return "groq";
  return "openai";
}

// Groq-hosted model identifiers
export const GROQ_MODELS = new Set([
  "llama3-70b-8192",
  "llama3-8b-8192",
  "llama-3.1-70b-versatile",
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
  "mixtral-8x7b-32768",
  "gemma2-9b-it",
  "gemma-7b-it",
]);

// ---------------------------------------------------------------------------
// Model capability caps (prevent runaway token usage)
// ---------------------------------------------------------------------------

export const MODEL_MAX_TOKENS: Record<string, number> = {
  // OpenAI
  "gpt-4o":              128_000,
  "gpt-4o-mini":         128_000,
  "gpt-4-turbo":         128_000,
  // Anthropic
  "claude-opus-4-6":          200_000,
  "claude-sonnet-4-6":        200_000,
  "claude-haiku-4-5-20251001": 200_000,
  // Groq
  "llama3-70b-8192":           8_192,
  "llama3-8b-8192":            8_192,
  "llama-3.1-70b-versatile":  131_072,
  "llama-3.1-8b-instant":     131_072,
  "llama-3.3-70b-versatile":  131_072,
  "mixtral-8x7b-32768":        32_768,
  "gemma2-9b-it":               8_192,
  "gemma-7b-it":                8_192,
};
