/**
 * src/api/workflows/workflows.controller.ts
 *
 * Thin HTTP ↔ service bridge. All business logic lives in workflow.service.ts.
 */

import { Request, Response, NextFunction } from "express";
import {
  workflowService,
  CreateWorkflowSchema,
  UpdateWorkflowSchema,
  RunWorkflowSchema,
} from "../../services/workflow.service";
import { AppError } from "../../middleware/errorHandler";

// ---------------------------------------------------------------------------
// POST /api/workflows
// ---------------------------------------------------------------------------

export async function createWorkflow(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const parsed = CreateWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }

    const workflow = await workflowService.create(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: workflow });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/workflows
// ---------------------------------------------------------------------------

export async function listWorkflows(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const workflows = await workflowService.list(req.user!.sub);
    res.json({ success: true, data: workflows, total: workflows.length });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/workflows/:id
// ---------------------------------------------------------------------------

export async function getWorkflow(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const workflow = await workflowService.getById(req.params["id"] as string, req.user!.sub);
    res.json({ success: true, data: workflow });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// PATCH /api/workflows/:id
// ---------------------------------------------------------------------------

export async function updateWorkflow(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const parsed = UpdateWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }

    const workflow = await workflowService.update(req.params["id"] as string, req.user!.sub, parsed.data);
    res.json({ success: true, data: workflow });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// DELETE /api/workflows/:id
// ---------------------------------------------------------------------------

export async function deleteWorkflow(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    await workflowService.delete(req.params["id"] as string, req.user!.sub);
    res.json({ success: true, message: "Workflow deleted." });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// POST /api/workflows/:id/run
// ---------------------------------------------------------------------------

export async function runWorkflow(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const parsed = RunWorkflowSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }

    const result = await workflowService.run(req.params["id"] as string, req.user!.sub, parsed.data);
    const status = result.status === "COMPLETED" ? 200 : 422;
    res.status(status).json({ success: result.status === "COMPLETED", data: result });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/workflows/runs
// ---------------------------------------------------------------------------

export async function listRuns(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const workflowId = req.query["workflowId"] as string | undefined;
    const runs = await workflowService.listRuns(req.user!.sub, workflowId);
    res.json({ success: true, data: runs, total: runs.length });
  } catch (err) { next(err); }
}

// ---------------------------------------------------------------------------
// GET /api/workflows/runs/:runId
// ---------------------------------------------------------------------------

export async function getRun(
  req: Request, res: Response, next: NextFunction,
): Promise<void> {
  try {
    const run = await workflowService.getRun(req.params["runId"] as string, req.user!.sub);
    res.json({ success: true, data: run });
  } catch (err) { next(err); }
}
