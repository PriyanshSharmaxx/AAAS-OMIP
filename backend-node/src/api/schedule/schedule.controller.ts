/**
 * src/api/schedule/schedule.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import {
  schedulerService,
  CreateScheduleSchema,
  UpdateScheduleSchema,
} from "../../services/scheduler.service";
import { AppError } from "../../middleware/errorHandler";

// POST /api/schedule
export async function createSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }
    const schedule = await schedulerService.create(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: schedule });
  } catch (err) { next(err); }
}

// GET /api/schedule
export async function listSchedules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedules = await schedulerService.list(req.user!.sub);
    res.json({ success: true, data: schedules, total: schedules.length });
  } catch (err) { next(err); }
}

// GET /api/schedule/status
export async function schedulerStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: schedulerService.status() });
  } catch (err) { next(err); }
}

// GET /api/schedule/:id
export async function getSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await schedulerService.getById(req.params.id!, req.user!.sub);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
}

// PATCH /api/schedule/:id
export async function updateSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateScheduleSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }
    const schedule = await schedulerService.update(req.params.id!, req.user!.sub, parsed.data);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
}

// DELETE /api/schedule/:id
export async function deleteSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await schedulerService.delete(req.params.id!, req.user!.sub);
    res.json({ success: true, message: "Schedule deleted." });
  } catch (err) { next(err); }
}

// POST /api/schedule/:id/pause
export async function pauseSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await schedulerService.pause(req.params.id!, req.user!.sub);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
}

// POST /api/schedule/:id/resume
export async function resumeSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const schedule = await schedulerService.resume(req.params.id!, req.user!.sub);
    res.json({ success: true, data: schedule });
  } catch (err) { next(err); }
}

// POST /api/schedule/:id/trigger
export async function triggerSchedule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await schedulerService.trigger(req.params.id!, req.user!.sub);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /api/schedule/:id/runs
export async function getScheduleRuns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const limit = Math.min(parseInt(req.query["limit"] as string || "20", 10), 100);
    const runs  = await schedulerService.getRuns(req.params.id!, req.user!.sub, limit);
    res.json({ success: true, data: runs, total: runs.length });
  } catch (err) { next(err); }
}
