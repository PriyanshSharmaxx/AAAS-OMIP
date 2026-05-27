/**
 * src/api/versioning/versioning.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import {
  versioningService,
  SaveVersionSchema,
  RollbackSchema,
} from "../../services/versioning.service";
import { AppError } from "../../middleware/errorHandler";

// POST /api/agents/:id/versions
export async function saveVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = SaveVersionSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const version = await versioningService.saveVersion(req.params["id"] as string, req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: version });
  } catch (err) { next(err); }
}

// GET /api/agents/:id/versions
export async function listVersions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const versions = await versioningService.listVersions(req.params["id"] as string, req.user!.sub);
    res.json({ success: true, data: versions, total: versions.length });
  } catch (err) { next(err); }
}

// GET /api/agents/:id/versions/:versionId
export async function getVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const version = await versioningService.getVersion(req.params["id"] as string, req.params["versionId"] as string, req.user!.sub);
    res.json({ success: true, data: version });
  } catch (err) { next(err); }
}

// POST /api/agents/:id/versions/:versionId/rollback
export async function rollback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = RollbackSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const result = await versioningService.rollback(req.params["id"] as string, req.params["versionId"] as string, req.user!.sub, parsed.data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// DELETE /api/agents/:id/versions/:versionId
export async function deleteVersion(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await versioningService.deleteVersion(req.params["id"] as string, req.params["versionId"] as string, req.user!.sub);
    res.json({ success: true, message: "Version deleted." });
  } catch (err) { next(err); }
}
