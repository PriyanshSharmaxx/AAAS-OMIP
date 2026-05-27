import { Request, Response, NextFunction } from "express";
import { RuntimeEngine, RunAgentSchema } from "../../services/runtime.service";
import { executionService } from "../../services/execution.service";
import { getAgentRunQueue, getQueueStats } from "../../workers/queue";
import { AppError } from "../../middleware/errorHandler";

// ---------------------------------------------------------------------------
// POST /api/agents/run
// ---------------------------------------------------------------------------

export async function runAgent(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body.input !== undefined && req.body.userInput === undefined
      ? { ...req.body, userInput: req.body.input }
      : req.body;

    const input = RunAgentSchema.parse(body);
    const result = await RuntimeEngine.execute(req.user!.sub, input);

    const status = result.status === "COMPLETED" ? 200 : 422;
    res.status(status).json({ success: result.status === "COMPLETED", data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/runs  — list runs for current user
// ---------------------------------------------------------------------------

export async function listRuns(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit   = Math.min(parseInt(req.query["limit"] as string || "20", 10), 100);
    const agentId = req.query["agentId"] as string | undefined;
    const runs    = await executionService.listByUser(req.user!.sub, { limit, agentId });
    res.json({ success: true, data: runs });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/runs/stats — usage stats
// ---------------------------------------------------------------------------

export async function runStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await executionService.stats(req.user!.sub);
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/agents/run/async — enqueue an agent run (returns immediately)
// ---------------------------------------------------------------------------

export async function runAgentAsync(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = RunAgentSchema.parse(req.body);
    const result = await RuntimeEngine.enqueue(req.user!.sub, input);
    res.status(202).json({
      success: true,
      data: {
        jobId:       result.jobId,
        executionId: result.executionId,
        queuedAt:    result.queuedAt,
        pollUrl:     `/api/agents/jobs/${result.jobId}`,
        executionUrl:`/api/agents/runs/${result.executionId}`,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/jobs/:jobId — poll a queued job's status
// ---------------------------------------------------------------------------

export async function getJobStatus(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { jobId } = req.params;
    const queue = getAgentRunQueue();
    const job   = await queue.getJob(jobId);

    if (!job) {
      return next(new AppError("Job not found.", 404, "JOB_NOT_FOUND"));
    }

    // Ownership check via job data
    if (job.data.userId !== req.user!.sub) {
      return next(new AppError("Access denied.", 403, "FORBIDDEN"));
    }

    const state    = await job.getState();
    const progress = job.progress as number | undefined;

    res.json({
      success: true,
      data: {
        jobId,
        state,                                  // "waiting" | "active" | "completed" | "failed" | "delayed"
        progress:     progress ?? 0,
        executionId:  job.data.executionLogId,
        agentId:      job.data.agentId,
        queuedAt:     new Date(job.timestamp),
        processedAt:  job.processedOn ? new Date(job.processedOn) : null,
        finishedAt:   job.finishedOn  ? new Date(job.finishedOn)  : null,
        attemptsMade: job.attemptsMade,
        result:       state === "completed" ? job.returnvalue : null,
        error:        state === "failed"    ? job.failedReason : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/queue/stats — queue health (admin / internal use)
// ---------------------------------------------------------------------------

export async function queueStats(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const stats = await getQueueStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/agents/runs/:executionId — single run detail
// ---------------------------------------------------------------------------

export async function getRunById(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const log = await executionService.getById(
      req.params["executionId"]!,
      req.user!.sub,
    );
    res.json({ success: true, data: log });
  } catch (err) {
    next(err);
  }
}
