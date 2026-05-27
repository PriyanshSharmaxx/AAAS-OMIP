/**
 * src/services/tools/index.ts
 *
 * Barrel export — every RegisteredTool object from every tool file.
 * Import from here to keep toolRegistry.ts clean.
 */

// ── API tools ────────────────────────────────────────────────────────────────
export { httpRequest, graphqlQuery, parseJson, webhookSend } from "./api.tool";

// ── Search tools ─────────────────────────────────────────────────────────────
export { webSearch, citeSource } from "./search.tool";

// ── Email tools ──────────────────────────────────────────────────────────────
export { gmailSend, gmailRead, gmailReply } from "./gmail.tool";

// ── Messaging tools ──────────────────────────────────────────────────────────
export { slackSendMessage, slackReadChannel, slackReact } from "./slack.tool";

// ── Code / VCS tools ─────────────────────────────────────────────────────────
export { githubGetRepo, githubListIssues, githubCreateIssue, githubComment } from "./github.tool";

// ── Data tools ───────────────────────────────────────────────────────────────
export { dbQuery, dbAggregate } from "./database.tool";

// ── File tools ───────────────────────────────────────────────────────────────
export { fileRead, fileWrite, fileConvert } from "./file.tool";

// ── Utility tools ────────────────────────────────────────────────────────────
export { calculator, textTransform, jsonFormat } from "./utility.tool";

// ── Types (re-exported for convenience) ─────────────────────────────────────
export type { RegisteredTool, ToolResult, ToolConfig, ToolContext, ToolCategory, McpServerConfig } from "./types";
