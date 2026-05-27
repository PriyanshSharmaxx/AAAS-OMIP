/**
 * src/adapters/llm.adapter.ts
 *
 * Generic LLM Adapter — handles single-turn and multi-turn agentic loops
 * with tool calling support. This is the "native" engine of Omip.
 */

import { callLLM } from "../lib/llm";
import { resolveTools, executeTool } from "../services/toolRegistry";
import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";
import type { LLMMessage, LLMToolDefinition } from "../lib/llm/types";

export async function runLLMAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start = Date.now();
  const systemPrompt = agent.config.systemPrompt || agent.prompt || "You are a helpful AI agent.";
  
  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userInput },
  ];

  const enabledToolNames = agent.tools
    .filter((t) => t.enabled)
    .map((t) => t.name);
  
  const toolDefs: LLMToolDefinition[] = resolveTools(enabledToolNames);

  let iteration = 0;
  const maxIter = (agent.config.maxIterations as number) || 5;
  const steps: any[] = [];
  const cumUsage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };

  try {
    while (iteration < maxIter) {
      iteration++;

      const llmResponse = await callLLM({
        model:             agent.model,
        messages,
        tools:             toolDefs.length > 0 ? toolDefs : undefined,
        temperature:       (agent.config.temperature as number) || 0.7,
        maxTokens:         (agent.config.maxTokens as number)   || 4096,
      });

      cumUsage.promptTokens     += llmResponse.usage.promptTokens;
      cumUsage.completionTokens += llmResponse.usage.completionTokens;
      cumUsage.totalTokens      += llmResponse.usage.totalTokens;

      steps.push({
        iteration,
        type: "llm_call",
        content: llmResponse.content,
        tokens: llmResponse.usage,
      });

      if (llmResponse.finishReason !== "tool_calls" || llmResponse.toolCalls.length === 0) {
        return {
          success:   true,
          output:    llmResponse.content,
          latencyMs: Date.now() - start,
          metadata: {
            steps,
            usage: cumUsage,
            iterations: iteration,
            finishReason: llmResponse.finishReason,
          },
        };
      }

      // Handle tool calls
      messages.push({
        role:      "assistant",
        content:   llmResponse.content,
        toolCalls: llmResponse.toolCalls,
      });

      for (const tc of llmResponse.toolCalls) {
        const toolConfig = (agent.config.toolConfig as any)?.[tc.name];
        
        try {
          const toolResult = await executeTool(tc.name, tc.args, toolConfig, {
            userId:  agent.id, // Fallback if no userId in agent record
            agentId: agent.id,
          });

          const resultStr = typeof toolResult === "string" ? toolResult : JSON.stringify(toolResult);
          
          steps.push({
            iteration,
            type: "tool_result",
            toolName: tc.name,
            content: resultStr,
          });

          messages.push({
            role:       "tool",
            toolCallId: tc.id,
            content:    resultStr,
          });
        } catch (toolErr) {
          const errorMsg = toolErr instanceof Error ? toolErr.message : "Tool failed";
          messages.push({
            role:       "tool",
            toolCallId: tc.id,
            content:    `Error: ${errorMsg}`,
          });
        }
      }
    }

    return {
      success:   false,
      output:    "",
      error:     "Maximum iterations reached",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "LLM execution failed";
    logger.error("LLM adapter error", { agentId: agent.id, error });
    return { success: false, output: "", error, latencyMs: Date.now() - start };
  }
}
