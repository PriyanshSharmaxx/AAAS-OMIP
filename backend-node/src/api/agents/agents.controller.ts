import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import {
  agentsService,
  CreateAgentSchema,
  UpdateAgentSchema,
  AgentQuerySchema,
} from "../../services/agents.service";
import { calculateCost } from "../../services/pricing/cost.service";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { listSupportedFrameworks } from "../../adapters";

// ---------------------------------------------------------------------------
// POST /api/agents
// ---------------------------------------------------------------------------

export async function createAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = CreateAgentSchema.parse(req.body);
    const agent = await agentsService.create(req.user!.sub, input);
    res.status(201).json({ success: true, data: agent });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents  (owned by current user)
// ---------------------------------------------------------------------------

export async function listAgents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = AgentQuerySchema.parse(req.query);
    const result = await agentsService.list(req.user!.sub, query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

import {
  agentRepo, listingRepo, marketplaceService,
  AgentStatus, ListingStatus, PermissionAction, ResourceType,
} from "../../services/marketplace.service";
import { permissionService } from "../../services/permission.service";

import { integrationService } from "../../services/integration.service";
import { getToolByName } from "../../services/toolRegistry";

/**
 * GET /api/agents/:id/validate
 * Performs pre-execution checks (permissions, tools, cost, integrations).
 */
export async function validateAgent(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.sub;

    const agent = await agentRepo.findById(id!);
    if (!agent) throw new AppError("Agent not found", 404);

    // 1. Core Permission check
    const hasPermission = await permissionService.check(userId, ResourceType.AGENT, agent.id, PermissionAction.RUN);
    const isOwner = agent.userId === userId;
    
    // 2. Integration & Tool check
    const agentTools = (agent.tools as any[]) || [];
    const missingConfigs = agentTools.filter(t => t.required && !t.config).map(t => t.name);
    
    const requiredIntegrations: any[] = [];
    const integrationBlockers: string[] = [];

    for (const at of agentTools) {
      if (!at.enabled) continue;
      
      const toolDef = getToolByName(at.name);
      if (toolDef?.integrationSlug) {
        const slug = toolDef.integrationSlug;
        const integration = await integrationService.getConnection(userId, slug);
        const hasGrant = await integrationService.checkAgentPermission(userId, agent.id, slug);
        
        requiredIntegrations.push({
          slug,
          name: slug.charAt(0).toUpperCase() + slug.slice(1),
          connected: !!integration,
          granted: hasGrant
        });

        if (!integration) {
          integrationBlockers.push(`Connection required for ${slug}.`);
        } else if (!hasGrant) {
          integrationBlockers.push(`Agent needs permission to use ${slug}.`);
        }
      }
    }

    res.json({
      success: true,
      data: {
        valid: (isOwner || hasPermission || agent.isPublic) && integrationBlockers.length === 0,
        isOwner,
        hasPermission,
        missingTools: missingConfigs,
        integrations: requiredIntegrations,
        blockers: integrationBlockers,
        agentStatus: agent.status,
        requiresApi: agent.execution_type === "API",
      }
    });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/agents/public  (browse marketplace)
// ---------------------------------------------------------------------------

export async function listPublicAgents(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const query  = AgentQuerySchema.parse(req.query);
    const result = await agentsService.listPublic(query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/explore (discovery data)
// ---------------------------------------------------------------------------

export async function getExploreData(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await marketplaceService.explore(req.user?.sub);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/:id
// ---------------------------------------------------------------------------

export async function getAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await agentsService.getById(req.params["id"]!, req.user?.sub);
    res.json({ success: true, data: agent });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// PATCH /api/agents/:id
// ---------------------------------------------------------------------------

export async function updateAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input   = UpdateAgentSchema.parse(req.body);
    const updated = await agentsService.update(req.params["id"]!, req.user!.sub, input);
    res.json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/agents/:id  (soft-delete / archive)
// ---------------------------------------------------------------------------

export async function deleteAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await agentsService.delete(req.params["id"]!, req.user!.sub);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/agents/:id/hard  (admin: permanent delete)
// ---------------------------------------------------------------------------

export async function hardDeleteAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await agentsService.hardDelete(
      req.params["id"]!,
      req.user!.sub,
      req.user!.role,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/:id/cost
// ---------------------------------------------------------------------------

export async function getAgentCost(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agent = await prisma.agent.findUnique({
      where:  { id: req.params["id"]! },
      select: { tools: true, model: true, pricing: true, name: true },
    });

    if (!agent) {
      res.status(404).json({ success: false, message: "Agent not found." });
      return;
    }

    const breakdown = calculateCost(agent as { tools: unknown; model: string; pricing: string });

    res.json({
      success: true,
      data: {
        credits:  breakdown.total,
        breakdown: {
          base:  breakdown.base,
          tools: breakdown.tools,
          model: breakdown.model,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/agents/:id/add-api   — attach an ApiProduct to agent's tools
// ---------------------------------------------------------------------------

const AddApiSchema = z.object({ apiId: z.string().uuid() });

export async function addApiToAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = AddApiSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }

    const { apiId } = parsed.data;
    const agentId   = req.params["id"]!;
    const userId    = req.user!.sub;

    // Verify agent ownership
    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true, tools: true } });
    if (!agent) return next(new AppError("Agent not found.", 404, "AGENT_NOT_FOUND"));
    if (agent.userId !== userId) return next(new AppError("Access denied.", 403, "FORBIDDEN"));

    // Verify ApiProduct exists and user has a key for it
    const [apiProduct, apiKey] = await Promise.all([
      prisma.apiProduct.findUnique({ where: { id: apiId }, select: { id: true, name: true, isActive: true } }),
      prisma.apiKey.findUnique({ where: { userId_apiId: { userId, apiId } }, select: { id: true, isActive: true } }),
    ]);

    if (!apiProduct || !apiProduct.isActive) {
      return next(new AppError("API not found.", 404, "API_NOT_FOUND"));
    }
    if (!apiKey?.isActive) {
      return next(new AppError("Subscribe to this API before adding it to an agent.", 402, "NOT_SUBSCRIBED"));
    }

    // Update the agent's tools JSON — add entry if not already present
    const tools = Array.isArray(agent.tools) ? (agent.tools as unknown[]) : [];
    const alreadyAttached = tools.some(
      (t) => typeof t === "object" && t !== null && (t as Record<string, unknown>)["apiId"] === apiId,
    );

    if (!alreadyAttached) {
      tools.push({ type: "api", apiId, name: apiProduct.name });
      await prisma.agent.update({ where: { id: agentId }, data: { tools } });
    }

    res.json({ success: true, message: `${apiProduct.name} added to agent.`, data: { tools } });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// DELETE /api/agents/:id/remove-api/:apiId
// ---------------------------------------------------------------------------

export async function removeApiFromAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const agentId = req.params["id"]!;
    const apiId   = req.params["apiId"]!;
    const userId  = req.user!.sub;

    const agent = await prisma.agent.findUnique({ where: { id: agentId }, select: { userId: true, tools: true } });
    if (!agent) return next(new AppError("Agent not found.", 404, "AGENT_NOT_FOUND"));
    if (agent.userId !== userId) return next(new AppError("Access denied.", 403, "FORBIDDEN"));

    const tools = (Array.isArray(agent.tools) ? (agent.tools as unknown[]) : []).filter(
      (t) => !(typeof t === "object" && t !== null && (t as Record<string, unknown>)["apiId"] === apiId),
    );

    await prisma.agent.update({ where: { id: agentId }, data: { tools } });
    res.json({ success: true, message: "API removed from agent.", data: { tools } });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/agents/frameworks  — list all registered adapter frameworks
// ---------------------------------------------------------------------------

export async function listFrameworks(
  _req: Request,
  res: Response,
): Promise<void> {
  res.json({ success: true, data: listSupportedFrameworks() });
}

// GET /api/agents/:id/runs  (execution history)
// ---------------------------------------------------------------------------

export async function getAgentRuns(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit  = Math.min(parseInt(req.query["limit"] as string || "20"), 100);
    const runs   = await agentsService.getExecutionHistory(
      req.params["id"]!,
      req.user!.sub,
      limit,
    );
    res.json({ success: true, data: runs });
  } catch (err) {
    next(err);
  }
}
