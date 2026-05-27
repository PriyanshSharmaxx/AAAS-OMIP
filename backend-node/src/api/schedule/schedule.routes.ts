import { Router } from "express";
import {
  createSchedule,
  listSchedules,
  schedulerStatus,
  getSchedule,
  updateSchedule,
  deleteSchedule,
  pauseSchedule,
  resumeSchedule,
  triggerSchedule,
  getScheduleRuns,
} from "./schedule.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();
router.use(verifyUser);

/**
 * @route   GET /api/schedule/status
 * @desc    Number of active cron tasks currently running in this process
 * @access  Private
 */
router.get("/status", schedulerStatus);

/**
 * @route   POST /api/schedule
 * @desc    Create a new schedule
 * @access  Private
 * @body    { agentId, name, cronExpression, inputTemplate?, overrides?, timezone?, maxRetries? }
 */
router.post("/", createSchedule);

/**
 * @route   GET /api/schedule
 * @desc    List all active schedules for the current user
 * @access  Private
 */
router.get("/", listSchedules);

/**
 * @route   GET /api/schedule/:id
 * @desc    Get schedule detail
 * @access  Private (owner only)
 */
router.get("/:id", getSchedule);

/**
 * @route   PATCH /api/schedule/:id
 * @desc    Update schedule (restarts cron if cronExpression changed)
 * @access  Private (owner only)
 */
router.patch("/:id", updateSchedule);

/**
 * @route   DELETE /api/schedule/:id
 * @desc    Soft-delete schedule (stops cron, preserves run history)
 * @access  Private (owner only)
 */
router.delete("/:id", deleteSchedule);

/**
 * @route   POST /api/schedule/:id/pause
 * @desc    Pause a schedule (stops cron without deleting)
 * @access  Private (owner only)
 */
router.post("/:id/pause", pauseSchedule);

/**
 * @route   POST /api/schedule/:id/resume
 * @desc    Resume a paused schedule
 * @access  Private (owner only)
 */
router.post("/:id/resume", resumeSchedule);

/**
 * @route   POST /api/schedule/:id/trigger
 * @desc    Manually fire a schedule immediately (outside the cron)
 * @access  Private (owner only)
 */
router.post("/:id/trigger", triggerSchedule);

/**
 * @route   GET /api/schedule/:id/runs
 * @desc    Run history for a specific schedule
 * @access  Private (owner only)
 * @query   limit (default 20, max 100)
 */
router.get("/:id/runs", getScheduleRuns);

export default router;
