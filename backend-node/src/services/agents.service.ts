import { z } from "zod";
import { agentRepo, executionRepo, userRepo, AgentStatus, auditLogRepo } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { frameworkToType } from "../utils/agentMapper";
import { billingService } from "./billing.service";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const ToolSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  enabled:     z.boolean().default(true),
  config:      z.record(z.unknown()).default({}),
});

const AgentConfigSchema = z.object({
  temperature:    z.number().min(0).max(2).default(0.7),
  maxTokens:      z.number().int().min(1).max(128_000).default(4096),
  topP:           z.number().min(0).max(1).default(1),
  presencePenalty:  z.number().min(-2).max(2).default(0),
  frequencyPenalty: z.number().min(-2).max(2).default(0),
  systemPromptSuffix: z.string().max(500).optional(),
}).default({});

export const CreateAgentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(80, "Name must be at most 80 characters")
    .trim(),
  description: z.string().max(500).trim().default(""),
  category: z
    .enum([
      "general", "research", "development", "marketing",
      "data", "automation", "communication", "finance",
    ])
    .default("general"),
  prompt: z
    .string()
    .max(32_000, "System prompt must be at most 32,000 characters")
    .default("You are a helpful AI assistant. Please complete the user's request to the best of your abilities."),
  model: z
    .enum([
      // OpenAI
      "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
      // Anthropic
      "claude-opus-4-6", "claude-sonnet-4-6", "claude-haiku-4-5-20251001",
      // Groq
      "llama3-70b-8192", "llama3-8b-8192",
      "llama-3.1-70b-versatile", "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile", "mixtral-8x7b-32768",
      "gemma2-9b-it", "gemma-7b-it",
    ])
    .default("gpt-4o"),
  // Optional framework tag — auto-derives execution type via frameworkToType()
  framework: z.string().optional(),
  // Explicit execution type override (takes precedence over framework)
  type: z.enum(["llm", "rag", "api", "script", "workflow", "multi-agent"]).optional(),
  config:   AgentConfigSchema,
  tools:    z.array(ToolSchema).max(20).default([]),
  isPublic: z.boolean().default(false),
  tags:     z.array(z.string().max(30)).max(10).default([]),
  iconUrl:  z.string().url().optional(),
  teamId:   z.string().uuid().optional(),
});

export const UpdateAgentSchema = CreateAgentSchema.partial().extend({
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  version: z.string().regex(/^\d+\.\d+\.\d+$/, "Version must follow semver, e.g. 1.2.0").optional(),
});

export const AgentQuerySchema = z.object({
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  category: z.string().optional(),
  search:   z.string().max(100).optional(),
  status:   z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional(),
  isPublic: z.coerce.boolean().optional(),
  sort:     z.enum(["createdAt", "updatedAt", "name", "runsCount"]).default("updatedAt"),
  order:    z.enum(["asc", "desc"]).default("desc"),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;
export type AgentQuery       = z.infer<typeof AgentQuerySchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sanitiseAgent(agent: NonNullable<Awaited<ReturnType<typeof agentRepo.findById>>>) {
  return {
    id:          agent.id,
    name:        agent.name,
    description: agent.description,
    category:    agent.category,
    prompt:      agent.prompt,
    model:       agent.model,
    config:      agent.config,
    tools:       agent.tools,
    isPublic:    agent.isPublic,
    version:     agent.version,
    status:      agent.status,
    tags:        agent.tags,
    iconUrl:     agent.iconUrl,
    runsCount:   agent.runsCount,
    successCount: agent.successCount,
    failureCount: agent.failureCount,
    creator: (agent as { user?: { id: string; username: string; displayName: string | null } }).user ?? null,
    createdAt:   agent.createdAt,
    updatedAt:   agent.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const agentsService = {

  // ── Create agent ─────────────────────────────────────────────────────────
  async create(userId: string, input: CreateAgentInput) {
    if (!input.teamId) {
      await billingService.assertCanCreateAgent(userId);
    }

    // Derive execution type from framework tag, explicit override takes precedence
    const derivedType = input.type
      ?? (input.framework ? frameworkToType(input.framework) : "llm");

    const agent = await agentRepo.create({
      user:        { connect: { id: userId } },
      name:        input.name,
      description: input.description,
      category:    input.category,
      prompt:      input.prompt,
      model:       input.model,
      config:      input.config as object,
      tools:       input.tools as object[],
      isPublic:    input.isPublic,
      tags:        input.tags,
      iconUrl:     input.iconUrl ?? null,
      status:      AgentStatus.DRAFT,
      // Store framework label and resolved execution type
      ...(input.framework ? { framework: input.framework } : {}),
      type: derivedType,
      ...(input.teamId ? { team: { connect: { id: input.teamId } } } : {}),
    });

    await auditLogRepo.create({
      user:   { connect: { id: userId } },
      action: "AGENT_CREATED",
      entity: "Agent",
      entityId: agent.id,
      metadata: { name: agent.name },
    });

    logger.info("Agent created", { agentId: agent.id, userId });
    return agent;
  },

  // ── List agents (owned by user + optional public browse) ─────────────────
  async list(userId: string, query: AgentQuery) {
    const { page, limit, category, search, status, isPublic, sort, order } = query;
    const skip = (page - 1) * limit;

    // Build where clause
    const where: Record<string, unknown> = { userId };
    if (status)   where["status"]   = status as AgentStatus;
    if (category) where["category"] = category;
    if (isPublic !== undefined) where["isPublic"] = isPublic;
    if (search) {
      where["OR"] = [
        { name:        { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { tags:        { has: search.toLowerCase() } },
      ];
    }

    const [agents, total] = await Promise.all([
      agentRepo["findByUser"](userId, status as AgentStatus | undefined).then((_all) => {
        // Post-filter until we add prisma.agent.findMany directly
        return _all;
      }),
      // We'll do the proper paginated query inline for full control
      Promise.resolve(0),
    ]);

    // Direct Prisma query for pagination
    const { prisma } = await import("../lib/prisma");
    const [rows, count] = await Promise.all([
      prisma.agent.findMany({
        where: where as any,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      prisma.agent.count({
        where: where as any,
      }),
    ]);

    void agents; // unused — using direct query above
    void total;

    return {
      agents: rows,
      pagination: {
        page,
        limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
    };
  },

  // ── Browse public marketplace ─────────────────────────────────────────────
  async listPublic(query: AgentQuery) {
    const { page, limit, category, search, sort, order } = query;
    const skip = (page - 1) * limit;
    const { prisma } = await import("../lib/prisma");

    const where = {
      isPublic: true,
      status:   AgentStatus.ACTIVE,
      ...(category ? { category } : {}),
      ...(search
        ? {
            OR: [
              { name:        { contains: search, mode: "insensitive" as const } },
              { description: { contains: search, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const [rows, count] = await Promise.all([
      prisma.agent.findMany({
        where,
        orderBy: { [sort]: order },
        skip,
        take: limit,
        include: { user: { select: { id: true, username: true, displayName: true } } },
      }),
      prisma.agent.count({ where }),
    ]);

    return {
      agents: rows,
      pagination: {
        page, limit,
        total: count,
        totalPages: Math.ceil(count / limit),
        hasNext: page * limit < count,
        hasPrev: page > 1,
      },
    };
  },

  // ── Get single agent by ID ────────────────────────────────────────────────
  async getById(agentId: string, requesterId?: string) {
    const agent = await agentRepo.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    // Private agents are only accessible by their owner
    if (!agent.isPublic && agent.userId !== requesterId) {
      throw new AppError("You do not have access to this agent.", 403, "FORBIDDEN");
    }

    return sanitiseAgent(agent);
  },

  // ── Update agent ─────────────────────────────────────────────────────────
  async update(agentId: string, userId: string, input: UpdateAgentInput) {
    const agent = await agentRepo.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }
    if (agent.userId !== userId) {
      throw new AppError("You do not own this agent.", 403, "FORBIDDEN");
    }

    const updated = await agentRepo.update(agentId, {
      ...(input.name        !== undefined && { name:        input.name        }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.category    !== undefined && { category:    input.category    }),
      ...(input.prompt      !== undefined && { prompt:      input.prompt      }),
      ...(input.model       !== undefined && { model:       input.model       }),
      ...(input.config      !== undefined && { config:      input.config as object }),
      ...(input.tools       !== undefined && { tools:       input.tools as object[] }),
      ...(input.isPublic    !== undefined && { isPublic:    input.isPublic    }),
      ...(input.tags        !== undefined && { tags:        input.tags        }),
      ...(input.iconUrl     !== undefined && { iconUrl:     input.iconUrl     }),
      ...(input.status      !== undefined && { status:      input.status as AgentStatus }),
      ...(input.version     !== undefined && { version:     input.version     }),
      ...(input.teamId      !== undefined && { teamId:      input.teamId      }),
    });

    await auditLogRepo.create({
      user:   { connect: { id: userId } },
      action: "AGENT_UPDATED",
      entity: "Agent",
      entityId: agentId,
      metadata: { fieldsUpdated: Object.keys(input) },
    });

    logger.info("Agent updated", { agentId, userId });
    return updated;
  },

  // ── Delete agent ──────────────────────────────────────────────────────────
  async delete(agentId: string, userId: string) {
    const agent = await agentRepo.findById(agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }
    if (agent.userId !== userId) {
      throw new AppError("You do not own this agent.", 403, "FORBIDDEN");
    }

    // Soft-delete: archive instead of hard-delete to preserve run history
    await agentRepo.update(agentId, { status: AgentStatus.ARCHIVED });
    
    await auditLogRepo.create({
      user:   { connect: { id: userId } },
      action: "AGENT_ARCHIVED",
      entity: "Agent",
      entityId: agentId,
      metadata: { name: agent.name },
    });

    logger.info("Agent archived (soft-deleted)", { agentId, userId });

    return { id: agentId, archived: true };
  },

  // ── Hard delete (admin only) ──────────────────────────────────────────────
  async hardDelete(agentId: string, userId: string, userRole: string) {
    if (userRole !== "ADMIN") {
      throw new AppError("Only admins can permanently delete agents.", 403, "FORBIDDEN");
    }
    await agentRepo.delete(agentId);
    
    await auditLogRepo.create({
      user:   { connect: { id: userId } },
      action: "AGENT_HARD_DELETED",
      entity: "Agent",
      entityId: agentId,
    });

    logger.info("Agent hard-deleted", { agentId, by: userId });
    return { id: agentId, deleted: true };
  },

  // ── Get execution history for an agent ───────────────────────────────────
  async getExecutionHistory(agentId: string, userId: string, limit = 20) {
    const agent = await agentRepo.findById(agentId);

    if (!agent) throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    if (agent.userId !== userId) throw new AppError("Forbidden.", 403, "FORBIDDEN");

    return executionRepo.findByAgent(agentId, limit);
  },
};
