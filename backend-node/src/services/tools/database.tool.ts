/**
 * src/services/tools/database.tool.ts
 *
 * Database tool — agents can read from agent-accessible data sources.
 *
 * SECURITY: Agents NEVER get direct SQL write access. All write
 * operations go through predefined parameterised stored procedures.
 * This tool is intentionally read-heavy / query-only by default.
 *
 * Supports:
 *   db_query      — run a read-only SELECT against a configured data source
 *   db_aggregate  — compute count/sum/avg/min/max over a dataset
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Security helpers
// ---------------------------------------------------------------------------

// Block any obviously destructive SQL keywords
const DESTRUCTIVE_PATTERN = /\b(INSERT|UPDATE|DELETE|DROP|TRUNCATE|ALTER|CREATE|GRANT|REVOKE|EXEC|EXECUTE|xp_|sp_)\b/i;

function isSafeQuery(sql: string): boolean {
  return !DESTRUCTIVE_PATTERN.test(sql);
}

// ---------------------------------------------------------------------------
// db_query
// ---------------------------------------------------------------------------

export const dbQuery: RegisteredTool = {
  name:        "db_query",
  category:    "data",
  description: "Execute a read-only SQL query against a configured data source",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    connectionString: { type: "string", description: "Database connection string (postgres://...)", required: true },
    maxRows:          { type: "string", description: "Maximum rows returned (default 100, max 500)", required: false },
  },
  rateLimit: { maxPerMinute: 10 },
  definition: {
    name: "db_query",
    description: "Execute a read-only SQL SELECT query against a configured database. Write operations (INSERT/UPDATE/DELETE) are blocked for security.",
    parameters: {
      type: "object",
      properties: {
        sql:          { type: "string",  description: "SELECT SQL query to execute" },
        parameters:   { type: "string",  description: "JSON array of parameterised values e.g. '[\"value1\", 42]'" },
        max_rows:     { type: "string",  description: "Maximum rows to return (1-500)" },
        format:       { type: "string",  description: "Output format", enum: ["json", "csv", "table"] },
      },
      required: ["sql"],
    },
  },
  handler: async (args, config, context): Promise<ToolResult> => {
    const sql     = (args["sql"] as string).trim();
    const maxRows = Math.min(parseInt(args["max_rows"] as string || "100", 10), 500);
    const format  = (args["format"] as string) ?? "json";

    // Security: block write operations
    if (!isSafeQuery(sql)) {
      return {
        success: false,
        error: "Only SELECT queries are permitted. INSERT, UPDATE, DELETE and DDL statements are blocked.",
      };
    }

    // Parse optional parameters
    let params: unknown[] = [];
    if (args["parameters"]) {
      try {
        params = JSON.parse(args["parameters"] as string) as unknown[];
        if (!Array.isArray(params)) throw new Error("not an array");
      } catch {
        return { success: false, error: "parameters must be a JSON array e.g. '[\"value1\", 42]'" };
      }
    }

    logger.info("db_query called", {
      sql:     sql.slice(0, 100), // truncate for logs
      maxRows,
      userId:  context?.userId,
      mock:    !config?.connectionString,
    });

    // In production: use a real DB driver with parameterised queries
    // const { rows } = await pool.query(sql, params);
    // return { success: true, data: { rows: rows.slice(0, maxRows), total: rows.length } };

    // Mock response reflecting the query structure
    const mockRows = [
      { id: 1, name: "Alice",   value: 42,   created_at: new Date().toISOString() },
      { id: 2, name: "Bob",     value: 17,   created_at: new Date().toISOString() },
      { id: 3, name: "Charlie", value: 99,   created_at: new Date().toISOString() },
    ].slice(0, maxRows);

    const result: Record<string, unknown> = {
      rows:       mockRows,
      row_count:  mockRows.length,
      query:      sql,
      parameters: params,
      format,
      mock:       true,
    };

    if (format === "csv") {
      const headers = Object.keys(mockRows[0] || {}).join(",");
      const csvRows = mockRows.map((r) => Object.values(r).join(",")).join("\n");
      result["csv"] = `${headers}\n${csvRows}`;
    }

    return {
      success: true,
      data:    result,
      meta:    { source: "db_mock", latencyMs: 45 },
    };
  },
};

// ---------------------------------------------------------------------------
// db_aggregate
// ---------------------------------------------------------------------------

export const dbAggregate: RegisteredTool = {
  name:        "db_aggregate",
  category:    "data",
  description: "Compute aggregations (count, sum, avg, min, max) over a dataset",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    connectionString: { type: "string", description: "Database connection string", required: true },
  },
  rateLimit: { maxPerMinute: 15 },
  definition: {
    name: "db_aggregate",
    description: "Compute aggregate statistics (count, sum, average, min, max) over a database table or view.",
    parameters: {
      type: "object",
      properties: {
        table:       { type: "string", description: "Table or view name to aggregate over" },
        column:      { type: "string", description: "Column to aggregate" },
        operation:   { type: "string", description: "Aggregate function", enum: ["count", "sum", "avg", "min", "max"] },
        filter:      { type: "string", description: "Optional WHERE clause condition (SQL)" },
        group_by:    { type: "string", description: "Optional column to GROUP BY" },
      },
      required: ["table", "column", "operation"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const table     = args["table"]     as string;
    const column    = args["column"]    as string;
    const operation = args["operation"] as string;

    // Security: validate table and column names — only alphanumeric + underscores
    if (!/^[a-zA-Z0-9_]+$/.test(table) || !/^[a-zA-Z0-9_]+$/.test(column)) {
      return { success: false, error: "table and column names must be alphanumeric (no special characters)." };
    }

    logger.info("db_aggregate called", { table, column, operation, userId: context?.userId });

    // Mock aggregate result
    const mockValues: Record<string, number> = {
      count: 1_247,
      sum:   98_432.50,
      avg:   78.93,
      min:   0.01,
      max:   9_999.99,
    };

    return {
      success: true,
      data: {
        table,
        column,
        operation,
        result:   mockValues[operation] ?? 0,
        filter:   args["filter"] ?? null,
        group_by: args["group_by"] ?? null,
        mock:     true,
      },
      meta: { source: "db_mock", latencyMs: 30 },
    };
  },
};
