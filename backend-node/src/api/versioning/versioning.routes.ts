/**
 * Versioning routes are mounted under /api/agents/:id/versions
 * (merged onto the agents router with mergeParams: true)
 *
 * Mount in agents.routes.ts:
 *   import versioningRoutes from "../versioning/versioning.routes";
 *   router.use("/:id/versions", versioningRoutes);
 */

import { Router } from "express";
import {
  saveVersion,
  listVersions,
  getVersion,
  rollback,
  deleteVersion,
} from "./versioning.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router({ mergeParams: true });
router.use(verifyUser);

/**
 * @route   POST /api/agents/:id/versions
 * @desc    Snapshot the current agent config as the next version
 * @access  Private (owner)
 * @body    { changelog? }
 */
router.post("/", saveVersion);

/**
 * @route   GET /api/agents/:id/versions
 * @desc    List all saved versions (metadata, newest first)
 * @access  Private (owner)
 */
router.get("/", listVersions);

/**
 * @route   GET /api/agents/:id/versions/:versionId
 * @desc    Full snapshot detail for a specific version
 * @access  Private (owner)
 */
router.get("/:versionId", getVersion);

/**
 * @route   POST /api/agents/:id/versions/:versionId/rollback
 * @desc    Restore agent config from a snapshot
 * @access  Private (owner)
 * @body    { saveCurrentFirst?: boolean, changelog? }
 */
router.post("/:versionId/rollback", rollback);

/**
 * @route   DELETE /api/agents/:id/versions/:versionId
 * @desc    Delete a specific version snapshot
 * @access  Private (owner)
 */
router.delete("/:versionId", deleteVersion);

export default router;
