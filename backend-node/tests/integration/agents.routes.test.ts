import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/create-test-app";

const { mockAgentsService, mockRuntimeEngine } = vi.hoisted(() => ({
  mockAgentsService: {
    create: vi.fn(),
    list: vi.fn(),
    listPublic: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    hardDelete: vi.fn(),
    getExecutionHistory: vi.fn(),
  },
  mockRuntimeEngine: {
    execute: vi.fn(),
    enqueue: vi.fn(),
  },
}));

vi.mock("../../src/middleware/auth", () => ({
  verifyUser: (req: any, _res: any, next: any) => {
    req.user = { sub: "user-1", role: "USER" };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock("../../src/services/agents.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/agents.service")>("../../src/services/agents.service");
  return { ...actual, agentsService: mockAgentsService };
});

vi.mock("../../src/services/runtime.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/runtime.service")>("../../src/services/runtime.service");
  return { ...actual, RuntimeEngine: mockRuntimeEngine };
});

vi.mock("../../src/services/marketplace.service", () => ({
  agentRepo: { findById: vi.fn() },
  listingRepo: { findById: vi.fn() },
  marketplaceService: { explore: vi.fn(async () => ({})) },
  AgentStatus: { ACTIVE: "ACTIVE", DRAFT: "DRAFT", ARCHIVED: "ARCHIVED" },
  ListingStatus: { PUBLISHED: "PUBLISHED", DRAFT: "DRAFT" },
  PermissionAction: { RUN: "RUN", READ: "READ" },
  ResourceType: { AGENT: "AGENT" },
}));

vi.mock("../../src/services/permission.service", () => ({
  permissionService: {
    check: vi.fn(async () => true),
  },
}));

vi.mock("../../src/services/integration.service", () => ({
  integrationService: {
    getConnection: vi.fn(async () => null),
    checkAgentPermission: vi.fn(async () => false),
  },
}));

vi.mock("../../src/services/toolRegistry", () => ({
  getToolByName: vi.fn(() => null),
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    agent: {
      findUnique: vi.fn(async () => ({ id: "agent-1", userId: "user-1", tools: [], name: "Test Agent", model: "gpt-4o", pricing: "free" })),
      update: vi.fn(async () => ({})),
    },
    apiProduct: { findUnique: vi.fn(async () => null) },
    apiKey: { findUnique: vi.fn(async () => null) },
  },
}));

vi.mock("../../src/api/versioning/versioning.routes", () => ({
  default: (() => {
    const express = require("express") as typeof import("express");
    return express.Router();
  })(),
}));

import agentRoutes from "../../src/api/agents/agents.routes";

describe("agent routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates an agent for the authenticated user", async () => {
    mockAgentsService.create.mockResolvedValue({ id: "agent-1", name: "Test Agent" });

    const app = createTestApp(agentRoutes);
    const response = await request(app)
      .post("/")
      .send({ name: "Test Agent", description: "desc", category: "automation" });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe("agent-1");
  });

  it("runs an agent synchronously", async () => {
    mockRuntimeEngine.execute.mockResolvedValue({
      status: "COMPLETED",
      executionId: "run-1",
      output: "done",
    });

    const app = createTestApp(agentRoutes);
    const response = await request(app)
      .post("/run")
      .send({ agentId: "123e4567-e89b-12d3-a456-426614174000", userInput: "Run this" });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.executionId).toBe("run-1");
  });
});
