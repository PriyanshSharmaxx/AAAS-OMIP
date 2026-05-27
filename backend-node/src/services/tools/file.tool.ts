/**
 * src/services/tools/file.tool.ts
 *
 * File/document tool — read, write, and convert files within the agent's
 * sandboxed workspace. Agents cannot access the host filesystem; all
 * operations work within a per-agent virtual file store.
 *
 * Supports:
 *   file_read    — read a file from agent workspace
 *   file_write   — write/overwrite a file in agent workspace
 *   file_convert — convert between formats (csv→json, txt→md, etc.)
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

const ALLOWED_EXTENSIONS = new Set([
  ".txt", ".md", ".json", ".csv", ".yaml", ".yml", ".xml", ".html",
  ".log", ".env.example", ".gitignore",
]);

const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024; // 1 MB

function isSafePath(filePath: string): boolean {
  // Block path traversal and absolute paths
  return !filePath.includes("..") && !filePath.startsWith("/") && !filePath.includes("\\");
}

function getAllowedExtension(filePath: string): string | null {
  const ext = "." + filePath.split(".").pop()?.toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext) ? ext : null;
}

// ---------------------------------------------------------------------------
// file_read
// ---------------------------------------------------------------------------

export const fileRead: RegisteredTool = {
  name:        "file_read",
  category:    "file",
  description: "Read a file from the agent's sandboxed workspace",
  version:     "1.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 30 },
  definition: {
    name: "file_read",
    description: "Read the contents of a file from the agent's virtual workspace. Only text-based file types are supported.",
    parameters: {
      type: "object",
      properties: {
        path:       { type: "string", description: "Relative file path within workspace e.g. 'reports/summary.md'" },
        encoding:   { type: "string", description: "Text encoding", enum: ["utf-8", "ascii"], },
        max_chars:  { type: "string", description: "Maximum characters to return (default 50000)" },
      },
      required: ["path"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const filePath = (args["path"] as string).trim();
    const maxChars = Math.min(parseInt(args["max_chars"] as string || "50000", 10), 100_000);

    if (!isSafePath(filePath)) {
      return { success: false, error: "Path traversal is not allowed. Use relative paths within workspace." };
    }

    const ext = getAllowedExtension(filePath);
    if (!ext) {
      return {
        success: false,
        error:   `File type not allowed. Supported: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`,
      };
    }

    logger.info("file_read called", { filePath, userId: context?.userId });

    // In production: read from agent's scoped file store / S3 prefix
    // const content = await fileStore.read(`${context.agentId}/${filePath}`);

    const mockContent = ext === ".json"
      ? JSON.stringify({ mock: true, path: filePath, message: "This is a mock file read." }, null, 2)
      : ext === ".csv"
        ? "id,name,value\n1,Alice,42\n2,Bob,17\n3,Charlie,99"
        : `# Mock File: ${filePath}\n\nThis is mock content for a file read operation.\nIn production this reads from the agent's sandboxed file store.`;

    const truncated = mockContent.length > maxChars;
    const content   = truncated ? mockContent.slice(0, maxChars) : mockContent;

    return {
      success: true,
      data: {
        path:       filePath,
        content,
        size_bytes: content.length,
        truncated,
        encoding:   (args["encoding"] as string) ?? "utf-8",
        mock:       true,
      },
      meta: { source: `file:${filePath}`, latencyMs: 15 },
    };
  },
};

// ---------------------------------------------------------------------------
// file_write
// ---------------------------------------------------------------------------

export const fileWrite: RegisteredTool = {
  name:        "file_write",
  category:    "file",
  description: "Write or overwrite a file in the agent's sandboxed workspace",
  version:     "1.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 15 },
  definition: {
    name: "file_write",
    description: "Write content to a file in the agent's virtual workspace. Creates the file if it doesn't exist.",
    parameters: {
      type: "object",
      properties: {
        path:    { type: "string", description: "Relative file path e.g. 'output/report.md'" },
        content: { type: "string", description: "Text content to write to the file" },
        mode:    { type: "string", description: "Write mode", enum: ["overwrite", "append"] },
      },
      required: ["path", "content"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const filePath = (args["path"] as string).trim();
    const content  = args["content"] as string;
    const mode     = (args["mode"] as string) ?? "overwrite";

    if (!isSafePath(filePath)) {
      return { success: false, error: "Path traversal is not allowed." };
    }

    const ext = getAllowedExtension(filePath);
    if (!ext) {
      return {
        success: false,
        error:   `File type not allowed. Supported: ${Array.from(ALLOWED_EXTENSIONS).join(", ")}`,
      };
    }

    if (Buffer.byteLength(content, "utf-8") > MAX_FILE_SIZE_BYTES) {
      return { success: false, error: `File size exceeds 1 MB limit.` };
    }

    logger.info("file_write called", { filePath, mode, bytes: content.length, userId: context?.userId });

    // In production: write to agent's scoped file store / S3 prefix
    // await fileStore.write(`${context.agentId}/${filePath}`, content, { mode });

    return {
      success: true,
      data: {
        path:       filePath,
        size_bytes: Buffer.byteLength(content, "utf-8"),
        mode,
        written_at: new Date().toISOString(),
        mock:       true,
      },
      meta: { source: `file:${filePath}`, latencyMs: 20 },
    };
  },
};

// ---------------------------------------------------------------------------
// file_convert
// ---------------------------------------------------------------------------

type ConvertFormat = "json" | "csv" | "markdown" | "text" | "yaml";

function csvToJson(csv: string): unknown {
  const lines   = csv.trim().split("\n");
  const headers = lines[0]?.split(",").map((h) => h.trim()) ?? [];
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    return Object.fromEntries(headers.map((h, i) => [h, values[i]?.trim() ?? ""]));
  });
}

function jsonToCsv(json: unknown): string {
  if (!Array.isArray(json) || json.length === 0) return "";
  const headers = Object.keys(json[0] as Record<string, unknown>);
  const rows    = (json as Record<string, unknown>[]).map((row) =>
    headers.map((h) => String(row[h] ?? "")).join(","),
  );
  return [headers.join(","), ...rows].join("\n");
}

export const fileConvert: RegisteredTool = {
  name:        "file_convert",
  category:    "file",
  description: "Convert file content between formats (CSV↔JSON, text→markdown, etc.)",
  version:     "1.0.0",
  requiresConfig: false,
  rateLimit:   { maxPerMinute: 20 },
  definition: {
    name: "file_convert",
    description: "Convert content from one format to another. Supports CSV↔JSON, text→markdown, JSON→YAML.",
    parameters: {
      type: "object",
      properties: {
        content: { type: "string", description: "The content to convert" },
        from:    { type: "string", description: "Source format", enum: ["json", "csv", "markdown", "text", "yaml"] },
        to:      { type: "string", description: "Target format", enum: ["json", "csv", "markdown", "text", "yaml"] },
      },
      required: ["content", "from", "to"],
    },
  },
  handler: async (args): Promise<ToolResult> => {
    const content = args["content"] as string;
    const from    = args["from"] as ConvertFormat;
    const to      = args["to"]   as ConvertFormat;

    if (from === to) {
      return { success: true, data: { content, from, to, changed: false } };
    }

    let converted: string;

    try {
      if (from === "csv" && to === "json") {
        converted = JSON.stringify(csvToJson(content), null, 2);
      } else if (from === "json" && to === "csv") {
        const parsed = JSON.parse(content) as unknown;
        converted = jsonToCsv(parsed);
      } else if ((from === "text" || from === "markdown") && to === "markdown") {
        // Wrap plain text in a basic markdown code block
        converted = `# Converted Document\n\n\`\`\`\n${content}\n\`\`\``;
      } else if (from === "json" && to === "yaml") {
        // Minimal JSON→YAML: just format nicely (real impl would use js-yaml)
        const parsed = JSON.parse(content) as unknown;
        converted = jsonToYamlSimple(parsed, 0);
      } else {
        // Generic: return as-is with a note
        converted = content;
      }
    } catch (e) {
      return { success: false, error: `Conversion failed: ${(e as Error).message}` };
    }

    return {
      success: true,
      data: {
        content:  converted,
        from,
        to,
        changed:  true,
        size_bytes: Buffer.byteLength(converted, "utf-8"),
      },
      meta: { source: "file_convert", latencyMs: 5 },
    };
  },
};

// Minimal JSON → YAML serialiser (no external dependency)
function jsonToYamlSimple(value: unknown, indent: number): string {
  const pad = "  ".repeat(indent);
  if (value === null)                return "null";
  if (typeof value === "boolean")    return String(value);
  if (typeof value === "number")     return String(value);
  if (typeof value === "string")     return value.includes("\n") ? `|\n${pad}  ${value.replace(/\n/g, `\n${pad}  `)}` : value;
  if (Array.isArray(value)) {
    return value.map((v) => `${pad}- ${jsonToYamlSimple(v, indent + 1)}`).join("\n");
  }
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => {
        const valStr = jsonToYamlSimple(v, indent + 1);
        return typeof v === "object" && v !== null
          ? `${pad}${k}:\n${valStr}`
          : `${pad}${k}: ${valStr}`;
      })
      .join("\n");
  }
  return String(value);
}
