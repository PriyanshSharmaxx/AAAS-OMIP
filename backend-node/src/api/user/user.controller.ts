/**
 * src/api/user/user.controller.ts
 *
 * User-level endpoints that sit outside the auth flow.
 *
 * Routes:
 *   GET /api/user/credits          — current balance + lifetime usage
 *   GET /api/user/credit-history   — recent CreditLog entries
 */

import { Request, Response, NextFunction } from "express";
import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";

// ---------------------------------------------------------------------------
// GET /api/user/credits
// ---------------------------------------------------------------------------

export async function getUserCredits(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.sub },
      select: { credits: true, totalCreditsUsed: true },
    });

    if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");

    res.json({
      success: true,
      data: {
        credits:          user.credits,
        totalCreditsUsed: user.totalCreditsUsed,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/user/credit-history
// ---------------------------------------------------------------------------

export async function getCreditHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const limit = Math.min(
      parseInt(req.query["limit"] as string || "20", 10),
      100,
    );

    const logs = await prisma.creditLog.findMany({
      where:   { userId: req.user!.sub },
      orderBy: { createdAt: "desc" },
      take:    limit,
      select: {
        id:        true,
        agentId:   true,
        amount:    true,
        type:      true,
        note:      true,
        createdAt: true,
      },
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    next(err);
  }
}
