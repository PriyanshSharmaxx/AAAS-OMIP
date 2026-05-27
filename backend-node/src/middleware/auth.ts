import { Request, Response, NextFunction } from "express";
import { extractBearerToken, verifyToken, JwtPayload } from "../lib/jwt";
import { AppError } from "./errorHandler";
import { userRepo } from "../lib/db";

// ---------------------------------------------------------------------------
// Augment Express Request with authenticated user
// ---------------------------------------------------------------------------

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload & { dbUser?: Awaited<ReturnType<typeof userRepo.findById>> };
    }
  }
}

// ---------------------------------------------------------------------------
// verifyUser — validates JWT, attaches payload to req.user
// ---------------------------------------------------------------------------

export async function verifyUser(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError("No token provided. Please log in.", 401, "NO_TOKEN");
    }

    const payload = verifyToken(token);

    // Optional: fetch full user to verify account is still active
    // For performance-sensitive routes you can skip this check
    req.user = payload;
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// verifyUserWithDB — like verifyUser but also fetches the DB record
// Use for sensitive operations where you need the latest role / active status
// ---------------------------------------------------------------------------

export async function verifyUserWithDB(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) {
      throw new AppError("No token provided. Please log in.", 401, "NO_TOKEN");
    }

    const payload = verifyToken(token);
    const dbUser  = await userRepo.findById(payload.sub);

    if (!dbUser) {
      throw new AppError("User account not found.", 401, "USER_NOT_FOUND");
    }
    if (!dbUser.isActive) {
      throw new AppError("Your account has been deactivated.", 403, "ACCOUNT_INACTIVE");
    }

    req.user = { ...payload, dbUser };
    next();
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// optionalAuth — attaches req.user if a valid token is present, otherwise
// continues without error. Use for public routes that benefit from user context.
// ---------------------------------------------------------------------------

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      req.user = verifyToken(token);
    }
  } catch {
    // invalid / expired token — treat as unauthenticated, don't block
  }
  next();
}

// ---------------------------------------------------------------------------
// requireRole — role-based access gate (use after verifyUser)
// ---------------------------------------------------------------------------

export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Not authenticated.", 401, "NOT_AUTHENTICATED"));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(
        new AppError(
          `Access denied. Required role: ${roles.join(" or ")}.`,
          403,
          "FORBIDDEN",
        ),
      );
      return;
    }
    next();
  };
}
