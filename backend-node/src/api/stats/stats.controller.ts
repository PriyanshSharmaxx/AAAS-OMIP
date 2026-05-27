/**
 * src/api/stats/stats.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import { getDashboardStats } from "../../services/stats.service";

// GET /api/stats/dashboard
export async function dashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await getDashboardStats(req.user!.sub);
    res.json({ success: true, data: stats });
  } catch (err) { next(err); }
}
