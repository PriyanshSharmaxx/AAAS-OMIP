import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { env } from "./lib/config";
import { logger } from "./lib/logger";
import { connectDB, disconnectDB } from "./lib/prisma";
import { connectRedis, redis } from "./lib/redis";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { requestContextMiddleware } from "./middleware/requestContext";
import { closeQueues } from "./workers/queue";

// ─── Route imports (populated per step) ─────────────────────────────────────
import authRoutes         from "./api/auth/auth.routes";
import userRoutes         from "./api/user/user.routes";
import agentRoutes        from "./api/agents/agents.routes";
import llmRoutes          from "./api/llm/llm.routes";
import toolRoutes         from "./api/tools/tools.routes";
import workflowRoutes     from "./api/workflows/workflows.routes";
import scheduleRoutes     from "./api/schedule/schedule.routes";
import teamRoutes         from "./api/teams/teams.routes";
import marketplaceRoutes     from "./api/marketplace/marketplace.routes";
import apisRoutes            from "./api/apis/apis.routes";
import notificationRoutes    from "./api/notifications/notifications.routes";
import permissionRoutes      from "./api/permissions/permissions.routes";
import statsRoutes           from "./api/stats/stats.routes";
import integrationRoutes     from "./api/integrations/integrations.routes";
import billingRoutes         from "./api/billing/billing.routes";
import { schedulerService, getActiveCronCount } from "./services/scheduler.service";
import { getSystemHealth }   from "./services/stats.service";

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

export function createApp(): express.Application {
  const app = express();

  // ── Context ──────────────────────────────────────────────────────────────
  app.use(requestContextMiddleware);

  // ── Reverse proxy trust (Railway / Render / ALB) ─────────────────────────
  if (env.TRUST_PROXY > 0) app.set("trust proxy", env.TRUST_PROXY);

  // ── Security ──────────────────────────────────────────────────────────────
  app.use(helmet({
    contentSecurityPolicy: env.NODE_ENV === "production" ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https:"],
        upgradeInsecureRequests: [],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(
    cors({
      origin: env.ALLOWED_ORIGINS.split(",").map((o) => o.trim()),
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    }),
  );

  // ── Rate limiting ─────────────────────────────────────────────────────────
  app.use(
    rateLimit({
      windowMs: env.RATE_LIMIT_WINDOW_MS,
      max: env.RATE_LIMIT_MAX,
      standardHeaders: true,
      legacyHeaders: false,
      message: { success: false, error: "Too many requests, please try again later." },
    }),
  );

  // ── Body parsing ──────────────────────────────────────────────────────────
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ── Request logging ───────────────────────────────────────────────────────
  app.use(
    morgan(env.NODE_ENV === "production" ? "combined" : "dev", {
      stream: { write: (msg) => logger.http(msg.trim()) },
    }),
  );

  // ── Health check ──────────────────────────────────────────────────────────
  app.get("/health", async (_req, res) => {
    const health = await getSystemHealth(getActiveCronCount());
    const httpStatus = health.status === "ok" ? 200 : 503;
    res.status(httpStatus).json({
      service: "omip-backend-node",
      version: "1.0.0",
      env:     env.NODE_ENV,
      ...health,
    });
  });

  // ── API routes ────────────────────────────────────────────────────────────
  app.use("/api/auth",   authRoutes);
  app.use("/api/user",   userRoutes);
  app.use("/api/agents", agentRoutes);
  app.use("/api/llm",    llmRoutes);
  app.use("/api/tools",     toolRoutes);
  app.use("/api/workflows", workflowRoutes);
  app.use("/api/schedule",  scheduleRoutes);
  app.use("/api/teams",       teamRoutes);
  app.use("/api/marketplace",   marketplaceRoutes);
  app.use("/api/apis",          apisRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/permissions",   permissionRoutes);
  app.use("/api/stats",         statsRoutes);
  app.use("/api/integrations",  integrationRoutes);
  app.use("/api/billing",       billingRoutes);
  // Versioning routes are mounted inside agentRoutes at /api/agents/:id/versions

  // ── 404 + error handlers (must be last) ───────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

export async function bootstrap(): Promise<void> {
  try {
    await connectDB();
    await connectRedis();
    await schedulerService.init();

    const app = createApp();
    const server = app.listen(env.PORT, () => {
      logger.info(`🚀  Omip backend running on http://localhost:${env.PORT}`);
      logger.info(`    Mode   : ${env.NODE_ENV}`);
      logger.info(`    Health : http://localhost:${env.PORT}/health`);
    });

    // ── Graceful shutdown ────────────────────────────────────────────────────
    const shutdown = async (signal: string) => {
      logger.info(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        schedulerService.shutdown();
        await closeQueues();
        await disconnectDB();
        await redis.quit();
        logger.info("Server closed");
        process.exit(0);
      });

      // Force exit after 10s
      setTimeout(() => {
        logger.error("Forced exit after timeout");
        process.exit(1);
      }, 10_000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT",  () => shutdown("SIGINT"));
    process.on("uncaughtException",  (err) => logger.error("Uncaught exception",  { err: err.message }));
    process.on("unhandledRejection", (err) => logger.error("Unhandled rejection", { err }));
  } catch (err) {
    logger.error("Failed to start server", { err });
    process.exit(1);
  }
}

if (require.main === module) {
  void bootstrap();
}
