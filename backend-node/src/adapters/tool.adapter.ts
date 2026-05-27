/**
 * src/adapters/tool.adapter.ts
 *
 * Tool Adapter — standardises how individual tools are executed outside of
 * the core agent loop (e.g. for testing, debugging, or direct API usage).
 */

import { executeTool } from "../services/toolRegistry";
import { logger } from "../lib/logger";
import { ServiceResult } from "./services.types";
import type { ToolConfig, ToolContext } from "../services/tools/types";

export interface ToolExecutionPayload {
  toolName: string;
  args:     Record<string, any>;
  config?:  ToolConfig;
  context?: ToolContext;
}

export const toolAdapter = {
  providerName: "INTERNAL_TOOLSET",

  async execute(payload: ToolExecutionPayload): Promise<ServiceResult> {
    const start = Date.now();
    try {
      const result = await executeTool(
        payload.toolName,
        payload.args,
        payload.config,
        payload.context
      );

      return {
        success:   true,
        data:      result,
        latencyMs: Date.now() - start,
        provider:  this.providerName,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Tool execution failed";
      logger.error("Tool adapter error", { error, tool: payload.toolName });
      return {
        success:   false,
        error,
        latencyMs: Date.now() - start,
        provider:  this.providerName,
      };
    }
  }
};
