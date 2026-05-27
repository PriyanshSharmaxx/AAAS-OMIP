import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/create-test-app";

const { mockRuntimeEngine, mockExecutionService } = vi.hoisted(() => ({
  mockRuntimeEngine: {
    execute: vi.fn(),
    enqueue: vi.fn(),
  },
  mockExecutionService: {
    listByUser: vi.fn(),
    stats: vi.fn(),
    getById: vi.fn(),
  },
}));

vi.mock("../../src/middleware/auth", () => ({
  verifyUser: (req: any, _res: any, next: any) => {
    req.user = { sub: "user-1", role: "USER" };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../src/services/runtime.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/runtime.service")>("../../src/services/runtime.service");
  return { ...actual, RuntimeEngine: mockRuntimeEngine };
});

vi.mock("../../src/services/execution.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/execution.service")>("../../src/services/execution.service");
  return { ...actual, executionService: mockExecutionService };
});

vi.mock("../../src/workers/queue", () => ({
  getAgentRunQueue: vi.fn(),
  getQueueStats: vi.fn(),
}));

vi.mock("../../src/api/versioning/versioning.routes", () => ({
  default: (() => {
    const express = require("express") as typeof import("express");
    return express.Router();
  })(),
}));

import agentRoutes from "../../src/api/agents/agents.routes";

describe("Execution Routes Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail to run an agent without required inputs", async () => {
    const app = createTestApp(agentRoutes);
    const response = await request(app)
      .post("/run")
      .send({ agentId: "123e4567-e89b-12d3-a456-426614174000" }); // missing userInput

    expect(response.status).toBe(400); // Validation error handled by Zod
  });

  it("should list execution runs", async () => {
    mockExecutionService.listByUser.mockResolvedValue([
      { id: "run-1", status: "COMPLETED" },
    ]);

    const app = createTestApp(agentRoutes);
    const response = await request(app).get("/runs");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].id).toBe("run-1");
  });
});
