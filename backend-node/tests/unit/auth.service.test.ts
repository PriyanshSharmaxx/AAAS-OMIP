import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../../src/middleware/errorHandler";

const { mockUserRepo, mockSessionRepo, mockAuditLogRepo } = vi.hoisted(() => ({
  mockUserRepo: {
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updateLastLogin: vi.fn(),
    update: vi.fn(),
  },
  mockSessionRepo: {
    create: vi.fn(),
    findByToken: vi.fn(),
    invalidate: vi.fn(),
    invalidateAllForUser: vi.fn(),
  },
  mockAuditLogRepo: {
    create: vi.fn(),
  },
}));

vi.mock("bcryptjs", () => ({
  default: {
    hash: vi.fn(async () => "hashed-password"),
    compare: vi.fn(async () => true),
  },
}));

vi.mock("../../src/lib/db", () => ({
  userRepo: mockUserRepo,
  sessionRepo: mockSessionRepo,
  auditLogRepo: mockAuditLogRepo,
  UserRole: {
    USER: "USER",
    CREATOR: "CREATOR",
  },
}));

vi.mock("../../src/lib/jwt", () => ({
  signToken: vi.fn(() => "signed-token"),
}));

import { authService } from "../../src/services/auth.service";

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a user and session on signup", async () => {
    mockUserRepo.findByEmail.mockResolvedValue(null);
    mockUserRepo.findByUsername.mockResolvedValue(null);
    mockUserRepo.create.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      username: "tester",
      role: "USER",
      displayName: "Tester",
      createdAt: new Date("2026-05-02T00:00:00.000Z"),
    });
    mockUserRepo.findById.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      username: "tester",
      role: "USER",
    });

    const result = await authService.signup({
      email: "test@example.com",
      username: "tester",
      password: "Password1",
      role: "USER",
      displayName: "Tester",
    });

    expect(mockUserRepo.create).toHaveBeenCalled();
    expect(mockSessionRepo.create).toHaveBeenCalled();
    expect(result.token).toBe("signed-token");
    expect(result.refreshToken).toBe("signed-token");
    expect(result.user.email).toBe("test@example.com");
  });

  it("rejects duplicate email signups", async () => {
    mockUserRepo.findByEmail.mockResolvedValue({ id: "existing-user" });
    mockUserRepo.findByUsername.mockResolvedValue(null);

    await expect(
      authService.signup({
        email: "test@example.com",
        username: "tester",
        password: "Password1",
        role: "USER",
      }),
    ).rejects.toMatchObject<AppError>({
      code: "EMAIL_TAKEN",
      statusCode: 409,
    });
  });
});
