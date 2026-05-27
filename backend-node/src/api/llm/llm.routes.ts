/**
 * /api/llm — LLM diagnostic and test routes
 * These are protected routes for testing the LLM integration directly.
 */
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { verifyUser } from "../../middleware/auth";
import { quickRun, runAgent } from "../../services/agentExecutor";
import { listTools } from "../../services/toolRegistry";

const router = Router();
router.use(verifyUser);

// ── GET /api/llm/tools — list all registered tools ───────────────────────

router.get("/tools", (_req: Request, res: Response) => {
  res.json({ success: true, data: listTools() });
});

// ── POST /api/llm/quick — one-shot LLM call (no tools, no agent) ─────────

const QuickSchema = z.object({
  systemPrompt: z.string().min(1).max(4000),
  userMessage:  z.string().min(1).max(8000),
  model:        z.string().default("gpt-4o-mini"),
  temperature:  z.number().min(0).max(2).optional(),
  maxTokens:    z.number().int().min(1).max(4096).optional(),
});

router.post(
  "/quick",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input  = QuickSchema.parse(req.body);
      const output = await quickRun(input);
      res.json({ success: true, data: { output } });
    } catch (err) {
      next(err);
    }
  },
);

// ── POST /api/llm/run — full agentic run with tool loop ──────────────────

const RunSchema = z.object({
  systemPrompt: z.string().min(1).max(32_000),
  userInput:    z.string().min(1).max(8000),
  model:        z.string().default("gpt-4o"),
  tools:        z.array(z.object({
    name:    z.string(),
    enabled: z.boolean().default(true),
  })).default([]),
  config: z.object({
    temperature: z.number().min(0).max(2).default(0.7),
    maxTokens:   z.number().int().default(4096),
  }).default({}),
  maxIterations: z.number().int().min(1).max(10).default(5),
});

router.post(
  "/run",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input  = RunSchema.parse(req.body);
      const result = await runAgent({
        agentId:   "test",
        agentName: "Test Agent",
        prompt:    input.systemPrompt,
        model:     input.model,
        config:    input.config,
        tools:     input.tools,
        userInput: input.userInput,
        userId:    req.user!.sub,
        maxIterations: input.maxIterations,
        triggerSource: "manual",
      });
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  },
);

export default router;
