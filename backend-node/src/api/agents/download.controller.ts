/**
 * src/api/agents/download.controller.ts
 *
 * Secure, monetised agent download system.
 *
 * Routes:
 *   GET /api/agents/:id/download/cli    — CLI bundle (agent.json + README)
 *   GET /api/agents/:id/download/docker — Docker bundle (Dockerfile + agent.json + run.sh)
 *
 * License tiers:
 *   free  → full download (prompt, config, tools included)
 *   paid  → thin client only (no prompt/logic exposed; execution via backend API)
 *
 * Subscription check:
 *   Paid agents require an active Subscription row for the agent's Listing.
 *   Unauthenticated or unsubscribed users receive HTTP 403.
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { logger } from "../../lib/logger";
import { createZip } from "../../lib/zip";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/**
 * Resolve whether the requesting user may download the agent, and which
 * tier (full | restricted) they are entitled to.
 */
async function resolveDownloadAccess(
  agentId: string,
  agentPricing: string,
  agentUserId: string,
  requestingUserId: string,
): Promise<{ allowed: boolean; tier: "full" | "restricted"; reason?: string }> {
  // Agent owners always get full access
  if (agentUserId === requestingUserId) {
    return { allowed: true, tier: "full" };
  }

  // Free agents → full download for everyone
  if (agentPricing === "free") {
    return { allowed: true, tier: "full" };
  }

  // Paid agents → require active subscription to the agent's listing
  const listing = await prisma.listing.findUnique({
    where: { agentId },
    select: { id: true },
  });

  if (!listing) {
    // Paid agent but no listing exists yet → restricted thin-client only
    return { allowed: true, tier: "restricted" };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { listingId_userId: { listingId: listing.id, userId: requestingUserId } },
    select: { isActive: true },
  });

  if (!subscription?.isActive) {
    return {
      allowed: false,
      tier: "restricted",
      reason: "An active subscription is required to download this agent.",
    };
  }

  return { allowed: true, tier: "restricted" }; // subscribers get thin-client
}

// ---------------------------------------------------------------------------
// ZIP content builders
// ---------------------------------------------------------------------------

/** Full download — only for free agents or agent owners */
function buildFullCliPackage(agent: {
  id: string;
  name: string;
  description: string;
  category: string;
  prompt: string;
  model: string;
  config: unknown;
  tools: unknown;
  version: string;
}): Buffer {
  const agentJson = JSON.stringify(
    {
      agent_id: agent.id,
      name: agent.name,
      description: agent.description,
      category: agent.category,
      platform: "aas",
      version: agent.version,
      model: agent.model,
      prompt: agent.prompt,
      config: agent.config,
      tools: agent.tools,
      requires_auth: false,
      download_tier: "full",
    },
    null,
    2,
  );

  const readme = `# ${agent.name} — AaaS Agent

## Quick Start

\`\`\`bash
npx aas-agent run agent.json
\`\`\`

## Description

${agent.description}

## Requirements

- Node.js 18+ or Docker
- AaaS CLI: \`npm install -g aas-agent\`

## Configuration

Edit \`agent.json\` to customise the model, temperature, and tools before running.

## Support

https://aas.dev/docs
`;

  return createZip([
    { name: "agent.json", data: agentJson },
    { name: "README.md", data: readme },
  ]);
}

/** Thin client — for paid agents (no prompt/logic exposed) */
function buildThinCliPackage(agent: {
  id: string;
  name: string;
  description: string;
  version: string;
}): Buffer {
  const agentJson = JSON.stringify(
    {
      agent_id: agent.id,
      name: agent.name,
      platform: "aas",
      version: agent.version,
      requires_auth: true,
      download_tier: "restricted",
    },
    null,
    2,
  );

  const readme = `# ${agent.name} — AaaS Agent (Subscription)

## Quick Start

\`\`\`bash
npx aas-agent run agent.json --api-key YOUR_API_KEY
\`\`\`

Your API key is available in your AaaS dashboard under **My Subscriptions**.

## How It Works

This is a thin-client package. All execution happens securely on the AaaS platform.
No agent logic or prompts are stored locally.

## Requirements

- Node.js 18+
- AaaS CLI: \`npm install -g aas-agent\`
- Active AaaS subscription for this agent

## Support

https://aas.dev/docs
`;

  return createZip([
    { name: "agent.json", data: agentJson },
    { name: "README.md", data: readme },
  ]);
}

/** Docker package — full or thin depending on tier */
function buildDockerPackage(
  agent: {
    id: string;
    name: string;
    description: string;
    version: string;
    model: string;
  },
  tier: "full" | "restricted",
  os: string,
): Buffer {
  const agentJson = JSON.stringify(
    {
      agent_id: agent.id,
      name: agent.name,
      platform: "aas",
      version: agent.version,
      requires_auth: tier === "restricted",
      download_tier: tier,
    },
    null,
    2,
  );

  const apiKeyLine =
    tier === "restricted"
      ? 'ENV AAS_API_KEY=""\n# Set via: docker run -e AAS_API_KEY=your_key ...\n'
      : "";

  const runCommand =
    tier === "restricted"
      ? 'CMD ["npx", "aas-agent", "run", "agent.json", "--api-key", "$AAS_API_KEY"]'
      : 'CMD ["npx", "aas-agent", "run", "agent.json"]';

  const dockerfile = `FROM node:20-alpine

WORKDIR /agent

# Install AaaS CLI
RUN npm install -g aas-agent

# Copy agent bundle
COPY agent.json .

${apiKeyLine}
# Run agent
${runCommand}
`;

  const apiKeyFlag = tier === "restricted" ? " -e AAS_API_KEY=your_api_key" : "";
  const runSh = `#!/bin/sh
# ${agent.name} — Docker runner
# Generated by AaaS platform

IMAGE_NAME="${slugify(agent.name)}-agent"

echo "Building Docker image..."
docker build -t "$IMAGE_NAME" .

echo "Running agent..."
docker run --rm${apiKeyFlag} "$IMAGE_NAME"
`;

  const readme = `# ${agent.name} — Docker Package

## Requirements

- Docker 20+

## Build & Run

\`\`\`bash
chmod +x run.sh
./run.sh
\`\`\`

Or manually:

\`\`\`bash
docker build -t ${slugify(agent.name)}-agent .
docker run --rm${apiKeyFlag} ${slugify(agent.name)}-agent
\`\`\`
${
  tier === "restricted"
    ? `
## API Key

Set your subscription API key as an environment variable:

\`\`\`bash
docker run --rm -e AAS_API_KEY=your_api_key ${slugify(agent.name)}-agent
\`\`\`

Your API key is available in the AaaS dashboard under **My Subscriptions**.
`
    : ""
}
## Support

https://aas.dev/docs
`;

  return createZip([
    { name: "Dockerfile", data: dockerfile },
    { name: "agent.json", data: agentJson },
    { name: "run.sh", data: runSh },
    { name: "README.md", data: readme },
  ]);
}

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

/**
 * GET /api/agents/:id/download/cli
 * Returns a ZIP containing agent.json + README.md
 */
export async function downloadCli(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agentId = req.params["id"]!;
    const userId = req.user!.sub;
    const os = (req.query["os"] as string | undefined) ?? "unknown";

    // ── Fetch agent ────────────────────────────────────────────────────────
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new AppError("Agent not found", 404);

    // ── License check ──────────────────────────────────────────────────────
    const access = await resolveDownloadAccess(
      agentId,
      agent.pricing,
      agent.userId,
      userId,
    );

    if (!access.allowed) {
      res.status(403).json({
        success: false,
        message: access.reason ?? "Subscription required.",
        requiresSubscription: true,
      });
      return;
    }

    // ── Log download ───────────────────────────────────────────────────────
    await prisma.downloadLog.create({
      data: { agentId, userId, format: "cli", os, tier: access.tier },
    });

    logger.info("agent.download.cli", {
      agentId,
      userId,
      tier: access.tier,
      os,
    });

    // ── Generate ZIP ───────────────────────────────────────────────────────
    const zipBuffer =
      access.tier === "full"
        ? buildFullCliPackage(agent as Parameters<typeof buildFullCliPackage>[0])
        : buildThinCliPackage(agent);

    const filename = `${slugify(agent.name)}-cli.zip`;
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.set("Content-Length", String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/:id/download/docker
 * Returns a ZIP containing Dockerfile + agent.json + run.sh + README.md
 */
export async function downloadDocker(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agentId = req.params["id"]!;
    const userId = req.user!.sub;
    const os = (req.query["os"] as string | undefined) ?? "unknown";

    // ── Fetch agent ────────────────────────────────────────────────────────
    const agent = await prisma.agent.findUnique({ where: { id: agentId } });
    if (!agent) throw new AppError("Agent not found", 404);

    // ── License check ──────────────────────────────────────────────────────
    const access = await resolveDownloadAccess(
      agentId,
      agent.pricing,
      agent.userId,
      userId,
    );

    if (!access.allowed) {
      res.status(403).json({
        success: false,
        message: access.reason ?? "Subscription required.",
        requiresSubscription: true,
      });
      return;
    }

    // ── Log download ───────────────────────────────────────────────────────
    await prisma.downloadLog.create({
      data: { agentId, userId, format: "docker", os, tier: access.tier },
    });

    logger.info("agent.download.docker", {
      agentId,
      userId,
      tier: access.tier,
      os,
    });

    // ── Generate ZIP ───────────────────────────────────────────────────────
    const zipBuffer = buildDockerPackage(agent, access.tier, os);

    const filename = `${slugify(agent.name)}-docker.zip`;
    res.set("Content-Type", "application/zip");
    res.set("Content-Disposition", `attachment; filename="${filename}"`);
    res.set("Content-Length", String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/agents/:id/download/status
 * Returns whether the current user can download this agent and which tier.
 * Used by the frontend to pre-check before showing download buttons.
 */
export async function downloadStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agentId = req.params["id"]!;
    const userId = req.user!.sub;

    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { id: true, pricing: true, userId: true, name: true },
    });
    if (!agent) throw new AppError("Agent not found", 404);

    const access = await resolveDownloadAccess(
      agentId,
      agent.pricing,
      agent.userId,
      userId,
    );

    res.json({
      success: true,
      data: {
        allowed: access.allowed,
        tier: access.tier,
        pricing: agent.pricing,
        requiresSubscription: !access.allowed,
      },
    });
  } catch (err) {
    next(err);
  }
}
