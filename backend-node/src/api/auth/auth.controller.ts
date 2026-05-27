import { Request, Response, NextFunction } from "express";
import {
  authService,
  SignupSchema,
  LoginSchema,
  RefreshSchema,
} from "../../services/auth.service";

// ---------------------------------------------------------------------------
// POST /api/auth/signup
// ---------------------------------------------------------------------------

export async function signup(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = SignupSchema.parse(req.body);
    const result = await authService.signup(input, req.ip, req.get("User-Agent"));
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await authService.login(input, req.ip, req.get("User-Agent"));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/refresh
// ---------------------------------------------------------------------------

export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { token } = RefreshSchema.parse(req.body);
    const result = await authService.refresh(token, req.ip, req.get("User-Agent"));
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected)
// ---------------------------------------------------------------------------

export async function me(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await authService.me(req.user!.sub);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/change-password  (protected)
// ---------------------------------------------------------------------------

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body as {
      currentPassword: string;
      newPassword: string;
    };

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: "currentPassword and newPassword required." });
      return;
    }

    await authService.changePassword(req.user!.sub, currentPassword, newPassword);
    res.json({ success: true, message: "Password updated successfully." });
  } catch (err) {
    next(err);
  }
}

// ---------------------------------------------------------------------------
// POST /api/auth/logout  (protected)
// ---------------------------------------------------------------------------

export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    await authService.logout(req.user!.sub, refreshToken);
    res.json({ success: true, message: "Logged out successfully." });
  } catch (err) {
    next(err);
  }
}
