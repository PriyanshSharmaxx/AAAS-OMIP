import Redis from "ioredis";
import { env } from "./config";
import { logger } from "./logger";

// Shared Redis connection used by BullMQ and direct cache operations
export const redis = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  enableReadyCheck: false,
  lazyConnect: true,
});

redis.on("connect",  () => logger.info("✅  Redis connected"));
redis.on("error",    (err) => logger.error("Redis error", { err: err.message }));
redis.on("close",    () => logger.warn("Redis connection closed"));

export async function connectRedis(): Promise<void> {
  await redis.connect();
}

// A separate connection for BullMQ subscribers (must not share with main)
export function createRedisConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}
