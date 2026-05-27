/**
 * src/adapters/api.adapter.ts
 *
 * API Adapter — handles direct REST API agents.
 * Calls an upstream URL with configured method and headers.
 */

import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";

export async function runAPIAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start = Date.now();
  const { url, method = "POST", headers = {} } = agent.config;

  if (!url) {
    return {
      success:   false,
      output:    "",
      error:     "Agent configuration missing URL",
      latencyMs: Date.now() - start,
    };
  }

  logger.info("API adapter executing", { agentId: agent.id, url, method });

  try {
    const response = await fetch(url as string, {
      method: method as string,
      headers: {
        "Content-Type": "application/json",
        ...(headers as Record<string, string>),
      },
      body: JSON.stringify({ input: userInput }),
    });

    const data = await response.json();
    const output = typeof data === "string" ? data : JSON.stringify(data);

    return {
      success:   response.ok,
      output,
      latencyMs: Date.now() - start,
      metadata: {
        status: response.status,
        url,
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "API execution failed";
    logger.error("API adapter error", { agentId: agent.id, url, error });
    return { success: false, output: "", error, latencyMs: Date.now() - start };
  }
}
