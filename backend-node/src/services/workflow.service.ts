/**
 * src/services/workflow.service.ts
 *
 * Workflow Engine — sequential multi-agent chaining.
 *
 * A Workflow is a named list of Steps. Each Step references an Agent and
 * optionally a template string for its userInput that can interpolate the
 * output of any previous step: "Translate this: {{step_summarise.output}}"
 *
 * Execution is sequential; a step failure aborts the run immediately.
 *
 * Architecture:
 *   workflowService.run()
 *     └─ load Workflow + validate
 *     └─ create WorkflowRun (PENDING → RUNNING)
 *     └─ for each step in order:
 *         └─ resolve agent from DB
 *         └─ interpolate inputTemplate with prior step outputs
 *         └─ call runAgent() from agentExecutor
 *         └─ append step result to stepResults[]
 *         └─ on failure → mark run FAILED, return early
 *     └─ mark run COMPLETED, return final output
 */

import { z } from "zod";
import { workflowRepo, workflowRunRepo, agentRepo, WorkflowRunStatus, ResourceType, PermissionAction } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { permissionService } from "./permission.service";
import { RuntimeEngine } from "./runtime.service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowStep {
  id:            string;   // unique within workflow e.g. "step_summarise"
  name:          string;   // human-readable label
  agentId:       string;   // which agent to run
  inputTemplate: string;   // may contain {{step_<id>.output}} placeholders
  config?: {
    temperature?: number;
    maxTokens?:   number;
  };
}

export interface WorkflowStepResult {
  stepId:     string;
  stepName:   string;
  agentId:    string;
  success:    boolean;
  output:     string;
  error?:     string;
  durationMs: number;
  iterations: number;
  tokens: {
    promptTokens:     number;
    completionTokens: number;
    totalTokens:      number;
  };
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const WorkflowStepSchema = z.object({
  id:   z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, "Step ID must be lowercase alphanumeric/underscore"),
  name: z.string().min(1).max(100),
  agentId: z.string().uuid("agentId must be a UUID"),
  inputTemplate: z.string().min(1).max(8000),
  config: z.object({
    temperature: z.number().min(0).max(2).optional(),
    maxTokens:   z.number().int().min(1).max(8192).optional(),
  }).optional(),
});

export const CreateWorkflowSchema = z.object({
  name:        z.string().min(1).max(100).trim(),
  description: z.string().max(500).trim().default(""),
  steps:       z.array(WorkflowStepSchema).min(1).max(10),
  isPublic:    z.boolean().default(false),
});

export const UpdateWorkflowSchema = CreateWorkflowSchema.partial();

export const RunWorkflowSchema = z.object({
  initialInput:  z.string().min(1).max(8000),
  triggerSource: z.enum(["manual", "api", "scheduled", "webhook"]).default("manual"),
});

// ---------------------------------------------------------------------------
// Template interpolation
// ---------------------------------------------------------------------------

/**
 * interpolate — replaces {{step_<id>.output}} tokens in a template string
 * with the actual output from that step's result.
 *
 * Also replaces {{initial_input}} with the original user-supplied input.
 */
function interpolate(
  template: string,
  stepResults: WorkflowStepResult[],
  initialInput: string,
): string {
  let result = template.replace(/\{\{initial_input\}\}/g, initialInput);

  for (const sr of stepResults) {
    const token = `{{${sr.stepId}.output}}`;
    result = result.split(token).join(sr.output);
  }

  return result;
}

// ---------------------------------------------------------------------------
// workflowService
// ---------------------------------------------------------------------------

export const workflowService = {

  // ── create ───────────────────────────────────────────────────────────────

  async create(userId: string, input: z.infer<typeof CreateWorkflowSchema>) {
    // Validate step IDs are unique within the workflow
    const ids = input.steps.map((s) => s.id);
    if (new Set(ids).size !== ids.length) {
      throw new AppError("Workflow step IDs must be unique.", 400, "DUPLICATE_STEP_ID");
    }

    const workflow = await workflowRepo.create({
      name:        input.name,
      description: input.description,
      steps:       input.steps as object[],
      isPublic:    input.isPublic,
      user:        { connect: { id: userId } },
    });

    logger.info("Workflow created", { workflowId: workflow.id, userId, steps: input.steps.length });
    return workflow;
  },

  // ── list ─────────────────────────────────────────────────────────────────

  async list(userId: string) {
    return workflowRepo.findByUser(userId);
  },

  // ── getById ──────────────────────────────────────────────────────────────

  async getById(workflowId: string, userId: string) {
    const workflow = await workflowRepo.findById(workflowId);
    if (!workflow || !workflow.isActive) {
      throw new AppError("Workflow not found.", 404, "WORKFLOW_NOT_FOUND");
    }
    if (workflow.userId !== userId) {
      throw new AppError("Access denied.", 403, "FORBIDDEN");
    }
    return workflow;
  },

  // ── update ───────────────────────────────────────────────────────────────

  async update(workflowId: string, userId: string, input: z.infer<typeof UpdateWorkflowSchema>) {
    const workflow = await workflowService.getById(workflowId, userId);

    if (input.steps) {
      const ids = input.steps.map((s) => s.id);
      if (new Set(ids).size !== ids.length) {
        throw new AppError("Workflow step IDs must be unique.", 400, "DUPLICATE_STEP_ID");
      }
    }

    const updated = await workflowRepo.update(workflow.id, {
      ...(input.name        ? { name:        input.name }                   : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.steps       ? { steps:       input.steps as object[] }      : {}),
      ...(input.isPublic    !== undefined ? { isPublic:   input.isPublic }  : {}),
    });

    return updated;
  },

  // ── delete (soft) ─────────────────────────────────────────────────────────

  async delete(workflowId: string, userId: string) {
    await workflowService.getById(workflowId, userId);
    await workflowRepo.softDelete(workflowId);
  },

  // ── run ──────────────────────────────────────────────────────────────────

  async run(
    workflowId: string,
    userId:     string,
    input:      z.infer<typeof RunWorkflowSchema>,
  ) {
    // Load and authorise
    const workflow = await workflowRepo.findById(workflowId);
    if (!workflow || !workflow.isActive) {
      throw new AppError("Workflow not found.", 404, "WORKFLOW_NOT_FOUND");
    }
    if (workflow.userId !== userId && !workflow.isPublic) {
      const hasGrant = await permissionService.check(userId, ResourceType.WORKFLOW, workflowId, PermissionAction.RUN);
      if (!hasGrant) throw new AppError("Access denied.", 403, "FORBIDDEN");
    }

    const steps = workflow.steps as unknown as WorkflowStep[];
    if (!steps.length) {
      throw new AppError("Workflow has no steps.", 400, "NO_STEPS");
    }

    // Create run record
    const runRecord = await workflowRunRepo.create({
      inputData:    { initialInput: input.initialInput },
      triggerSource: input.triggerSource,
      status:       WorkflowRunStatus.RUNNING,
      startedAt:    new Date(),
      workflow:     { connect: { id: workflowId } },
      user:         { connect: { id: userId } },
    });

    const startTime:    number            = Date.now();
    const stepResults:  WorkflowStepResult[] = [];
    let finalOutput = "";

    logger.info("Workflow run started", {
      workflowId,
      runId: runRecord.id,
      steps: steps.length,
      userId,
    });

    try {
      for (const step of steps) {
        // Resolve the agent from DB
        const agent = await agentRepo.findById(step.agentId);
        if (!agent) {
          throw new AppError(`Step "${step.name}": agent "${step.agentId}" not found.`, 404, "AGENT_NOT_FOUND");
        }

        // Build the actual user input for this step
        const userInput = interpolate(step.inputTemplate, stepResults, input.initialInput);

        logger.debug("Running workflow step", {
          stepId:  step.id,
          stepName: step.name,
          agentId: step.agentId,
          runId:   runRecord.id,
        });

        // Run the agent via the unified RuntimeEngine
        const runtimeResult = await RuntimeEngine.execute(userId, {
          agentId: agent.id,
          userInput,
          mode: "quick",
          overrides: {
            temperature: step.config?.temperature,
            maxTokens: step.config?.maxTokens,
          },
          triggerSource: "workflow",
          workflowRunId: runRecord.id,
        });

        const stepResult: WorkflowStepResult = {
          stepId:     step.id,
          stepName:   step.name,
          agentId:    agent.id,
          success:    runtimeResult.status === "COMPLETED",
          output:     runtimeResult.output,
          error:      runtimeResult.error,
          durationMs: runtimeResult.durationMs,
          iterations: runtimeResult.metadata.iterations ?? 1,
          tokens: {
            promptTokens:     runtimeResult.usage.promptTokens,
            completionTokens: runtimeResult.usage.completionTokens,
            totalTokens:      runtimeResult.usage.totalTokens,
          },
        };

        stepResults.push(stepResult);
        finalOutput = runtimeResult.output;

        if (runtimeResult.status !== "COMPLETED") {
          // Abort workflow on step failure
          logger.warn("Workflow step failed — aborting run", {
            stepId: step.id,
            error:  runtimeResult.error,
            runId:  runRecord.id,
          });

          await workflowRunRepo.update(runRecord.id, {
            status:      WorkflowRunStatus.FAILED,
            stepResults: stepResults as object[],
            errorMessage: `Step "${step.name}" failed: ${runtimeResult.error ?? "unknown error"}`,
            completedAt: new Date(),
            durationMs:  Date.now() - startTime,
          });

          await workflowRepo.incrementRuns(workflowId);

          return {
            runId:       runRecord.id,
            status:      WorkflowRunStatus.FAILED,
            stepResults,
            error:       `Step "${step.name}" failed: ${runtimeResult.error}`,
            durationMs:  Date.now() - startTime,
          };
        }

        logger.info("Workflow step complete", {
          stepId:    step.id,
          durationMs: stepResult.durationMs,
          tokens:    stepResult.tokens.totalTokens,
        });
      }
    } catch (err) {
      // Unexpected error (e.g. DB down, agent not found)
      const errorMessage = err instanceof Error ? err.message : "Unexpected workflow error";

      await workflowRunRepo.update(runRecord.id, {
        status:      WorkflowRunStatus.FAILED,
        stepResults: stepResults as object[],
        errorMessage,
        completedAt: new Date(),
        durationMs:  Date.now() - startTime,
      });

      await workflowRepo.incrementRuns(workflowId);

      logger.error("Workflow run error", { workflowId, runId: runRecord.id, error: errorMessage });

      throw err;
    }

    // All steps passed — mark COMPLETED
    const durationMs = Date.now() - startTime;

    await Promise.all([
      workflowRunRepo.update(runRecord.id, {
        status:      WorkflowRunStatus.COMPLETED,
        outputData:  { output: finalOutput },
        stepResults: stepResults as object[],
        completedAt: new Date(),
        durationMs,
      }),
      workflowRepo.incrementRuns(workflowId),
    ]);

    logger.info("Workflow run completed", {
      workflowId,
      runId:      runRecord.id,
      steps:      steps.length,
      durationMs,
    });

    return {
      runId:       runRecord.id,
      status:      WorkflowRunStatus.COMPLETED,
      finalOutput,
      stepResults,
      durationMs,
    };
  },

  // ── listRuns ──────────────────────────────────────────────────────────────

  async listRuns(userId: string, workflowId?: string) {
    if (workflowId) {
      // verify ownership first
      await workflowService.getById(workflowId, userId);
      return workflowRunRepo.findByWorkflow(workflowId);
    }
    return workflowRunRepo.findByUser(userId);
  },

  // ── getRun ────────────────────────────────────────────────────────────────

  async getRun(runId: string, userId: string) {
    const run = await workflowRunRepo.findById(runId);
    if (!run) throw new AppError("Workflow run not found.", 404, "RUN_NOT_FOUND");
    if (run.userId !== userId) throw new AppError("Access denied.", 403, "FORBIDDEN");
    return run;
  },
};
