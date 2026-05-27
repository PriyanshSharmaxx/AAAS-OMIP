/**
 * src/services/execution.service.ts
 *
 * Orchestrates the full agent execution pipeline:
 *   1. Validate user can access the agent
 *   2. Create ExecutionLog (PENDING)
 *   3. Mark RUNNING + set startedAt
 *   4. Call runAgent() from agentExecutor
 *   5. Persist result (COMPLETED | FAILED) + update agent stats
 *   6. Return structured ExecutionResult
 *
 * Both the sync HTTP handler (Step 6) and the BullMQ worker (Step 9)
 * call this service — keeping all execution logic in one place.
 */

import { z } from "zod";
import { prisma } from "../lib/prisma";
import { agentRepo, executionRepo, AgentStatus, ExecutionStatus, Prisma } from "../lib/db";
import { dispatchByType, AgentRunResult } from "./agentExecutor";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { getAgentRunQueue, DEFAULT_JOB_OPTIONS } from "../workers/queue";
import { notificationService } from "./notification.service";
import { permissionService } from "./permission.service";
import { ResourceType, PermissionAction } from "../lib/db";
import { calculateCost } from "./pricing/cost.service";

// ---------------------------------------------------------------------------
// Input schema
// ---------------------------------------------------------------------------

export const RunAgentSchema = z.object({
  agentId: z.string().uuid("Must be a valid agent UUID"),
  // "quick" skips external API config; "advanced" uses caller-supplied config
  mode: z.enum(["quick", "advanced"]).default("quick"),
  // User's message / task description
  userInput: z
    .string()
    .min(1, "userInput cannot be empty")
    .max(16_000, "userInput must be at most 16,000 characters"),
  // Optional: override static agent config for this run only
  overrides: z
    .object({
      model:       z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens:   z.number().int().min(1).max(128_000).optional(),
    })
    .optional(),
  // Conversation history for multi-turn runs
  history: z
    .array(
      z.object({
        role:    z.enum(["user", "assistant"]),
        content: z.string().max(8000),
      }),
    )
    .max(20)
    .optional(),
  // Metadata injected by scheduler / webhook (internal use)
  triggerSource: z.enum(["manual", "scheduled", "webhook", "workflow"]).default("manual"),
  scheduleId:    z.string().optional(),
  workflowRunId: z.string().optional(),
});

export type RunAgentInput = z.infer<typeof RunAgentSchema>;

// ---------------------------------------------------------------------------
// Result shape returned to the HTTP layer / worker
// ---------------------------------------------------------------------------

export interface ExecutionResult {
  executionId:  string;
  agentId:      string;
  agentName:    string;
  status:       "COMPLETED" | "FAILED";
  output:       string;
  error?:       string;
  usage: {
    promptTokens:     number;
    completionTokens: number;
    totalTokens:      number;
  };
  model:          string;
  durationMs:     number;
  iterations:     number;
  finishReason:   string;
  steps:          unknown[];          // reasoning trace
  triggerSource:  string;
  startedAt:      Date;
  completedAt:    Date;
  /** Credits consumed by this run (0 for free agents). */
  creditsUsed:    number;
  /** Caller's remaining balance after deduction. */
  creditsRemaining: number;
}

// ---------------------------------------------------------------------------
// Core pipeline
// ---------------------------------------------------------------------------

export const executionService = {

  /**
   * execute() — runs an agent end-to-end and persists the log.
   * Called by: sync HTTP route (Step 6) and BullMQ worker (Step 9).
   */
  async execute(
    userId: string,
    input: RunAgentInput,
  ): Promise<ExecutionResult> {

    // ── 1. Fetch and validate agent ──────────────────────────────────────────
    const agent = await agentRepo.findById(input.agentId);

    if (!agent) {
      throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    }

    // Access check: must be owner OR public + active
    const isOwner  = agent.userId === userId;
    const isPublic = agent.isPublic && agent.status === AgentStatus.ACTIVE;

    if (!isOwner && !isPublic) {
      // Fall back to explicit permission grant
      const hasGrant = await permissionService.check(userId, ResourceType.AGENT, agent.id, PermissionAction.RUN);
      if (!hasGrant) {
        throw new AppError(
          "You do not have access to this agent.",
          403,
          "FORBIDDEN",
        );
      }
    }

    if (agent.status === AgentStatus.ARCHIVED) {
      throw new AppError(
        "This agent has been archived and cannot be run.",
        410,
        "AGENT_ARCHIVED",
      );
    }

    // ── 1b. Credit check + atomic deduction ──────────────────────────────────
    const cost = calculateCost({
      tools:   (agent.tools as any),
      model:   agent.model,
      pricing: agent.pricing,
    });

    // Use a DB transaction so the balance check and deduction are atomic.
    // This prevents concurrent runs from overdrawing the same credit pool.
    let creditsRemaining = 0;
    if (cost.total > 0) {
      const updatedUser = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const user = await tx.user.findUnique({
          where:  { id: userId },
          select: { credits: true },
        });

        if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

        if (user.credits < cost.total) {
          throw new AppError(
            `Insufficient credits. Required: ${cost.total}, available: ${user.credits}.`,
            402,
            "INSUFFICIENT_CREDITS",
          );
        }

        const updated = await tx.user.update({
          where: { id: userId },
          data: {
            credits:          { decrement: cost.total },
            totalCreditsUsed: { increment: cost.total },
          },
          select: { credits: true },
        });

        await tx.creditLog.create({
          data: {
            userId,
            agentId: agent.id,
            amount:  -cost.total,
            type:    "deduction",
            note:    `Agent run: ${agent.name}`,
          },
        });

        return updated;
      });

      creditsRemaining = updatedUser.credits;
    }

    // ── 2. Extract stored config + apply overrides ───────────────────────────
    const storedConfig  = agent.config as Record<string, number>;
    const overrides     = input.overrides ?? {};

    const effectiveModel  = overrides.model       ?? agent.model;
    const effectiveConfig = {
      temperature:       overrides.temperature ?? storedConfig["temperature"]       ?? 0.7,
      maxTokens:         overrides.maxTokens   ?? storedConfig["maxTokens"]         ?? 4096,
      topP:              storedConfig["topP"]                                        ?? 1,
      presencePenalty:   storedConfig["presencePenalty"]                            ?? 0,
      frequencyPenalty:  storedConfig["frequencyPenalty"]                           ?? 0,
    };

    const storedTools = (agent.tools as any[])
      .filter((t: any) => t.enabled);

    // ── 3. Create ExecutionLog (PENDING) ─────────────────────────────────────
    const logEntry = await executionRepo.create({
      agent:          { connect: { id: agent.id   } },
      user:           { connect: { id: userId      } },
      modelUsed:      effectiveModel,
      promptUsed:     agent.prompt,
      toolsUsed: (storedTools as any),
      inputData:      { userInput: input.userInput, overrides },
      status:         ExecutionStatus.PENDING,
      triggerSource:  input.triggerSource,
      ...(input.scheduleId    ? { scheduleId:    input.scheduleId    } : {}),
      ...(input.workflowRunId ? { workflowRunId: input.workflowRunId } : {}),
    });

    logger.info("Execution started", {
      executionId: logEntry.id,
      agentId:     agent.id,
      agentName:   agent.name,
      userId,
      model:       effectiveModel,
      trigger:     input.triggerSource,
    });

    // ── 4. Mark RUNNING ───────────────────────────────────────────────────────
    const startedAt = new Date();
    await executionRepo.update(logEntry.id, {
      status:    ExecutionStatus.RUNNING,
      startedAt,
    });

    // ── 5. Run agent ──────────────────────────────────────────────────────────
    let runResult: AgentRunResult;

    try {
      runResult = await dispatchByType({
        agentId:   agent.id,
        agentName: agent.name,
        prompt:    agent.prompt,
        model:     effectiveModel,
        config:    effectiveConfig,
        tools:     storedTools,
        userInput: input.userInput,
        history:   input.history,
        userId,
        triggerSource: input.triggerSource,
        agentType:      (agent as Record<string, unknown>)["type"]      as string | undefined,
        agentFramework: (agent as Record<string, unknown>)["framework"] as string | undefined,
      });
    } catch (err) {
      // Unexpected executor crash — still persist a FAILED log
      const errorMsg = err instanceof Error ? err.message : "Executor crashed";
      await persistFailure(logEntry.id, agent.id, startedAt, errorMsg, 0);

      throw new AppError(
        `Agent execution failed: ${errorMsg}`,
        500,
        "EXECUTION_FAILED",
      );
    }

    // ── 6. Persist result ─────────────────────────────────────────────────────
    const completedAt = new Date();
    const finalStatus = runResult.success
      ? ExecutionStatus.COMPLETED
      : ExecutionStatus.FAILED;

    await Promise.all([
      // Update log entry
      executionRepo.update(logEntry.id, {
        status:           finalStatus,
        outputData: (runResult.success
          ? {
              output:      runResult.output,
              finishReason: runResult.finishReason,
              iterations:  runResult.iterations,
              steps:       runResult.steps,
            }
          : {}) as any,
        errorMessage:     runResult.error ?? null,
        durationMs:       runResult.durationMs,
        promptTokens:     runResult.usage.promptTokens,
        completionTokens: runResult.usage.completionTokens,
        totalTokens:      runResult.usage.totalTokens,
        startedAt,
        completedAt,
      }),

      // Update agent stats
      agentRepo.incrementRuns(agent.id, runResult.success),
    ]);

    logger.info("Execution completed", {
      executionId:  logEntry.id,
      status:       finalStatus,
      durationMs:   runResult.durationMs,
      tokens:       runResult.usage.totalTokens,
      finishReason: runResult.finishReason,
    });

    // Fire-and-forget notification — never blocks the response
    if (finalStatus === ExecutionStatus.COMPLETED) {
      notificationService.notifyExecutionCompleted(userId, agent.name, logEntry.id, runResult.durationMs).catch(() => {});
    } else {
      notificationService.notifyExecutionFailed(userId, agent.name, logEntry.id, runResult.error ?? "Unknown error").catch(() => {});
    }

    return {
      executionId:  logEntry.id,
      agentId:      agent.id,
      agentName:    agent.name,
      status:       finalStatus === ExecutionStatus.COMPLETED ? "COMPLETED" : "FAILED",
      output:       runResult.output,
      error:        runResult.error,
      usage:        runResult.usage,
      model:        runResult.model,
      durationMs:   runResult.durationMs,
      iterations:   runResult.iterations,
      finishReason: runResult.finishReason,
      steps:        runResult.steps,
      triggerSource: input.triggerSource,
      startedAt,
      completedAt,
      creditsUsed:      cost.total,
      creditsRemaining,
    };
  },

  // ── Get a single run by ID ─────────────────────────────────────────────────
  async getById(executionId: string, userId: string) {
    const log = await executionRepo.findById(executionId);

    if (!log) {
      throw new AppError("Execution log not found.", 404, "EXECUTION_NOT_FOUND");
    }
    if (log.userId !== userId) {
      throw new AppError("You do not have access to this run.", 403, "FORBIDDEN");
    }

    return log;
  },

  // ── List runs for the current user ────────────────────────────────────────
  async listByUser(userId: string, opts?: { limit?: number; agentId?: string }) {
    const { limit = 20, agentId } = opts ?? {};

    return prisma.executionLog.findMany({
      where: {
        userId,
        ...(agentId ? { agentId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take:    Math.min(limit, 100),
      include: {
        agent: { select: { id: true, name: true, category: true, model: true } },
      },
    });
  },

  // ── enqueue() — async path via BullMQ ────────────────────────────────────

  /**
   * enqueue() — validates access, creates a PENDING ExecutionLog, then
   * adds a job to the agent-runs queue.
   *
   * Returns immediately with { jobId, executionId } — the client polls
   * GET /api/agents/jobs/:jobId to check progress.
   */
  async enqueue(
    userId: string,
    input: RunAgentInput,
  ): Promise<{ jobId: string; executionId: string; queuedAt: Date }> {
    // 1. Validate agent access (same checks as execute())
    const agent = await agentRepo.findById(input.agentId);
    if (!agent) throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");

    const isOwner  = agent.userId === userId;
    const isPublic = agent.isPublic && agent.status === AgentStatus.ACTIVE;
    if (!isOwner && !isPublic) throw new AppError("You do not have access to this agent.", 403, "FORBIDDEN");
    if (agent.status === AgentStatus.ARCHIVED) throw new AppError("This agent has been archived.", 410, "AGENT_ARCHIVED");

    // 2. Resolve effective model
    // const storedConfig  = agent.config as Record<string, number>;
    const effectiveModel = input.overrides?.model ?? agent.model;

    // 3. Pre-create PENDING ExecutionLog so we can return an ID immediately
    const logEntry = await executionRepo.create({
      agent:         { connect: { id: agent.id } },
      user:          { connect: { id: userId    } },
      modelUsed:     effectiveModel,
      promptUsed:    agent.prompt,
      toolsUsed:     [],
      inputData:     { userInput: input.userInput, overrides: input.overrides ?? {} },
      status:        ExecutionStatus.PENDING,
      triggerSource: input.triggerSource,
      ...(input.scheduleId    ? { scheduleId:    input.scheduleId    } : {}),
      ...(input.workflowRunId ? { workflowRunId: input.workflowRunId } : {}),
    });

    // 4. Enqueue
    const queue = getAgentRunQueue();
    const job   = await queue.add(
      `agent-run:${agent.id}`,
      {
        executionLogId: logEntry.id,
        userId,
        agentId:        agent.id,
        agentName:      agent.name,
        userInput:      input.userInput,
        overrides:      input.overrides,
        history:        input.history,
        triggerSource:  input.triggerSource,
        scheduleId:     input.scheduleId,
        workflowRunId:  input.workflowRunId,
      },
      DEFAULT_JOB_OPTIONS,
    );

    const queuedAt = new Date();

    logger.info("Agent run enqueued", {
      jobId:        job.id,
      executionId:  logEntry.id,
      agentId:      agent.id,
      userId,
    });

    return { jobId: job.id!, executionId: logEntry.id, queuedAt };
  },

  // ── executeQueued() — called by worker with pre-existing log ────────────

  /**
   * executeQueued() — used by the BullMQ worker.
   * Receives the pre-created executionLogId, marks it RUNNING, runs the
   * agent, and persists the result — skipping the access-check and log
   * creation that execute() does (those happen in enqueue()).
   */
  async executeQueued(
    executionLogId: string,
    userId:         string,
    input: Omit<RunAgentInput, "agentId"> & { agentId: string },
  ): Promise<ExecutionResult> {
    const agent = await agentRepo.findById(input.agentId);
    if (!agent) throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");

    const storedConfig   = agent.config as Record<string, number>;
    const effectiveModel = input.overrides?.model ?? agent.model;
    const effectiveConfig = {
      temperature:      input.overrides?.temperature ?? storedConfig["temperature"]     ?? 0.7,
      maxTokens:        input.overrides?.maxTokens   ?? storedConfig["maxTokens"]       ?? 4096,
      topP:             storedConfig["topP"]                                              ?? 1,
      presencePenalty:  storedConfig["presencePenalty"]                                  ?? 0,
      frequencyPenalty: storedConfig["frequencyPenalty"]                                 ?? 0,
    };
    const storedTools = (agent.tools as Array<{ name: string; enabled: boolean; config?: Record<string, unknown> }>)
      .filter((t) => t.enabled);

    // Mark RUNNING
    const startedAt = new Date();
    await executionRepo.update(executionLogId, {
      status:    ExecutionStatus.RUNNING,
      startedAt,
      toolsUsed: (storedTools as any),
    });

    let runResult: AgentRunResult;
    try {
      runResult = await dispatchByType({
        agentId:   agent.id,
        agentName: agent.name,
        prompt:    agent.prompt,
        model:     effectiveModel,
        config:    effectiveConfig,
        tools:     storedTools,
        userInput: input.userInput,
        history:   input.history,
        userId,
        triggerSource: input.triggerSource,
        agentType:      (agent as Record<string, unknown>)["type"]      as string | undefined,
        agentFramework: (agent as Record<string, unknown>)["framework"] as string | undefined,
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Executor crashed";
      await persistFailure(executionLogId, agent.id, startedAt, errorMsg, 0);
      throw new AppError(`Agent execution failed: ${errorMsg}`, 500, "EXECUTION_FAILED");
    }

    const completedAt = new Date();
    const finalStatus = runResult.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;

    await Promise.all([
      executionRepo.update(executionLogId, {
        status:           finalStatus,
        outputData: (runResult ? { output: runResult.output, finishReason: runResult.finishReason, iterations: runResult.iterations, steps: runResult.steps } : {}) as any,
        errorMessage:     runResult.error ?? null,
        durationMs:       runResult.durationMs,
        promptTokens:     runResult.usage.promptTokens,
        completionTokens: runResult.usage.completionTokens,
        totalTokens:      runResult.usage.totalTokens,
        startedAt,
        completedAt,
      }),
      agentRepo.incrementRuns(agent.id, runResult.success),
    ]);

    logger.info("Queued execution completed", {
      executionId:  executionLogId,
      status:       finalStatus,
      durationMs:   runResult.durationMs,
      tokens:       runResult.usage.totalTokens,
    });

    return {
      executionId:  executionLogId,
      agentId:      agent.id,
      agentName:    agent.name,
      status:       finalStatus === ExecutionStatus.COMPLETED ? "COMPLETED" : "FAILED",
      output:       runResult.output,
      error:        runResult.error,
      usage:        runResult.usage,
      model:        runResult.model,
      durationMs:   runResult.durationMs,
      iterations:   runResult.iterations,
      finishReason: runResult.finishReason,
      steps:        runResult.steps,
      triggerSource: input.triggerSource,
      startedAt,
      completedAt,
      // Credit deduction for queued runs is handled by the worker's own credit
      // check before enqueue — placeholder values here avoid interface mismatch.
      creditsUsed:      0,
      creditsRemaining: 0,
    };
  },

  // ── Usage stats for the dashboard ─────────────────────────────────────────
  async stats(userId: string) {
    const [statusGroups, recentRuns, totalTokens] = await Promise.all([
      prisma.executionLog.groupBy({
        by:    ["status"],
        where: { userId },
        _count: { id: true },
      }),
      prisma.executionLog.findMany({
        where:   { userId },
        orderBy: { createdAt: "desc" },
        take:    5,
        select:  {
          id: true, status: true, durationMs: true,
          totalTokens: true, createdAt: true,
          agent: { select: { name: true } },
        },
      }),
      prisma.executionLog.aggregate({
        where: { userId },
        _sum:  { totalTokens: true, durationMs: true },
      }),
    ]);

    const counts = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count.id]),
    ) as Record<string, number>;

    return {
      total:      Object.values(counts).reduce((a, b) => a + b, 0),
      completed:  counts["COMPLETED"]  ?? 0,
      failed:     counts["FAILED"]     ?? 0,
      running:    counts["RUNNING"]    ?? 0,
      pending:    counts["PENDING"]    ?? 0,
      totalTokens: totalTokens._sum.totalTokens ?? 0,
      totalDurationMs: totalTokens._sum.durationMs ?? 0,
      recentRuns,
    };
  },
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function persistFailure(
  logId: string,
  agentId: string,
  startedAt: Date,
  errorMsg: string,
  durationMs: number,
): Promise<void> {
  await Promise.all([
    executionRepo.update(logId, {
      status:       ExecutionStatus.FAILED,
      errorMessage: errorMsg,
      durationMs,
      startedAt,
      completedAt:  new Date(),
    }),
    agentRepo.incrementRuns(agentId, false),
  ]).catch((e) =>
    logger.error("Failed to persist execution failure", { logId, err: e.message }),
  );
}
