import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestApp } from "../helpers/create-test-app";

const { mockAuthService } = vi.hoisted(() => ({
  mockAuthService: {
    signup: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    changePassword: vi.fn(),
    logout: vi.fn(),
  },
}));

vi.mock("../../src/services/auth.service", async () => {
  const actual = await vi.importActual<typeof import("../../src/services/auth.service")>("../../src/services/auth.service");
  return {
    ...actual,
    authService: mockAuthService,
  };
});

import authRoutes from "../../src/api/auth/auth.routes";

describe("auth routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user on signup", async () => {
    mockAuthService.signup.mockResolvedValue({
      token: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user-1", email: "test@example.com", username: "tester", role: "USER" },
    });

    const app = createTestApp(authRoutes);
    const response = await request(app)
      .post("/signup")
      .send({ email: "test@example.com", username: "tester", password: "Password1" });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(mockAuthService.signup).toHaveBeenCalled();
  });

  it("logs in an existing user", async () => {
    mockAuthService.login.mockResolvedValue({
      token: "access-token",
      refreshToken: "refresh-token",
      user: { id: "user-1", email: "test@example.com", username: "tester", role: "USER" },
    });

    const app = createTestApp(authRoutes);
    const response = await request(app)
      .post("/login")
      .send({ email: "test@example.com", password: "Password1" });

    expect(response.status).toBe(200);
    expect(response.body.data.token).toBe("access-token");
  });
});
