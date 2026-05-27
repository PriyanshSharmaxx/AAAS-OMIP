import { Router } from "express";
import {
  listNotifications,
  getUnreadCount,
  markRead,
  deleteAll,
  deleteNotification,
} from "./notifications.controller";
import { verifyUser } from "../../middleware/auth";

const router = Router();
router.use(verifyUser);

/**
 * @route   GET /api/notifications
 * @desc    List inbox with unreadCount; supports ?unreadOnly=true&page=1&limit=20
 * @access  Private
 */
router.get("/", listNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Lightweight count for notification badge polling
 * @access  Private
 */
router.get("/unread-count", getUnreadCount);

/**
 * @route   POST /api/notifications/mark-read
 * @desc    Mark one notification read (body: { notificationId }) or all (empty body)
 * @access  Private
 */
router.post("/mark-read", markRead);

/**
 * @route   DELETE /api/notifications/all
 * @desc    Clear all notifications for current user
 * @access  Private
 */
router.delete("/all", deleteAll);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Dismiss a single notification
 * @access  Private
 */
router.delete("/:id", deleteNotification);

export default router;
