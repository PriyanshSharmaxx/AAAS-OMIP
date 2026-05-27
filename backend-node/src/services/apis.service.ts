/**
 * src/services/apis.service.ts
 *
 * External API Marketplace service.
 * Handles:
 *   - Browsing ApiProduct catalogue
 *   - Subscribe (issue ApiKey) / unsubscribe
 *   - Proxy execution with usage logging
 *   - Per-key rate limiting via Redis
 *   - Usage stats per user
 */

import crypto   from "crypto";
import { z }    from "zod";
import { prisma } from "../lib/prisma";
import { redis }  from "../lib/redis";
import { auditLogRepo } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger }   from "../lib/logger";
import { billingService } from "./billing.service";

// ---------------------------------------------------------------------------
// Key generation
// ---------------------------------------------------------------------------

export function generateApiKey(): string {
  return `sk_live_${crypto.randomBytes(16).toString("hex")}`;
}

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

export const ApiProductQuerySchema = z.object({
  category: z.string().optional(),
  search:   z.string().max(100).optional(),
  pricing:  z.enum(["free", "per_call", "monthly"]).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
});

export const ProxyExecuteSchema = z.object({
  endpoint:  z.string().default("/"),
  method:    z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
  body:      z.record(z.unknown()).optional(),
  headers:   z.record(z.string()).optional(),
});

async function checkRateLimit(apiKeyId: string, limitPerDay: number): Promise<void> {
  const redisKey = `rl:apikey:${apiKeyId}:daily`;
  const count = await redis.incr(redisKey);
  if (count === 1) {
    // Reset at midnight or use 24h expiry
    await redis.expire(redisKey, 86400);
  }
  if (count > limitPerDay) {
    throw new AppError(
      `Daily rate limit exceeded — max ${limitPerDay} calls per day for your plan.`,
      429,
      "RATE_LIMIT_EXCEEDED",
    );
  }

  // Also a burst limit: 60/min
  const burstKey = `rl:apikey:${apiKeyId}:burst`;
  const bCount = await redis.incr(burstKey);
  if (bCount === 1) await redis.expire(burstKey, 60);
  if (bCount > 60) {
    throw new AppError("Burst limit exceeded — max 60 calls per minute.", 429, "BURST_LIMIT_EXCEEDED");
  }
}

// ---------------------------------------------------------------------------
// apisService
// ---------------------------------------------------------------------------

export const apisService = {

  // ── list ─────────────────────────────────────────────────────────────────

  async list(params: z.infer<typeof ApiProductQuerySchema>, userId?: string) {
    const skip  = (params.page - 1) * params.limit;
    const where: any = {
      isActive: true,
      ...(params.category ? { category: params.category } : {}),
      ...(params.pricing  ? { pricingType: params.pricing } : {}),
      ...(params.search
        ? {
            OR: [
              { name:        { contains: params.search, mode: "insensitive" } },
              { description: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.apiProduct.findMany({
        where,
        skip,
        take: params.limit,
        orderBy: [{ isFeatured: "desc" }, { requestCount: "desc" }],
        include: {
          plans: true,
          provider: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        },
      }),
      prisma.apiProduct.count({ where }),
    ]);

    // If user is authed, annotate each product with their subscription state
    let subscribedApiIds: Set<string> = new Set();
    if (userId) {
      const keys = await prisma.apiKey.findMany({
        where: { userId, isActive: true },
        select: { apiId: true },
      });
      subscribedApiIds = new Set(keys.map((k) => k.apiId));
    }

    return {
      products: products.map((p) => ({
        ...p,
        isSubscribed: subscribedApiIds.has(p.id),
      })),
      total,
      page:  params.page,
      pages: Math.ceil(total / params.limit),
    };
  },

  // ── getById ───────────────────────────────────────────────────────────────

  async getById(apiId: string, userId?: string) {
    const product = await prisma.apiProduct.findUnique({
      where: { id: apiId },
      include: {
        plans: true,
        provider: { select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true } },
      },
    });
    if (!product || !product.isActive) {
      throw new AppError("API not found.", 404, "API_NOT_FOUND");
    }

    let isSubscribed = false;
    let apiKey: string | null = null;
    if (userId) {
      const key = await prisma.apiKey.findUnique({ where: { userId_apiId: { userId, apiId } } });
      isSubscribed = !!(key?.isActive);
      if (isSubscribed && key) apiKey = key.key;
    }

    return { ...product, isSubscribed, apiKey };
  },

  // ── subscribe ─────────────────────────────────────────────────────────────

  async subscribe(apiId: string, userId: string, planId?: string) {
    const product = await prisma.apiProduct.findUnique({
      where: { id: apiId },
      include: { plans: true },
    });
    if (!product || !product.isActive) {
      throw new AppError("API not found.", 404, "API_NOT_FOUND");
    }

    // Idempotent — return existing active key
    const existing = await prisma.apiKey.findUnique({
      where: { userId_apiId: { userId, apiId } },
    });

    if (existing) {
      if (existing.isActive) {
        return { ...existing, apiProductName: product.name };
      }
      // Reactivate with a new key
      const updated = await prisma.apiKey.update({
        where: { id: existing.id },
        data:  { isActive: true, key: generateApiKey() },
      });
      await billingService.recordApiSubscriptionCharge({
        apiId,
        subscriberId: userId,
        planId: updated.planId,
      });
      return { ...updated, apiProductName: product.name };
    }

    const key = await prisma.apiKey.create({
      data: {
        userId,
        apiId,
        planId: planId || product.plans[0]?.id,
        key: generateApiKey(),
      },
    });

    await auditLogRepo.create({
      user:   { connect: { id: userId } },
      action: "API_KEY_ISSUED",
      entityType: "ApiKey",
      entityId: key.id,
      metadata: { apiId, planId: key.planId },
    });

    await billingService.recordApiSubscriptionCharge({
      apiId,
      subscriberId: userId,
      planId: key.planId,
    });

    logger.info("ApiKey issued", { apiId, userId, keyId: key.id, planId: key.planId });
    return { ...key, apiProductName: product.name };
  },

  // ── unsubscribe ───────────────────────────────────────────────────────────

  async unsubscribe(apiId: string, userId: string) {
    const key = await prisma.apiKey.findUnique({ where: { userId_apiId: { userId, apiId } } });
    if (!key || !key.isActive) {
      throw new AppError("Subscription not found.", 404, "NOT_SUBSCRIBED");
    }
    await prisma.apiKey.update({ where: { id: key.id }, data: { isActive: false } });
  },

  // ── myKeys ────────────────────────────────────────────────────────────────

  async myKeys(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where:   { userId, isActive: true },
      include: { apiProduct: true },
      orderBy: { createdAt: "desc" },
    });

    // Attach usage count per key
    const usageCounts = await prisma.apiUsage.groupBy({
      by: ["apiKeyId"],
      where: { userId },
      _count: { id: true },
    });
    const usageMap = new Map(usageCounts.map((u) => [u.apiKeyId, u._count.id]));

    return keys.map((k) => ({
      id:          k.id,
      key:         k.key,
      isActive:    k.isActive,
      totalCalls:  k.totalCalls,
      lastUsedAt:  k.lastUsedAt,
      createdAt:   k.createdAt,
      usageLast30: usageMap.get(k.id) ?? 0,
      apiProduct: {
        id:          k.apiProduct.id,
        name:        k.apiProduct.name,
        category:    k.apiProduct.category,
        pricingType: k.apiProduct.pricingType,
        pricePerCall:k.apiProduct.pricePerCall,
        priceMonthly:k.apiProduct.priceMonthly,
        isVerified:  k.apiProduct.isVerified,
        rating:      k.apiProduct.rating,
        latencyMs:   k.apiProduct.latencyMs,
        uptimePct:   k.apiProduct.uptimePct,
      },
    }));
  },

  // ── revokeKey ─────────────────────────────────────────────────────────────

  async revokeKey(keyId: string, userId: string) {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== userId) {
      throw new AppError("API key not found.", 404, "KEY_NOT_FOUND");
    }
    await prisma.apiKey.update({ where: { id: keyId }, data: { isActive: false } });
    
    await auditLogRepo.create({
      user:   { connect: { id: userId } },
      action: "API_KEY_REVOKED",
      entityType: "ApiKey",
      entityId: keyId,
      metadata: { apiId: key.apiId },
    });
  },

  // ── rotateKey ─────────────────────────────────────────────────────────────

  async rotateKey(keyId: string, userId: string) {
    const key = await prisma.apiKey.findUnique({ where: { id: keyId } });
    if (!key || key.userId !== userId) {
      throw new AppError("API key not found.", 404, "KEY_NOT_FOUND");
    }
    const newKey = generateApiKey();
    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data:  { key: newKey },
    });
    logger.info("ApiKey rotated", { keyId, userId });
    return updated;
  },

  // ── execute (proxy) ───────────────────────────────────────────────────────

  async execute(
    apiId:  string,
    userId: string,
    input:  z.infer<typeof ProxyExecuteSchema>,
  ) {
    // Verify subscription
    const keyRecord = await prisma.apiKey.findUnique({
      where:   { userId_apiId: { userId, apiId } },
      include: { apiProduct: true, plan: true },
    });

    if (!keyRecord || !keyRecord.isActive) {
      throw new AppError(
        "You must subscribe to this API before calling it.",
        403,
        "NOT_SUBSCRIBED",
      );
    }

    const product = keyRecord.apiProduct;
    if (!product.isActive) {
      throw new AppError("This API is not currently available.", 404, "API_NOT_FOUND");
    }

    // Rate limit check (Redis)
    const limit = keyRecord.plan?.limit || product.freeCallsPerDay || 100;
    await checkRateLimit(keyRecord.id, limit);

    const target = product.proxyTarget ?? product.baseUrl;
    const url    = `${target.replace(/\/$/, "")}${input.endpoint}`;

    const startMs = Date.now();
    let statusCode = 0;

    try {
      const fetchOptions: RequestInit = {
        method:  input.method,
        headers: {
          "Content-Type": "application/json",
          // Forward caller's extra headers (strip dangerous ones)
          ...Object.fromEntries(
            Object.entries(input.headers ?? {}).filter(
              ([k]) => !["host", "authorization", "cookie"].includes(k.toLowerCase()),
            ),
          ),
        },
        ...(["POST", "PUT", "PATCH"].includes(input.method) && input.body
          ? { body: JSON.stringify(input.body) }
          : {}),
      };

      const response = await fetch(url, fetchOptions);
      statusCode = response.status;
      const latencyMs = Date.now() - startMs;

      const contentType = response.headers.get("content-type") ?? "";
      const responseBody = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      // Log usage (fire-and-forget)
      void logUsage(userId, apiId, keyRecord.id, statusCode, latencyMs, input.endpoint);
      if (response.ok) {
        await billingService.recordApiUsageCharge({
          apiId,
          consumerId: userId,
          endpoint: input.endpoint,
        });
      }

      logger.info("API proxied", {
        apiId, userId, url, status: statusCode, latencyMs,
      });

      return {
        status:     statusCode,
        data:       responseBody,
        latencyMs,
        endpoint:   input.endpoint,
        apiName:    product.name,
      };
    } catch (err) {
      const latencyMs = Date.now() - startMs;
      void logUsage(userId, apiId, keyRecord.id, statusCode || 502, latencyMs, input.endpoint);
      logger.error("API proxy error", { apiId, userId, url, err });
      throw new AppError("Upstream API call failed.", 502, "PROXY_ERROR");
    }
  },

  // ── usageStats ────────────────────────────────────────────────────────────

  async usageStats(userId: string, apiId?: string) {
    const where = {
      userId,
      ...(apiId ? { apiId } : {}),
    };

    const [total, recent, byApi] = await Promise.all([
      prisma.apiUsage.count({ where }),
      prisma.apiUsage.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 50,
        include: { apiProduct: { select: { name: true, category: true } } },
      }),
      prisma.apiUsage.groupBy({
        by: ["apiId"],
        where,
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
      }),
    ]);

    return { total, recent, byApi };
  },
};

// ---------------------------------------------------------------------------
// Internal helper — log usage + update counters
// ---------------------------------------------------------------------------

async function logUsage(
  userId:    string,
  apiId:     string,
  apiKeyId:  string,
  status:    number,
  latency:   number,
  endpoint:  string,
): Promise<void> {
  await Promise.all([
    prisma.apiUsage.create({
      data: { userId, apiId, apiKeyId, statusCode: status, latencyMs: latency, endpoint },
    }),
    prisma.apiKey.update({
      where: { id: apiKeyId },
      data:  { totalCalls: { increment: 1 }, lastUsedAt: new Date() },
    }),
    prisma.apiProduct.update({
      where: { id: apiId },
      data:  { requestCount: { increment: 1 } },
    }),
  ]).catch((e) => logger.warn("Usage log write failed", { e }));
}
