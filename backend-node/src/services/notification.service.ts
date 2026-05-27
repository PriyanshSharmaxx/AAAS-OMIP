/**
 * src/services/notification.service.ts
 *
 * In-app notification inbox.
 *
 * Design rules:
 *   • All `notify*` helpers are fire-and-forget — call sites wrap them in
 *     `.catch(() => {})` so a notification failure never breaks the main flow.
 *   • The service writes directly to the DB (no queue) — notifications are
 *     low-priority and the volume is small relative to executions.
 *
 * Notification types (NotificationType enum):
 *   EXECUTION_COMPLETED — your agent run finished successfully
 *   EXECUTION_FAILED    — your agent run failed
 *   SUBSCRIPTION_NEW    — someone subscribed to your listing
 *   REVIEW_RECEIVED     — someone left a review on your listing
 *   INVITE_RECEIVED     — you have been invited to a team
 */

import { z } from "zod";
import { notificationRepo, NotificationType } from "../lib/db";
import { AppError } from "../middleware/errorHandler";
import { logger } from "../lib/logger";

// ---------------------------------------------------------------------------
// Query schema (GET /api/notifications)
// ---------------------------------------------------------------------------

export const ListNotificationsSchema = z.object({
  unreadOnly: z.coerce.boolean().default(false),
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(100).default(20),
});

// ---------------------------------------------------------------------------
// notificationService
// ---------------------------------------------------------------------------

export const notificationService = {

  // ── list ───────────────────────────────────────────────────────────────────

  async list(userId: string, query: z.infer<typeof ListNotificationsSchema>) {
    const skip = (query.page - 1) * query.limit;
    const [notifications, unreadCount] = await Promise.all([
      notificationRepo.findByUser(userId, {
        unreadOnly: query.unreadOnly,
        take:       query.limit,
        skip,
      }),
      notificationRepo.countUnread(userId),
    ]);
    return { notifications, unreadCount };
  },

  // ── unreadCount ────────────────────────────────────────────────────────────

  async unreadCount(userId: string) {
    return notificationRepo.countUnread(userId);
  },

  // ── markRead ───────────────────────────────────────────────────────────────

  async markRead(userId: string, notificationId?: string) {
    if (notificationId) {
      // Mark one — verify ownership first
      const result = await notificationRepo.markRead(notificationId);
      // Check the updated record belongs to this user (Prisma will 404 if not found,
      // but not enforce userId — we check after the fact)
      if (result.userId !== userId) {
        throw new AppError("Notification not found.", 404, "NOT_FOUND");
      }
      return result;
    }
    // Mark all unread → read
    await notificationRepo.markAllRead(userId);
    return null;
  },

  // ── delete ─────────────────────────────────────────────────────────────────

  async delete(userId: string, notificationId: string) {
    // Fetch first to verify ownership
    const notifications = await notificationRepo.findByUser(userId, { take: 200 });
    const owned = notifications.find((n) => n.id === notificationId);
    if (!owned) throw new AppError("Notification not found.", 404, "NOT_FOUND");
    await notificationRepo.delete(notificationId);
  },

  // ── deleteAll ──────────────────────────────────────────────────────────────

  async deleteAll(userId: string) {
    await notificationRepo.deleteAllByUser(userId);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Fire-and-forget helpers used by other services
  // Call pattern:  notificationService.notifyExecutionCompleted(...).catch(() => {});
  // ─────────────────────────────────────────────────────────────────────────

  async notifyExecutionCompleted(userId: string, agentName: string, executionId: string, durationMs: number) {
    await notificationRepo.create({
      user:     { connect: { id: userId } },
      type:     NotificationType.EXECUTION_COMPLETED,
      title:    `${agentName} run completed`,
      body:     `Your agent "${agentName}" finished successfully in ${(durationMs / 1000).toFixed(1)}s.`,
      metadata: { executionId, agentName, durationMs },
    });
    logger.debug("Notification: EXECUTION_COMPLETED", { userId, executionId });
  },

  async notifyExecutionFailed(userId: string, agentName: string, executionId: string, error: string) {
    await notificationRepo.create({
      user:     { connect: { id: userId } },
      type:     NotificationType.EXECUTION_FAILED,
      title:    `${agentName} run failed`,
      body:     `Your agent "${agentName}" encountered an error: ${error.slice(0, 200)}`,
      metadata: { executionId, agentName, error: error.slice(0, 500) },
    });
    logger.debug("Notification: EXECUTION_FAILED", { userId, executionId });
  },

  async notifySubscriptionNew(creatorId: string, listingName: string, listingId: string, subscriberUsername: string) {
    await notificationRepo.create({
      user:     { connect: { id: creatorId } },
      type:     NotificationType.SUBSCRIPTION_NEW,
      title:    "New subscriber",
      body:     `@${subscriberUsername} subscribed to your listing "${listingName}".`,
      metadata: { listingId, listingName, subscriberUsername },
    });
    logger.debug("Notification: SUBSCRIPTION_NEW", { creatorId, listingId });
  },

  async notifyReviewReceived(creatorId: string, listingName: string, listingId: string, rating: number, reviewerUsername: string) {
    const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
    await notificationRepo.create({
      user:     { connect: { id: creatorId } },
      type:     NotificationType.REVIEW_RECEIVED,
      title:    `New ${rating}-star review`,
      body:     `@${reviewerUsername} left a ${stars} review on "${listingName}".`,
      metadata: { listingId, listingName, rating, reviewerUsername },
    });
    logger.debug("Notification: REVIEW_RECEIVED", { creatorId, listingId, rating });
  },

  async notifyInviteReceived(inviteeId: string, teamName: string, teamId: string, inviterUsername: string, role: string) {
    await notificationRepo.create({
      user:     { connect: { id: inviteeId } },
      type:     NotificationType.INVITE_RECEIVED,
      title:    `Team invite from @${inviterUsername}`,
      body:     `@${inviterUsername} invited you to join "${teamName}" as ${role}.`,
      metadata: { teamId, teamName, inviterUsername, role },
    });
    logger.debug("Notification: INVITE_RECEIVED", { inviteeId, teamId });
  },
};
