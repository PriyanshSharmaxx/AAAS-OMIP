/**
 * src/services/team.service.ts
 *
 * Team System — create teams, invite members, manage roles.
 *
 * Role hierarchy (highest → lowest):
 *   OWNER  — full control; cannot be removed; can transfer ownership
 *   ADMIN  — invite/remove MEMBER/VIEWER; edit team details
 *   MEMBER — view team + agents; run shared agents
 *   VIEWER — read-only access to team
 *
 * Invite flow:
 *   ADMIN+ calls POST /api/teams/:id/invite with { userId? | email, role }
 *   → If userId provided and user exists: direct membership (ACCEPTED)
 *   → If email only: PENDING invite with opaque token stored in TeamMember
 *   → Invitee calls POST /api/teams/invites/:token/accept to join
 */

import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { teamRepo, teamMemberRepo, userRepo, auditLogRepo, TeamRole, InviteStatus } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";
import { notificationService } from "./notification.service";

// ---------------------------------------------------------------------------
// Role helpers
// ---------------------------------------------------------------------------

const ROLE_RANK: Record<TeamRole, number> = {
  OWNER:  4,
  ADMIN:  3,
  MEMBER: 2,
  VIEWER: 1,
};

function canManage(actor: TeamRole, target: TeamRole): boolean {
  return ROLE_RANK[actor] > ROLE_RANK[target];
}

function isAtLeast(role: TeamRole, minimum: TeamRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

// ---------------------------------------------------------------------------
// Slug generator
// ---------------------------------------------------------------------------

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 50);
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base;
  let attempt = 0;
  while (attempt < 10) {
    const existing = await teamRepo.findBySlug(slug);
    if (!existing) return slug;
    slug = `${base}-${Math.floor(Math.random() * 9000) + 1000}`;
    attempt++;
  }
  return `${base}-${Date.now()}`;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const CreateTeamSchema = z.object({
  name:        z.string().min(2).max(80).trim(),
  description: z.string().max(500).trim().default(""),
  avatarUrl:   z.string().url().optional(),
});

export const UpdateTeamSchema = z.object({
  name:        z.string().min(2).max(80).trim().optional(),
  description: z.string().max(500).trim().optional(),
  avatarUrl:   z.string().url().nullable().optional(),
});

export const InviteMemberSchema = z.object({
  // Provide userId (existing user) OR email (pending invite)
  userId: z.string().uuid().optional(),
  email:  z.string().email().optional(),
  role:   z.enum(["ADMIN", "MEMBER", "VIEWER"]).default("MEMBER"),
}).refine((d) => d.userId ?? d.email, {
  message: "Provide either userId or email.",
});

export const ChangeRoleSchema = z.object({
  role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
});

// ---------------------------------------------------------------------------
// teamService
// ---------------------------------------------------------------------------

export const teamService = {

  // ── create ───────────────────────────────────────────────────────────────

  async create(userId: string, input: z.infer<typeof CreateTeamSchema>) {
    const slug = await uniqueSlug(toSlug(input.name));

    const team = await teamRepo.create({
      name:        input.name,
      description: input.description,
      slug,
      ...(input.avatarUrl ? { avatarUrl: input.avatarUrl } : {}),
      members: {
        create: {
          userId,
          role:         TeamRole.OWNER,
          inviteStatus: InviteStatus.ACCEPTED,
          joinedAt:     new Date(),
        },
      },
    });

    logger.info("Team created", { teamId: team.id, userId, slug });
    
    await auditLogRepo.create({
      user: { connect: { id: userId } },
      action: "team.created",
      entityType: "TEAM",
      entityId: team.id,
      metadata: { slug, name: input.name }
    });

    return team;
  },

  // ── list — teams the user belongs to ─────────────────────────────────────

  async list(userId: string) {
    return teamRepo.findByUser(userId);
  },

  // ── getById ──────────────────────────────────────────────────────────────

  async getById(teamId: string, userId: string) {
    const team = await teamRepo.findById(teamId);
    if (!team || !team.isActive) {
      throw new AppError("Team not found.", 404, "TEAM_NOT_FOUND");
    }
    // Must be a member (any role, ACCEPTED)
    const membership = team.members.find(
      (m) => m.userId === userId && m.inviteStatus === InviteStatus.ACCEPTED,
    );
    if (!membership) {
      throw new AppError("You are not a member of this team.", 403, "FORBIDDEN");
    }

    // 2FA Compliance Check
    if (team.twoFactorEnforced) {
      const user = await userRepo.findById(userId);
      if (user && !user.twoFactorEnabled) {
        throw new AppError(
          "This team requires Two-Factor Authentication. Please enable 2FA in your security settings to proceed.",
          403,
          "MFA_REQUIRED"
        );
      }
    }

    return { team, myRole: membership.role };
  },

  // ── update ────────────────────────────────────────────────────────────────

  async update(teamId: string, userId: string, input: z.infer<typeof UpdateTeamSchema>) {
    const { myRole } = await teamService.getById(teamId, userId);
    if (!isAtLeast(myRole, TeamRole.ADMIN)) {
      throw new AppError("Only ADMIN or OWNER can update team details.", 403, "FORBIDDEN");
    }

    return teamRepo.update(teamId, {
      ...(input.name        !== undefined ? { name:        input.name }        : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.avatarUrl   !== undefined ? { avatarUrl:   input.avatarUrl }   : {}),
    });
  },

  // ── delete ────────────────────────────────────────────────────────────────

  async delete(teamId: string, userId: string) {
    const { myRole } = await teamService.getById(teamId, userId);
    if (myRole !== TeamRole.OWNER) {
      throw new AppError("Only the team OWNER can delete the team.", 403, "FORBIDDEN");
    }
    await teamRepo.softDelete(teamId);
    logger.info("Team deleted", { teamId, userId });

    await auditLogRepo.create({
      user: { connect: { id: userId } },
      action: "team.deleted",
      entityType: "TEAM",
      entityId: teamId
    });
  },

  // ── invite ────────────────────────────────────────────────────────────────

  async invite(teamId: string, actorId: string, input: z.infer<typeof InviteMemberSchema>) {
    const { team, myRole } = await teamService.getById(teamId, actorId);

    if (!isAtLeast(myRole, TeamRole.ADMIN)) {
      throw new AppError("Only ADMIN or OWNER can invite members.", 403, "FORBIDDEN");
    }

    // Cannot invite someone with a role equal to or higher than yourself
    const targetRole = input.role as TeamRole;
    if (!canManage(myRole, targetRole)) {
      throw new AppError(
        `You cannot invite someone with role ${targetRole} — it is equal to or higher than your own.`,
        403,
        "FORBIDDEN",
      );
    }

    // Check team capacity
    if (team.membersCount >= team.maxMembers) {
      throw new AppError(
        `Team has reached the maximum of ${team.maxMembers} members.`,
        400,
        "TEAM_FULL",
      );
    }

    // ── Case A: invite by userId (direct membership) ──────────────────────
    if (input.userId) {
      const targetUser = await userRepo.findById(input.userId);
      if (!targetUser) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
      if (!targetUser.isActive) throw new AppError("User account is inactive.", 400, "USER_INACTIVE");

      // Already a member?
      const existing = await teamMemberRepo.findMembership(teamId, input.userId);
      if (existing) {
        if (existing.inviteStatus === InviteStatus.ACCEPTED) {
          throw new AppError("User is already a member of this team.", 409, "ALREADY_MEMBER");
        }
        // Re-invite a declined/expired invite → update existing record
        const updated = await teamMemberRepo.update(existing.id, {
          role:         targetRole,
          inviteStatus: InviteStatus.ACCEPTED,
          joinedAt:     new Date(),
          invitedBy:    { connect: { id: actorId } },
        });
        await teamRepo.updateMemberCount(teamId, 1);
        return updated;
      }

      const member = await teamMemberRepo.create({
        team:         { connect: { id: teamId } },
        user:         { connect: { id: input.userId } },
        role:         targetRole,
        inviteStatus: InviteStatus.ACCEPTED,
        invitedBy:    { connect: { id: actorId } },
        joinedAt:     new Date(),
      });
      await teamRepo.updateMemberCount(teamId, 1);

      logger.info("Team member added directly", { teamId, userId: input.userId, role: targetRole });

      // Notify the invited user (fire-and-forget)
      const actor = await userRepo.findById(actorId).catch(() => null);
      if (actor) {
        notificationService.notifyInviteReceived(
          input.userId,
          team.name,
          teamId,
          actor.username,
          targetRole,
        ).catch(() => {});
      }

      return member;
    }

    // ── Case B: invite by email (pending invite) ──────────────────────────
    const email = input.email!;
    const token = uuidv4();

    // Check if this email already has a pending invite in this team
    // Check by email in team
    const existingEmailInvite = await (async () => {
      const { prisma } = await import("../lib/prisma");
      return prisma.teamMember.findFirst({ where: { teamId, inviteEmail: email } });
    })();

    if (existingEmailInvite && existingEmailInvite.inviteStatus === InviteStatus.PENDING) {
      throw new AppError("An invite is already pending for this email.", 409, "INVITE_PENDING");
    }

    // Try to resolve email to an existing user
    const existingUser = await userRepo.findByEmail(email);
    const member = await teamMemberRepo.create({
      team:         { connect: { id: teamId } },
      ...(existingUser ? { user: { connect: { id: existingUser.id } } } : {}),
      role:         targetRole,
      inviteEmail:  email,
      inviteToken:  token,
      inviteStatus: InviteStatus.PENDING,
      invitedBy:    { connect: { id: actorId } },
    });

    logger.info("Team invite created", { teamId, email, role: targetRole, token: token.slice(0, 8) });

    await auditLogRepo.create({
      user: { connect: { id: actorId } },
      action: "team.invite_sent",
      entityType: "TEAM",
      entityId: teamId,
      metadata: { email, role: targetRole }
    });

    // In production: send invite email here
    // await emailService.sendTeamInvite({ to: email, teamName: team.name, token, inviterName: ... });

    return { ...member, inviteUrl: `/api/teams/invites/${token}/accept` };
  },

  // ── acceptInvite ──────────────────────────────────────────────────────────

  async acceptInvite(token: string, userId: string) {
    const membership = await teamMemberRepo.findByToken(token);
    if (!membership) throw new AppError("Invite not found or already used.", 404, "INVITE_NOT_FOUND");
    if (membership.inviteStatus !== InviteStatus.PENDING) {
      throw new AppError("This invite has already been accepted or declined.", 400, "INVITE_USED");
    }

    // Bind the invite to this user if not already bound
    const updated = await teamMemberRepo.update(membership.id, {
      user:         { connect: { id: userId } },
      inviteStatus: InviteStatus.ACCEPTED,
      inviteToken:  null,
      joinedAt:     new Date(),
    });
    await teamRepo.updateMemberCount(membership.teamId, 1);

    logger.info("Team invite accepted", { teamId: membership.teamId, userId });
    return updated;
  },

  // ── declineInvite ─────────────────────────────────────────────────────────

  async declineInvite(token: string, _userId: string) {
    const membership = await teamMemberRepo.findByToken(token);
    if (!membership) throw new AppError("Invite not found.", 404, "INVITE_NOT_FOUND");
    if (membership.inviteStatus !== InviteStatus.PENDING) {
      throw new AppError("This invite has already been accepted or declined.", 400, "INVITE_USED");
    }

    await teamMemberRepo.update(membership.id, {
      inviteStatus: InviteStatus.DECLINED,
      inviteToken:  null,
    });

    return { declined: true };
  },

  // ── changeRole ────────────────────────────────────────────────────────────

  async changeRole(
    teamId:   string,
    actorId:  string,
    targetUserId: string,
    newRole:  TeamRole,
  ) {
    const { myRole } = await teamService.getById(teamId, actorId);
    if (myRole !== TeamRole.OWNER) {
      throw new AppError("Only the team OWNER can change roles.", 403, "FORBIDDEN");
    }

    if (targetUserId === actorId) {
      throw new AppError("You cannot change your own role. Transfer ownership instead.", 400, "SELF_ROLE_CHANGE");
    }

    const targetMembership = await teamMemberRepo.findMembership(teamId, targetUserId);
    if (!targetMembership || targetMembership.inviteStatus !== InviteStatus.ACCEPTED) {
      throw new AppError("Member not found in this team.", 404, "MEMBER_NOT_FOUND");
    }
    if (targetMembership.role === TeamRole.OWNER) {
      throw new AppError("Cannot change the OWNER's role. Transfer ownership first.", 400, "CANNOT_CHANGE_OWNER");
    }

    return teamMemberRepo.update(targetMembership.id, { role: newRole });
  },

  // ── removeMember ─────────────────────────────────────────────────────────

  async removeMember(teamId: string, actorId: string, targetUserId: string) {
    const { myRole } = await teamService.getById(teamId, actorId);
    const isSelf = actorId === targetUserId;

    if (!isSelf && !isAtLeast(myRole, TeamRole.ADMIN)) {
      throw new AppError("Only ADMIN or OWNER can remove members.", 403, "FORBIDDEN");
    }

    const targetMembership = await teamMemberRepo.findMembership(teamId, targetUserId);
    if (!targetMembership || targetMembership.inviteStatus !== InviteStatus.ACCEPTED) {
      throw new AppError("Member not found in this team.", 404, "MEMBER_NOT_FOUND");
    }

    if (targetMembership.role === TeamRole.OWNER && !isSelf) {
      throw new AppError("The team OWNER cannot be removed.", 400, "CANNOT_REMOVE_OWNER");
    }
    if (!isSelf && !canManage(myRole, targetMembership.role)) {
      throw new AppError("You cannot remove a member with an equal or higher role.", 403, "FORBIDDEN");
    }

    await teamMemberRepo.delete(targetMembership.id);
    await teamRepo.updateMemberCount(teamId, -1);

    logger.info("Team member removed", { teamId, targetUserId, by: actorId });

    await auditLogRepo.create({
      user: { connect: { id: actorId } },
      action: "team.member_removed",
      entityType: "TEAM",
      entityId: teamId,
      metadata: { removedUserId: targetUserId }
    });
  },

  // ── transferOwnership ─────────────────────────────────────────────────────

  async transferOwnership(teamId: string, currentOwnerId: string, newOwnerId: string) {
    const { myRole } = await teamService.getById(teamId, currentOwnerId);
    if (myRole !== TeamRole.OWNER) {
      throw new AppError("Only the current OWNER can transfer ownership.", 403, "FORBIDDEN");
    }

    const newOwnerMembership = await teamMemberRepo.findMembership(teamId, newOwnerId);
    if (!newOwnerMembership || newOwnerMembership.inviteStatus !== InviteStatus.ACCEPTED) {
      throw new AppError("New owner must be an existing team member.", 400, "NOT_A_MEMBER");
    }

    const currentOwnerMembership = await teamMemberRepo.findMembership(teamId, currentOwnerId);

    // Swap roles atomically
    await Promise.all([
      teamMemberRepo.update(newOwnerMembership.id,    { role: TeamRole.OWNER }),
      teamMemberRepo.update(currentOwnerMembership!.id, { role: TeamRole.ADMIN }),
    ]);

    logger.info("Team ownership transferred", { teamId, from: currentOwnerId, to: newOwnerId });

    await auditLogRepo.create({
      user: { connect: { id: currentOwnerId } },
      action: "team.ownership_transferred",
      entityType: "TEAM",
      entityId: teamId,
      metadata: { newOwnerId }
    });
  },

  // ── addCredits ───────────────────────────────────────────────────────────
  async addCredits(teamId: string, actorId: string, amount: number, note?: string) {
    const { myRole } = await teamService.getById(teamId, actorId);
    if (!isAtLeast(myRole, TeamRole.ADMIN)) {
      throw new AppError("Only ADMIN or OWNER can add team credits.", 403, "FORBIDDEN");
    }

    const updated = await teamRepo.update(teamId, {
      credits: { increment: amount }
    });

    await auditLogRepo.create({
      user: { connect: { id: actorId } },
      action: "team.credits_added",
      entityType: "TEAM",
      entityId: teamId,
      metadata: { amount, note }
    });

    return updated;
  },

  // ── toggle2FAEnforcement ──────────────────────────────────────────────────
  async toggle2FAEnforcement(teamId: string, actorId: string, enforced: boolean) {
    const { myRole } = await teamService.getById(teamId, actorId);
    if (myRole !== TeamRole.OWNER) {
      throw new AppError("Only the team OWNER can change security policies.", 403, "FORBIDDEN");
    }

    const updated = await teamRepo.update(teamId, {
      twoFactorEnforced: enforced
    });

    await auditLogRepo.create({
      user: { connect: { id: actorId } },
      action: "team.2fa_policy_updated",
      entityType: "TEAM",
      entityId: teamId,
      metadata: { enforced }
    });

    return updated;
  },

  // ── listPendingInvites ────────────────────────────────────────────────────

  async listPendingInvites(userId: string) {
    return teamMemberRepo.findPendingInvites(userId);
  },
};
