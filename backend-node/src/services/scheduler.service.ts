/**
 * src/services/scheduler.service.ts
 *
 * Scheduler System — creates, manages, and fires node-cron jobs that
 * trigger agent runs via BullMQ.
 *
 * Architecture:
 *   schedulerService.init()     — load all active schedules at startup, start crons
 *   schedulerService.create()   — persist + start cron
 *   schedulerService.pause()    — stop cron task, mark isPaused
 *   schedulerService.resume()   — restart cron task, clear isPaused
 *   schedulerService.delete()   — stop + soft-delete
 *   schedulerService.trigger()  — fire immediately (manual / out-of-band)
 *
 * When a cron fires:
 *   1. Create ScheduleRun (PENDING)
 *   2. Enqueue job via BullMQ (agent-runs queue)
 *   3. Store jobId on ScheduleRun
 *   4. Update schedule.lastRunAt + nextRunAt
 */

import { scheduleRepo, scheduleRunRepo, ScheduleRunStatus } from "../lib/db";
import { getScheduleQueue } from "../workers/queue";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Cron task registry — holds running ScheduledTask objects by schedule ID
// ---------------------------------------------------------------------------

const ACTIVE_TASKS = new Map<string, cron.ScheduledTask>();

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const CreateScheduleSchema = z.object({
  agentId:       z.string().uuid("agentId must be a UUID"),
  name:          z.string().min(1).max(100).trim(),
  description:   z.string().max(500).trim().default(""),
  cronExpression: z
    .string()
    .min(1)
    .max(100),
  inputTemplate: z.string().min(1).max(8000).default("Run scheduled task."),
  overrides: z
    .object({
      model:       z.string().optional(),
      temperature: z.number().min(0).max(2).optional(),
      maxTokens:   z.number().int().min(1).max(128_000).optional(),
    })
    .default({}),
  timezone: z.string().default("UTC"),
  maxRetries: z.number().int().min(0).max(10).default(3),
});

export const UpdateScheduleSchema = CreateScheduleSchema.partial().omit({ agentId: true });

// ---------------------------------------------------------------------------
// Template interpolation for inputTemplate
// ---------------------------------------------------------------------------

function renderInputTemplate(template: string, scheduleName: string): string {
  const now  = new Date();
  return template
    .replace(/\{\{now\}\}/g,            now.toISOString())
    .replace(/\{\{date\}\}/g,           now.toISOString().split("T")[0]!)
    .replace(/\{\{time\}\}/g,           now.toTimeString().slice(0, 8))
    .replace(/\{\{schedule_name\}\}/g,  scheduleName)
    .replace(/\{\{timestamp\}\}/g,      String(now.getTime()));
}

// ---------------------------------------------------------------------------
// Approximate next-run calculator (for display only — node-cron owns actual timing)
// ---------------------------------------------------------------------------

function estimateNextRun(cronExpr: string): Date {
  // Parse a subset of cron expressions to give a reasonable UI estimate.
  // This is intentionally approximate; the actual next-fire is managed by node-cron.
  const parts = cronExpr.trim().split(/\s+/);
  if (parts.length < 5) return new Date(Date.now() + 60_000);

  const [minute, hour] = parts;
  const now = new Date();

  // If both minute and hour are fixed numbers, estimate next occurrence today or tomorrow
  const m = parseInt(minute!, 10);
  const h = parseInt(hour!, 10);

  if (!isNaN(m) && !isNaN(h)) {
    const candidate = new Date(now);
    candidate.setHours(h, m, 0, 0);
    if (candidate <= now) {
      candidate.setDate(candidate.getDate() + 1); // tomorrow
    }
    return candidate;
  }

  // For wildcard / complex expressions, default to ~next minute
  const next = new Date(now);
  next.setSeconds(0, 0);
  next.setMinutes(next.getMinutes() + 1);
  return next;
}

// ---------------------------------------------------------------------------
// Core fire function — called every time a cron triggers
// ---------------------------------------------------------------------------

export async function fireCron(scheduleId: string): Promise<void> {
  // Load schedule (including agent details)
  const schedule = await scheduleRepo.findById(scheduleId);
  if (!schedule || !schedule.isActive || schedule.isPaused) {
    logger.warn("Cron fired for inactive/paused schedule — skipping", { scheduleId });
    return;
  }

  const agent = (schedule as unknown as { agent: { id: string; name: string; prompt: string; model: string; config: unknown; tools: unknown } }).agent;
  if (!agent) {
    logger.error("Schedule references missing agent", { scheduleId, agentId: schedule.agentId });
    return;
  }

  // Create ScheduleRun (PENDING)
  const scheduleRun = await scheduleRunRepo.create({
    schedule: { connect: { id: scheduleId } },
    status:   ScheduleRunStatus.PENDING,
  });

  logger.info("Schedule fired", { scheduleId, scheduleRunId: scheduleRun.id, agentId: schedule.agentId });

  try {
    const userInput  = renderInputTemplate(schedule.inputTemplate, schedule.name);
    const overrides  = schedule.overrides as Record<string, unknown>;

    const { RuntimeEngine } = await import("./runtime.service");

    const result = await RuntimeEngine.enqueue(schedule.userId, {
      agentId: schedule.agentId,
      userInput,
      mode: "quick",
      overrides: Object.keys(overrides).length ? overrides : undefined,
      triggerSource: "scheduled",
      scheduleId: schedule.id,
    });

    // Update ScheduleRun with jobId + executionLogId
    await scheduleRunRepo.update(scheduleRun.id, {
      status:         ScheduleRunStatus.RUNNING,
      jobId:          result.jobId,
      executionLogId: result.executionId,
    });

    // Update schedule stats + next run estimate
    await scheduleRepo.update(schedule.id, {
      lastRunAt: new Date(),
      nextRunAt: estimateNextRun(schedule.cronExpression),
    });
    await scheduleRepo.incrementRuns(schedule.id, false);

    logger.info("Schedule job enqueued", {
      scheduleId,
      scheduleRunId: scheduleRun.id,
      jobId:         result.jobId,
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Unknown error";
    logger.error("Failed to enqueue scheduled run", { scheduleId, error });

    await scheduleRunRepo.update(scheduleRun.id, {
      status: ScheduleRunStatus.FAILED,
      error,
      completedAt: new Date(),
    });
    await scheduleRepo.incrementRuns(schedule.id, true);
  }
}

// ---------------------------------------------------------------------------
// Start a cron task for a schedule
// ---------------------------------------------------------------------------

async function startCronTask(scheduleId: string, cronExpression: string): Promise<void> {
  const queue = getScheduleQueue();
  
  await stopCronTask(scheduleId);

  await queue.add(
    `trigger:${scheduleId}`,
    { scheduleId },
    {
      repeat: { pattern: cronExpression },
      jobId: `repeat:${scheduleId}`,
    }
  );

  logger.debug("Schedule enqueued in BullMQ (Repeatable)", { scheduleId, cronExpression });
}

async function stopCronTask(scheduleId: string): Promise<void> {
  const queue = getScheduleQueue();
  const repeatableJobs = await queue.getRepeatableJobs();
  const job = repeatableJobs.find(j => j.id === `repeat:${scheduleId}`);
  if (job) {
    await queue.removeRepeatableByKey(job.key);
    logger.debug("Schedule removed from BullMQ", { scheduleId });
  }
}

// ---------------------------------------------------------------------------
// schedulerService
// ---------------------------------------------------------------------------

export const schedulerService = {

  // ── init — call once at server startup ───────────────────────────────────

  async init(): Promise<void> {
    const schedules = await scheduleRepo.findAllActive();

    for (const s of schedules) {
      startCronTask(s.id, s.cronExpression);
    }

    logger.info(`Scheduler initialised — ${schedules.length} active cron(s) loaded`);
  },

  // ── create ───────────────────────────────────────────────────────────────

  async create(userId: string, input: z.infer<typeof CreateScheduleSchema>) {
    const schedule = await scheduleRepo.create({
      user:          { connect: { id: userId           } },
      agent:         { connect: { id: input.agentId    } },
      name:          input.name,
      description:   input.description,
      cronExpression: input.cronExpression,
      inputTemplate: input.inputTemplate,
      overrides:     input.overrides as object,
      timezone:      input.timezone,
      maxRetries:    input.maxRetries,
      nextRunAt:     estimateNextRun(input.cronExpression),
    });

    startCronTask(schedule.id, schedule.cronExpression);

    logger.info("Schedule created", { scheduleId: schedule.id, userId, cron: input.cronExpression });
    return schedule;
  },

  // ── list ─────────────────────────────────────────────────────────────────

  async list(userId: string) {
    return scheduleRepo.findByUser(userId);
  },

  // ── getById ──────────────────────────────────────────────────────────────

  async getById(scheduleId: string, userId: string) {
    const schedule = await scheduleRepo.findById(scheduleId);
    if (!schedule || !schedule.isActive) {
      throw new AppError("Schedule not found.", 404, "SCHEDULE_NOT_FOUND");
    }
    if (schedule.userId !== userId) {
      throw new AppError("Access denied.", 403, "FORBIDDEN");
    }
    return schedule;
  },

  // ── update ───────────────────────────────────────────────────────────────

  async update(scheduleId: string, userId: string, input: z.infer<typeof UpdateScheduleSchema>) {
    const schedule = await schedulerService.getById(scheduleId, userId);

    const updated = await scheduleRepo.update(schedule.id, {
      ...(input.name           !== undefined ? { name:           input.name }           : {}),
      ...(input.description    !== undefined ? { description:    input.description }    : {}),
      ...(input.inputTemplate  !== undefined ? { inputTemplate:  input.inputTemplate }  : {}),
      ...(input.overrides      !== undefined ? { overrides:      input.overrides as object } : {}),
      ...(input.timezone       !== undefined ? { timezone:       input.timezone }       : {}),
      ...(input.maxRetries     !== undefined ? { maxRetries:     input.maxRetries }     : {}),
      ...(input.cronExpression !== undefined ? {
        cronExpression: input.cronExpression,
        nextRunAt: estimateNextRun(input.cronExpression),
      } : {}),
    });

    // Restart cron if expression changed and schedule is running
    if (input.cronExpression && !schedule.isPaused) {
      startCronTask(schedule.id, input.cronExpression);
    }

    return updated;
  },

  // ── pause ─────────────────────────────────────────────────────────────────

  async pause(scheduleId: string, userId: string) {
    const schedule = await schedulerService.getById(scheduleId, userId);
    if (schedule.isPaused) throw new AppError("Schedule is already paused.", 400, "ALREADY_PAUSED");

    stopCronTask(schedule.id);
    return scheduleRepo.update(schedule.id, { isPaused: true, nextRunAt: null });
  },

  // ── resume ────────────────────────────────────────────────────────────────

  async resume(scheduleId: string, userId: string) {
    const schedule = await schedulerService.getById(scheduleId, userId);
    if (!schedule.isPaused) throw new AppError("Schedule is not paused.", 400, "NOT_PAUSED");

    startCronTask(schedule.id, schedule.cronExpression);
    return scheduleRepo.update(schedule.id, {
      isPaused:  false,
      nextRunAt: estimateNextRun(schedule.cronExpression),
    });
  },

  // ── delete ────────────────────────────────────────────────────────────────

  async delete(scheduleId: string, userId: string) {
    await schedulerService.getById(scheduleId, userId);
    stopCronTask(scheduleId);
    await scheduleRepo.softDelete(scheduleId);
  },

  // ── trigger — fire immediately outside the cron ───────────────────────────

  async trigger(scheduleId: string, userId: string) {
    const schedule = await schedulerService.getById(scheduleId, userId);
    // Fire manually — same as cron fire but triggerSource = "manual"
    await fireCron(schedule.id);
    return { triggered: true, scheduleId: schedule.id, triggeredAt: new Date() };
  },

  // ── getRuns — run history for a schedule ──────────────────────────────────

  async getRuns(scheduleId: string, userId: string, limit = 20) {
    await schedulerService.getById(scheduleId, userId);
    return scheduleRunRepo.findBySchedule(scheduleId, limit);
  },

  // ── status — active task count ────────────────────────────────────────────

  status() {
    return {
      activeTasks: ACTIVE_TASKS.size,
      scheduleIds: Array.from(ACTIVE_TASKS.keys()),
    };
  },

  // ── shutdown — stop all crons gracefully ──────────────────────────────────

  shutdown() {
    for (const [id, task] of ACTIVE_TASKS.entries()) {
      task.stop();
      ACTIVE_TASKS.delete(id);
    }
    logger.info("All cron tasks stopped");
  },
};

/** Returns the number of currently active cron tasks (for health checks). */
export function getActiveCronCount(): number {
  return ACTIVE_TASKS.size;
}
