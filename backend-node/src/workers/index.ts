/**
 * src/workers/index.ts
 *
 * Standalone worker process entry point.
 * Run with: npm run worker
 *
 * This process connects to Redis and PostgreSQL,
 * then starts the BullMQ workers. It does NOT start an HTTP server.
 *
 * In production, run one or more worker pods separately from the API server.
 */

import { connectDB, disconnectDB } from "../lib/prisma";
import { connectRedis, redis }     from "../lib/redis";
import { logger }                  from "../lib/logger";
import { closeQueues }             from "./queue";
import { 
  createAgentRunWorker, 
  createWorkflowRunWorker,
  createNotificationWorker,
  createReportWorker,
  createSyncWorker,
  createScheduleWorker,
} from "./worker";
import { schedulerService }        from "../services/scheduler.service";

async function startWorkers(): Promise<void> {
  logger.info("🔧  Omip worker process starting...");

  // Connect to DB and Redis
  await connectDB();
  await connectRedis();

  // Start workers
  const agentWorker    = createAgentRunWorker();
  const workflowWorker = createWorkflowRunWorker();
  const notifyWorker   = createNotificationWorker();
  const reportWorker   = createReportWorker();
  const syncWorker     = createSyncWorker();
  const scheduleWorker = createScheduleWorker();

  // Start scheduler (cron jobs run in the worker process to keep API server stateless)
  await schedulerService.init();

  logger.info("✅  Workers running — waiting for jobs...");

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`${signal} received — shutting down workers`);

    schedulerService.shutdown();
    await Promise.all([
      agentWorker.close(),
      workflowWorker.close(),
      notifyWorker.close(),
      reportWorker.close(),
      syncWorker.close(),
      scheduleWorker.close(),
      closeQueues(),
    ]);

    await disconnectDB();
    await redis.quit();

    logger.info("Worker process shut down cleanly");
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT",  () => shutdown("SIGINT"));
  process.on("uncaughtException",  (err) => {
    logger.error("Uncaught exception in worker", { err: err.message });
    shutdown("uncaughtException").catch(() => process.exit(1));
  });
  process.on("unhandledRejection", (err) => {
    logger.error("Unhandled rejection in worker", { err });
  });
}

startWorkers().catch((err) => {
  logger.error("Failed to start worker process", { err: (err as Error).message });
  process.exit(1);
});
