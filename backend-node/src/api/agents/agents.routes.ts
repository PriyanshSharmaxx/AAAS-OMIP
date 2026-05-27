import { Router } from "express";
import {
  createAgent,
  listAgents,
  listPublicAgents,
  getExploreData,
  getAgent,
  validateAgent,
  updateAgent,
  deleteAgent,
  hardDeleteAgent,
  getAgentRuns,
  getAgentCost,
  addApiToAgent,
  removeApiFromAgent,
  listFrameworks,
} from "./agents.controller";
import {
  runAgent,
  runAgentAsync,
  getJobStatus,
  queueStats,
  listRuns,
  runStats,
  getRunById,
} from "./execution.controller";
import {
  downloadCli,
  downloadDocker,
  downloadStatus,
} from "./download.controller";
import { verifyUser, requireRole } from "../../middleware/auth";
import versioningRoutes from "../versioning/versioning.routes";

const router = Router();

// ── Public (no auth required) ─────────────────────────────────────────────

/**
 * @route   GET /api/agents/public
 * @desc    Browse public marketplace agents
 * @access  Public
 */
router.get("/public",     listPublicAgents);
router.get("/explore",    getExploreData);
router.get("/frameworks", listFrameworks);

// Public agent detail — no auth needed for public agents (controller checks req.user?.sub)
router.get("/:id/validate", validateAgent);
// ── Protected — all routes below require valid JWT ────────────────────────

router.use(verifyUser);

// ── Execution routes (must come before /:id to avoid param collision) ─────

/**
 * @route   POST /api/agents/run
 * @desc    Execute an agent end-to-end (synchronous — waits for result)
 * @access  Private
 * @body    { agentId, userInput, overrides?, history?, triggerSource? }
 */
router.post("/run",     runAgent);
// Alias — same handler, simplified body { agentId, input } normalised inside
router.post("/execute", runAgent);

/**
 * @route   POST /api/agents/run/async
 * @desc    Enqueue an agent run (returns immediately with jobId + executionId)
 * @access  Private
 * @body    { agentId, userInput, overrides?, history?, triggerSource? }
 */
router.post("/run/async", runAgentAsync);

/**
 * @route   GET /api/agents/jobs/:jobId
 * @desc    Poll a queued job's state and progress
 * @access  Private (owner only)
 */
router.get("/jobs/:jobId", getJobStatus);

/**
 * @route   GET /api/agents/queue/stats
 * @desc    BullMQ queue health stats
 * @access  Private
 */
router.get("/queue/stats", queueStats);

/**
 * @route   GET /api/agents/runs
 * @desc    List execution history for current user
 * @access  Private
 * @query   limit, agentId
 */
router.get("/runs", listRuns);

/**
 * @route   GET /api/agents/runs/stats
 * @desc    Usage statistics for current user
 * @access  Private
 */
router.get("/runs/stats", runStats);

/**
 * @route   GET /api/agents/runs/:executionId
 * @desc    Single execution log detail
 * @access  Private (owner only)
 */
router.get("/runs/:executionId", getRunById);

// ── Agent CRUD ────────────────────────────────────────────────────────────

/**
 * @route   POST /api/agents
 * @desc    Create a new agent
 * @access  Private
 */
router.post("/", createAgent);

/**
 * @route   GET /api/agents
 * @desc    List own agents
 * @access  Private
 */
router.get("/", listAgents);

// ── Cost estimation ───────────────────────────────────────────────────────────

/**
 * @route   GET /api/agents/:id/cost
 * @desc    Return estimated credit cost for running this agent
 * @access  Private
 */
router.get("/:id/cost", getAgentCost);

// ── Download routes (/:id/download/*) — must appear before plain /:id ────────

/**
 * @route   GET /api/agents/:id/download/status
 * @desc    Pre-flight check: can this user download the agent, and at what tier?
 * @access  Private
 */
router.get("/:id/download/status", downloadStatus);

/**
 * @route   GET /api/agents/:id/download/cli
 * @desc    Download CLI bundle (agent.json + README) as ZIP
 * @access  Private — free agents: full download; paid agents: subscription required
 * @query   os? (windows | macos | linux) — logged for analytics
 */
router.get("/:id/download/cli", downloadCli);

/**
 * @route   GET /api/agents/:id/download/docker
 * @desc    Download Docker bundle (Dockerfile + agent.json + run.sh) as ZIP
 * @access  Private — free agents: full download; paid agents: subscription required
 * @query   os? (windows | macos | linux) — logged for analytics
 */
router.get("/:id/download/docker", downloadDocker);

/**
 * @route   GET /api/agents/:id
 * @desc    Get agent by ID (public = no ownership required)
 * @access  Public (partial) / Private
 */
router.get("/:id", getAgent);

/**
 * @route   PATCH /api/agents/:id
 * @desc    Update agent (owner only)
 * @access  Private
 */
router.patch("/:id", updateAgent);

/**
 * @route   DELETE /api/agents/:id
 * @desc    Soft-delete / archive agent (owner only)
 * @access  Private
 */
router.delete("/:id", deleteAgent);

/**
 * @route   DELETE /api/agents/:id/hard
 * @desc    Permanent delete (Admin only)
 * @access  Admin
 */
router.delete("/:id/hard", requireRole("ADMIN"), hardDeleteAgent);

/**
 * @route   GET /api/agents/:id/runs
 * @desc    Execution history for a specific agent (owner only)
 * @access  Private
 */
router.get("/:id/runs", getAgentRuns);

/**
 * @route   POST /api/agents/:id/add-api
 * @desc    Attach a subscribed ApiProduct to this agent's tools array
 * @access  Private (owner) — user must already have an active ApiKey for the API
 * @body    { apiId: string }
 */
router.post("/:id/add-api", addApiToAgent);

/**
 * @route   DELETE /api/agents/:id/remove-api/:apiId
 * @desc    Detach an ApiProduct from this agent's tools array
 * @access  Private (owner)
 */
router.delete("/:id/remove-api/:apiId", removeApiFromAgent);

/**
 * @route   * /api/agents/:id/versions/*
 * @desc    Agent versioning sub-router (save, list, get, rollback, delete)
 * @access  Private (owner)
 */
router.use("/:id/versions", versioningRoutes);

export default router;
