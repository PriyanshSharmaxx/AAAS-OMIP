import { Router } from "express";
import { dashboardStats } from "./stats.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();
router.use(verifyUser);

/**
 * @route   GET /api/stats/dashboard
 * @desc    Aggregated cross-module counts for the user dashboard
 * @access  Private
 * @returns agents, executions, usage, workflows, schedules, teams, marketplace, notifications
 */
router.get("/dashboard", dashboardStats);

export default router;
