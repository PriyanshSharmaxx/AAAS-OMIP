import { Router } from "express";
import {
  grantPermission,
  revokePermission,
  listPermissions,
  validatePermission,
} from "./permissions.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();
router.use(verifyUser);

/**
 * @route   POST /api/permissions/validate
 * @desc    Check whether a user has a specific action on a resource
 * @access  Private
 * @body    { userId, resourceType, resourceId, action }
 * @returns { allowed: boolean, reason: string }
 */
router.post("/validate", validatePermission);

/**
 * @route   GET /api/permissions
 * @desc    List all grants on a resource (owner only)
 * @access  Private (resource owner)
 * @query   resourceType, resourceId
 */
router.get("/", listPermissions);

/**
 * @route   POST /api/permissions
 * @desc    Grant a permission to a user on a resource (owner only)
 * @access  Private (resource owner)
 * @body    { userId, resourceType, resourceId, action }
 */
router.post("/", grantPermission);

/**
 * @route   DELETE /api/permissions/:id
 * @desc    Revoke a permission (resource owner only)
 * @access  Private (resource owner)
 */
router.delete("/:id", revokePermission);

export default router;
