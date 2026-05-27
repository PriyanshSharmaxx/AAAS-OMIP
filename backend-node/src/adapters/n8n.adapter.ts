/**
 * src/adapters/n8n.adapter.ts
 *
 * n8n Workflow adapter — triggers an n8n workflow via its webhook URL and
 * returns the workflow response as the agent output.
 *
 * Setup in n8n:
 *   1. Create a Webhook node → set Method = POST, Response = "Last Node"
 *   2. Copy the webhook URL into agent.config.webhookUrl
 *   3. (Optional) Add a "Respond to Webhook" node to shape the response
 *
 * The adapter sends:  { input, agentId, agentName, timestamp }
 * Expected response:  { output: string } OR any JSON (stringified as output)
 */

import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";

const TIMEOUT_MS = 30_000; // n8n workflows can be slow

export async function runN8NAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start = Date.now();
  const webhookUrl = agent.config.webhookUrl;

  if (!webhookUrl) {
    return {
      success:   false,
      output:    "",
      error:     "n8n adapter: agent.config.webhookUrl is required for n8n Workflow agents.",
      latencyMs: 0,
    };
  }

  logger.debug("n8n adapter executing", { agentId: agent.id, webhookUrl });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(webhookUrl, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        input:     userInput,
        agentId:   agent.id,
        agentName: agent.name,
        timestamp: new Date().toISOString(),
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      return {
        success:   false,
        output:    "",
        error:     `n8n webhook returned HTTP ${res.status}: ${body}`,
        latencyMs: Date.now() - start,
        metadata:  { statusCode: res.status, webhookUrl },
      };
    }

    const contentType = res.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await res.json() as Record<string, unknown>
      : { output: await res.text() };

    // Normalise to string output — prefer data.output, fallback to full JSON
    const output = typeof data["output"] === "string"
      ? data["output"]
      : JSON.stringify(data, null, 2);

    logger.info("n8n adapter success", { agentId: agent.id, latencyMs: Date.now() - start });

    return {
      success:   true,
      output,
      latencyMs: Date.now() - start,
      metadata:  { webhookUrl, responseKeys: Object.keys(data) },
    };
  } catch (err) {
    clearTimeout(timer);
    const error = err instanceof Error
      ? (err.name === "AbortError" ? `n8n timed out after ${TIMEOUT_MS}ms` : err.message)
      : "n8n execution failed";

    logger.error("n8n adapter error", { agentId: agent.id, error });
    return { success: false, output: "", error, latencyMs: Date.now() - start };
  }
}
