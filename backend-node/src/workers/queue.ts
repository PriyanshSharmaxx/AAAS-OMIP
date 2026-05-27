/**
 * src/workers/queue.ts
 *
 * BullMQ queue definitions and typed job data interfaces.
 *
 * Two queues:
 *   agent-runs     — async agent execution jobs
 *   workflow-runs  — async workflow execution jobs
 *
 * Both queues use the same Redis connection factory from lib/redis.ts.
 * BullMQ requires a *separate* connection per queue (no sharing with
 * the main ioredis instance used for cache/pub-sub).
 */

import { Queue, QueueEvents, JobsOptions } from "bullmq";
import { createRedisConnection } from "../lib/redis";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// Queue names
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = {
  AGENT_RUNS:    "agent-runs",
  WORKFLOW_RUNS: "workflow-runs",
  NOTIFICATIONS: "notifications",
  REPORTS:       "reports",
  SYNC:          "sync",
  SCHEDULES:     "schedules",
} as const;

// ---------------------------------------------------------------------------
// Typed job data
// ---------------------------------------------------------------------------

/**
 * AgentRunJobData — payload enqueued when a client calls POST /run/async.
 * The pre-created ExecutionLog ID is included so the worker can update it
 * rather than creating a duplicate record.
 */
export interface AgentRunJobData {
  executionLogId: string;  // pre-created ExecutionLog.id (status = PENDING)
  userId:         string;
  agentId:        string;
  agentName:      string;
  userInput:      string;
  overrides?: {
    model?:       string;
    temperature?: number;
    maxTokens?:   number;
  };
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  triggerSource:  "manual" | "scheduled" | "webhook" | "workflow";
  scheduleId?:    string;
  workflowRunId?: string;
}

export interface AgentRunJobResult {
  executionLogId: string;
  status:         "COMPLETED" | "FAILED";
  output:         string;
  error?:         string;
  durationMs:     number;
  totalTokens:    number;
}

/**
 * WorkflowRunJobData — payload for async workflow execution.
 */
export interface WorkflowRunJobData {
  workflowRunId:  string;  // pre-created WorkflowRun.id (status = PENDING)
  workflowId:     string;
  userId:         string;
  initialInput:   string;
  triggerSource:  "manual" | "scheduled" | "webhook";
}

export interface WorkflowRunJobResult {
  workflowRunId: string;
  status:        "COMPLETED" | "FAILED";
  finalOutput?:  string;
  error?:        string;
  durationMs:    number;
}

/**
 * NotificationJobData — email, slack, or webhook
 */
export interface NotificationJobData {
  userId:      string;
  type:        "email" | "slack" | "webhook" | "in_app";
  title:       string;
  message:     string;
  metadata?:   Record<string, unknown>;
  recipient?:  string; // email or webhook url
}

/**
 * ReportJobData — PDF/CSV generation
 */
export interface ReportJobData {
  userId:      string;
  reportType:  "usage" | "audit" | "performance";
  format:      "pdf" | "csv" | "json";
  dateRange:   { start: string; end: string };
  filters?:    Record<string, unknown>;
}

/**
 * SyncJobData — Integration data sync
 */
export interface SyncJobData {
  userId:         string;
  connectionId:   string;
  integrationSlug: string;
  fullSync:       boolean;
}

/**
 * ScheduleJobData — triggers a fireCron call
 */
export interface ScheduleJobData {
  scheduleId: string;
}

// ---------------------------------------------------------------------------
// Default job options
// ---------------------------------------------------------------------------

export const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type:  "exponential",
    delay: 2_000, // 2s, 4s, 8s
  },
  removeOnComplete: { count: 100, age: 86_400 },     // keep last 100, max 24h
  removeOnFail:     { count: 200, age: 7 * 86_400 }, // keep last 200, max 7 days
};

// High-priority options — no retries (used for webhook-triggered runs)
export const PRIORITY_JOB_OPTIONS: JobsOptions = {
  ...DEFAULT_JOB_OPTIONS,
  priority:  1,
  attempts:  1,
  removeOnFail: { count: 50, age: 86_400 },
};

// ---------------------------------------------------------------------------
// Queue singletons
// ---------------------------------------------------------------------------

let agentRunQueue:    Queue<AgentRunJobData,    AgentRunJobResult>    | null = null;
let workflowRunQueue: Queue<WorkflowRunJobData, WorkflowRunJobResult> | null = null;

export function getAgentRunQueue(): Queue<AgentRunJobData, AgentRunJobResult> {
  if (!agentRunQueue) {
    agentRunQueue = new Queue<AgentRunJobData, AgentRunJobResult>(
      QUEUE_NAMES.AGENT_RUNS,
      {
        connection:     createRedisConnection(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      },
    );

    agentRunQueue.on("error", (err) =>
      logger.error("AgentRunQueue error", { err: err.message }),
    );

    logger.info("AgentRunQueue initialised");
  }
  return agentRunQueue;
}

export function getWorkflowRunQueue(): Queue<WorkflowRunJobData, WorkflowRunJobResult> {
  if (!workflowRunQueue) {
    workflowRunQueue = new Queue<WorkflowRunJobData, WorkflowRunJobResult>(
      QUEUE_NAMES.WORKFLOW_RUNS,
      {
        connection:     createRedisConnection(),
        defaultJobOptions: DEFAULT_JOB_OPTIONS,
      },
    );

    workflowRunQueue.on("error", (err) =>
      logger.error("WorkflowRunQueue error", { err: err.message }),
    );

    logger.info("WorkflowRunQueue initialised");
  }
  return workflowRunQueue;
}

let notificationQueue: Queue<NotificationJobData> | null = null;
export function getNotificationQueue(): Queue<NotificationJobData> {
  if (!notificationQueue) {
    notificationQueue = new Queue(QUEUE_NAMES.NOTIFICATIONS, {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return notificationQueue;
}

let reportQueue: Queue<ReportJobData> | null = null;
export function getReportQueue(): Queue<ReportJobData> {
  if (!reportQueue) {
    reportQueue = new Queue(QUEUE_NAMES.REPORTS, {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return reportQueue;
}

let syncQueue: Queue<SyncJobData> | null = null;
export function getSyncQueue(): Queue<SyncJobData> {
  if (!syncQueue) {
    syncQueue = new Queue(QUEUE_NAMES.SYNC, {
      connection: createRedisConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }
  return syncQueue;
}

let scheduleQueue: Queue<ScheduleJobData> | null = null;
export function getScheduleQueue(): Queue<ScheduleJobData> {
  if (!scheduleQueue) {
    scheduleQueue = new Queue(QUEUE_NAMES.SCHEDULES, {
      connection: createRedisConnection(),
      defaultJobOptions: {
        ...DEFAULT_JOB_OPTIONS,
        // Schedule triggers shouldn't be retried too many times
        attempts: 1, 
      },
    });
  }
  return scheduleQueue;
}

// ---------------------------------------------------------------------------
// QueueEvents (for listening to job completions from the API server side)
// ---------------------------------------------------------------------------

let agentRunQueueEvents: QueueEvents | null = null;

export function getAgentRunQueueEvents(): QueueEvents {
  if (!agentRunQueueEvents) {
    agentRunQueueEvents = new QueueEvents(
      QUEUE_NAMES.AGENT_RUNS,
      { connection: createRedisConnection() },
    );
  }
  return agentRunQueueEvents;
}

// ---------------------------------------------------------------------------
// Queue stats helper
// ---------------------------------------------------------------------------

export async function getQueueStats() {
  const agentQ    = getAgentRunQueue();
  const workflowQ = getWorkflowRunQueue();
  const notifyQ   = getNotificationQueue();
  const reportQ   = getReportQueue();
  const syncQ     = getSyncQueue();
  const scheduleQ = getScheduleQueue();

  const [
    agentCounts, 
    workflowCounts,
    notifyCounts,
    reportCounts,
    syncCounts,
    scheduleCounts
  ] = await Promise.all([
    agentQ.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    workflowQ.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    notifyQ.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    reportQ.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    syncQ.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
    scheduleQ.getJobCounts("waiting", "active", "completed", "failed", "delayed"),
  ]);

  return {
    agentRuns: { queue: QUEUE_NAMES.AGENT_RUNS, counts: agentCounts },
    workflowRuns: { queue: QUEUE_NAMES.WORKFLOW_RUNS, counts: workflowCounts },
    notifications: { queue: QUEUE_NAMES.NOTIFICATIONS, counts: notifyCounts },
    reports: { queue: QUEUE_NAMES.REPORTS, counts: reportCounts },
    sync: { queue: QUEUE_NAMES.SYNC, counts: syncCounts },
    schedules: { queue: QUEUE_NAMES.SCHEDULES, counts: scheduleCounts },
  };
}

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

export async function closeQueues(): Promise<void> {
  await Promise.all([
    agentRunQueue?.close(),
    workflowRunQueue?.close(),
    notificationQueue?.close(),
    reportQueue?.close(),
    syncQueue?.close(),
    agentRunQueueEvents?.close(),
  ]);
  logger.info("Queues closed");
}
