/**
 * src/lib/llm/groq.client.ts
 *
 * Groq LLM client — uses the OpenAI-compatible REST API.
 * Groq supports tool calls via the same schema as OpenAI.
 */

import { env } from "../config";
import { AppError } from "../../middleware/errorHandler";
import { LLMRequestOptions, LLMResponse, LLMToolCall } from "./types";

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

// ---------------------------------------------------------------------------
// callGroq — single non-streaming chat completion
// ---------------------------------------------------------------------------

export async function callGroq(opts: LLMRequestOptions): Promise<LLMResponse> {
  if (!env.GROQ_API_KEY) {
    throw new AppError(
      "GROQ_API_KEY is not configured.",
      503,
      "LLM_NOT_CONFIGURED",
    );
  }

  const start = Date.now();

  const body: Record<string, unknown> = {
    model:             opts.model,
    messages:          opts.messages,
    temperature:       opts.temperature  ?? 0.7,
    max_tokens:        opts.maxTokens    ?? 4096,
    top_p:             opts.topP         ?? 1,
  };

  if (opts.tools?.length) {
    body["tools"] = opts.tools.map((t) => ({
      type: "function",
      function: {
        name:        t.name,
        description: t.description,
        parameters:  t.parameters,
      },
    }));
    body["tool_choice"] = "auto";
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);

  let res: Response;
  try {
    res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method:  "POST",
      headers: {
        "Authorization": `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type":  "application/json",
      },
      body:   JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new AppError(`Groq API error ${res.status}: ${text}`, 502, "GROQ_ERROR");
  }

  const data = await res.json() as {
    id: string;
    model: string;
    choices: Array<{
      message: {
        content: string | null;
        tool_calls?: Array<{
          id: string;
          function: { name: string; arguments: string };
        }>;
      };
      finish_reason: string;
    }>;
    usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  };

  const latencyMs = Date.now() - start;
  const choice    = data.choices[0]!;
  const msg       = choice.message;

  const toolCalls: LLMToolCall[] = (msg.tool_calls ?? []).map((tc) => ({
    id:        tc.id,
    name:      tc.function.name,
    arguments: (() => {
      try { return JSON.parse(tc.function.arguments) as Record<string, unknown>; }
      catch { return {}; }
    })(),
  }));

  const finishReason =
    choice.finish_reason === "tool_calls" ? "tool_calls" :
    choice.finish_reason === "length"     ? "length"     : "stop";

  return {
    content:   msg.content ?? "",
    toolCalls,
    usage: {
      promptTokens:     data.usage.prompt_tokens,
      completionTokens: data.usage.completion_tokens,
      totalTokens:      data.usage.total_tokens,
    },
    finishReason,
    model:    data.model,
    provider: "openai", // Groq is OpenAI-compatible; treat as "openai" provider for type compat
    latencyMs,
  };
}
