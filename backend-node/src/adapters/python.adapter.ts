/**
 * src/adapters/python.adapter.ts
 *
 * Python Agent adapter — delegates execution to an external Python microservice.
 *
 * The microservice is expected to expose:
 *   POST /execute  →  { code?, input, agentId, agentName, config }
 *   Response:          { output: string, success: boolean, error?: string, logs?: string }
 *
 * Environment variable:
 *   PYTHON_SERVICE_URL=http://localhost:8001   (set in .env)
 *
 * A minimal Python microservice (FastAPI) that satisfies this contract:
 *   from fastapi import FastAPI
 *   app = FastAPI()
 *   @app.post("/execute")
 *   async def execute(body: dict):
 *       exec(body.get("code", ""), {"input": body["input"]})
 *       return {"output": "done", "success": True}
 */

import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";

const TIMEOUT_MS = 60_000; // Python agents can be compute-heavy

export async function runPythonAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start      = Date.now();
  const serviceUrl = process.env.PYTHON_SERVICE_URL;

  if (!serviceUrl) {
    return {
      success:   false,
      output:    "",
      error:     "Python adapter: PYTHON_SERVICE_URL is not configured. Set it in .env.",
      latencyMs: 0,
    };
  }

  logger.debug("Python adapter executing", { agentId: agent.id, serviceUrl });

  const controller = new AbortController();
  const timer      = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${serviceUrl}/execute`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        agentId:   agent.id,
        agentName: agent.name,
        input:     userInput,
        code:      agent.config.code,
        config:    agent.config,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const body = await res.text().catch(() => res.statusText);
      return {
        success:   false,
        output:    "",
        error:     `Python service returned HTTP ${res.status}: ${body}`,
        latencyMs: Date.now() - start,
        metadata:  { statusCode: res.status, serviceUrl },
      };
    }

    const data = await res.json() as {
      output:   string;
      success:  boolean;
      error?:   string;
      logs?:    string;
    };

    if (!data.success) {
      return {
        success:   false,
        output:    data.output ?? "",
        error:     data.error ?? "Python execution returned success=false",
        latencyMs: Date.now() - start,
        metadata:  { logs: data.logs },
      };
    }

    logger.info("Python adapter success", { agentId: agent.id, latencyMs: Date.now() - start });

    return {
      success:   true,
      output:    typeof data.output === "string"
        ? data.output
        : JSON.stringify(data.output, null, 2),
      latencyMs: Date.now() - start,
      metadata:  { serviceUrl, logs: data.logs },
    };
  } catch (err) {
    clearTimeout(timer);
    const error = err instanceof Error
      ? (err.name === "AbortError" ? `Python service timed out after ${TIMEOUT_MS}ms` : err.message)
      : "Python execution failed";

    logger.error("Python adapter error", { agentId: agent.id, error });
    return { success: false, output: "", error, latencyMs: Date.now() - start };
  }
}
