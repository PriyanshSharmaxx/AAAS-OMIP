import { PrismaClient } from "@prisma/client";
import { env } from "./config";
import { logger } from "./logger";

// Prevent multiple Prisma instances in development (Next.js HMR style)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      env.NODE_ENV === "development"
        ? [{ emit: "event", level: "query" }, "info", "warn", "error"]
        : ["warn", "error"],
  });

if (env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Log slow queries in development
if (env.NODE_ENV === "development") {
  // @ts-expect-error Prisma event typing
  prisma.$on("query", (e: { query: string; duration: number }) => {
    if (e.duration > 200) {
      logger.warn(`Slow query (${e.duration}ms): ${e.query}`);
    }
  });
}

export async function connectDB(): Promise<void> {
  await prisma.$connect();
  logger.info("✅  Database connected");
}

export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info("Database disconnected");
}
