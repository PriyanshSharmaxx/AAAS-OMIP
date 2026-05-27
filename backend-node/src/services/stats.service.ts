/**
 * src/services/stats.service.ts
 *
 * Cross-module aggregation for the dashboard and health check.
 * All counts are read-only queries — no side effects.
 */

import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { getQueueStats } from "../workers/queue";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// System health — used by GET /health
// ---------------------------------------------------------------------------

export interface SystemHealth {
  status:     "ok" | "degraded";
  uptime:     number;       // process uptime in seconds
  database:   { ok: boolean; latencyMs: number };
  redis:      { ok: boolean; latencyMs: number };
  queues: {
    agentRuns:    Record<string, number>;
    workflowRuns: Record<string, number>;
    notifications: Record<string, number>;
    reports:      Record<string, number>;
    sync:         Record<string, number>;
    schedules:    Record<string, number>;
  };
  activeCrons: number;
  timestamp:  string;
}

export async function getSystemHealth(activeCronCount: number): Promise<SystemHealth> {
  // DB ping
  let dbOk = false;
  let dbLatency = -1;
  try {
    const t0 = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatency = Date.now() - t0;
    dbOk = true;
  } catch (err) {
    logger.error("Health check: DB ping failed", { err: (err as Error).message });
  }

  // Redis ping
  let redisOk = false;
  let redisLatency = -1;
  try {
    const t0 = Date.now();
    await redis.ping();
    redisLatency = Date.now() - t0;
    redisOk = true;
  } catch (err) {
    logger.error("Health check: Redis ping failed", { err: (err as Error).message });
  }

  // Queue stats (best-effort)
  let queueStats = {
    agentRuns:     {} as Record<string, number>,
    workflowRuns:  {} as Record<string, number>,
    notifications: {} as Record<string, number>,
    reports:       {} as Record<string, number>,
    sync:          {} as Record<string, number>,
    schedules:     {} as Record<string, number>,
  };

  try {
    const qs = await getQueueStats();
    queueStats = {
      agentRuns:     qs.agentRuns.counts    as unknown as Record<string, number>,
      workflowRuns:  qs.workflowRuns.counts as unknown as Record<string, number>,
      notifications: qs.notifications?.counts as unknown as Record<string, number> || {},
      reports:       qs.reports?.counts       as unknown as Record<string, number> || {},
      sync:          qs.sync?.counts          as unknown as Record<string, number> || {},
      schedules:     qs.schedules?.counts     as unknown as Record<string, number> || {},
    };
  } catch { /* non-fatal */ }

  return {
    status:     dbOk && redisOk ? "ok" : "degraded",
    uptime:     Math.floor(process.uptime()),
    database:   { ok: dbOk,    latencyMs: dbLatency },
    redis:      { ok: redisOk, latencyMs: redisLatency },
    queues:     queueStats,
    activeCrons: activeCronCount,
    timestamp:  new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Dashboard stats — used by GET /api/stats/dashboard
// ---------------------------------------------------------------------------

export async function getDashboardStats(userId: string) {
  const [
    agentCounts,
    executionCounts,
    workflowCount,
    workflowRunCount,
    scheduleCount,
    teamCount,
    subscriptionCount,
    listingCount,
    unreadNotifications,
    tokenSum,
  ] = await Promise.all([
    // Agents: total + by status
    prisma.agent.groupBy({
      by:    ["status"],
      where: { userId },
      _count: { id: true },
    }),
    // Executions: total + by status
    prisma.executionLog.groupBy({
      by:    ["status"],
      where: { userId },
      _count: { id: true },
    }),
    // Active workflows
    prisma.workflow.count({ where: { userId, isActive: true } }),
    // Workflow runs
    prisma.workflowRun.count({ where: { userId } }),
    // Active schedules
    prisma.schedule.count({ where: { userId, isActive: true } }),
    // Teams
    prisma.teamMember.count({ where: { userId, inviteStatus: "ACCEPTED" } }),
    // Active marketplace subscriptions
    prisma.subscription.count({ where: { userId, isActive: true } }),
    // Listings created
    prisma.listing.count({ where: { userId } }),
    // Unread notifications
    prisma.notification.count({ where: { userId, isRead: false } }),
    // Token usage aggregate
    prisma.executionLog.aggregate({
      where: { userId },
      _sum:  { totalTokens: true, durationMs: true },
    }),
  ]);

  // Flatten agent counts
  const agents = Object.fromEntries(agentCounts.map((g) => [g.status, g._count.id]));
  // Flatten execution counts
  const executions = Object.fromEntries(executionCounts.map((g) => [g.status, g._count.id]));
  const totalExecutions = Object.values(executions).reduce((a, b) => a + b, 0);

  return {
    agents: {
      total:    Object.values(agents).reduce((a, b) => a + b, 0),
      active:   agents["ACTIVE"]   ?? 0,
      draft:    agents["DRAFT"]    ?? 0,
      archived: agents["ARCHIVED"] ?? 0,
    },
    executions: {
      total:     totalExecutions,
      completed: executions["COMPLETED"] ?? 0,
      failed:    executions["FAILED"]    ?? 0,
      running:   executions["RUNNING"]   ?? 0,
      pending:   executions["PENDING"]   ?? 0,
      successRate: totalExecutions > 0
        ? Math.round(((executions["COMPLETED"] ?? 0) / totalExecutions) * 100)
        : 0,
    },
    usage: {
      totalTokens:    tokenSum._sum.totalTokens    ?? 0,
      totalDurationMs: tokenSum._sum.durationMs    ?? 0,
    },
    workflows:    { total: workflowCount, runs: workflowRunCount },
    schedules:    { active: scheduleCount },
    teams:        { memberships: teamCount },
    marketplace:  { subscriptions: subscriptionCount, listings: listingCount },
    notifications: { unread: unreadNotifications },
  };
}
