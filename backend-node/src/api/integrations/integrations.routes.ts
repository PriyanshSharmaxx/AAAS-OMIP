/**
 * src/api/integrations/integrations.routes.ts
 */

import { Router } from "express";
import { verifyUser } from "../../middleware/auth";
import * as integrationsController from "./integrations.controller";

const router = Router();

// ── Public / Callback ──────────────────────────────────────────────────────

// The OAuth callback doesn't always have the auth header, but we use the 'state' param
router.get("/:slug/callback", integrationsController.handleCallback);

// ── Protected ──────────────────────────────────────────────────────────────

router.use(verifyUser);

router.get("/", integrationsController.listIntegrations);
router.get("/connections", integrationsController.listConnections);
router.get("/:slug/auth-url", integrationsController.getAuthUrl);
router.post("/:slug/grant-agent", integrationsController.grantAgentPermission);

export default router;
