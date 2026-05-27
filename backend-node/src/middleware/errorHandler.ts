import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// Typed application error
// ---------------------------------------------------------------------------

export class AppError extends Error {
  constructor(
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "AppError";
    Error.captureStackTrace(this, this.constructor);
  }
}

// ---------------------------------------------------------------------------
// Global error handler middleware
// ---------------------------------------------------------------------------

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation error",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(err.message, { stack: err.stack, code: err.code });
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Unknown errors
  const message = err instanceof Error ? err.message : "Internal server error";
  logger.error("Unhandled error", { error: message, stack: err instanceof Error ? err.stack : undefined });
  res.status(500).json({ success: false, error: "Internal server error" });
}

// ---------------------------------------------------------------------------
// 404 handler
// ---------------------------------------------------------------------------

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
}
