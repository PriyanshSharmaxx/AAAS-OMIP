/**
 * src/services/tools/utility.tool.ts
 *
 * General-purpose utility tools that need no external API access.
 *
 * Supports:
 *   calculator    — evaluate mathematical expressions (safe eval)
 *   text_transform— format/transform strings
 *   json_format   — pretty-print or minify JSON
 */

import { RegisteredTool, ToolResult } from "./types";

// ---------------------------------------------------------------------------
// calculator
// ---------------------------------------------------------------------------

// Character whitelist — only allow safe math characters
const SAFE_MATH_CHARS = /^[0-9+\-*/().,% \n\t]+$/;

export const calculator: RegisteredTool = {
  name:        "calculator",
  category:    "utility",
  description: "Evaluate mathematical expressions safely",
  version:     "2.0.0",
  requiresConfig: false,
  definition: {
    name: "calculator",
    description: "Evaluate a mathematical expression. Supports basic arithmetic (+, -, *, /), parentheses, and percentages.",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Mathematical expression e.g. '(150 * 0.15) + 22.50'" },
        precision:  { type: "string", description: "Decimal places in result (0-15, default 4)" },
      },
      required: ["expression"],
    },
  },
  handler: async (args): Promise<ToolResult> => {
    const raw       = args["expression"] as string;
    const precision = Math.min(parseInt(args["precision"] as string || "4", 10), 15);

    if (!SAFE_MATH_CHARS.test(raw)) {
      return { success: false, error: "Expression contains disallowed characters. Only numbers and +−*/() are permitted." };
    }

    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${raw})`)() as number;
      if (typeof result !== "number" || !isFinite(result)) {
        return { success: false, error: "Expression did not produce a finite number." };
      }
      return {
        success: true,
        data: {
          expression: raw,
          result:     parseFloat(result.toFixed(precision)),
          precision,
        },
        meta: { source: "calculator", latencyMs: 0 },
      };
    } catch (e) {
      return { success: false, error: `Invalid expression: ${(e as Error).message}` };
    }
  },
};

// ---------------------------------------------------------------------------
// text_transform
// ---------------------------------------------------------------------------

type TransformOp =
  | "uppercase" | "lowercase" | "title_case" | "snake_case"
  | "camel_case" | "trim" | "reverse" | "word_count" | "char_count";

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function toSnakeCase(s: string): string {
  return s
    .replace(/([A-Z])/g, "_$1")
    .replace(/[\s\-]+/g, "_")
    .toLowerCase()
    .replace(/^_/, "");
}

function toCamelCase(s: string): string {
  return s
    .replace(/[\s_\-]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^(.)/, (c: string) => c.toLowerCase());
}

export const textTransform: RegisteredTool = {
  name:        "text_transform",
  category:    "utility",
  description: "Transform and format text strings",
  version:     "1.0.0",
  requiresConfig: false,
  definition: {
    name: "text_transform",
    description: "Apply a transformation to a text string: change case, count words, reverse, or convert naming conventions.",
    parameters: {
      type: "object",
      properties: {
        text:      { type: "string", description: "The input text to transform" },
        operation: {
          type: "string",
          description: "Transformation to apply",
          enum: ["uppercase", "lowercase", "title_case", "snake_case", "camel_case", "trim", "reverse", "word_count", "char_count"],
        },
      },
      required: ["text", "operation"],
    },
  },
  handler: async (args): Promise<ToolResult> => {
    const text = args["text"] as string;
    const op   = args["operation"] as TransformOp;

    let result: string | number;

    switch (op) {
      case "uppercase":   result = text.toUpperCase(); break;
      case "lowercase":   result = text.toLowerCase(); break;
      case "title_case":  result = titleCase(text); break;
      case "snake_case":  result = toSnakeCase(text); break;
      case "camel_case":  result = toCamelCase(text); break;
      case "trim":        result = text.trim(); break;
      case "reverse":     result = text.split("").reverse().join(""); break;
      case "word_count":  result = text.trim().split(/\s+/).filter(Boolean).length; break;
      case "char_count":  result = text.length; break;
      default:            return { success: false, error: `Unknown operation: ${op}` };
    }

    return {
      success: true,
      data: { text, operation: op, result },
      meta: { source: "text_transform", latencyMs: 0 },
    };
  },
};

// ---------------------------------------------------------------------------
// json_format
// ---------------------------------------------------------------------------

export const jsonFormat: RegisteredTool = {
  name:        "json_format",
  category:    "utility",
  description: "Pretty-print or minify a JSON string",
  version:     "1.0.0",
  requiresConfig: false,
  definition: {
    name: "json_format",
    description: "Format a JSON string: pretty-print with indentation or minify to a single line.",
    parameters: {
      type: "object",
      properties: {
        json_string: { type: "string", description: "The JSON string to format" },
        mode:        { type: "string", description: "Format mode", enum: ["pretty", "minify"] },
        indent:      { type: "string", description: "Indent spaces for pretty mode (default 2)" },
      },
      required: ["json_string"],
    },
  },
  handler: async (args): Promise<ToolResult> => {
    const mode   = (args["mode"] as string) ?? "pretty";
    const indent = Math.min(parseInt(args["indent"] as string || "2", 10), 8);

    let parsed: unknown;
    try {
      parsed = JSON.parse(args["json_string"] as string);
    } catch {
      return { success: false, error: "json_string is not valid JSON." };
    }

    const formatted = mode === "minify"
      ? JSON.stringify(parsed)
      : JSON.stringify(parsed, null, indent);

    return {
      success: true,
      data: {
        formatted,
        mode,
        original_bytes: (args["json_string"] as string).length,
        formatted_bytes: formatted.length,
      },
      meta: { source: "json_format", latencyMs: 0 },
    };
  },
};
