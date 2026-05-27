/**
 * src/api/tools/tools.controller.ts
 *
 * REST handlers for /api/tools
 *
 * GET  /api/tools              — list all registered tools (filterable by category)
 * GET  /api/tools/:name        — get one tool's full definition
 * POST /api/tools/:name/test   — test a tool with supplied args (auth required)
 */

import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { listTools, getToolByName, executeTool } from "../../services/toolRegistry";
import { AppError } from "../../middleware/errorHandler";
import { logger } from "../../lib/logger";

// ---------------------------------------------------------------------------
// GET /api/tools
// ---------------------------------------------------------------------------

export async function getTools(
  req: Request,
  res: Response,
  _next: NextFunction,
): Promise<void> {
  const { category } = req.query;
  const tools = listTools(category as string | undefined);

  res.json({
    success: true,
    data: {
      tools,
      total: tools.length,
      categories: [...new Set(tools.map((t) => t.category))].sort(),
    },
  });
}

// ---------------------------------------------------------------------------
// GET /api/tools/:name
// ---------------------------------------------------------------------------

export async function getToolByNameHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { name } = req.params;
  const tool = getToolByName(name);

  if (!tool) {
    return next(new AppError(`Tool "${name}" not found.`, 404, "TOOL_NOT_FOUND"));
  }

  res.json({
    success: true,
    data: {
      name:           tool.name,
      category:       tool.category,
      description:    tool.description,
      version:        tool.version,
      requiresConfig: tool.requiresConfig,
      configSchema:   tool.configSchema ?? null,
      rateLimit:      tool.rateLimit ?? null,
      definition:     tool.definition,
    },
  });
}

// ---------------------------------------------------------------------------
// POST /api/tools/:name/test
// ---------------------------------------------------------------------------

const TestToolSchema = z.object({
  args:   z.record(z.unknown()).default({}),
  config: z.record(z.unknown()).optional(),
});

export async function testTool(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { name } = req.params;

  const parsed = TestToolSchema.safeParse(req.body);
  if (!parsed.success) {
    return next(new AppError("Invalid request body.", 400, "VALIDATION_ERROR"));
  }

  const tool = getToolByName(name);
  if (!tool) {
    return next(new AppError(`Tool "${name}" not found.`, 404, "TOOL_NOT_FOUND"));
  }

  const { args, config } = parsed.data;
  const userId = req.user?.sub;

  logger.info("Tool test called", { name, userId });

  const startMs = Date.now();

  try {
    const result = await executeTool(
      name,
      args,
      config,
      { userId, agentId: "test", runId: `test-${Date.now()}` },
    );

    res.json({
      success:   true,
      data: {
        tool_name:  name,
        result,
        latency_ms: Date.now() - startMs,
      },
    });
  } catch (err) {
    next(err);
  }
}
