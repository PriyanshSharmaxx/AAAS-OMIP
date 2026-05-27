/**
 * src/services/oauth.service.ts
 *
 * Handling OAuth2 flows, token exchanges, and refreshes.
 */

import axios from "axios";
import { integrationRepo, connectionRepo } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

export const oauthService = {

  /**
   * Generates the authorization URL for a specific integration.
   */
  async getAuthUrl(integrationSlug: string, userId: string) {
    const integration = await integrationRepo.findBySlug(integrationSlug);
    if (!integration || !integration.authUrl) {
      throw new AppError("Integration not configured for OAuth.", 400);
    }

    const params = new URLSearchParams({
      client_id: integration.clientId || "",
      redirect_uri: this.getRedirectUri(integrationSlug),
      response_type: "code",
      scope: integration.defaultScopes.join(" "),
      state: userId, // In production, use a signed state token to prevent CSRF
      access_type: "offline",
      prompt: "consent"
    });

    return `${integration.authUrl}?${params.toString()}`;
  },

  /**
   * Exchanges an authorization code for access and refresh tokens.
   */
  async handleCallback(integrationSlug: string, code: string, userId: string) {
    const integration = await integrationRepo.findBySlug(integrationSlug);
    if (!integration || !integration.tokenUrl) {
      throw new AppError("Integration not found.", 404);
    }

    try {
      const response = await axios.post(integration.tokenUrl, new URLSearchParams({
        client_id: integration.clientId || "",
        client_secret: integration.clientSecret || "",
        code,
        grant_type: "authorization_code",
        redirect_uri: this.getRedirectUri(integrationSlug)
      }).toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const { access_token, refresh_token, expires_in, scope } = response.data;

      // Calculate expiration
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

      // Upsert the connection
      const connection = await connectionRepo.upsert(userId, integration.id, {
        accessToken: access_token,
        refreshToken: refresh_token || undefined,
        expiresAt,
        scopes: scope ? scope.split(" ") : integration.defaultScopes,
        isActive: true
      });

      logger.info("OAuth connection successful", { userId, integrationSlug });
      return connection;
    } catch (err) {
      logger.error("OAuth callback failed", { integrationSlug, err: (err as Error).message });
      throw new AppError("Failed to exchange OAuth code.", 500);
    }
  },

  /**
   * Refreshes an access token using a refresh token.
   */
  async refreshToken(connectionId: string) {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
      include: { integration: true }
    });

    if (!connection || !connection.refreshToken) {
      throw new AppError("No refresh token available.", 400);
    }

    const { integration } = connection;
    if (!integration.tokenUrl) throw new AppError("Integration not configured.", 400);

    try {
      const response = await axios.post(integration.tokenUrl, new URLSearchParams({
        client_id: integration.clientId || "",
        client_secret: integration.clientSecret || "",
        refresh_token: connection.refreshToken,
        grant_type: "refresh_token"
      }).toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" }
      });

      const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;
      const expiresAt = expires_in ? new Date(Date.now() + expires_in * 1000) : null;

      const updated = await prisma.connection.update({
        where: { id: connectionId },
        data: {
          accessToken: access_token,
          refreshToken: new_refresh_token || connection.refreshToken,
          expiresAt
        }
      });

      return updated;
    } catch (err) {
      logger.error("Token refresh failed", { connectionId, err: (err as Error).message });
      // If refresh fails, we might want to deactivate the connection
      await connectionRepo.deactivate(connectionId);
      throw new AppError("Failed to refresh OAuth token.", 401);
    }
  },

  getRedirectUri(slug: string) {
    // In a real app, this should be configurable
    const baseUrl = process.env.BACKEND_URL || "http://localhost:4000";
    return `${baseUrl}/api/integrations/${slug}/callback`;
  }
};

// Internal prisma import for the service
import { prisma } from "../lib/prisma";
