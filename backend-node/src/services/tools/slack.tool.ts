/**
 * src/services/tools/slack.tool.ts
 *
 * Slack tool — send messages, read channels, manage reactions.
 *
 * In real deployment: swap handler bodies for Slack Web API calls
 * using the OAuth bot_token stored in ToolConfig.
 *
 * Supports:
 *   slack_send_message   — post a message to a channel or DM
 *   slack_read_channel   — fetch recent messages from a channel
 *   slack_react          — add an emoji reaction to a message
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// slack_send_message
// ---------------------------------------------------------------------------

export const slackSendMessage: RegisteredTool = {
  name:        "slack_send_message",
  category:    "messaging",
  description: "Post a message to a Slack channel or direct message",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    botToken:   { type: "string", description: "Slack bot OAuth token (xoxb-...)", required: true },
    workspaceId:{ type: "string", description: "Slack workspace ID", required: false },
  },
  integrationSlug: "slack",
  rateLimit: { maxPerMinute: 20 },
  definition: {
    name: "slack_send_message",
    description: "Post a message to a Slack channel or user DM. Supports rich text blocks and attachments.",
    parameters: {
      type: "object",
      properties: {
        channel:    { type: "string", description: "Channel ID or name (#general) or user ID (U12345) for DM" },
        text:       { type: "string", description: "Plain text fallback message (required for notifications)" },
        blocks:     { type: "string", description: "JSON string of Slack Block Kit blocks for rich formatting" },
        thread_ts:  { type: "string", description: "Timestamp of parent message to reply in thread" },
        username:   { type: "string", description: "Override the bot display name" },
        icon_emoji: { type: "string", description: "Override bot icon with emoji e.g. ':robot_face:'" },
      },
      required: ["channel", "text"],
    },
  },
  handler: async (args, config, context): Promise<ToolResult> => {
    const channel = (args["channel"] as string).trim();
    const text    = args["text"] as string;

    // Validate blocks JSON if provided
    if (args["blocks"]) {
      try {
        JSON.parse(args["blocks"] as string);
      } catch {
        return { success: false, error: "blocks must be a valid JSON string." };
      }
    }

    logger.info("slack_send_message called", {
      channel,
      userId:  context?.userId,
      agentId: context?.agentId,
      mock:    !config?.botToken,
    });

    // In production: call Slack Web API
    // const { WebClient } = require("@slack/web-api");
    // const slackClient = new WebClient(config.botToken);
    // const res = await slackClient.chat.postMessage({ channel, text, blocks, thread_ts });

    const mockTs = `${Date.now() / 1000}`;

    return {
      success: true,
      data: {
        ok:         true,
        channel,
        ts:         mockTs,
        message: {
          type:    "message",
          text,
          bot_id:  "B0123MOCK",
          ts:      mockTs,
          thread_ts: args["thread_ts"] ?? undefined,
        },
      },
      meta: { source: "slack_mock", latencyMs: 90 },
    };
  },
};

// ---------------------------------------------------------------------------
// slack_read_channel
// ---------------------------------------------------------------------------

export const slackReadChannel: RegisteredTool = {
  name:        "slack_read_channel",
  category:    "messaging",
  description: "Fetch recent messages from a Slack channel",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    botToken: { type: "string", description: "Slack bot OAuth token", required: true },
  },
  integrationSlug: "slack",
  rateLimit: { maxPerMinute: 30 },
  definition: {
    name: "slack_read_channel",
    description: "Retrieve recent messages from a Slack channel. The bot must be a member of the channel.",
    parameters: {
      type: "object",
      properties: {
        channel:     { type: "string", description: "Channel ID or name to read" },
        limit:       { type: "string", description: "Number of messages to return (1-50)" },
        oldest:      { type: "string", description: "Unix timestamp — only messages after this" },
        search_term: { type: "string", description: "Filter messages containing this text" },
      },
      required: ["channel"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const channel   = (args["channel"] as string).trim();
    const limit     = Math.min(parseInt(args["limit"] as string || "10", 10), 50);
    const searchTerm = args["search_term"] as string | undefined;

    logger.info("slack_read_channel called", { channel, limit, userId: context?.userId });

    // Mock realistic Slack message data
    const mockMessages = Array.from({ length: Math.min(limit, 5) }, (_, i) => ({
      type:   "message",
      user:   `U${String(i * 12345).padStart(8, "0")}`,
      text:   searchTerm
        ? `Message mentioning "${searchTerm}" — item ${i + 1} in #${channel}`
        : `Recent message ${i + 1} in #${channel}`,
      ts:     `${(Date.now() - i * 600_000) / 1000}`,
      reply_count: i === 0 ? 3 : 0,
      reactions:   i === 0 ? [{ name: "thumbsup", count: 2 }] : [],
    }));

    return {
      success: true,
      data: {
        channel,
        messages:    mockMessages,
        total_found: mockMessages.length,
        has_more:    false,
      },
      meta: { source: "slack_mock", latencyMs: 110, cached: false },
    };
  },
};

// ---------------------------------------------------------------------------
// slack_react
// ---------------------------------------------------------------------------

export const slackReact: RegisteredTool = {
  name:        "slack_react",
  category:    "messaging",
  description: "Add or remove an emoji reaction on a Slack message",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    botToken: { type: "string", description: "Slack bot OAuth token", required: true },
  },
  integrationSlug: "slack",
  rateLimit: { maxPerMinute: 30 },
  definition: {
    name: "slack_react",
    description: "Add or remove an emoji reaction to a specific Slack message.",
    parameters: {
      type: "object",
      properties: {
        channel:  { type: "string", description: "Channel ID where the message lives" },
        ts:       { type: "string", description: "Timestamp of the message to react to" },
        emoji:    { type: "string", description: "Emoji name without colons e.g. 'thumbsup', 'white_check_mark'" },
        action:   { type: "string", description: "add or remove", enum: ["add", "remove"] },
      },
      required: ["channel", "ts", "emoji"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    logger.info("slack_react called", {
      channel: args["channel"],
      emoji:   args["emoji"],
      action:  args["action"] ?? "add",
      userId:  context?.userId,
    });

    return {
      success: true,
      data: {
        ok:      true,
        channel: args["channel"],
        ts:      args["ts"],
        emoji:   args["emoji"],
        action:  args["action"] ?? "add",
      },
      meta: { source: "slack_mock", latencyMs: 55 },
    };
  },
};
