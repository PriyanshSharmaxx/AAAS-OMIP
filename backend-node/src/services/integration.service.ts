/**
 * src/services/integration.service.ts
 *
 * Managing third-party integrations and user connections.
 */

import { integrationRepo, connectionRepo, ResourceType, PermissionAction } from "../lib/db";
import { permissionService } from "./permission.service";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

export const integrationService = {

  async listIntegrations() {
    return integrationRepo.findAll();
  },

  async listUserConnections(userId: string) {
    return connectionRepo.findByUser(userId);
  },

  async getConnection(userId: string, integrationSlug: string) {
    const integration = await integrationRepo.findBySlug(integrationSlug);
    if (!integration) throw new AppError("Integration not found.", 404, "INTEGRATION_NOT_FOUND");
    
    return connectionRepo.findUnique(userId, integration.id);
  },

  /**
   * Enforce per-agent permission for an integration.
   * Checks if the agent has been granted 'USE' permission on the integration resource.
   */
  async checkAgentPermission(userId: string, agentId: string, integrationSlug: string) {
    const integration = await integrationRepo.findBySlug(integrationSlug);
    if (!integration) return false;

    // A user's own agent is typically allowed to use their own connections,
    // but for production trust, we should require an explicit grant or 
    // a confirmation in the UI.
    
    // For now, we use the permissionService to check if (userId, INTEGRATION, integrationId, USE) 
    // is granted for the agent? 
    // Wait, the permissionService usually checks (userId, resourceType, resourceId, action).
    // In this case, the 'resource' is the Integration, and the 'user' is the Agent (acting as a principal).
    
    // Actually, we can use the Agent ID as a "subject" in a special way or just 
    // check a mapping table.
    
    // Let's assume for Step 10 that we want an explicit grant for the AGENT.
    // We can store this as a permission where the AGENT is the resource and the connection is...
    // No, the Connection is the resource.
    
    const connection = await connectionRepo.findUnique(userId, integration.id);
    if (!connection) return false;

    // Check if the agent has a grant to USE this connection.
    // We use the permission system:
    // Resource: CONNECTION (we should add this to ResourceType)
    // Actually, let's just use INTEGRATION for now.
    
    return permissionService.check(agentId, ResourceType.INTEGRATION, integration.id, PermissionAction.USE);
  },

  async grantAgentPermission(userId: string, agentId: string, integrationSlug: string) {
    const integration = await integrationRepo.findBySlug(integrationSlug);
    if (!integration) throw new AppError("Integration not found.", 404);

    // Only the owner of the integration connection (the user) can grant this.
    return permissionService.grant(userId, {
      userId: agentId, // Using agentId as the "user" in the permission table
      resourceType: ResourceType.INTEGRATION,
      resourceId: integration.id,
      action: PermissionAction.USE
    });
  }
};
