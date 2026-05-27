/**
 * src/services/mcpLoader.ts
 *
 * MCP (Model Context Protocol) server loader.
 *
 * Connects to external MCP servers defined in an agent's config and
 * dynamically adds their tools into the registry for that execution run.
 *
 * Currently a structured stub — real MCP client implementation wires in here.
 *
 * Architecture:
 *   Agent config → McpServerConfig[] → loadMcpTools() → additional RegisteredTool[]
 *   These are merged with the base REGISTRY for that specific run only
 *   (they are NOT globally registered, to prevent cross-agent leakage).
 */

import { logger } from "../lib/logger";
import type { McpServerConfig, RegisteredTool, ToolResult } from "./tools/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface McpLoadResult {
  server:     McpServerConfig;
  tools:      RegisteredTool[];
  error?:     string;
  connected:  boolean;
}

// ---------------------------------------------------------------------------
// loadMcpTools
// ---------------------------------------------------------------------------

/**
 * loadMcpTools — given an array of McpServerConfig objects, attempt to
 * connect to each enabled server and fetch its tool definitions.
 *
 * Returns per-server results including any tools that were loaded.
 * Failures are non-fatal — the run continues with the tools that did load.
 *
 * @param servers  List of MCP server configs from the agent row
 * @param context  Caller context for logging
 */
export async function loadMcpTools(
  servers: McpServerConfig[],
  context?: { agentId?: string; userId?: string },
): Promise<McpLoadResult[]> {
  const results: McpLoadResult[] = [];

  for (const server of servers) {
    if (!server.enabled) {
      logger.debug("MCP server skipped (disabled)", { id: server.id, name: server.name });
      continue;
    }

    logger.info("Loading MCP server tools", {
      id:        server.id,
      name:      server.name,
      transport: server.transport,
      agentId:   context?.agentId,
    });

    try {
      const tools = await connectAndFetchTools(server);
      results.push({ server, tools, connected: true });
      logger.info("MCP server loaded", { id: server.id, toolCount: tools.length });
    } catch (err) {
      const error = err instanceof Error ? err.message : "Unknown MCP error";
      logger.warn("MCP server failed to connect", { id: server.id, error });
      results.push({ server, tools: [], error, connected: false });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// connectAndFetchTools — transport-specific connection logic
// ---------------------------------------------------------------------------

async function connectAndFetchTools(server: McpServerConfig): Promise<RegisteredTool[]> {
  switch (server.transport) {
    case "stdio":
      return connectStdio(server);
    case "http":
    case "sse":
      return connectHttp(server);
    default:
      throw new Error(`Unknown MCP transport: ${String(server.transport)}`);
  }
}

/**
 * connectStdio — spawns an MCP server process and communicates via stdin/stdout.
 *
 * Real implementation:
 *   const { Client } = require("@modelcontextprotocol/sdk/client");
 *   const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio");
 *   const transport = new StdioClientTransport({ command: server.command, env: server.env });
 *   const client = new Client({ name: "omip-agent", version: "1.0.0" }, { capabilities: {} });
 *   await client.connect(transport);
 *   const { tools } = await client.listTools();
 *   return tools.map(adaptMcpTool);
 */
async function connectStdio(server: McpServerConfig): Promise<RegisteredTool[]> {
  if (!server.command) {
    throw new Error(`stdio MCP server "${server.name}" has no command.`);
  }

  logger.debug("MCP stdio connect (mock)", { command: server.command });

  // Stub: return one placeholder tool per MCP server
  return [buildMcpPlaceholderTool(server)];
}

/**
 * connectHttp — connects to an MCP server via HTTP/SSE transport.
 *
 * Real implementation:
 *   const { Client } = require("@modelcontextprotocol/sdk/client");
 *   const { SSEClientTransport } = require("@modelcontextprotocol/sdk/client/sse");
 *   const transport = new SSEClientTransport(new URL(server.url!));
 *   const client = new Client({ name: "omip-agent", version: "1.0.0" }, { capabilities: {} });
 *   await client.connect(transport);
 *   const { tools } = await client.listTools();
 *   return tools.map(adaptMcpTool);
 */
async function connectHttp(server: McpServerConfig): Promise<RegisteredTool[]> {
  if (!server.url) {
    throw new Error(`HTTP/SSE MCP server "${server.name}" has no URL.`);
  }

  logger.debug("MCP HTTP/SSE connect (mock)", { url: server.url });

  return [buildMcpPlaceholderTool(server)];
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/**
 * buildMcpPlaceholderTool — creates a shim RegisteredTool for an MCP server.
 * In production this is replaced by adaptMcpTool() which maps the real
 * MCP tool definition from the server's listTools() response.
 */
function buildMcpPlaceholderTool(server: McpServerConfig): RegisteredTool {
  const name = `mcp_${server.id}`;
  return {
    name,
    category:       "mcp",
    description:    `MCP tool from server: ${server.name}`,
    version:        "1.0.0",
    requiresConfig: false,
    definition: {
      name,
      description: `Proxy tool for MCP server "${server.name}" (${server.transport})`,
      parameters: {
        type: "object",
        properties: {
          input: { type: "string", description: "Input to send to the MCP server" },
        },
        required: ["input"],
      },
    },
    handler: async (args): Promise<ToolResult> => {
      // In production: forward call to the connected MCP client
      return {
        success: true,
        data: {
          server:   server.name,
          input:    args["input"],
          response: `Mock MCP response from ${server.name}. Real implementation forwards to the MCP server.`,
          mock:     true,
        },
        meta: { source: `mcp:${server.id}`, latencyMs: 50 },
      };
    },
  };
}

/**
 * extractMcpTools — given loadMcpTools() results, return a flat list of all
 * successfully loaded tools ready to be merged with the base registry.
 */
export function extractMcpTools(results: McpLoadResult[]): RegisteredTool[] {
  return results.flatMap((r) => (r.connected ? r.tools : []));
}
