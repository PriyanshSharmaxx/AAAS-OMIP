import { Router } from "express";
import { signup, login, me, changePassword, logout, refresh } from "./auth.controller";
import { verifyUser } from "../../middleware/auth";
import rateLimit from "express-rate-limit";

const router = Router();

// Stricter rate limit for auth endpoints (5 attempts per 15 min)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    error: "Too many auth attempts. Please try again in 15 minutes.",
    code: "RATE_LIMITED",
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
});

// ── Public routes ─────────────────────────────────────────────────────────

/**
 * @route   POST /api/auth/signup
 * @desc    Register a new user
 * @access  Public
 * @body    { email, username, password, role?, displayName? }
 */
router.post("/signup", authLimiter, signup);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate and receive JWT
 * @access  Public
 * @body    { email, password }
 */
router.post("/login", authLimiter, login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Renew access token using refresh token
 * @access  Public
 * @body    { token }
 */
router.post("/refresh", authLimiter, refresh);

// ── Protected routes ──────────────────────────────────────────────────────

/**
 * @route   GET /api/auth/me
 * @desc    Return the current authenticated user's profile
 * @access  Private
 */
router.get("/me", verifyUser, me);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change password
 * @access  Private
 * @body    { currentPassword, newPassword }
 */
router.post("/change-password", verifyUser, changePassword);

/**
 * @route   POST /api/auth/logout
 * @desc    Acknowledge logout (client must discard token)
 * @access  Private
 */
router.post("/logout", verifyUser, logout);

export default router;
