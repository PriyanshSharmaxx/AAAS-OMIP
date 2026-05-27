/**
 * src/adapters/multiagent.adapter.ts
 *
 * Multi-Agent adapter — simulates CrewAI / AutoGen style orchestration.
 *
 * Each "agent" in the crew is defined as a step in agent.config.steps:
 *   steps: [
 *     { role: "Researcher",  prompt: "Research this topic: {input}", model?: "llama3-70b-8192" },
 *     { role: "Writer",      prompt: "Write a report based on: {input}" },
 *     { role: "Critic",      prompt: "Review and improve: {input}" },
 *   ]
 *
 * Execution is sequential (CrewAI default). Each step's output becomes
 * the next step's input — simulating agent hand-off.
 *
 * To simulate AutoGen back-and-forth: set agent.config.rounds > 1 to repeat
 * the full crew cycle multiple times.
 */

import { callLLM, GROQ_MODELS } from "../lib/llm";
import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";

interface CrewStep {
  role?:   string;
  prompt:  string;
  model?:  string;
}

const DEFAULT_MODEL = "llama3-70b-8192";

export async function runMultiAgentAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start  = Date.now();
  const steps  = (agent.config.steps ?? []) as CrewStep[];
  const rounds = (agent.config["rounds"] as number | undefined) ?? 1;

  if (steps.length === 0) {
    return {
      success:   false,
      output:    "",
      error:     "Multi-agent adapter: agent.config.steps[] is empty. Define crew members.",
      latencyMs: 0,
    };
  }

  logger.debug("Multi-agent adapter executing", {
    agentId: agent.id,
    stepCount: steps.length,
    rounds,
  });

  const baseModel = GROQ_MODELS.has(agent.model) ? agent.model : DEFAULT_MODEL;

  // Trace of all step outputs for debugging
  const stepTraces: Array<{ round: number; role: string; output: string }> = [];

  let result = userInput;

  try {
    for (let round = 1; round <= rounds; round++) {
      for (const step of steps) {
        const stepModel = step.model ?? baseModel;
        const role      = step.role ?? "Agent";

        // Interpolate {input} in the prompt — if no placeholder, append input
        const userMessage = step.prompt.includes("{input}")
          ? step.prompt.replace("{input}", result)
          : `${step.prompt}\n\n${result}`;

        const llmRes = await callLLM({
          model:    stepModel,
          messages: [
            {
              role:    "system",
              content: `You are the "${role}" in a multi-agent crew. ${agent.config.systemPrompt ?? ""}`.trim(),
            },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          maxTokens:   4096,
        });

        result = llmRes.content;

        stepTraces.push({ round, role, output: result.slice(0, 200) });

        logger.debug("Multi-agent step done", {
          agentId: agent.id, round, role, stepModel,
          tokens: llmRes.usage.totalTokens,
        });
      }
    }

    logger.info("Multi-agent adapter success", {
      agentId:    agent.id,
      steps:      steps.length,
      rounds,
      latencyMs:  Date.now() - start,
    });

    return {
      success:   true,
      output:    result,
      latencyMs: Date.now() - start,
      metadata:  {
        steps:  steps.length,
        rounds,
        traces: stepTraces,
        model:  baseModel,
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Multi-agent execution failed";
    logger.error("Multi-agent adapter error", { agentId: agent.id, error });
    return {
      success:   false,
      output:    result, // return partial result if any steps succeeded
      error,
      latencyMs: Date.now() - start,
      metadata:  { completedSteps: stepTraces.length },
    };
  }
}
