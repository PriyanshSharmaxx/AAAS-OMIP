/**
 * src/services/permission.service.ts
 *
 * Fine-grained permission grants across agents, workflows, and listings.
 *
 * Resolution order for any (userId, resourceType, resourceId, action):
 *   1. Resource owner  → always allowed (all actions)
 *   2. Public resource → READ and RUN allowed without an explicit grant
 *   3. Explicit grant  → check the permissions table
 *   4. Otherwise       → denied
 *
 * Only the resource owner can grant or revoke permissions.
 */

import { z } from "zod";
import {
  permissionRepo, agentRepo, workflowRepo, listingRepo, userRepo,
  ResourceType, PermissionAction,
} from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const GrantSchema = z.object({
  userId:       z.string().uuid("Must be a valid user UUID"),
  resourceType: z.nativeEnum(ResourceType),
  resourceId:   z.string().uuid("Must be a valid resource UUID"),
  action:       z.nativeEnum(PermissionAction),
});

export const ValidateSchema = z.object({
  userId:       z.string().uuid(),
  resourceType: z.nativeEnum(ResourceType),
  resourceId:   z.string().uuid(),
  action:       z.nativeEnum(PermissionAction),
});

export const ListPermissionsSchema = z.object({
  resourceType: z.nativeEnum(ResourceType),
  resourceId:   z.string().uuid(),
});

// ---------------------------------------------------------------------------
// Internal: resolve owner + public status for any resource type
// ---------------------------------------------------------------------------

async function resolveResource(
  resourceType: ResourceType,
  resourceId:   string,
): Promise<{ ownerId: string; isPublic: boolean }> {
  switch (resourceType) {
    case ResourceType.AGENT: {
      const agent = await agentRepo.findById(resourceId);
      if (!agent) throw new AppError("Agent not found.", 404, "RESOURCE_NOT_FOUND");
      return { ownerId: agent.userId, isPublic: agent.isPublic };
    }
    case ResourceType.WORKFLOW: {
      const workflow = await workflowRepo.findById(resourceId);
      if (!workflow || !workflow.isActive) throw new AppError("Workflow not found.", 404, "RESOURCE_NOT_FOUND");
      return { ownerId: workflow.userId, isPublic: workflow.isPublic };
    }
    case ResourceType.LISTING: {
      const listing = await listingRepo.findById(resourceId);
      if (!listing) throw new AppError("Listing not found.", 404, "RESOURCE_NOT_FOUND");
      return { ownerId: listing.userId, isPublic: true }; // published listings are public by nature
    }
  }
}

// ---------------------------------------------------------------------------
// permissionService
// ---------------------------------------------------------------------------

export const permissionService = {

  // ── grant ──────────────────────────────────────────────────────────────────

  async grant(grantorId: string, input: z.infer<typeof GrantSchema>) {
    // Grantor must own the resource
    const resource = await resolveResource(input.resourceType, input.resourceId);
    if (resource.ownerId !== grantorId) {
      throw new AppError("Only the resource owner can grant permissions.", 403, "FORBIDDEN");
    }

    // Cannot grant permission to yourself
    if (input.userId === grantorId) {
      throw new AppError("You already have full access as the owner.", 400, "OWN_RESOURCE");
    }

    // Target user must exist
    const target = await userRepo.findById(input.userId);
    if (!target) throw new AppError("Target user not found.", 404, "USER_NOT_FOUND");

    // Upsert — silently succeed if already granted
    const existing = await permissionRepo.findUserPermission(
      input.userId, input.resourceType, input.resourceId, input.action,
    );
    if (existing) {
      return existing; // idempotent
    }

    const permission = await permissionRepo.grant({
      user:         { connect: { id: input.userId } },
      grantor:      { connect: { id: grantorId } },
      resourceType: input.resourceType,
      resourceId:   input.resourceId,
      action:       input.action,
    });

    logger.info("Permission granted", {
      permissionId:  permission.id,
      grantorId,
      userId:        input.userId,
      resourceType:  input.resourceType,
      resourceId:    input.resourceId,
      action:        input.action,
    });

    return permission;
  },

  // ── revoke ─────────────────────────────────────────────────────────────────

  async revoke(grantorId: string, permissionId: string) {
    const permission = await permissionRepo.findById(permissionId);
    if (!permission) throw new AppError("Permission not found.", 404, "PERMISSION_NOT_FOUND");

    // Only the original grantor or the resource owner can revoke
    const resource = await resolveResource(permission.resourceType, permission.resourceId);
    if (resource.ownerId !== grantorId) {
      throw new AppError("Only the resource owner can revoke permissions.", 403, "FORBIDDEN");
    }

    await permissionRepo.revoke(permissionId);
    logger.info("Permission revoked", { permissionId, grantorId });
  },

  // ── list ───────────────────────────────────────────────────────────────────

  async list(requesterId: string, query: z.infer<typeof ListPermissionsSchema>) {
    const resource = await resolveResource(query.resourceType, query.resourceId);
    if (resource.ownerId !== requesterId) {
      throw new AppError("Only the resource owner can list permissions.", 403, "FORBIDDEN");
    }
    return permissionRepo.findByResource(query.resourceType, query.resourceId);
  },

  // ── validate (external endpoint) ──────────────────────────────────────────

  async validate(input: z.infer<typeof ValidateSchema>): Promise<{ allowed: boolean; reason: string }> {
    const resource = await resolveResource(input.resourceType, input.resourceId).catch(() => null);
    if (!resource) return { allowed: false, reason: "resource_not_found" };

    // Owner always allowed
    if (resource.ownerId === input.userId) {
      return { allowed: true, reason: "owner" };
    }

    // Public resource allows READ and RUN without a grant
    if (resource.isPublic && (input.action === PermissionAction.READ || input.action === PermissionAction.RUN)) {
      return { allowed: true, reason: "public" };
    }

    // Explicit grant
    const hasGrant = await permissionRepo.hasPermission(
      input.userId, input.resourceType, input.resourceId, input.action,
    );
    if (hasGrant) return { allowed: true, reason: "explicit_grant" };

    return { allowed: false, reason: "no_permission" };
  },

  // ── check (internal — used by execution & workflow services) ──────────────

  async check(
    userId:       string,
    resourceType: ResourceType,
    resourceId:   string,
    action:       PermissionAction,
  ): Promise<boolean> {
    const result = await permissionService.validate({ userId, resourceType, resourceId, action });
    return result.allowed;
  },
};
