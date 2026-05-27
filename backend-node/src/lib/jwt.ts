import jwt from "jsonwebtoken";
import { env } from "./config";
import { AppError } from "../middleware/errorHandler";

// ---------------------------------------------------------------------------
// Token payload shape
// ---------------------------------------------------------------------------

export interface JwtPayload {
  sub: string;       // user id
  email: string;
  username: string;
  role: string;
  iat?: number;
  exp?: number;
}

// ---------------------------------------------------------------------------
// Sign
// ---------------------------------------------------------------------------

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
    algorithm: "HS256",
  } as jwt.SignOptions);
}

// ---------------------------------------------------------------------------
// Verify — throws AppError on invalid / expired
// ---------------------------------------------------------------------------

export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
    }) as JwtPayload;
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError("Token has expired. Please log in again.", 401, "TOKEN_EXPIRED");
    }
    if (err instanceof jwt.JsonWebTokenError) {
      throw new AppError("Invalid token.", 401, "TOKEN_INVALID");
    }
    throw new AppError("Authentication failed.", 401, "AUTH_FAILED");
  }
}

// ---------------------------------------------------------------------------
// Extract raw token from Authorization header
// ---------------------------------------------------------------------------

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}
