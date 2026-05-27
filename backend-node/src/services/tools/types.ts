/**
 * src/services/tools/types.ts
 *
 * Core types for the tool / MCP system.
 * Every tool in the registry satisfies these interfaces.
 */

import { LLMToolDefinition } from "../../lib/llm/types";

// ---------------------------------------------------------------------------
// Tool categories
// ---------------------------------------------------------------------------

export type ToolCategory =
  | "search"
  | "email"
  | "code"
  | "file"
  | "api"
  | "data"
  | "messaging"
  | "calendar"
  | "crm"
  | "utility"
  | "mcp";

// ---------------------------------------------------------------------------
// Handler contract
// ---------------------------------------------------------------------------

export type ToolHandler = (
  args: Record<string, unknown>,
  config?: ToolConfig,
  context?: ToolContext,
) => Promise<ToolResult>;

// Config injected from the agent's tool config object
export interface ToolConfig {
  apiKey?:      string;
  endpoint?:    string;
  timeout?:     number;
  maxResults?:  number;
  [key: string]: unknown;
}

// Runtime context — userId, agentId, etc. for logging / rate-limiting
export interface ToolContext {
  userId?:   string;
  agentId?:  string;
  runId?:    string;
}

// Structured result — tools return this; executor stringifies for LLM
export interface ToolResult {
  success: boolean;
  data?:   unknown;
  error?:  string;
  meta?: {
    source?:    string;
    latencyMs?: number;
    cached?:    boolean;
  };
}

// ---------------------------------------------------------------------------
// Registered tool full descriptor
// ---------------------------------------------------------------------------

export interface RegisteredTool {
  name:        string;
  category:    ToolCategory;
  description: string;           // human-readable
  definition:  LLMToolDefinition; // sent to LLM
  handler:     ToolHandler;
  // Metadata for UI / marketplace display
  requiresConfig: boolean;       // needs API key / endpoint in config
  configSchema?: Record<string, { type: string; description: string; required: boolean }>;
  rateLimit?: { maxPerMinute: number };
  version:     string;
  integrationSlug?: string; // e.g. "google-drive"
}

// ---------------------------------------------------------------------------
// MCP server descriptor (Model Context Protocol)
// ---------------------------------------------------------------------------

export interface McpServerConfig {
  id:          string;
  name:        string;
  description: string;
  transport:   "stdio" | "http" | "sse";
  command?:    string;   // stdio transport
  url?:        string;   // http / sse transport
  env?:        Record<string, string>;
  enabled:     boolean;
}
