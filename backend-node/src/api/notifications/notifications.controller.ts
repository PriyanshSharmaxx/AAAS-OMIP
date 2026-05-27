/**
 * src/api/notifications/notifications.controller.ts
 */

import { Request, Response, NextFunction } from "express";
import { notificationService, ListNotificationsSchema } from "../../services/notification.service";
import { AppError } from "../../middleware/errorHandler";

// GET /api/notifications
export async function listNotifications(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const parsed = ListNotificationsSchema.safeParse(req.query);
    if (!parsed.success) return next(new AppError(parsed.error.errors[0]?.message ?? "Validation error.", 400, "VALIDATION_ERROR"));
    const result = await notificationService.list(req.user!.sub, parsed.data);
    res.json({
      success: true,
      data:    result.notifications,
      total:   result.notifications.length,
      unreadCount: result.unreadCount,
    });
  } catch (err) { next(err); }
}

// GET /api/notifications/unread-count
export async function getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await notificationService.unreadCount(req.user!.sub);
    res.json({ success: true, data: { unreadCount: count } });
  } catch (err) { next(err); }
}

// POST /api/notifications/mark-read
// Body: { notificationId?: string }  — omit to mark ALL read
export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { notificationId } = req.body as { notificationId?: string };
    const result = await notificationService.markRead(req.user!.sub, notificationId);
    if (result) {
      res.json({ success: true, data: result });
    } else {
      res.json({ success: true, message: "All notifications marked as read." });
    }
  } catch (err) { next(err); }
}

// DELETE /api/notifications/all
export async function deleteAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.deleteAll(req.user!.sub);
    res.json({ success: true, message: "All notifications deleted." });
  } catch (err) { next(err); }
}

// DELETE /api/notifications/:id
export async function deleteNotification(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await notificationService.delete(req.user!.sub, req.params.id!);
    res.json({ success: true, message: "Notification dismissed." });
  } catch (err) { next(err); }
}
