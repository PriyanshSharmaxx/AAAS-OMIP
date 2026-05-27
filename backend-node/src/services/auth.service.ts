import bcrypt from "bcryptjs";
import { z } from "zod";
import { userRepo, sessionRepo, auditLogRepo, UserRole } from "../lib/db";
import { signToken } from "../lib/jwt";
import { AppError } from "../middleware/errorHandler";

// ---------------------------------------------------------------------------
// Validation schemas (shared with controller)
// ---------------------------------------------------------------------------

export const SignupSchema = z.object({
  email: z
    .string()
    .email("Must be a valid email address")
    .toLowerCase()
    .trim(),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[a-z0-9_-]+$/i, "Username may only contain letters, numbers, _ and -")
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  role: z.enum(["USER", "CREATOR"]).optional().default("USER"),
  displayName: z.string().max(60).trim().optional(),
});

export const LoginSchema = z.object({
  email:    z.string().email().toLowerCase().trim(),
  password: z.string().min(1, "Password is required"),
});

export const RefreshSchema = z.object({
  token: z.string().min(1),
});

export type SignupInput = z.infer<typeof SignupSchema>;
export type LoginInput  = z.infer<typeof LoginSchema>;

// ---------------------------------------------------------------------------
// Auth response shape
// ---------------------------------------------------------------------------

export interface AuthResponse {
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    role: string;
    displayName: string | null;
    createdAt: Date;
  };
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const authService = {

  // ── Signup ────────────────────────────────────────────────────────────────
  async signup(input: SignupInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse & { refreshToken: string }> {
    const [existingEmail, existingUsername] = await Promise.all([
      userRepo.findByEmail(input.email),
      userRepo.findByUsername(input.username),
    ]);

    if (existingEmail) throw new AppError("Email already exists.", 409, "EMAIL_TAKEN");
    if (existingUsername) throw new AppError("Username already taken.", 409, "USERNAME_TAKEN");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await userRepo.create({
      email: input.email,
      username: input.username,
      passwordHash,
      role: input.role as UserRole,
      displayName: input.displayName ?? null,
    });

    // Create session & tokens
    const { accessToken, refreshToken } = await this.createSession(user.id, ipAddress, userAgent);

    await auditLogRepo.create({
      user: { connect: { id: user.id } },
      action: "auth.signup",
      entityType: "USER",
      entityId: user.id,
      ipAddress,
    });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id:          user.id,
        email:       user.email,
        username:    user.username,
        role:        user.role,
        displayName: user.displayName,
        createdAt:   user.createdAt,
      },
    };
  },

  // ── Login ─────────────────────────────────────────────────────────────────
  async login(input: LoginInput, ipAddress?: string, userAgent?: string): Promise<AuthResponse & { refreshToken: string }> {
    const user = await userRepo.findByEmail(input.email);
    const DUMMY_HASH = "$2a$12$dummyhashforpreventingtimingattacksonnonexistentaccounts";
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const passwordValid = await bcrypt.compare(input.password, hash);

    if (!user || !passwordValid) {
      throw new AppError("Invalid email or password.", 401, "INVALID_CREDENTIALS");
    }

    if (!user.isActive) {
      throw new AppError("Account deactivated.", 403, "ACCOUNT_INACTIVE");
    }

    // Create session & tokens
    const { accessToken, refreshToken } = await this.createSession(user.id, ipAddress, userAgent);

    await userRepo.updateLastLogin(user.id);
    await auditLogRepo.create({
      user: { connect: { id: user.id } },
      action: "auth.login",
      entityType: "USER",
      entityId: user.id,
      ipAddress,
    });

    return {
      token: accessToken,
      refreshToken,
      user: {
        id:          user.id,
        email:       user.email,
        username:    user.username,
        role:        user.role,
        displayName: user.displayName,
        createdAt:   user.createdAt,
      },
    };
  },

  // ── Refresh ───────────────────────────────────────────────────────────────
  async refresh(refreshToken: string, _ipAddress?: string, _userAgent?: string): Promise<{ accessToken: string; refreshToken: string }> {
    const session = await sessionRepo.findByToken(refreshToken);
    
    if (!session || !session.isValid || session.expiresAt < new Date()) {
      if (session) await sessionRepo.invalidate(refreshToken);
      throw new AppError("Session expired or invalid.", 401, "SESSION_INVALID");
    }

    // Rotate refresh token (optional, but safer)
    const newAccessToken = signToken({
      sub:      session.user.id,
      email:    session.user.email,
      username: session.user.username,
      role:     session.user.role,
    });

    return { accessToken: newAccessToken, refreshToken };
  },

  // ── Logout ────────────────────────────────────────────────────────────────
  async logout(userId: string, refreshToken?: string): Promise<void> {
    if (refreshToken) {
      await sessionRepo.invalidate(refreshToken);
    } else {
      await sessionRepo.invalidateAllForUser(userId);
    }
    await auditLogRepo.create({
      user: { connect: { id: userId } },
      action: "auth.logout",
      entityType: "USER",
      entityId: userId,
    });
  },

  // ── Helpers ───────────────────────────────────────────────────────────────
  async createSession(userId: string, ipAddress?: string, userAgent?: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError("User not found.", 404);

    const accessToken = signToken({
      sub:      user.id,
      email:    user.email,
      username: user.username,
      role:     user.role,
    });

    const refreshToken = signToken({
      sub:      user.id,
      email:    user.email,
      username: user.username,
      role:     user.role,
    });

    await sessionRepo.create({
      user:      { connect: { id: userId } },
      token:     refreshToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      ipAddress,
      userAgent,
    });

    return { accessToken, refreshToken };
  },

  async me(userId: string) {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError("User not found.", 404, "USER_NOT_FOUND");
    const { passwordHash: _ph, ...safe } = user;
    return safe;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepo.findById(userId);
    if (!user) throw new AppError("User not found.", 404);

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new AppError("Current password incorrect.", 400);

    const newHash = await bcrypt.hash(newPassword, 12);
    await userRepo.update(userId, { passwordHash: newHash });
    
    // Revoke all other sessions for safety on password change
    await sessionRepo.invalidateAllForUser(userId);

    await auditLogRepo.create({
      user: { connect: { id: userId } },
      action: "auth.password_changed",
      entityType: "USER",
      entityId: userId,
    });
  },
};
