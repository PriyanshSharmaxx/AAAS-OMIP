import { Router } from "express";
import { getTools, getToolByNameHandler, testTool } from "./tools.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();

/**
 * @route   GET /api/tools
 * @desc    List all registered tools (optionally filter by ?category=email)
 * @access  Public
 */
router.get("/", getTools);

/**
 * @route   GET /api/tools/:name
 * @desc    Get full definition of a single tool
 * @access  Public
 */
router.get("/:name", getToolByNameHandler);

/**
 * @route   POST /api/tools/:name/test
 * @desc    Execute a tool with test args (useful for agent builders)
 * @access  Private
 * @body    { args: Record<string, unknown>, config?: Record<string, unknown> }
 */
router.post("/:name/test", verifyUser, testTool);

export default router;
