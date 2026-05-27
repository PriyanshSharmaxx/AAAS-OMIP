/**
 * src/workers/worker.ts
 *
 * BullMQ Worker — processes jobs from the agent-runs and workflow-runs queues.
 *
 * This module exports factory functions. The actual Worker instances are
 * created in src/workers/index.ts (standalone process) or can be imported
 * by tests.
 *
 * Architecture:
 *   job received
 *     └─ agentRunProcessor()
 *         └─ executionService.executeQueued()  ← marks RUNNING, runs agent, persists
 *         └─ returns AgentRunJobResult
 *     └─ BullMQ stores result in Redis (accessible via job.returnvalue)
 */

import { Worker, Job, UnrecoverableError } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { logger } from "../lib/logger";
import { env } from "../lib/config";

import {
  QUEUE_NAMES,
  WorkflowRunJobData,
  WorkflowRunJobResult,
  NotificationJobData,
  SyncJobData,
  ScheduleJobData,
} from "./queue";

import { workflowService }  from "../services/workflow.service";
import { schedulerService, fireCron } from "../services/scheduler.service";
import { AppError }         from "../middleware/errorHandler";

// ---------------------------------------------------------------------------
// Agent run processor
// ---------------------------------------------------------------------------

import { RuntimeEngine } from "../services/runtime.service";

async function agentRunProcessor(
  job: Job<AgentRunJobData, AgentRunJobResult>,
): Promise<AgentRunJobResult> {
  const { executionLogId, userId, agentId, userInput, overrides, history, triggerSource, scheduleId, workflowRunId } = job.data;

  logger.info("Worker: processing agent run job", {
    jobId:         job.id,
    executionLogId,
    agentId,
    userId,
    attempt:       job.attemptsMade + 1,
  });

  await job.updateProgress(10); // signal processing has begun

  try {
    const result = await RuntimeEngine.executeQueued(
      executionLogId,
      userId,
      {
        agentId,
        userInput,
        mode: "quick",
        overrides,
        history,
        triggerSource,
        scheduleId,
        workflowRunId,
      },
    );

    await job.updateProgress(100);

    logger.info("Worker: agent run job complete", {
      jobId:         job.id,
      executionLogId,
      status:        result.status,
      durationMs:    result.durationMs,
      totalTokens:   result.usage.totalTokens,
    });

    return {
      executionLogId,
      status:      result.status,
      output:      result.output,
      error:       result.error,
      durationMs:  result.durationMs,
      totalTokens: result.usage.totalTokens,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    logger.error("Worker: agent run job failed", {
      jobId:         job.id,
      executionLogId,
      error:         message,
      attempt:       job.attemptsMade + 1,
    });

    // If it's an AppError with a client-side code, don't retry
    if (err instanceof AppError && err.statusCode < 500) {
      throw new UnrecoverableError(message);
    }

    throw err; // BullMQ will retry per backoff config
  }
}

// ---------------------------------------------------------------------------
// Workflow run processor
// ---------------------------------------------------------------------------

async function workflowRunProcessor(
  job: Job<WorkflowRunJobData, WorkflowRunJobResult>,
): Promise<WorkflowRunJobResult> {
  const { workflowRunId, workflowId, userId, initialInput, triggerSource } = job.data;

  logger.info("Worker: processing workflow run job", {
    jobId:         job.id,
    workflowRunId,
    workflowId,
    userId,
    attempt:       job.attemptsMade + 1,
  });

  await job.updateProgress(5);

  try {
    const result = await workflowService.run(
      workflowId,
      userId,
      { initialInput, triggerSource: triggerSource as "manual" | "scheduled" | "webhook" },
    );

    await job.updateProgress(100);

    logger.info("Worker: workflow run job complete", {
      jobId:         job.id,
      workflowRunId,
      status:        result.status,
      durationMs:    result.durationMs,
    });

    return {
      workflowRunId: result.runId,
      status:        result.status as "COMPLETED" | "FAILED",
      finalOutput:   "finalOutput" in result ? result.finalOutput : undefined,
      error:         "error" in result ? (result.error as string | undefined) : undefined,
      durationMs:    result.durationMs,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    logger.error("Worker: workflow run job failed", {
      jobId:        job.id,
      workflowRunId,
      error:        message,
      attempt:      job.attemptsMade + 1,
    });

    if (err instanceof AppError && err.statusCode < 500) {
      throw new UnrecoverableError(message);
    }

    throw err;
  }
}

// ---------------------------------------------------------------------------
// Notification processor
// ---------------------------------------------------------------------------

async function notificationProcessor(job: Job<NotificationJobData>): Promise<void> {
  const { type, recipient, title, message } = job.data;
  logger.info("Worker: processing notification", { type, recipient, jobId: job.id });
  
  // In a real app, use nodemailer for email, slack-web-api for slack, etc.
  // For now, we log and simulate success.
  await new Promise(r => setTimeout(r, 500)); 

  logger.info("Worker: notification sent", { jobId: job.id });
}

// ---------------------------------------------------------------------------
// Report processor
// ---------------------------------------------------------------------------

async function reportProcessor(job: Job<ReportJobData>): Promise<{ url: string }> {
  const { reportType, format, userId } = job.data;
  logger.info("Worker: generating report", { reportType, format, userId, jobId: job.id });

  await job.updateProgress(20);
  // Simulate heavy processing
  await new Promise(r => setTimeout(r, 3000));
  await job.updateProgress(80);

  // In real app, upload to S3 and return URL
  const url = `https://storage.omip.ai/reports/${userId}/${reportType}_${Date.now()}.${format}`;
  
  logger.info("Worker: report generated", { jobId: job.id, url });
  return { url };
}

// ---------------------------------------------------------------------------
// Sync processor
// ---------------------------------------------------------------------------

async function syncProcessor(job: Job<SyncJobData>): Promise<void> {
  const { integrationSlug, connectionId, fullSync } = job.data;
  logger.info("Worker: syncing integration", { integrationSlug, connectionId, fullSync, jobId: job.id });

  // Simulate sync logic
  await job.updateProgress(10);
  await new Promise(r => setTimeout(r, 2000));
  await job.updateProgress(100);

  logger.info("Worker: sync complete", { jobId: job.id });
}

// ---------------------------------------------------------------------------
// Schedule processor
// ---------------------------------------------------------------------------

async function scheduleProcessor(job: Job<ScheduleJobData>): Promise<void> {
  const { scheduleId } = job.data;
  logger.info("Worker: triggering schedule fire", { scheduleId, jobId: job.id });

  try {
    await fireCron(scheduleId);
    logger.info("Worker: schedule fire successful", { scheduleId, jobId: job.id });
  } catch (err) {
    logger.error("Worker: schedule fire failed", { scheduleId, jobId: job.id, err });
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Worker factories
// ---------------------------------------------------------------------------

export interface WorkerOptions {
  concurrency?: number;  // default from env
}

export function createAgentRunWorker(opts?: WorkerOptions): Worker<AgentRunJobData, AgentRunJobResult> {
  const concurrency = opts?.concurrency ?? env.WORKER_CONCURRENCY;

  const worker = new Worker<AgentRunJobData, AgentRunJobResult>(
    QUEUE_NAMES.AGENT_RUNS,
    agentRunProcessor,
    {
      connection:  createRedisConnection(),
      concurrency,
      // Stalled job detection: if job hasn't updated in 5 min, reclaim it
      stalledInterval: 30_000,
      maxStalledCount: 2,
    },
  );

  worker.on("completed", (job) =>
    logger.info("AgentRunWorker: job completed", { jobId: job.id }),
  );

  worker.on("failed", (job, err) =>
    logger.error("AgentRunWorker: job failed", {
      jobId:   job?.id,
      error:   err.message,
      attempts: job?.attemptsMade,
    }),
  );

  worker.on("stalled", (jobId) =>
    logger.warn("AgentRunWorker: job stalled", { jobId }),
  );

  worker.on("error", (err) =>
    logger.error("AgentRunWorker error", { err: err.message }),
  );

  logger.info(`AgentRunWorker started (concurrency=${concurrency})`);
  return worker;
}

export function createWorkflowRunWorker(opts?: WorkerOptions): Worker<WorkflowRunJobData, WorkflowRunJobResult> {
  const concurrency = opts?.concurrency ?? 2; // workflow runs are heavier — lower concurrency

  const worker = new Worker<WorkflowRunJobData, WorkflowRunJobResult>(
    QUEUE_NAMES.WORKFLOW_RUNS,
    workflowRunProcessor,
    {
      connection:      createRedisConnection(),
      concurrency,
      stalledInterval: 60_000,
      maxStalledCount: 1,
    },
  );

  worker.on("completed", (job) =>
    logger.info("WorkflowRunWorker: job completed", { jobId: job.id }),
  );

  worker.on("failed", (job, err) =>
    logger.error("WorkflowRunWorker: job failed", { jobId: job?.id, error: err.message }),
  );

  worker.on("error", (err) =>
    logger.error("WorkflowRunWorker error", { err: err.message }),
  );

  logger.info(`WorkflowRunWorker started (concurrency=${concurrency})`);
  return worker;
}

export function createNotificationWorker(): Worker<NotificationJobData> {
  return new Worker(QUEUE_NAMES.NOTIFICATIONS, notificationProcessor, {
    connection: createRedisConnection(),
    concurrency: 10, // notifications are light
  });
}

export function createReportWorker(): Worker<ReportJobData> {
  return new Worker(QUEUE_NAMES.REPORTS, reportProcessor, {
    connection: createRedisConnection(),
    concurrency: 2, // reports are heavy
  });
}

export function createSyncWorker(): Worker<SyncJobData> {
  return new Worker(QUEUE_NAMES.SYNC, syncProcessor, {
    connection: createRedisConnection(),
    concurrency: 5,
  });
}

export function createScheduleWorker(): Worker<ScheduleJobData> {
  return new Worker(QUEUE_NAMES.SCHEDULES, scheduleProcessor, {
    connection: createRedisConnection(),
    concurrency: 5,
  });
}
