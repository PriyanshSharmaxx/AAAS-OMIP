/**
 * src/api/apis/apis.controller.ts
 *
 * HTTP handlers for the External API Marketplace.
 */

import { Request, Response, NextFunction } from "express";
import {
  apisService,
  ApiProductQuerySchema,
  ProxyExecuteSchema,
} from "../../services/apis.service";
import { AppError } from "../../middleware/errorHandler";

// GET /api/apis
export async function listApis(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ApiProductQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }
    const result = await apisService.list(parsed.data, req.user?.sub);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
}

// GET /api/apis/:id
export async function getApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await apisService.getById(req.params["id"]!, req.user?.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// POST /api/apis/:id/subscribe
export async function subscribeToApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { planId } = req.body;
    const data = await apisService.subscribe(req.params["id"]!, req.user!.sub, planId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
}

// DELETE /api/apis/:id/subscribe
export async function unsubscribeFromApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await apisService.unsubscribe(req.params["id"]!, req.user!.sub);
    res.json({ success: true, message: "Unsubscribed successfully." });
  } catch (err) { next(err); }
}

// GET /api/apis/my-keys
export async function myApiKeys(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await apisService.myKeys(req.user!.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// DELETE /api/apis/keys/:keyId
export async function revokeApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await apisService.revokeKey(req.params["keyId"]!, req.user!.sub);
    res.json({ success: true, message: "API key revoked." });
  } catch (err) { next(err); }
}

// POST /api/apis/keys/:keyId/rotate
export async function rotateApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await apisService.rotateKey(req.params["keyId"]!, req.user!.sub);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// POST /api/apis/execute/:apiId
export async function executeApi(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ProxyExecuteSchema.safeParse(req.body);
    if (!parsed.success) {
      return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    }
    const data = await apisService.execute(req.params["apiId"]!, req.user!.sub, parsed.data);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}

// GET /api/apis/usage  (all) or /api/apis/usage/:apiId (per-api)
export async function usageStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const apiId = req.params["apiId"];
    const data  = await apisService.usageStats(req.user!.sub, apiId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
}
