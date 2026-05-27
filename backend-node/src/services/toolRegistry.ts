/**
 * src/services/toolRegistry.ts
 *
 * Central tool registry — registers every tool from src/services/tools/*
 * and exposes the three functions used by agentExecutor:
 *
 *   resolveTools(names)         → LLMToolDefinition[]  (sent to LLM)
 *   executeTool(name, args, ...) → unknown              (runs the handler)
 *   listTools()                  → metadata[]           (for API/UI display)
 *
 * Tool config (API keys, tokens) is looked up per-tool from the agent's
 * config.toolConfig record and injected into the handler at call time.
 */

import { LLMToolDefinition } from "../lib/llm/types";
import { logger } from "../lib/logger";
import { AppError } from "../middleware/errorHandler";
import { integrationService } from "./integration.service";
import { oauthService } from "./oauth.service";

import type { RegisteredTool, ToolConfig, ToolContext } from "./tools/types";

// Import all tools from the barrel
import {
  // API
  httpRequest, graphqlQuery, parseJson, webhookSend,
  // Search
  webSearch, citeSource,
  // Email
  gmailSend, gmailRead, gmailReply,
  // Messaging
  slackSendMessage, slackReadChannel, slackReact,
  // Code / VCS
  githubGetRepo, githubListIssues, githubCreateIssue, githubComment,
  // Data
  dbQuery, dbAggregate,
  // File
  fileRead, fileWrite, fileConvert,
  // Utility
  calculator, textTransform, jsonFormat,
} from "./tools";

// ---------------------------------------------------------------------------
// Registry map
// ---------------------------------------------------------------------------

const REGISTRY = new Map<string, RegisteredTool>();

function register(tool: RegisteredTool): void {
  REGISTRY.set(tool.name, tool);
  logger.debug(`Tool registered: ${tool.name} [${tool.category}] v${tool.version}`);
}

// ---------------------------------------------------------------------------
// Register all tools
// ---------------------------------------------------------------------------

const ALL_TOOLS: RegisteredTool[] = [
  // API
  httpRequest, graphqlQuery, parseJson, webhookSend,
  // Search
  webSearch, citeSource,
  // Email
  gmailSend, gmailRead, gmailReply,
  // Messaging
  slackSendMessage, slackReadChannel, slackReact,
  // Code / VCS
  githubGetRepo, githubListIssues, githubCreateIssue, githubComment,
  // Data
  dbQuery, dbAggregate,
  // File
  fileRead, fileWrite, fileConvert,
  // Utility
  calculator, textTransform, jsonFormat,
];

for (const tool of ALL_TOOLS) {
  register(tool);
}

logger.info(`Tool registry initialised — ${REGISTRY.size} tools loaded`);

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * resolveTools — returns LLMToolDefinition[] for the requested tool names.
 * Unknown names are silently skipped (agents can only use tools they declared).
 */
export function resolveTools(names: string[]): LLMToolDefinition[] {
  return names
    .map((name) => REGISTRY.get(name)?.definition)
    .filter((d): d is LLMToolDefinition => d !== undefined);
}

/**
 * executeTool — runs a registered tool handler.
 * Throws AppError(404) if the tool is not registered.
 *
 * @param name    Tool name as declared by the LLM (must match registry key)
 * @param args    Key-value arguments from the LLM's tool_call
 * @param config  Per-tool config (API keys, tokens) from agent.config.toolConfig
 * @param context Runtime context (userId, agentId, runId) for logging / auditing
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  config?: ToolConfig,
  context?: ToolContext,
): Promise<unknown> {
  const tool = REGISTRY.get(name);
  if (!tool) {
    throw new AppError(`Tool "${name}" is not registered.`, 404, "TOOL_NOT_FOUND");
  }

  // ── OAuth & Permission Enforcements ──────────────────────────────────────
  if (tool.integrationSlug && context?.userId && context?.agentId) {
    // 1. Enforce per-agent permission
    const isAllowed = await integrationService.checkAgentPermission(
      context.userId, context.agentId, tool.integrationSlug
    );
    
    if (!isAllowed) {
      throw new AppError(
        `Agent does not have permission to use the "${tool.integrationSlug}" integration.`,
        403, "INTEGRATION_ACCESS_DENIED"
      );
    }

    // 2. Fetch and inject valid token
    const connection = await integrationService.getConnection(context.userId, tool.integrationSlug);
    if (!connection) {
      throw new AppError(`No active connection found for "${tool.integrationSlug}".`, 401, "CONNECTION_REQUIRED");
    }

    let token = connection.accessToken;

    // 3. Auto-refresh if expired
    if (connection.expiresAt && connection.expiresAt < new Date()) {
      logger.info("Auto-refreshing OAuth token", { connectionId: connection.id });
      const refreshed = await oauthService.refreshToken(connection.id);
      token = refreshed.accessToken;
    }

    // Inject into config so the handler can use it
    config = { ...config, accessToken: token };
  }

  logger.debug("Executing tool", { name, category: tool.category, userId: context?.userId });

  try {
    const result = await tool.handler(args, config, context);
    return result;
  } catch (err) {
    logger.error("Tool execution error", { name, err: (err as Error).message });
    throw err;
  }
}

/**
 * listTools — returns metadata for all registered tools (for API / UI display).
 * Sensitive fields like config schemas are included so the UI can render
 * the correct form fields.
 */
export function listTools(category?: string): Array<{
  name:           string;
  category:       RegisteredTool["category"];
  description:    string;
  version:        string;
  requiresConfig: boolean;
  configSchema?:  RegisteredTool["configSchema"];
  rateLimit?:     RegisteredTool["rateLimit"];
  parameters:     LLMToolDefinition["parameters"];
}> {
  return Array.from(REGISTRY.values())
    .filter((t) => !category || t.category === category)
    .map((t) => ({
      name:           t.name,
      category:       t.category,
      description:    t.description,
      version:        t.version,
      requiresConfig: t.requiresConfig,
      configSchema:   t.configSchema,
      rateLimit:      t.rateLimit,
      parameters:     t.definition.parameters,
    }));
}

/**
 * getToolByName — returns the full RegisteredTool or undefined.
 */
export function getToolByName(name: string): RegisteredTool | undefined {
  return REGISTRY.get(name);
}

export { REGISTRY };

// Re-export types so callers don't need to go two levels deep
export type { RegisteredTool, ToolConfig, ToolContext } from "./tools/types";
