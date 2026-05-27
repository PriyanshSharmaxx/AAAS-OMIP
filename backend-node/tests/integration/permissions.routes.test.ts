import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/create-test-app";

const { mockPermissionService } = vi.hoisted(() => ({
  mockPermissionService: {
    grant: vi.fn(),
    revoke: vi.fn(),
    list: vi.fn(),
    validate: vi.fn(),
  },
}));

vi.mock("../../src/middleware/auth", () => ({
  verifyUser: (req: any, _res: any, next: any) => {
    req.user = { sub: "user-1", role: "USER" };
    next();
  },
}));

vi.mock("../../src/services/permission.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/permission.service")>("../../src/services/permission.service");
  return { ...actual, permissionService: mockPermissionService };
});

import permissionRoutes from "../../src/api/permissions/permissions.routes";

describe("permission routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("grants a permission", async () => {
    mockPermissionService.grant.mockResolvedValue({ id: "perm-1" });
    const app = createTestApp(permissionRoutes);

    const response = await request(app).post("/").send({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      resourceType: "AGENT",
      resourceId: "123e4567-e89b-12d3-a456-426614174001",
      action: "RUN",
    });

    expect(response.status).toBe(201);
    expect(response.body.data.id).toBe("perm-1");
  });

  it("validates a permission decision", async () => {
    mockPermissionService.validate.mockResolvedValue({ allowed: true, reason: "owner" });
    const app = createTestApp(permissionRoutes);

    const response = await request(app).post("/validate").send({
      userId: "123e4567-e89b-12d3-a456-426614174000",
      resourceType: "AGENT",
      resourceId: "123e4567-e89b-12d3-a456-426614174001",
      action: "RUN",
    });

    expect(response.status).toBe(200);
    expect(response.body.data.allowed).toBe(true);
  });
});
