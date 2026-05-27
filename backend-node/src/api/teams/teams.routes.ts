import { Router } from "express";
import {
  createTeam,
  listTeams,
  getTeam,
  updateTeam,
  deleteTeam,
  inviteMember,
  acceptInvite,
  declineInvite,
  myPendingInvites,
  changeMemberRole,
  removeMember,
  transferOwnership,
  addTeamCredits,
  updateSecurityPolicy,
  listTeamAgents,
  getTeamAuditLogs,
} from "./teams.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();
router.use(verifyUser);

// ── Invite management (token-based, before /:id routes) ──────────────────────

/**
 * @route   GET /api/teams/invites/pending
 * @desc    List all pending invites for the current user
 * @access  Private
 */
router.get("/invites/pending", myPendingInvites);

/**
 * @route   POST /api/teams/invites/:token/accept
 * @desc    Accept a team invite by token
 * @access  Private
 */
router.post("/invites/:token/accept", acceptInvite);

/**
 * @route   POST /api/teams/invites/:token/decline
 * @desc    Decline a team invite by token
 * @access  Private
 */
router.post("/invites/:token/decline", declineInvite);

// ── Team CRUD ─────────────────────────────────────────────────────────────────

/**
 * @route   POST /api/teams
 * @desc    Create a team (caller becomes OWNER)
 * @access  Private
 * @body    { name, description?, avatarUrl? }
 */
router.post("/", createTeam);

/**
 * @route   GET /api/teams
 * @desc    List teams the current user belongs to
 * @access  Private
 */
router.get("/", listTeams);

/**
 * @route   GET /api/teams/:id
 * @desc    Get team detail + full member list (members only)
 * @access  Private (member)
 */
router.get("/:id", getTeam);

/**
 * @route   PATCH /api/teams/:id
 * @desc    Update team name/description (ADMIN+)
 * @access  Private (ADMIN | OWNER)
 */
router.patch("/:id", updateTeam);

/**
 * @route   DELETE /api/teams/:id
 * @desc    Soft-delete team (OWNER only)
 * @access  Private (OWNER)
 */
router.delete("/:id", deleteTeam);

// ── Member management ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/teams/:id/invite
 * @desc    Invite a user by userId (direct) or email (pending invite)
 * @access  Private (ADMIN | OWNER)
 * @body    { userId?, email?, role }
 */
router.post("/:id/invite", inviteMember);

/**
 * @route   PATCH /api/teams/:id/members/:userId/role
 * @desc    Change a member's role (OWNER only)
 * @access  Private (OWNER)
 * @body    { role: "ADMIN" | "MEMBER" | "VIEWER" }
 */
router.patch("/:id/members/:userId/role", changeMemberRole);

/**
 * @route   DELETE /api/teams/:id/members/:userId
 * @desc    Remove a member (ADMIN+, or self-leave)
 * @access  Private
 */
router.delete("/:id/members/:userId", removeMember);

/**
 * @route   POST /api/teams/:id/transfer
 * @desc    Transfer OWNER role to another member (OWNER only)
 * @access  Private (OWNER)
 * @body    { newOwnerId: string }
 */
router.post("/:id/transfer", transferOwnership);

// ── Enterprise / Shared Features ──────────────────────────────────────────────

/**
 * @route   POST /api/teams/:id/credits
 * @desc    Add credits to the team (ADMIN+)
 * @access  Private (ADMIN+)
 */
router.post("/:id/credits", addTeamCredits);

/**
 * @route   PATCH /api/teams/:id/security
 * @desc    Toggle 2FA enforcement (OWNER only)
 * @access  Private (OWNER)
 */
router.patch("/:id/security", updateSecurityPolicy);

/**
 * @route   GET /api/teams/:id/agents
 * @desc    List agents shared with/owned by the team
 * @access  Private (member)
 */
router.get("/:id/agents", listTeamAgents);

/**
 * @route   GET /api/teams/:id/audit-logs
 * @desc    Get activity logs for the team
 * @access  Private (ADMIN+)
 */
router.get("/:id/audit-logs", getTeamAuditLogs);

export default router;
