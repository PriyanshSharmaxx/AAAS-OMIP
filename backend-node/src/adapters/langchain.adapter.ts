/**
 * src/adapters/langchain.adapter.ts
 *
 * LangChain-style execution adapter — implements the core LangChain primitives
 * (PromptTemplate + LLMChain) natively using our existing LLM infrastructure.
 *
 * This avoids the 300MB @langchain/* dependency while providing identical
 * behaviour. Swap for the real packages if you need vector stores or agents.
 *
 * Supported patterns:
 *   - agent.config.promptTemplate  → single-variable template chain
 *   - agent.config.steps[]         → sequential chain (chain of chains)
 *   - agent.config.systemPrompt    → system message prefix
 *
 * Template syntax: "Answer this question: {input}" — {input} is replaced with
 * the user's message. Add more variables as {variableName}.
 */

import { callLLM, GROQ_MODELS } from "../lib/llm";
import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";

// ---------------------------------------------------------------------------
// PromptTemplate — interpolates {variables} in a template string
// ---------------------------------------------------------------------------

class PromptTemplate {
  constructor(
    private readonly template: string,
    private readonly inputVariables: string[],
  ) {}

  format(values: Record<string, string>): string {
    let result = this.template;
    for (const key of this.inputVariables) {
      result = result.replaceAll(`{${key}}`, values[key] ?? "");
    }
    return result;
  }

  static fromTemplate(template: string): PromptTemplate {
    const vars = [...template.matchAll(/\{(\w+)\}/g)].map((m) => m[1]!);
    return new PromptTemplate(template, [...new Set(vars)]);
  }
}

// ---------------------------------------------------------------------------
// LLMChain — runs a PromptTemplate through an LLM call
// ---------------------------------------------------------------------------

class LLMChain {
  constructor(
    private readonly model: string,
    private readonly prompt: PromptTemplate,
    private readonly systemMessage?: string,
    private readonly temperature = 0.7,
    private readonly maxTokens   = 4096,
  ) {}

  async call(variables: Record<string, string>): Promise<string> {
    const userMessage = this.prompt.format(variables);
    const messages = [
      ...(this.systemMessage
        ? [{ role: "system" as const, content: this.systemMessage }]
        : []),
      { role: "user" as const, content: userMessage },
    ];

    const res = await callLLM({
      model:       this.model,
      messages,
      temperature: this.temperature,
      maxTokens:   this.maxTokens,
    });

    return res.content;
  }
}

// ---------------------------------------------------------------------------
// runLangChainAdapter — main entry point
// ---------------------------------------------------------------------------

export async function runLangChainAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start = Date.now();

  // Prefer a Groq model if agent uses one; otherwise use agent.model or gpt-4o
  const model = GROQ_MODELS.has(agent.model) ? agent.model : (agent.model || "gpt-4o");

  logger.debug("LangChain adapter executing", { agentId: agent.id, model });

  try {
    // ── Sequential chain (multiple steps) ────────────────────────────────────
    if (agent.config.steps && agent.config.steps.length > 0) {
      const stepTraces: string[] = [];
      let result = userInput;

      for (const step of agent.config.steps) {
        const template = PromptTemplate.fromTemplate(step.prompt.includes("{input}")
          ? step.prompt
          : `${step.prompt}\n\n{input}`);

        const chain = new LLMChain(
          step.model ?? model,
          template,
          agent.config.systemPrompt,
        );

        result = await chain.call({ input: result });
        stepTraces.push(result);
      }

      return {
        success:   true,
        output:    result,
        latencyMs: Date.now() - start,
        metadata:  { model, steps: stepTraces.length, chainType: "sequential" },
      };
    }

    // ── Single-template chain (standard LangChain pattern) ───────────────────
    const rawTemplate = agent.config.promptTemplate
      ?? (agent.prompt.includes("{input}") ? agent.prompt : `${agent.prompt}\n\n{input}`);

    const template = PromptTemplate.fromTemplate(rawTemplate);
    const chain    = new LLMChain(
      model,
      template,
      agent.config.systemPrompt,
      0.7,
      4096,
    );

    const output = await chain.call({ input: userInput });

    logger.info("LangChain adapter success", { agentId: agent.id, latencyMs: Date.now() - start });

    return {
      success:   true,
      output,
      latencyMs: Date.now() - start,
      metadata:  { model, chainType: "simple", template: rawTemplate.slice(0, 100) },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "LangChain execution failed";
    logger.error("LangChain adapter error", { agentId: agent.id, error });
    return { success: false, output: "", error, latencyMs: Date.now() - start };
  }
}
