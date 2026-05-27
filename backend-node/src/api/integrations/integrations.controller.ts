/**
 * src/api/integrations/integrations.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import { integrationService } from "../../services/integration.service";
import { oauthService } from "../../services/oauth.service";
import { AppError } from "../../middleware/errorHandler";

// GET /api/integrations
export async function listIntegrations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const integrations = await integrationService.listIntegrations();
    res.json({ success: true, data: integrations });
  } catch (err) { next(err); }
}

// GET /api/integrations/connections
export async function listConnections(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const connections = await integrationService.listUserConnections(req.user!.sub);
    res.json({ success: true, data: connections });
  } catch (err) { next(err); }
}

// GET /api/integrations/:slug/auth-url
export async function getAuthUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const url = await oauthService.getAuthUrl(req.params.slug!, req.user!.sub);
    res.json({ success: true, data: { url } });
  } catch (err) { next(err); }
}

// GET /api/integrations/:slug/callback
export async function handleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, state } = req.query;
    if (!code) throw new AppError("No code provided.", 400);
    
    // state is the userId in this basic implementation
    const userId = (state as string) || req.user?.sub;
    if (!userId) throw new AppError("No user context found.", 401);

    await oauthService.handleCallback(req.params.slug!, code as string, userId);
    
    // In production, redirect to a frontend success page
    res.send("OAuth connection successful! You can close this window.");
  } catch (err) { next(err); }
}

// POST /api/integrations/:slug/grant-agent
export async function grantAgentPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { agentId } = req.body;
    if (!agentId) throw new AppError("agentId is required.", 400);

    const permission = await integrationService.grantAgentPermission(req.user!.sub, agentId, req.params.slug!);
    res.json({ success: true, data: permission });
  } catch (err) { next(err); }
}
