/**
 * src/services/tools/gmail.tool.ts
 *
 * Gmail tool — production-ready mock with realistic response shapes.
 *
 * In real deployment: swap handler body for Google Gmail API calls
 * using the OAuth2 access_token stored in ToolConfig.
 *
 * Supports:
 *   gmail_send       — send an email
 *   gmail_read       — read/search inbox messages
 *   gmail_reply      — reply to a thread
 *   gmail_label      — apply/remove labels
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMessageId(): string {
  return `msg_${Math.random().toString(36).slice(2, 18)}`;
}

function mockThreadId(): string {
  return `thread_${Math.random().toString(36).slice(2, 14)}`;
}

function sanitiseEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ---------------------------------------------------------------------------
// gmail_send
// ---------------------------------------------------------------------------

export const gmailSend: RegisteredTool = {
  name:        "gmail_send",
  category:    "email",
  description: "Send an email via Gmail",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "OAuth2 access token for the Gmail account", required: true },
    fromEmail:   { type: "string", description: "Sender email address", required: false },
  },
  integrationSlug: "google",
  rateLimit: { maxPerMinute: 10 },
  definition: {
    name: "gmail_send",
    description: "Send an email to one or more recipients via Gmail.",
    parameters: {
      type: "object",
      properties: {
        to:          { type: "string",  description: "Recipient email address(es) — comma-separated for multiple" },
        subject:     { type: "string",  description: "Email subject line" },
        body:        { type: "string",  description: "Email body — plain text or HTML" },
        cc:          { type: "string",  description: "CC recipients (optional)" },
        bcc:         { type: "string",  description: "BCC recipients (optional)" },
        is_html:     { type: "string",  description: "Set to 'true' if body is HTML", enum: ["true", "false"] },
        reply_to_thread_id: { type: "string", description: "Thread ID if replying to an existing thread" },
      },
      required: ["to", "subject", "body"],
    },
  },
  handler: async (args, config, context): Promise<ToolResult> => {
    const to      = args["to"]      as string;
    const subject = args["subject"] as string;
    // const body = args["body"] as string;
    const cc      = args["cc"]      as string | undefined;

    // Validate recipient
    const recipients = to.split(",").map((e) => e.trim());
    for (const r of recipients) {
      if (!sanitiseEmail(r)) {
        return { success: false, error: `Invalid email address: "${r}"` };
      }
    }

    logger.info("gmail_send called", {
      to,
      subject,
      userId: context?.userId,
      agentId: context?.agentId,
      mock: !config?.accessToken,
    });

    // In production: call Google Gmail API
    // const gmail = google.gmail({ version: "v1", auth: oauth2Client });
    // await gmail.users.messages.send({ userId: "me", requestBody: { raw: encodedMessage } });

    const messageId = mockMessageId();
    const threadId  = (args["reply_to_thread_id"] as string) ?? mockThreadId();
    const sentAt    = new Date().toISOString();

    return {
      success: true,
      data: {
        message_id: messageId,
        thread_id:  threadId,
        to:         recipients,
        cc:         cc ? cc.split(",").map((e) => e.trim()) : [],
        subject,
        sent_at:    sentAt,
        labels:     ["SENT"],
        status:     "delivered",
      },
      meta: { source: "gmail_mock", latencyMs: 120 },
    };
  },
};

// ---------------------------------------------------------------------------
// gmail_read
// ---------------------------------------------------------------------------

export const gmailRead: RegisteredTool = {
  name:        "gmail_read",
  category:    "email",
  description: "Search and read emails from Gmail inbox",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "OAuth2 access token", required: true },
  },
  integrationSlug: "google",
  rateLimit: { maxPerMinute: 30 },
  definition: {
    name: "gmail_read",
    description: "Search and read emails from a Gmail inbox. Returns matching messages with sender, subject, date, and body snippet.",
    parameters: {
      type: "object",
      properties: {
        query:       { type: "string", description: "Gmail search query e.g. 'from:boss@company.com subject:report'" },
        max_results: { type: "string", description: "Maximum number of emails to return (1-20)" },
        label:       { type: "string", description: "Filter by label: INBOX, SENT, SPAM, UNREAD, STARRED" },
        include_body:{ type: "string", description: "Include full email body: 'true' or 'false'", enum: ["true","false"] },
      },
      required: ["query"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const query      = args["query"]       as string;
    const maxResults = Math.min(parseInt(args["max_results"] as string || "5", 10), 20);
    const includeBody = args["include_body"] === "true";

    logger.info("gmail_read called", { query, maxResults, userId: context?.userId });

    // Mock realistic email data
    const mockEmails = Array.from({ length: Math.min(maxResults, 3) }, (_, i) => ({
      id:        mockMessageId(),
      thread_id: mockThreadId(),
      from:      i === 0 ? "ceo@company.com" : i === 1 ? "noreply@github.com" : "team@slack.com",
      to:        "user@omip.io",
      subject:   i === 0
        ? `Re: ${query} — Action Required`
        : i === 1
          ? `[GitHub] PR review requested: ${query}`
          : `Slack: New message matching "${query}"`,
      date:      new Date(Date.now() - i * 3_600_000).toISOString(),
      snippet:   `This is a mock email snippet related to your query "${query}". In production this would be real Gmail content.`,
      labels:    ["INBOX", ...(i === 0 ? ["IMPORTANT"] : [])],
      is_read:   i > 0,
      ...(includeBody ? {
        body: `Full email body for message ${i + 1} matching query: "${query}".\n\nThis would contain the actual email content in production.`,
      } : {}),
    }));

    return {
      success: true,
      data: {
        query,
        total_found: mockEmails.length,
        messages:    mockEmails,
      },
      meta: { source: "gmail_mock", latencyMs: 200, cached: false },
    };
  },
};

// ---------------------------------------------------------------------------
// gmail_reply
// ---------------------------------------------------------------------------

export const gmailReply: RegisteredTool = {
  name:        "gmail_reply",
  category:    "email",
  description: "Reply to an existing Gmail thread",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "OAuth2 access token", required: true },
  },
  integrationSlug: "google",
  rateLimit: { maxPerMinute: 10 },
  definition: {
    name: "gmail_reply",
    description: "Reply to an existing Gmail email thread.",
    parameters: {
      type: "object",
      properties: {
        thread_id:  { type: "string", description: "The Gmail thread ID to reply to" },
        message_id: { type: "string", description: "The specific message ID to reply to" },
        body:       { type: "string", description: "Reply body text" },
        reply_all:  { type: "string", description: "Reply to all recipients: 'true' or 'false'", enum: ["true","false"] },
      },
      required: ["thread_id", "body"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    logger.info("gmail_reply called", { thread_id: args["thread_id"], userId: context?.userId });
    return {
      success: true,
      data: {
        message_id: mockMessageId(),
        thread_id:  args["thread_id"],
        status:     "sent",
        reply_all:  args["reply_all"] === "true",
        sent_at:    new Date().toISOString(),
      },
      meta: { source: "gmail_mock", latencyMs: 110 },
    };
  },
};
