/**
 * src/lib/llm/index.ts
 *
 * Unified LLM router — dispatches to the correct provider client
 * based on the model name. agentExecutor imports from here.
 */

import { callOpenAI }    from "./openai.client";
import { callAnthropic } from "./anthropic.client";
import { callGroq }      from "./groq.client";
import {
  LLMRequestOptions,
  LLMResponse,
  resolveProvider,
} from "./types";

export * from "./types";

// ---------------------------------------------------------------------------
// callLLM — single entry point for all LLM calls
// ---------------------------------------------------------------------------

export async function callLLM(opts: LLMRequestOptions): Promise<LLMResponse> {
  const provider = resolveProvider(opts.model);

  switch (provider) {
    case "openai":    return callOpenAI(opts);
    case "anthropic": return callAnthropic(opts);
    case "groq":      return callGroq(opts);
    default:
      throw new Error(`Unsupported LLM provider for model: ${opts.model}`);
  }
}
