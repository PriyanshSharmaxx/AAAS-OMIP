/**
 * src/services/runtime.service.ts
 *
 * Unified Execution Engine for Omip AaaS.
 * Consolidates agentExecutor and executionService into a single, production-grade
 * runtime model with adapter routing, queue integration, and failure handling.
 */

import { z } from "zod";
import { prisma } from "../lib/prisma";
import { agentRepo, executionRepo, AgentStatus, ExecutionStatus, ResourceType, PermissionAction, InviteStatus } from "../lib/db";
import { logger } from "../lib/logger";
import { getAgentRunQueue, DEFAULT_JOB_OPTIONS } from "../workers/queue";
import { notificationService } from "./notification.service";
import { permissionService } from "./permission.service";
import { calculateCost } from "./pricing/cost.service";
import { AppError } from "../middleware/errorHandler";
import { dispatchByType } from "./agentExecutor";
import { LLMUsage } from "../lib/llm";
import { billingService } from "./billing.service";

// ---------------------------------------------------------------------------
// Schemas & Types
// ---------------------------------------------------------------------------

export const RunAgentSchema = z.object({
  agentId: z.string().uuid("Must be a valid agent UUID"),
  userInput: z.string().min(1).max(16000),
  mode: z.enum(["quick", "advanced"]).default("quick"),
  overrides: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128000).optional(),
    maxIterations: z.number().int().min(1).max(10).optional(),
    timeoutMs: z.number().int().min(1000).max(300000).optional(),
  }).optional(),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().max(8000),
  })).max(20).optional(),
  triggerSource: z.enum(["manual", "scheduled", "webhook", "workflow"]).default("manual"),
  scheduleId: z.string().optional(),
  workflowRunId: z.string().optional(),
});

export type RunAgentInput = z.infer<typeof RunAgentSchema>;

export interface RuntimeResult {
  executionId: string;
  agentId: string;
  status: "COMPLETED" | "FAILED";
  output: string;
  error?: string;
  usage: LLMUsage;
  durationMs: number;
  model: string;
  metadata: Record<string, any>;
}

// ---------------------------------------------------------------------------
// Runtime Engine
// ---------------------------------------------------------------------------

export class RuntimeEngine {
  /**
   * Main entry point for synchronous execution.
   * Handles the entire pipeline: Auth -> Credits -> Setup -> Run -> Persistence -> Notify
   */
  static async execute(userId: string, input: RunAgentInput): Promise<RuntimeResult> {
    const startTime = Date.now();
    
    // 1. Resolve Agent & Validate Access
    const agent = await this.loadAndValidateAgent(userId, input.agentId);
    
    // 2. Credit Check & Deduction
    const cost = calculateCost({
      tools: agent.tools,
      model: input.overrides?.model ?? agent.model,
      pricing: agent.pricing,
      listing: agent.listing,
    });
    
    await this.deductCredits(userId, agent, cost.total);

    // 3. Create Persistent Execution Log
    const executionLog = await this.createExecutionLog(userId, agent, input);
    
    try {
      // 4. Mark Running
      await executionRepo.update(executionLog.id, { 
        status: ExecutionStatus.RUNNING, 
        startedAt: new Date() 
      });

      // 5. Dispatch to Execution Core
      const runResult = await this.dispatch(userId, agent, input);

      // 6. Persist Completion
      const result = await this.persistResult(executionLog.id, agent.id, runResult, startTime, agent.model);

      if (runResult.success) {
        await billingService.recordAgentRunCharge({
          consumerId: userId,
          agentId: agent.id,
          executionId: executionLog.id,
        });
      }
      
      // 7. Notify
      this.sendNotifications(userId, agent.name, executionLog.id, runResult);

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Internal Runtime Error";
      logger.error("Runtime execution failed", { executionId: executionLog.id, error: errorMsg });
      
      await this.persistFailure(executionLog.id, agent.id, errorMsg, startTime);
      throw new AppError(`Execution failed: ${errorMsg}`, 500, "RUNTIME_ERROR");
    }
  }

  /**
   * Entry point for asynchronous queueing.
   */
  static async enqueue(userId: string, input: RunAgentInput) {
    const agent = await this.loadAndValidateAgent(userId, input.agentId);
    
    // Create PENDING log
    const executionLog = await this.createExecutionLog(userId, agent, input);
    
    const queue = getAgentRunQueue();
    const job = await queue.add(`agent-run:${agent.id}`, {
      executionLogId: executionLog.id,
      userId,
      ...input,
      agentName: agent.name,
    }, DEFAULT_JOB_OPTIONS);

    logger.info("Agent run enqueued", { jobId: job.id, executionId: executionLog.id });
    
    return { 
      jobId: job.id!, 
      executionId: executionLog.id, 
      queuedAt: new Date() 
    };
  }

  /**
   * Worker-specific path for executing a pre-queued log.
   */
  static async executeQueued(
    executionLogId: string,
    userId: string,
    input: Omit<RunAgentInput, "agentId"> & { agentId: string }
  ): Promise<RuntimeResult> {
    const startTime = Date.now();
    const agent = await agentRepo.findById(input.agentId);
    if (!agent) throw new AppError("Agent not found", 404);

    // Skip auth/credits as they are checked at enqueue time
    
    await executionRepo.update(executionLogId, { 
      status: ExecutionStatus.RUNNING, 
      startedAt: new Date() 
    });

    const runResult = await this.dispatch(userId, agent, input as RunAgentInput);
    const result = await this.persistResult(executionLogId, agent.id, runResult, startTime, agent.model);

    if (runResult.success) {
      await billingService.recordAgentRunCharge({
        consumerId: userId,
        agentId: agent.id,
        executionId: executionLogId,
      });
    }

    return result;
  }

  // ── Internal Pipeline Steps ────────────────────────────────────────────────

  private static async loadAndValidateAgent(userId: string, agentId: string) {
    const agent = await agentRepo.findById(agentId);
    if (!agent) throw new AppError("Agent not found.", 404, "AGENT_NOT_FOUND");
    
    const isOwner = agent.userId === userId;
    const isPublic = agent.isPublic && agent.status === AgentStatus.ACTIVE;
    const isTeamAgent = agent.teamId !== null;
    
    let isTeamMember = false;
    if (isTeamAgent) {
      const membership = await prisma.teamMember.findUnique({
        where: { teamId_userId: { teamId: agent.teamId!, userId } }
      });
      isTeamMember = membership !== null && membership.inviteStatus === InviteStatus.ACCEPTED;
    }
    
    if (!isOwner && !isPublic && !isTeamMember) {
      const hasGrant = await permissionService.check(userId, ResourceType.AGENT, agent.id, PermissionAction.RUN);
      if (!hasGrant) throw new AppError("Access denied.", 403, "FORBIDDEN");
    }
    
    if (agent.status === AgentStatus.ARCHIVED) {
      throw new AppError("Agent is archived.", 410, "AGENT_ARCHIVED");
    }
    
    return agent;
  }

  private static async deductCredits(userId: string, agent: any, amount: number) {
    if (amount <= 0) return;
    
    await prisma.$transaction(async (tx) => {
      // Case A: Team-owned agent (deduct from team credits)
      if (agent.teamId) {
        const team = await tx.team.findUnique({ 
          where: { id: agent.teamId }, 
          select: { credits: true, name: true } 
        });
        
        if (!team || team.credits < amount) {
          throw new AppError(`Insufficient team credits (${team?.name ?? "Unknown"}). Need ${amount}, have ${team?.credits ?? 0}`, 402, "INSUFFICIENT_CREDITS");
        }

        await tx.team.update({
          where: { id: agent.teamId },
          data: { credits: { decrement: amount }, totalCreditsUsed: { increment: amount } }
        });

        await tx.creditLog.create({
          data: { 
            teamId: agent.teamId, 
            userId, 
            agentId: agent.id, 
            amount: -amount, 
            type: "deduction", 
            note: `Team Run: ${agent.name}` 
          }
        });
        
        return;
      }

      // Case B: User-owned agent (deduct from user credits)
      const user = await tx.user.findUnique({ where: { id: userId }, select: { credits: true } });
      if (!user || user.credits < amount) {
        throw new AppError(`Insufficient credits. Need ${amount}, have ${user?.credits ?? 0}`, 402, "INSUFFICIENT_CREDITS");
      }
      
      await tx.user.update({
        where: { id: userId },
        data: { credits: { decrement: amount }, totalCreditsUsed: { increment: amount } }
      });
      
      await tx.creditLog.create({
        data: { userId, agentId: agent.id, amount: -amount, type: "deduction", note: `Run: ${agent.name}` }
      });
    });
  }

  private static async createExecutionLog(userId: string, agent: any, input: RunAgentInput) {
    return executionRepo.create({
      agent: { connect: { id: agent.id } },
      user: { connect: { id: userId } },
      modelUsed: input.overrides?.model ?? agent.model,
      promptUsed: agent.prompt,
      toolsUsed: agent.tools as any[],
      inputData: { userInput: input.userInput, overrides: input.overrides ?? {} },
      status: ExecutionStatus.PENDING,
      triggerSource: input.triggerSource,
      scheduleId: input.scheduleId,
      workflowRunId: input.workflowRunId,
    });
  }

  private static async dispatch(userId: string, agent: any, input: RunAgentInput) {
    return dispatchByType({
      agentId:        agent.id,
      agentName:      agent.name,
      prompt:         agent.prompt,
      model:          input.overrides?.model ?? agent.model,
      config:         agent.config as any,
      tools:          agent.tools as any[],
      userInput:      input.userInput,
      userId,
      triggerSource:  input.triggerSource,
      maxIterations:  input.overrides?.maxIterations,
      timeoutMs:      input.overrides?.timeoutMs,
      agentFramework: agent.framework,
      agentType:      agent.type,
    });
  }

  private static async persistResult(logId: string, agentId: string, runResult: any, startTime: number, model: string): Promise<RuntimeResult> {
    const durationMs = Date.now() - startTime;
    const status = runResult.success ? ExecutionStatus.COMPLETED : ExecutionStatus.FAILED;
    
    await Promise.all([
      executionRepo.update(logId, {
        status,
        outputData: { output: runResult.output, ...runResult.metadata },
        errorMessage: runResult.error ?? null,
        durationMs,
        promptTokens: runResult.usage.promptTokens,
        completionTokens: runResult.usage.completionTokens,
        totalTokens: runResult.usage.totalTokens,
        completedAt: new Date(),
      }),
      agentRepo.incrementRuns(agentId, runResult.success)
    ]);

    return {
      executionId: logId,
      agentId,
      status: runResult.success ? "COMPLETED" : "FAILED",
      output: runResult.output,
      error: runResult.error,
      usage: runResult.usage,
      durationMs,
      model,
      metadata: runResult.metadata,
    };
  }

  private static async persistFailure(logId: string, agentId: string, error: string, startTime: number) {
    await Promise.all([
      executionRepo.update(logId, {
        status: ExecutionStatus.FAILED,
        errorMessage: error,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
      }),
      agentRepo.incrementRuns(agentId, false)
    ]);
  }

  private static sendNotifications(userId: string, agentName: string, logId: string, result: any) {
    if (result.success) {
      notificationService.notifyExecutionCompleted(userId, agentName, logId, result.durationMs).catch(() => {});
    } else {
      notificationService.notifyExecutionFailed(userId, agentName, logId, result.error ?? "Unknown").catch(() => {});
    }
  }
}
