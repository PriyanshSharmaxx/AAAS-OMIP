import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  mockPermissionRepo,
  mockAgentRepo,
  mockWorkflowRepo,
  mockListingRepo,
  mockUserRepo,
} = vi.hoisted(() => ({
  mockPermissionRepo: {
    findUserPermission: vi.fn(),
    grant: vi.fn(),
    findById: vi.fn(),
    revoke: vi.fn(),
    findByResource: vi.fn(),
    hasPermission: vi.fn(),
  },
  mockAgentRepo: {
    findById: vi.fn(),
  },
  mockWorkflowRepo: {
    findById: vi.fn(),
  },
  mockListingRepo: {
    findById: vi.fn(),
  },
  mockUserRepo: {
    findById: vi.fn(),
  },
}));

vi.mock("../../src/lib/db", () => ({
  permissionRepo: mockPermissionRepo,
  agentRepo: mockAgentRepo,
  workflowRepo: mockWorkflowRepo,
  listingRepo: mockListingRepo,
  userRepo: mockUserRepo,
  ResourceType: {
    AGENT: "AGENT",
    WORKFLOW: "WORKFLOW",
    LISTING: "LISTING",
  },
  PermissionAction: {
    READ: "READ",
    RUN: "RUN",
    WRITE: "WRITE",
  },
}));

import { permissionService } from "../../src/services/permission.service";
import { PermissionAction, ResourceType } from "../../src/lib/db";

describe("permissionService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows public agents to be read without an explicit grant", async () => {
    mockAgentRepo.findById.mockResolvedValue({
      id: "agent-1",
      userId: "owner-1",
      isPublic: true,
    });

    const result = await permissionService.validate({
      userId: "viewer-1",
      resourceType: ResourceType.AGENT,
      resourceId: "agent-1",
      action: PermissionAction.READ,
    });

    expect(result).toEqual({ allowed: true, reason: "public" });
  });

  it("falls back to explicit grants for private resources", async () => {
    mockAgentRepo.findById.mockResolvedValue({
      id: "agent-1",
      userId: "owner-1",
      isPublic: false,
    });
    mockPermissionRepo.hasPermission.mockResolvedValue(true);

    const result = await permissionService.validate({
      userId: "viewer-1",
      resourceType: ResourceType.AGENT,
      resourceId: "agent-1",
      action: PermissionAction.RUN,
    });

    expect(mockPermissionRepo.hasPermission).toHaveBeenCalledWith("viewer-1", "AGENT", "agent-1", "RUN");
    expect(result).toEqual({ allowed: true, reason: "explicit_grant" });
  });
});
