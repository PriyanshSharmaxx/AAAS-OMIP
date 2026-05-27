/**
 * src/adapters/workflow.adapter.ts
 *
 * Workflow Adapter — standardises how workflows are triggered.
 * Wraps workflowService to provide a consistent interface for the RuntimeEngine.
 */

import { workflowService } from "../services/workflow.service";
import { logger } from "../lib/logger";
import type { AgentRecord, AdapterResult } from "./types";

export async function runWorkflowAdapter(
  agent: AgentRecord,
  userInput: string,
): Promise<AdapterResult> {
  const start = Date.now();
  
  // A 'Workflow Agent' has a workflowId in its config
  const workflowId = agent.config.workflowId as string;
  if (!workflowId) {
    return {
      success:   false,
      output:    "",
      error:     "Agent configuration missing workflowId",
      latencyMs: Date.now() - start,
    };
  }

  logger.info("Workflow adapter executing", { agentId: agent.id, workflowId });

  try {
    // For now, workflows are fire-and-forget or sync
    // If sync, we wait for the result
    const run = await workflowService.execute(agent.userId, {
      workflowId,
      triggerPayload: { userInput },
    });

    return {
      success:   true,
      output:    `Workflow ${workflowId} triggered. Run ID: ${run.id}`,
      latencyMs: Date.now() - start,
      metadata:  {
        workflowId,
        runId: run.id,
        status: run.status,
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err.message : "Workflow execution failed";
    logger.error("Workflow adapter error", { agentId: agent.id, workflowId, error });
    return { success: false, output: "", error, latencyMs: Date.now() - start };
  }
}
