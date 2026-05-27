/**
 * src/middleware/requestContext.ts
 *
 * Middleware to generate a unique request ID for each incoming HTTP call
 * and make it available via Node's AsyncLocalStorage.
 */

import { Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  requestId: string;
  userId?: string;
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

export function requestContextMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) || uuidv4();
  
  // Set in header for client-side tracing
  res.setHeader("x-request-id", requestId);

  const context: RequestContext = { requestId };

  requestContextStorage.run(context, () => {
    next();
  });
}

/**
 * Helper to get the current request ID from anywhere in the call stack.
 */
export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}

/**
 * Helper to get the current context.
 */
export function getContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}
