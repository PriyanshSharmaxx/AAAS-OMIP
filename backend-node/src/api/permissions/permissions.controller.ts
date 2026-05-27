/**
 * src/api/permissions/permissions.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import {
  permissionService,
  GrantSchema,
  ValidateSchema,
  ListPermissionsSchema,
} from "../../services/permission.service";
import { AppError } from "../../middleware/errorHandler";

// POST /api/permissions
export async function grantPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = GrantSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const permission = await permissionService.grant(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: permission });
  } catch (err) { next(err); }
}

// DELETE /api/permissions/:id
export async function revokePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await permissionService.revoke(req.user!.sub, req.params.id!);
    res.json({ success: true, message: "Permission revoked." });
  } catch (err) { next(err); }
}

// GET /api/permissions?resourceType=AGENT&resourceId=...
export async function listPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ListPermissionsSchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const permissions = await permissionService.list(req.user!.sub, parsed.data);
    res.json({ success: true, data: permissions, total: permissions.length });
  } catch (err) { next(err); }
}

// POST /api/permissions/validate
export async function validatePermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ValidateSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const result = await permissionService.validate(parsed.data);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}
