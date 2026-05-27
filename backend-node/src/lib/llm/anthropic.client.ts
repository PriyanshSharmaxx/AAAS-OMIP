import Anthropic from "@anthropic-ai/sdk";
import { env } from "../config";
import { AppError } from "../../middleware/errorHandler";
import {
  LLMRequestOptions, LLMResponse, LLMToolCall,
} from "./types";

// ---------------------------------------------------------------------------
// Singleton client
// ---------------------------------------------------------------------------

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!env.ANTHROPIC_API_KEY) {
    throw new AppError(
      "ANTHROPIC_API_KEY is not configured.",
      503,
      "LLM_NOT_CONFIGURED",
    );
  }
  if (!_client) {
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

// ---------------------------------------------------------------------------
// Map our agnostic messages → Anthropic format
// Anthropic: system prompt is a top-level param, not a message
// ---------------------------------------------------------------------------

function extractSystem(messages: LLMRequestOptions["messages"]): {
  system: string;
  userMessages: Anthropic.MessageParam[];
} {
  const systemParts: string[] = [];
  const userMessages: Anthropic.MessageParam[] = [];

  for (const m of messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else if (m.role === "tool") {
      // Tool results in Anthropic use "user" role with content blocks
      userMessages.push({
        role: "user",
        content: [
          {
            type: "tool_result" as const,
            tool_use_id: m.tool_call_id ?? "",
            content: m.content,
          },
        ],
      });
    } else {
      userMessages.push({
        role: m.role as "user" | "assistant",
        content: m.content,
      });
    }
  }

  return { system: systemParts.join("\n\n"), userMessages };
}

function mapTools(
  tools: LLMRequestOptions["tools"],
): Anthropic.Tool[] {
  return (tools ?? []).map((t) => ({
    name:         t.name,
    description:  t.description,
    input_schema: {
      type:       "object" as const,
      properties: t.parameters.properties,
      required:   t.parameters.required ?? [],
    },
  }));
}

// ---------------------------------------------------------------------------
// callAnthropic() — single completion
// ---------------------------------------------------------------------------

export async function callAnthropic(opts: LLMRequestOptions): Promise<LLMResponse> {
  const client = getClient();
  const start  = Date.now();

  const { system, userMessages } = extractSystem(opts.messages);

  const response = await client.messages.create({
    model:       opts.model,
    max_tokens:  opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.7,
    top_p:       opts.topP ?? 1,
    ...(system ? { system } : {}),
    messages: userMessages,
    ...(opts.tools?.length ? { tools: mapTools(opts.tools) } : {}),
  });

  const latencyMs = Date.now() - start;

  // Parse response content blocks
  let textContent = "";
  const toolCalls: LLMToolCall[] = [];

  for (const block of response.content) {
    if (block.type === "text") {
      textContent += block.text;
    } else if (block.type === "tool_use") {
      toolCalls.push({
        id:        block.id,
        name:      block.name,
        arguments: block.input as Record<string, unknown>,
      });
    }
  }

  const finishReason =
    response.stop_reason === "tool_use" ? "tool_calls" :
    response.stop_reason === "max_tokens" ? "length" : "stop";

  return {
    content:   textContent,
    toolCalls,
    usage: {
      promptTokens:     response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      totalTokens:      response.usage.input_tokens + response.usage.output_tokens,
    },
    finishReason,
    model:    opts.model,
    provider: "anthropic",
    latencyMs,
  };
}
