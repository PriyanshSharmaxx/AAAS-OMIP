/**
 * src/lib/db.ts
 *
 * Thin typed wrappers around Prisma for the most common query patterns.
 * Each step's service layer imports from here, not directly from @prisma/client,
 * so the Prisma client is always the singleton from lib/prisma.ts.
 */

import {
  Prisma,
  User, Agent, ExecutionLog, Workflow, WorkflowRun, Schedule, ScheduleRun, Team, TeamMember,
  Listing, Subscription, ListingReview, AgentVersion, Notification, Permission,
  Session, AuditLog, BillingPlan, BillingSubscription, Collection, CollectionItem,
  Integration, Connection, Invoice, InvoiceItem, CreatorPayout,
  UserRole, AgentStatus, ExecutionStatus, WorkflowRunStatus, ScheduleRunStatus, TeamRole, InviteStatus,
  ListingStatus, PricingModel, NotificationType, ResourceType, PermissionAction,
} from "@prisma/client";

import { prisma } from "./prisma";

export {
  prisma, Prisma,
  UserRole, AgentStatus, ExecutionStatus, WorkflowRunStatus, ScheduleRunStatus,
  TeamRole, InviteStatus, ListingStatus, PricingModel, NotificationType,
  ResourceType, PermissionAction,
};
export type {
  User, Agent, ExecutionLog, Workflow, WorkflowRun, Schedule, ScheduleRun,
  Team, TeamMember, Listing, Subscription, ListingReview, AgentVersion, Notification, Permission,
  Session, AuditLog, BillingPlan, BillingSubscription, Collection, CollectionItem,
  Integration, Connection,
  Invoice, InvoiceItem, CreatorPayout,
};

// ---------------------------------------------------------------------------
// User helpers
// ---------------------------------------------------------------------------

export const userRepo = {
  findById: (id: string) =>
    prisma.user.findUnique({ where: { id } }),

  findByEmail: (email: string) =>
    prisma.user.findUnique({ where: { email } }),

  findByUsername: (username: string) =>
    prisma.user.findUnique({ where: { username } }),

  create: (data: Prisma.UserCreateInput) =>
    prisma.user.create({ data }),

  updateLastLogin: (id: string) =>
    prisma.user.update({
      where: { id },
      data: { lastLoginAt: new Date() },
    }),

  update: (id: string, data: Prisma.UserUpdateInput) =>
    prisma.user.update({ where: { id }, data }),
};

// ---------------------------------------------------------------------------
// Agent helpers
// ---------------------------------------------------------------------------

export const agentRepo = {
  findById: (id: string) =>
    prisma.agent.findUnique({ 
      where: { id }, 
      include: { 
        user: { select: { id: true, username: true, displayName: true } },
        listing: { select: { id: true, pricePerRun: true, pricingModel: true } }
      } 
    }),

  findByUser: (userId: string, status?: AgentStatus) =>
    prisma.agent.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: { updatedAt: "desc" },
    }),

  findPublic: (filters?: { category?: string; search?: string }) =>
    prisma.agent.findMany({
      where: {
        isPublic: true,
        status: AgentStatus.ACTIVE,
        ...(filters?.category ? { category: filters.category } : {}),
        ...(filters?.search
          ? {
              OR: [
                { name: { contains: filters.search, mode: "insensitive" } },
                { description: { contains: filters.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: { user: { select: { username: true, displayName: true } } },
      orderBy: { runsCount: "desc" },
    }),

  create: (data: Prisma.AgentCreateInput) =>
    prisma.agent.create({ data }),

  update: (id: string, data: Prisma.AgentUpdateInput) =>
    prisma.agent.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.agent.delete({ where: { id } }),

  incrementRuns: (id: string, success: boolean) =>
    prisma.agent.update({
      where: { id },
      data: {
        runsCount:    { increment: 1 },
        successCount: success ? { increment: 1 } : undefined,
        failureCount: success ? undefined : { increment: 1 },
      },
    }),
};

// ---------------------------------------------------------------------------
// Execution log helpers
// ---------------------------------------------------------------------------

export const executionRepo = {
  create: (data: Prisma.ExecutionLogCreateInput) =>
    prisma.executionLog.create({ data }),

  findById: (id: string) =>
    prisma.executionLog.findUnique({ where: { id } }),

  findByAgent: (agentId: string, take = 20) =>
    prisma.executionLog.findMany({
      where: { agentId },
      orderBy: { createdAt: "desc" },
      take,
    }),

  findByUser: (userId: string, take = 20) =>
    prisma.executionLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: { agent: { select: { name: true, category: true } } },
    }),

  update: (id: string, data: Prisma.ExecutionLogUpdateInput) =>
    prisma.executionLog.update({ where: { id }, data }),

  stats: (userId: string) =>
    prisma.executionLog.groupBy({
      by: ["status"],
      where: { userId },
      _count: { id: true },
    }),
};

// ---------------------------------------------------------------------------
// Workflow helpers
// ---------------------------------------------------------------------------

export const workflowRepo = {
  findById: (id: string) =>
    prisma.workflow.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, displayName: true } } },
    }),

  findByUser: (userId: string) =>
    prisma.workflow.findMany({
      where: { userId, isActive: true },
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { workflowRuns: true } } },
    }),

  create: (data: Prisma.WorkflowCreateInput) =>
    prisma.workflow.create({ data }),

  update: (id: string, data: Prisma.WorkflowUpdateInput) =>
    prisma.workflow.update({ where: { id }, data }),

  softDelete: (id: string) =>
    prisma.workflow.update({ where: { id }, data: { isActive: false } }),

  incrementRuns: (id: string) =>
    prisma.workflow.update({ where: { id }, data: { runsCount: { increment: 1 } } }),
};

// ---------------------------------------------------------------------------
// WorkflowRun helpers
// ---------------------------------------------------------------------------

export const workflowRunRepo = {
  findById: (id: string) =>
    prisma.workflowRun.findUnique({
      where: { id },
      include: { workflow: { select: { name: true } } },
    }),

  findByWorkflow: (workflowId: string, take = 20) =>
    prisma.workflowRun.findMany({
      where: { workflowId },
      orderBy: { createdAt: "desc" },
      take,
    }),

  findByUser: (userId: string, take = 20) =>
    prisma.workflowRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take,
      include: { workflow: { select: { name: true } } },
    }),

  create: (data: Prisma.WorkflowRunCreateInput) =>
    prisma.workflowRun.create({ data }),

  update: (id: string, data: Prisma.WorkflowRunUpdateInput) =>
    prisma.workflowRun.update({ where: { id }, data }),
};

// ---------------------------------------------------------------------------
// Schedule helpers
// ---------------------------------------------------------------------------

export const scheduleRepo = {
  findById: (id: string) =>
    prisma.schedule.findUnique({
      where: { id },
      include: { agent: { select: { id: true, name: true, model: true } } },
    }),

  findAllActive: () =>
    prisma.schedule.findMany({
      where: { isActive: true, isPaused: false },
      include: { agent: { select: { id: true, name: true, prompt: true, model: true, config: true, tools: true } } },
    }),

  findByUser: (userId: string) =>
    prisma.schedule.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        agent: { select: { id: true, name: true, category: true } },
        _count: { select: { scheduleRuns: true } },
      },
    }),

  create: (data: Prisma.ScheduleCreateInput) =>
    prisma.schedule.create({ data }),

  update: (id: string, data: Prisma.ScheduleUpdateInput) =>
    prisma.schedule.update({ where: { id }, data }),

  softDelete: (id: string) =>
    prisma.schedule.update({ where: { id }, data: { isActive: false } }),

  incrementRuns: (id: string, failed: boolean) =>
    prisma.schedule.update({
      where: { id },
      data: {
        runsCount:    { increment: 1 },
        failureCount: failed ? { increment: 1 } : undefined,
        lastRunAt:    new Date(),
      },
    }),
};

// ---------------------------------------------------------------------------
// ScheduleRun helpers
// ---------------------------------------------------------------------------

export const scheduleRunRepo = {
  create: (data: Prisma.ScheduleRunCreateInput) =>
    prisma.scheduleRun.create({ data }),

  findBySchedule: (scheduleId: string, take = 20) =>
    prisma.scheduleRun.findMany({
      where: { scheduleId },
      orderBy: { triggeredAt: "desc" },
      take,
    }),

  update: (id: string, data: Prisma.ScheduleRunUpdateInput) =>
    prisma.scheduleRun.update({ where: { id }, data }),
};

// ---------------------------------------------------------------------------
// Team helpers
// ---------------------------------------------------------------------------

const TEAM_MEMBER_INCLUDE = {
  user: { select: { id: true, username: true, displayName: true, avatarUrl: true, email: true } },
  invitedBy: { select: { id: true, username: true, displayName: true } },
} as const;

export const teamRepo = {
  findById: (id: string) =>
    prisma.team.findUnique({
      where: { id },
      include: { members: { include: TEAM_MEMBER_INCLUDE, orderBy: { createdAt: "asc" } } },
    }),

  findBySlug: (slug: string) =>
    prisma.team.findUnique({
      where: { slug },
      include: { members: { include: TEAM_MEMBER_INCLUDE } },
    }),

  findByUser: (userId: string) =>
    prisma.team.findMany({
      where: { members: { some: { userId, inviteStatus: "ACCEPTED" } }, isActive: true },
      include: {
        members: {
          where:   { userId },
          select:  { role: true, joinedAt: true },
        },
        _count: { select: { members: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

  create: (data: Prisma.TeamCreateInput) =>
    prisma.team.create({ data }),

  update: (id: string, data: Prisma.TeamUpdateInput) =>
    prisma.team.update({ where: { id }, data }),

  softDelete: (id: string) =>
    prisma.team.update({ where: { id }, data: { isActive: false } }),

  updateMemberCount: (id: string, delta: 1 | -1) =>
    prisma.team.update({
      where: { id },
      data: { membersCount: { increment: delta } },
    }),
};

// ---------------------------------------------------------------------------
// TeamMember helpers
// ---------------------------------------------------------------------------

export const teamMemberRepo = {
  findMembership: (teamId: string, userId: string) =>
    prisma.teamMember.findUnique({ where: { teamId_userId: { teamId, userId } } }),

  findByToken: (token: string) =>
    prisma.teamMember.findUnique({
      where:   { inviteToken: token },
      include: { team: true, user: true },
    }),

  create: (data: Prisma.TeamMemberCreateInput) =>
    prisma.teamMember.create({ data }),

  update: (id: string, data: Prisma.TeamMemberUpdateInput) =>
    prisma.teamMember.update({ where: { id }, data }),

  delete: (id: string) =>
    prisma.teamMember.delete({ where: { id } }),

  findPendingInvites: (userId: string) =>
    prisma.teamMember.findMany({
      where:   { userId, inviteStatus: "PENDING" },
      include: { team: { select: { id: true, name: true, slug: true } } },
    }),
};

// ---------------------------------------------------------------------------
// Marketplace — Listing helpers
// ---------------------------------------------------------------------------

export const listingRepo = {
  findById: (id: string) =>
    prisma.listing.findUnique({
      where: { id },
      include: {
        creator: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
        agent:   { select: { id: true, name: true, model: true, category: true, tools: true } },
        _count:  { select: { subscriptions: true, reviews: true } },
      },
    }),

  browse: (filters?: {
    category?: string;
    search?:   string;
    pricing?:  PricingModel;
    orderBy?:  "avgRating" | "totalRunsCount" | "subscribersCount" | "createdAt";
    take?:     number;
    skip?:     number;
  }) => {
    const { category, search, pricing, orderBy = "subscribersCount", take = 20, skip = 0 } = filters ?? {};
    return prisma.listing.findMany({
      where: {
        status: ListingStatus.PUBLISHED,
        ...(category ? { category } : {}),
        ...(pricing  ? { pricingModel: pricing } : {}),
        ...(search   ? {
          OR: [
            { name:        { contains: search, mode: "insensitive" } },
            { tagline:     { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        creator: { select: { id: true, username: true, displayName: true } },
        agent:   { select: { id: true, type: true, framework: true, version: true } },
      },
      orderBy: { [orderBy]: "desc" },
      take,
      skip,
    });
  },

  findByCreator: (userId: string) =>
    prisma.listing.findMany({
      where:   { userId },
      include: { agent: { select: { id: true, name: true } }, _count: { select: { subscriptions: true } } },
      orderBy: { createdAt: "desc" },
    }),

  findByAgentId: (agentId: string) =>
    prisma.listing.findUnique({ where: { agentId } }),

  create: (data: Prisma.ListingCreateInput) =>
    prisma.listing.create({ data }),

  update: (id: string, data: Prisma.ListingUpdateInput) =>
    prisma.listing.update({ where: { id }, data }),

  updateRating: async (listingId: string) => {
    const agg = await prisma.listingReview.aggregate({
      where: { listingId },
      _avg:  { rating: true },
      _count: { rating: true },
    });
    return prisma.listing.update({
      where: { id: listingId },
      data: {
        avgRating:    agg._avg.rating ?? 0,
        reviewsCount: agg._count.rating,
      },
    });
  },
};

// ---------------------------------------------------------------------------
// Marketplace — Subscription helpers
// ---------------------------------------------------------------------------

export const subscriptionRepo = {
  findByApiKey: (apiKey: string) =>
    prisma.subscription.findUnique({
      where:   { apiKey },
      include: {
        listing: {
          include: { agent: true },
        },
      },
    }),

  findByUser: (userId: string) =>
    prisma.subscription.findMany({
      where:   { userId, isActive: true },
      include: { listing: { select: { id: true, name: true, category: true, rateLimitPerDay: true } } },
      orderBy: { subscribedAt: "desc" },
    }),

  findUserSub: (listingId: string, userId: string) =>
    prisma.subscription.findUnique({ where: { listingId_userId: { listingId, userId } } }),

  create: (data: Prisma.SubscriptionCreateInput) =>
    prisma.subscription.create({ data }),

  update: (id: string, data: Prisma.SubscriptionUpdateInput) =>
    prisma.subscription.update({ where: { id }, data }),

  incrementUsage: (id: string) =>
    prisma.subscription.update({
      where: { id },
      data: {
        dailyRunsUsed: { increment: 1 },
        totalRunsUsed: { increment: 1 },
        lastUsedAt:    new Date(),
      },
    }),
};

// ---------------------------------------------------------------------------
// Marketplace — Review helpers
// ---------------------------------------------------------------------------

export const reviewRepo = {
  findByListing: (listingId: string, take = 20) =>
    prisma.listingReview.findMany({
      where:   { listingId },
      include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
      orderBy: { createdAt: "desc" },
      take,
    }),

  findUserReview: (listingId: string, userId: string) =>
    prisma.listingReview.findUnique({ where: { listingId_userId: { listingId, userId } } }),

  upsert: (listingId: string, userId: string, rating: number, comment?: string) =>
    prisma.listingReview.upsert({
      where:  { listingId_userId: { listingId, userId } },
      create: { listingId, userId, rating, comment },
      update: { rating, comment },
    }),

  delete: (listingId: string, userId: string) =>
    prisma.listingReview.delete({ where: { listingId_userId: { listingId, userId } } }),
};

// ---------------------------------------------------------------------------
// Agent Version helpers
// ---------------------------------------------------------------------------

export const agentVersionRepo = {
  findByAgent: (agentId: string) =>
    prisma.agentVersion.findMany({
      where:   { agentId },
      select: {
        id: true, versionNumber: true, name: true, description: true,
        model: true, changelog: true, createdBy: true, createdAt: true,
        creator: { select: { id: true, username: true, displayName: true } },
      },
      orderBy: { versionNumber: "desc" },
    }),

  findById: (id: string) =>
    prisma.agentVersion.findUnique({
      where:   { id },
      include: { creator: { select: { id: true, username: true, displayName: true } } },
    }),

  findLatestNumber: async (agentId: string): Promise<number> => {
    const latest = await prisma.agentVersion.findFirst({
      where:   { agentId },
      orderBy: { versionNumber: "desc" },
      select:  { versionNumber: true },
    });
    return latest?.versionNumber ?? 0;
  },

  create: (data: Prisma.AgentVersionCreateInput) =>
    prisma.agentVersion.create({ data }),

  delete: (id: string) =>
    prisma.agentVersion.delete({ where: { id } }),

  deleteByAgent: (agentId: string) =>
    prisma.agentVersion.deleteMany({ where: { agentId } }),
};

// ---------------------------------------------------------------------------
// Notification helpers
// ---------------------------------------------------------------------------

export const notificationRepo = {
  create: (data: Prisma.NotificationCreateInput) =>
    prisma.notification.create({ data }),

  findByUser: (userId: string, opts?: { unreadOnly?: boolean; take?: number; skip?: number }) => {
    const { unreadOnly = false, take = 20, skip = 0 } = opts ?? {};
    return prisma.notification.findMany({
      where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    });
  },

  countUnread: (userId: string) =>
    prisma.notification.count({ where: { userId, isRead: false } }),

  markRead: (id: string) =>
    prisma.notification.update({
      where: { id },
      data:  { isRead: true, readAt: new Date() },
    }),

  markAllRead: (userId: string) =>
    prisma.notification.updateMany({
      where: { userId, isRead: false },
      data:  { isRead: true, readAt: new Date() },
    }),

  delete: (id: string) =>
    prisma.notification.delete({ where: { id } }),

  deleteAllByUser: (userId: string) =>
    prisma.notification.deleteMany({ where: { userId } }),
};

// ---------------------------------------------------------------------------
// Permission helpers
// ---------------------------------------------------------------------------

export const permissionRepo = {
  findById: (id: string) =>
    prisma.permission.findUnique({
      where:   { id },
      include: {
        user:    { select: { id: true, username: true, displayName: true } },
        grantor: { select: { id: true, username: true, displayName: true } },
      },
    }),

  findByResource: (resourceType: ResourceType, resourceId: string) =>
    prisma.permission.findMany({
      where:   { resourceType, resourceId },
      include: { user: { select: { id: true, username: true, displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),

  findUserPermission: (userId: string, resourceType: ResourceType, resourceId: string, action: PermissionAction) =>
    prisma.permission.findUnique({
      where: { userId_resourceType_resourceId_action: { userId, resourceType, resourceId, action } },
    }),

  hasPermission: async (userId: string, resourceType: ResourceType, resourceId: string, action: PermissionAction): Promise<boolean> => {
    const perm = await prisma.permission.findUnique({
      where: { userId_resourceType_resourceId_action: { userId, resourceType, resourceId, action } },
      select: { id: true },
    });
    return perm !== null;
  },

  grant: (data: Prisma.PermissionCreateInput) =>
    prisma.permission.create({ data }),

  revoke: (id: string) =>
    prisma.permission.delete({ where: { id } }),

  revokeAllForResource: (resourceType: ResourceType, resourceId: string) =>
    prisma.permission.deleteMany({ where: { resourceType, resourceId } }),
};

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

export const sessionRepo = {
  create: (data: Prisma.SessionCreateInput) =>
    prisma.session.create({ data }),

  findByToken: (token: string) =>
    prisma.session.findUnique({ where: { token }, include: { user: true } }),

  invalidate: (token: string) =>
    prisma.session.update({ where: { token }, data: { isValid: false } }),

  invalidateAllForUser: (userId: string) =>
    prisma.session.updateMany({ where: { userId, isValid: true }, data: { isValid: false } }),
};

// ---------------------------------------------------------------------------
// Audit Log helpers
// ---------------------------------------------------------------------------

export const auditLogRepo = {
  create: (data: Prisma.AuditLogCreateInput) =>
    prisma.auditLog.create({ data }),

  findByUser: (userId: string, take = 50) =>
    prisma.auditLog.findMany({
      where:   { userId },
      orderBy: { createdAt: "desc" },
      take,
    }),
};

// ---------------------------------------------------------------------------
// Billing helpers
// ---------------------------------------------------------------------------

export const billingRepo = {
  findPlanById: (id: string) =>
    prisma.billingPlan.findUnique({ where: { id } }),

  findAllPlans: () =>
    prisma.billingPlan.findMany({ where: { isActive: true } }),

  findSubscriptionByUser: (userId: string) =>
    prisma.billingSubscription.findUnique({
      where:   { userId },
      include: { plan: true },
    }),

  upsertSubscription: (data: Prisma.BillingSubscriptionUncheckedCreateInput) =>
    prisma.billingSubscription.upsert({
      where:  { userId: data.userId },
      create: data,
      update: data,
    }),
};

export const invoiceRepo = {
  create: (data: Prisma.InvoiceUncheckedCreateInput) =>
    prisma.invoice.create({ data }),

  findById: (id: string) =>
    prisma.invoice.findUnique({ where: { id }, include: { items: true } }),

  findByUser: (userId: string) =>
    prisma.invoice.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),

  updateStatus: (id: string, status: string) =>
    prisma.invoice.update({ where: { id }, data: { status } }),
};

export const payoutRepo = {
  create: (data: Prisma.CreatorPayoutUncheckedCreateInput) =>
    prisma.creatorPayout.create({ data }),

  findByUser: (userId: string) =>
    prisma.creatorPayout.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),
};

export const creditLogRepo = {
  create: (data: Prisma.CreditLogUncheckedCreateInput) =>
    prisma.creditLog.create({ data }),

  findByUser: (userId: string) =>
    prisma.creditLog.findMany({ where: { userId }, orderBy: { createdAt: "desc" } }),

  findByTeam: (teamId: string) =>
    prisma.creditLog.findMany({ where: { teamId }, orderBy: { createdAt: "desc" } }),
};

// ---------------------------------------------------------------------------
// Collection helpers
// ---------------------------------------------------------------------------

export const collectionRepo = {
  findAll: () =>
    prisma.collection.findMany({ where: { isActive: true }, include: { items: { include: { listing: true } } } }),

  findBySlug: (slug: string) =>
    prisma.collection.findUnique({
      where:   { slug },
      include: { items: { include: { listing: { include: { creator: true } } }, orderBy: { displayOrder: "asc" } } },
    }),
};

// ---------------------------------------------------------------------------
// OAuth & Integration helpers
// ---------------------------------------------------------------------------

export const integrationRepo = {
  findAll: (activeOnly = true) =>
    prisma.integration.findMany({ 
      where: activeOnly ? { isActive: true } : {},
      orderBy: { name: "asc" } 
    }),

  findBySlug: (slug: string) =>
    prisma.integration.findUnique({ where: { slug } }),

  findById: (id: string) =>
    prisma.integration.findUnique({ where: { id } }),

  create: (data: Prisma.IntegrationCreateInput) =>
    prisma.integration.create({ data }),
};

export const connectionRepo = {
  findByUser: (userId: string) =>
    prisma.connection.findMany({
      where: { userId, isActive: true },
      include: { integration: true },
    }),

  findUnique: (userId: string, integrationId: string) =>
    prisma.connection.findUnique({
      where: { userId_integrationId: { userId, integrationId } },
      include: { integration: true },
    }),

  upsert: (userId: string, integrationId: string, data: Partial<Connection>) => {
    const { id, createdAt, updatedAt, ...updateData } = data as any;
    return prisma.connection.upsert({
      where: { userId_integrationId: { userId, integrationId } },
      create: { userId, integrationId, ...updateData },
      update: { ...updateData, isActive: true },
      include: { integration: true },
    });
  },

  deactivate: (id: string) =>
    prisma.connection.update({
      where: { id },
      data: { isActive: false, accessToken: "", refreshToken: "" },
    }),
};
