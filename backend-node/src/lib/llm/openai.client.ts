import OpenAI from "openai";
import { env } from "../config";
import { AppError } from "../../middleware/errorHandler";
import {
  LLMRequestOptions, LLMResponse, LLMToolCall,
} from "./types";

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.OPENAI_API_KEY) {
    throw new AppError(
      "OPENAI_API_KEY is not configured.",
      503,
      "LLM_NOT_CONFIGURED",
    );
  }
  if (!_client) {
    _client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Map our agnostic types → OpenAI Chat Completion format
// ---------------------------------------------------------------------------

function mapMessages(
  messages: LLMRequestOptions["messages"],
): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => {
    if (m.role === "tool") {
      return {
        role: "tool" as const,
        content: m.content,
        tool_call_id: m.tool_call_id ?? "",
      };
    }
    return {
      role: m.role as "system" | "user" | "assistant",
      content: m.content,
    };
  });
}

function mapTools(
  tools: LLMRequestOptions["tools"],
): OpenAI.Chat.ChatCompletionTool[] {
  return (tools ?? []).map((t) => ({
    type: "function" as const,
    function: {
      name:        t.name,
      description: t.description,
      parameters:  t.parameters as Record<string, unknown>,
    },
  }));
}

// ---------------------------------------------------------------------------
// call() — single non-streaming completion
// ---------------------------------------------------------------------------

export async function callOpenAI(opts: LLMRequestOptions): Promise<LLMResponse> {
  const client = getClient();
  const start  = Date.now();

  const response = await client.chat.completions.create(
    {
      model:             opts.model,
      messages:          mapMessages(opts.messages),
      temperature:       opts.temperature  ?? 0.7,
      max_tokens:        opts.maxTokens    ?? 4096,
      top_p:             opts.topP         ?? 1,
      presence_penalty:  opts.presencePenalty  ?? 0,
      frequency_penalty: opts.frequencyPenalty ?? 0,
      ...(opts.tools?.length
        ? { tools: mapTools(opts.tools), tool_choice: "auto" }
        : {}),
    },
    { timeout: opts.timeoutMs ?? 60_000 },
  );

  const latencyMs = Date.now() - start;
  const choice    = response.choices[0]!;
  const msg       = choice.message;

  // Parse tool calls
  const toolCalls: LLMToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
    id:        tc.id,
    name:      tc.function.name,
    arguments: (() => {
      try { return JSON.parse(tc.function.arguments) as Record<string, unknown>; }
      catch { return {}; }
    })(),
  }));

  const finishReason = choice.finish_reason === "tool_calls"
    ? "tool_calls"
    : choice.finish_reason === "length"
      ? "length"
      : "stop";

  return {
    content:      msg.content ?? "",
    toolCalls,
    usage: {
      promptTokens:     response.usage?.prompt_tokens     ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens:      response.usage?.total_tokens      ?? 0,
    },
    finishReason,
    model:    response.model,
    provider: "openai",
    latencyMs,
  };
}
