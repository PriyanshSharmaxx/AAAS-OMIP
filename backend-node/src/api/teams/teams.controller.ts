/**
 * src/api/teams/teams.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import {
  teamService,
  CreateTeamSchema,
  UpdateTeamSchema,
  InviteMemberSchema,
  ChangeRoleSchema,
} from "../../services/team.service";
import { AppError } from "../../middleware/errorHandler";
import { TeamRole } from "../../lib/db";

// POST /api/teams
export async function createTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = CreateTeamSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const team = await teamService.create(req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: team });
  } catch (err) { next(err); }
}

// GET /api/teams
export async function listTeams(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const teams = await teamService.list(req.user!.sub);
    res.json({ success: true, data: teams, total: teams.length });
  } catch (err) { next(err); }
}

// GET /api/teams/:id
export async function getTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { team, myRole } = await teamService.getById(req.params.id!, req.user!.sub);
    res.json({ success: true, data: { ...team, myRole } });
  } catch (err) { next(err); }
}

// PATCH /api/teams/:id
export async function updateTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = UpdateTeamSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const team = await teamService.update(req.params.id!, req.user!.sub, parsed.data);
    res.json({ success: true, data: team });
  } catch (err) { next(err); }
}

// DELETE /api/teams/:id
export async function deleteTeam(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await teamService.delete(req.params.id!, req.user!.sub);
    res.json({ success: true, message: "Team deleted." });
  } catch (err) { next(err); }
}

// POST /api/teams/:id/invite
export async function inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = InviteMemberSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const result = await teamService.invite(req.params.id!, req.user!.sub, parsed.data);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/teams/invites/:token/accept
export async function acceptInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teamService.acceptInvite(req.params.token!, req.user!.sub);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// POST /api/teams/invites/:token/decline
export async function declineInvite(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await teamService.declineInvite(req.params.token!, req.user!.sub);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// GET /api/teams/invites/pending  — my pending invites
export async function myPendingInvites(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const invites = await teamService.listPendingInvites(req.user!.sub);
    res.json({ success: true, data: invites, total: invites.length });
  } catch (err) { next(err); }
}

// PATCH /api/teams/:id/members/:userId/role
export async function changeMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ChangeRoleSchema.safeParse(req.body);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const result = await teamService.changeRole(
      req.params.id!,
      req.user!.sub,
      req.params.userId!,
      parsed.data.role as TeamRole,
    );
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
}

// DELETE /api/teams/:id/members/:userId
export async function removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await teamService.removeMember(req.params.id!, req.user!.sub, req.params.userId!);
    res.json({ success: true, message: "Member removed." });
  } catch (err) { next(err); }
}

// POST /api/teams/:id/transfer
export async function transferOwnership(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { newOwnerId } = req.body as { newOwnerId?: string };
    if (!newOwnerId) return next(new AppError("newOwnerId is required.", 400, "VALIDATION_ERROR"));
    await teamService.transferOwnership(req.params.id!, req.user!.sub, newOwnerId);
    res.json({ success: true, message: "Ownership transferred." });
  } catch (err) { next(err); }
}

// POST /api/teams/:id/credits
export async function addTeamCredits(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { amount, note } = req.body as { amount?: number; note?: string };
    if (!amount || amount <= 0) return next(new AppError("Positive amount is required.", 400, "VALIDATION_ERROR"));
    const team = await teamService.addCredits(req.params.id!, req.user!.sub, amount, note);
    res.json({ success: true, data: { credits: team.credits } });
  } catch (err) { next(err); }
}

// PATCH /api/teams/:id/security
export async function updateSecurityPolicy(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { twoFactorEnforced } = req.body as { twoFactorEnforced?: boolean };
    if (twoFactorEnforced === undefined) return next(new AppError("twoFactorEnforced is required.", 400, "VALIDATION_ERROR"));
    const team = await teamService.toggle2FAEnforcement(req.params.id!, req.user!.sub, twoFactorEnforced);
    res.json({ success: true, data: { twoFactorEnforced: team.twoFactorEnforced } });
  } catch (err) { next(err); }
}

// GET /api/teams/:id/agents
export async function listTeamAgents(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { prisma } = await import("../../lib/prisma");
    const { id } = req.params;
    // Check access first
    await teamService.getById(id!, req.user!.sub);
    
    const agents = await prisma.agent.findMany({
      where: { teamId: id, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
    });
    
    res.json({ success: true, data: agents, total: agents.length });
  } catch (err) { next(err); }
}

// GET /api/teams/:id/audit-logs
export async function getTeamAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { auditLogRepo } = await import("../../lib/db");
    const { id } = req.params;
    // Check ADMIN access
    const { myRole } = await teamService.getById(id!, req.user!.sub);
    if (myRole !== "OWNER" && myRole !== "ADMIN") {
      throw new AppError("Access denied.", 403, "FORBIDDEN");
    }

    const { prisma } = await import("../../lib/prisma");
    const logs = await prisma.auditLog.findMany({
      where: { entityType: "TEAM", entityId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { username: true, displayName: true } } }
    });

    res.json({ success: true, data: logs, total: logs.length });
  } catch (err) { next(err); }
}
