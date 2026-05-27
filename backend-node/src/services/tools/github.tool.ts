/**
 * src/services/tools/github.tool.ts
 *
 * GitHub tool — read repos, open issues/PRs, post comments.
 *
 * In real deployment: swap handler bodies for GitHub REST API calls
 * using the personal_access_token stored in ToolConfig.
 *
 * Supports:
 *   github_get_repo    — get repository metadata
 *   github_list_issues — list open issues/PRs
 *   github_create_issue— create a new issue
 *   github_comment     — post a comment on an issue or PR
 */

import { RegisteredTool, ToolResult } from "./types";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// github_get_repo
// ---------------------------------------------------------------------------

export const githubGetRepo: RegisteredTool = {
  name:        "github_get_repo",
  category:    "code",
  description: "Get repository metadata from GitHub",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "GitHub personal access token (ghp_...)", required: true },
  },
  integrationSlug: "github",
  rateLimit: { maxPerMinute: 30 },
  definition: {
    name: "github_get_repo",
    description: "Retrieve metadata for a GitHub repository including stars, forks, open issues count, and topics.",
    parameters: {
      type: "object",
      properties: {
        owner: { type: "string", description: "Repository owner (username or org)" },
        repo:  { type: "string", description: "Repository name" },
      },
      required: ["owner", "repo"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const owner = args["owner"] as string;
    const repo  = args["repo"]  as string;

    logger.info("github_get_repo called", { owner, repo, userId: context?.userId });

    // In production: call GitHub REST API
    // const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
    //   headers: { Authorization: `token ${config.accessToken}`, "User-Agent": "Omip-Agent/1.0" }
    // });
    // const data = await res.json();

    return {
      success: true,
      data: {
        full_name:       `${owner}/${repo}`,
        description:     `Mock description for ${owner}/${repo}`,
        html_url:        `https://github.com/${owner}/${repo}`,
        stargazers_count: 1_234,
        forks_count:      567,
        open_issues_count: 42,
        language:         "TypeScript",
        topics:           ["ai", "agents", "automation"],
        default_branch:   "main",
        visibility:       "public",
        updated_at:       new Date().toISOString(),
      },
      meta: { source: `github:${owner}/${repo}`, latencyMs: 180 },
    };
  },
};

// ---------------------------------------------------------------------------
// github_list_issues
// ---------------------------------------------------------------------------

export const githubListIssues: RegisteredTool = {
  name:        "github_list_issues",
  category:    "code",
  description: "List issues or pull requests from a GitHub repository",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "GitHub personal access token", required: true },
  },
  integrationSlug: "github",
  rateLimit: { maxPerMinute: 20 },
  definition: {
    name: "github_list_issues",
    description: "List open issues or pull requests from a GitHub repository with optional filters.",
    parameters: {
      type: "object",
      properties: {
        owner:  { type: "string", description: "Repository owner" },
        repo:   { type: "string", description: "Repository name" },
        state:  { type: "string", description: "Filter by state", enum: ["open", "closed", "all"] },
        type:   { type: "string", description: "Filter type", enum: ["issues", "pulls", "all"] },
        labels: { type: "string", description: "Comma-separated label names to filter by" },
        limit:  { type: "string", description: "Max results to return (1-30)" },
      },
      required: ["owner", "repo"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const owner = args["owner"] as string;
    const repo  = args["repo"]  as string;
    const state = (args["state"] as string) ?? "open";
    const limit = Math.min(parseInt(args["limit"] as string || "10", 10), 30);

    logger.info("github_list_issues called", { owner, repo, state, userId: context?.userId });

    const mockIssues = Array.from({ length: Math.min(limit, 4) }, (_, i) => ({
      number:     100 + i,
      title:      `Mock issue ${i + 1}: ${i === 0 ? "Bug in agent executor" : i === 1 ? "Feature request: add webhook tool" : i === 2 ? "Improve error messages" : "Update dependencies"}`,
      state,
      body:       `This is mock issue body ${i + 1} for ${owner}/${repo}.`,
      html_url:   `https://github.com/${owner}/${repo}/issues/${100 + i}`,
      user:       { login: `contributor_${i}` },
      labels:     i === 0 ? [{ name: "bug" }] : i === 1 ? [{ name: "enhancement" }] : [],
      comments:   i * 2,
      created_at: new Date(Date.now() - i * 86_400_000).toISOString(),
    }));

    return {
      success: true,
      data: {
        owner,
        repo,
        state,
        total_found: mockIssues.length,
        issues:      mockIssues,
      },
      meta: { source: `github:${owner}/${repo}`, latencyMs: 200 },
    };
  },
};

// ---------------------------------------------------------------------------
// github_create_issue
// ---------------------------------------------------------------------------

export const githubCreateIssue: RegisteredTool = {
  name:        "github_create_issue",
  category:    "code",
  description: "Create a new issue in a GitHub repository",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "GitHub personal access token", required: true },
  },
  integrationSlug: "github",
  rateLimit: { maxPerMinute: 5 },
  definition: {
    name: "github_create_issue",
    description: "Create a new GitHub issue with title, body, labels, and optional assignees.",
    parameters: {
      type: "object",
      properties: {
        owner:     { type: "string", description: "Repository owner" },
        repo:      { type: "string", description: "Repository name" },
        title:     { type: "string", description: "Issue title" },
        body:      { type: "string", description: "Issue body (Markdown supported)" },
        labels:    { type: "string", description: "Comma-separated label names" },
        assignees: { type: "string", description: "Comma-separated GitHub usernames to assign" },
      },
      required: ["owner", "repo", "title"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const owner = args["owner"] as string;
    const repo  = args["repo"]  as string;
    const title = args["title"] as string;

    logger.info("github_create_issue called", { owner, repo, title, userId: context?.userId });

    const issueNumber = Math.floor(Math.random() * 900) + 100;

    return {
      success: true,
      data: {
        number:   issueNumber,
        title,
        body:     args["body"] ?? "",
        html_url: `https://github.com/${owner}/${repo}/issues/${issueNumber}`,
        state:    "open",
        labels:   args["labels"]
          ? (args["labels"] as string).split(",").map((l) => ({ name: l.trim() }))
          : [],
        assignees: args["assignees"]
          ? (args["assignees"] as string).split(",").map((a) => ({ login: a.trim() }))
          : [],
        created_at: new Date().toISOString(),
      },
      meta: { source: `github:${owner}/${repo}`, latencyMs: 210 },
    };
  },
};

// ---------------------------------------------------------------------------
// github_comment
// ---------------------------------------------------------------------------

export const githubComment: RegisteredTool = {
  name:        "github_comment",
  category:    "code",
  description: "Post a comment on a GitHub issue or pull request",
  version:     "1.0.0",
  requiresConfig: true,
  configSchema: {
    accessToken: { type: "string", description: "GitHub personal access token", required: true },
  },
  integrationSlug: "github",
  rateLimit: { maxPerMinute: 10 },
  definition: {
    name: "github_comment",
    description: "Post a comment on an existing GitHub issue or pull request.",
    parameters: {
      type: "object",
      properties: {
        owner:  { type: "string", description: "Repository owner" },
        repo:   { type: "string", description: "Repository name" },
        number: { type: "string", description: "Issue or PR number" },
        body:   { type: "string", description: "Comment body (Markdown supported)" },
      },
      required: ["owner", "repo", "number", "body"],
    },
  },
  handler: async (args, _config, context): Promise<ToolResult> => {
    const owner  = args["owner"]  as string;
    const repo   = args["repo"]   as string;
    const number = args["number"] as string;

    logger.info("github_comment called", { owner, repo, number, userId: context?.userId });

    const commentId = Math.floor(Math.random() * 9_000_000) + 1_000_000;

    return {
      success: true,
      data: {
        id:         commentId,
        html_url:   `https://github.com/${owner}/${repo}/issues/${number}#issuecomment-${commentId}`,
        body:       args["body"],
        created_at: new Date().toISOString(),
      },
      meta: { source: `github:${owner}/${repo}#${number}`, latencyMs: 160 },
    };
  },
};
