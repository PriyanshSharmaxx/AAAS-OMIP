/**
 * src/api/apis/apis.routes.ts
 *
 * External API Marketplace routes.
 */

import { Router } from "express";
import {
  listApis,
  getApi,
  subscribeToApi,
  unsubscribeFromApi,
  myApiKeys,
  revokeApiKey,
  rotateApiKey,
  executeApi,
  usageStats,
} from "./apis.controller";
import { verifyUser, optionalAuth } from "../../middleware/auth";

const router = Router();

router.get("/", listApis);

// Fixed authenticated routes must come before "/:id".
router.get("/my-keys", verifyUser, myApiKeys);
router.get("/usage", verifyUser, usageStats);
router.get("/usage/:apiId", verifyUser, usageStats);
router.delete("/keys/:keyId", verifyUser, revokeApiKey);
router.post("/keys/:keyId/rotate", verifyUser, rotateApiKey);
router.post("/execute/:apiId", verifyUser, executeApi);

// Optional-auth detail route.
router.get("/:id", optionalAuth, getApi);

// Authenticated product actions.
router.post("/:id/subscribe", verifyUser, subscribeToApi);
router.delete("/:id/subscribe", verifyUser, unsubscribeFromApi);

export default router;
