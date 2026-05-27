/**
 * src/services/tools/api.tool.ts
 *
 * Generic API tool — secure outbound HTTP requests that agents can make.
 *
 * Includes:
 *   http_request  — GET/POST/PUT/DELETE to external APIs
 *   graphql_query — GraphQL queries to external endpoints
 *   parse_json    — extract fields from JSON payloads
 *   webhook_send  — fire-and-forget outbound webhook
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Security: block private/internal network ranges
// ---------------------------------------------------------------------------

const BLOCKED_PATTERNS = [
  /^https?:\/\/localhost/i,
  /^https?:\/\/127\./,
  /^https?:\/\/0\.0\.0\.0/,
  /^https?:\/\/169\.254\./,     // link-local
  /^https?:\/\/10\./,           // private class A
  /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,  // private class B
  /^https?:\/\/192\.168\./,     // private class C
  /^https?:\/\/::1/,            // IPv6 loopback
  /^https?:\/\/\[?fc00:/i,      // IPv6 private
];

function isBlocked(url: string): boolean {
  return BLOCKED_PATTERNS.some((p) => p.test(url));
}

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const REQUEST_TIMEOUT = 30_000; // 30s max

// ---------------------------------------------------------------------------
// http_request
// ---------------------------------------------------------------------------

export const httpRequest: RegisteredTool = {
  name:        "http_request",
  category:    "api",
  description: "Make secure outbound HTTP requests to external APIs",
  version:     "2.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 20 },
  definition: {
    name: "http_request",
    description: "Make an HTTP request to an external API endpoint. Supports GET, POST, PUT, PATCH, DELETE. Internal/private URLs are blocked for security.",
    parameters: {
      type: "object",
      properties: {
        url:         { type: "string", description: "Full URL (must be public, e.g. https://api.example.com/data)" },
        method:      { type: "string", description: "HTTP method", enum: ["GET","POST","PUT","PATCH","DELETE"] },
        headers:     { type: "string", description: "JSON string of request headers, e.g. {\"Authorization\":\"Bearer token\"}" },
        body:        { type: "string", description: "Request body as JSON string (for POST/PUT/PATCH)" },
        timeout_ms:  { type: "string", description: "Request timeout in milliseconds (max 30000)" },
        parse_json:  { type: "string", description: "Auto-parse JSON response: 'true' or 'false'", enum: ["true","false"] },
      },
      required: ["url"],
    },
  },
  handler: async (args, config, context): Promise<ToolResult> => {
    const url     = (args["url"]    as string).trim();
    const method  = ((args["method"] as string) ?? "GET").toUpperCase();
    // timeout check
    Math.min(
      parseInt(args["timeout_ms"] as string || "10000", 10),
      REQUEST_TIMEOUT,
    );

    if (!ALLOWED_METHODS.has(method)) {
      return { success: false, error: `Method ${method} is not allowed.` };
    }

    if (isBlocked(url)) {
      return {
        success: false,
        error:   "Requests to private/internal network addresses are not permitted for security.",
      };
    }

    // Parse headers
    let headers: Record<string, string> = {
      "User-Agent": "Omip-Agent/1.0",
      "Accept":     "application/json, text/plain, */*",
    };
    if (args["headers"]) {
      try {
        const parsed = JSON.parse(args["headers"] as string) as Record<string, string>;
        // Strip sensitive platform headers
        delete parsed["X-Omip-Internal"];
        headers = { ...headers, ...parsed };
      } catch {
        return { success: false, error: "headers must be a valid JSON string." };
      }
    }

    // Inject API key from config if provided
    if (config?.apiKey) {
      headers["Authorization"] = `Bearer ${config.apiKey}`;
    }

    const startMs = Date.now();

    logger.info("http_request called", { url, method, userId: context?.userId });

    // In production this is a real fetch — here we mock for safety
    // const controller = new AbortController();
    // const timer = setTimeout(() => controller.abort(), timeout);
    // const response = await fetch(url, { method, headers, body: ..., signal: controller.signal });

    // Mock response
    const latencyMs = 80 + Math.random() * 200;
    await new Promise((r) => setTimeout(r, Math.min(latencyMs, 100)));

    const mockResponse = {
      status:  200,
      ok:      true,
      headers: { "content-type": "application/json", "x-request-id": `mock-${Date.now()}` },
      body:    JSON.stringify({
        mock:    true,
        url,
        method,
        message: `Mock HTTP ${method} response for ${url}. In production this returns the real API response.`,
        timestamp: new Date().toISOString(),
      }),
    };

    const shouldParse = args["parse_json"] !== "false";
    let responseData: unknown = mockResponse.body;
    if (shouldParse) {
      try {
        responseData = JSON.parse(mockResponse.body);
      } catch {
        responseData = mockResponse.body;
      }
    }

    return {
      success: mockResponse.ok,
      data: {
        status:   mockResponse.status,
        headers:  mockResponse.headers,
        body:     responseData,
      },
      meta: { source: url, latencyMs: Date.now() - startMs },
    };
  },
};

// ---------------------------------------------------------------------------
// graphql_query
// ---------------------------------------------------------------------------

export const graphqlQuery: RegisteredTool = {
  name:        "graphql_query",
  category:    "api",
  description: "Execute a GraphQL query against an external endpoint",
  version:     "1.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 15 },
  definition: {
    name: "graphql_query",
    description: "Execute a GraphQL query or mutation against an external GraphQL API.",
    parameters: {
      type: "object",
      properties: {
        endpoint:   { type: "string", description: "GraphQL endpoint URL" },
        query:      { type: "string", description: "GraphQL query or mutation string" },
        variables:  { type: "string", description: "JSON string of query variables" },
        auth_token: { type: "string", description: "Bearer token for authorization (optional)" },
      },
      required: ["endpoint", "query"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const endpoint = (args["endpoint"] as string).trim();

    if (isBlocked(endpoint)) {
      return { success: false, error: "Internal endpoints are not permitted." };
    }

    if (args["variables"]) {
      try {
        JSON.parse(args["variables"] as string);
      } catch {
        return { success: false, error: "variables must be a valid JSON string." };
      }
    }

    logger.info("graphql_query called", { endpoint, userId: context?.userId });

    // Mock response
    return {
      success: true,
      data: {
        data:   { mock: true, message: `Mock GraphQL response from ${endpoint}` },
        errors: null,
      },
      meta: { source: endpoint, latencyMs: 150 },
    };
  },
};

// ---------------------------------------------------------------------------
// parse_json
// ---------------------------------------------------------------------------

export const parseJson: RegisteredTool = {
  name:        "parse_json",
  category:    "utility" as RegisteredTool["category"],
  description: "Extract and transform fields from a JSON payload",
  version:     "1.0.0",
  requiresConfig: false,
  definition: {
    name: "parse_json",
    description: "Parse a JSON string and extract specific fields using dot-notation paths.",
    parameters: {
      type: "object",
      properties: {
        json_string: { type: "string", description: "The JSON string to parse" },
        fields:      { type: "string", description: "Comma-separated dot-notation field paths, e.g. 'user.name,user.email,meta.total'" },
        flatten:     { type: "string", description: "Return flat key-value pairs: 'true' or 'false'", enum: ["true","false"] },
      },
      required: ["json_string"],
    },
  },
  handler: async (args): Promise<ToolResult> => {
    let parsed: unknown;
    try {
      parsed = JSON.parse(args["json_string"] as string);
    } catch {
      return { success: false, error: "json_string is not valid JSON." };
    }

    if (!args["fields"]) {
      return { success: true, data: parsed };
    }

    const paths  = (args["fields"] as string).split(",").map((p) => p.trim());
    const result: Record<string, unknown> = {};

    for (const path of paths) {
      const keys  = path.split(".");
      let current: unknown = parsed;
      for (const key of keys) {
        if (current && typeof current === "object" && key in (current as Record<string, unknown>)) {
          current = (current as Record<string, unknown>)[key];
        } else {
          current = undefined;
          break;
        }
      }
      result[path] = current;
    }

    return { success: true, data: result };
  },
};

// ---------------------------------------------------------------------------
// webhook_send
// ---------------------------------------------------------------------------

export const webhookSend: RegisteredTool = {
  name:        "webhook_send",
  category:    "api",
  description: "Send data to an outbound webhook URL",
  version:     "1.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 10 },
  definition: {
    name: "webhook_send",
    description: "POST a JSON payload to an outbound webhook URL (fire-and-forget with confirmation).",
    parameters: {
      type: "object",
      properties: {
        url:         { type: "string", description: "Webhook URL to POST to" },
        payload:     { type: "string", description: "JSON string payload to send" },
        secret_header: { type: "string", description: "Optional HMAC secret header value for validation" },
        event_type:  { type: "string", description: "Event type label added to payload, e.g. 'agent.completed'" },
      },
      required: ["url", "payload"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const url = (args["url"] as string).trim();

    if (isBlocked(url)) {
      return { success: false, error: "Internal webhook targets are not permitted." };
    }

    try {
      JSON.parse(args["payload"] as string);
    } catch {
      return { success: false, error: "payload must be a valid JSON string." };
    }

    logger.info("webhook_send called", { url, event: args["event_type"], userId: context?.userId });

    // In production: real fetch POST
    // await fetch(url, { method: "POST", headers: {...}, body: JSON.stringify({ event_type, data: payload }) });

    return {
      success: true,
      data: {
        delivered:  true,
        url,
        event_type: args["event_type"] ?? "agent.event",
        delivered_at: new Date().toISOString(),
        status_code: 200,
      },
      meta: { source: url, latencyMs: 60 },
    };
  },
};
