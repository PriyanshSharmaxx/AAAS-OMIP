import { Router } from "express";
import {
  createWorkflow,
  listWorkflows,
  getWorkflow,
  updateWorkflow,
  deleteWorkflow,
  runWorkflow,
  listRuns,
  getRun,
} from "./workflows.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

// All workflow routes require authentication
router.use(verifyUser);

// ── Run history (before /:id to avoid param collision) ───────────────────────

/**
 * @route   GET /api/workflows/runs
 * @desc    List all workflow runs for current user (optional ?workflowId=)
 * @access  Private
 */
router.get("/runs", listRuns);

/**
 * @route   GET /api/workflows/runs/:runId
 * @desc    Get a single workflow run with full step details
 * @access  Private (owner only)
 */
router.get("/runs/:runId", getRun);

// ── Workflow CRUD ─────────────────────────────────────────────────────────────

/**
 * @route   POST /api/workflows
 * @desc    Create a new workflow
 * @access  Private
 * @body    { name, description?, steps: WorkflowStep[], isPublic? }
 */
router.post("/", createWorkflow);

/**
 * @route   GET /api/workflows
 * @desc    List workflows owned by current user
 * @access  Private
 */
router.get("/", listWorkflows);

/**
 * @route   GET /api/workflows/:id
 * @desc    Get workflow definition by ID
 * @access  Private (owner only)
 */
router.get("/:id", getWorkflow);

/**
 * @route   PATCH /api/workflows/:id
 * @desc    Update workflow name/description/steps
 * @access  Private (owner only)
 */
router.patch("/:id", updateWorkflow);

/**
 * @route   DELETE /api/workflows/:id
 * @desc    Soft-delete a workflow (preserves run history)
 * @access  Private (owner only)
 */
router.delete("/:id", deleteWorkflow);

/**
 * @route   POST /api/workflows/:id/run
 * @desc    Execute a workflow end-to-end (synchronous)
 * @access  Private
 * @body    { initialInput: string, triggerSource?: string }
 */
router.post("/:id/run", runWorkflow);

export default router;
