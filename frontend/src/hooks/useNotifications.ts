"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Notification,
  NotificationFilter,
  NotificationStatus,
  MOCK_NOTIFICATIONS,
  filterNotifications,
} from "@/lib/notification-data";

// ---------------------------------------------------------------------------
// WebSocket simulation — in production replace with real WS connection
// ---------------------------------------------------------------------------

const WS_SIMULATION_INTERVAL = 45_000; // new mock notification every 45s
const POLL_FALLBACK_INTERVAL  = 30_000; // fallback polling interval

const SIMULATED_NEW: Omit<Notification, "id" | "created_at" | "status" | "user_id">[] = [
  {
    type: "success",
    title: "Workflow run completed",
    message: "Content Pipeline finished 8/8 nodes successfully.",
    entity: { type: "run", id: "run-sim-1", label: "Content Pipeline" },
  },
  {
    type: "info",
    title: "New feature available",
    message: "Agent branching & merge requests are now live in Version Control.",
  },
  {
    type: "team",
    title: "Team activity detected",
    message: "3 agents were updated by your team members in the last hour.",
    entity: { type: "team", id: "team-1", label: "Omip Dev Team" },
  },
];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK_NOTIFICATIONS);
  const [filter, setFilter]               = useState<NotificationFilter>("all");
  const [wsConnected, setWsConnected]     = useState(false);
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // -- Computed -----------------------------------------------------------------
  const unreadCount = notifications.filter((n) => n.status === "unread").length;
  const filtered     = filterNotifications(notifications, filter);

  // -- WebSocket simulation -----------------------------------------------------
  const connectWS = useCallback(() => {
    // Simulate successful WS handshake after 800ms
    setTimeout(() => setWsConnected(true), 800);

    function scheduleNext() {
      simTimerRef.current = setTimeout(() => {
        const template = SIMULATED_NEW[Math.floor(Math.random() * SIMULATED_NEW.length)];
        const newNote: Notification = {
          ...template,
          id: `sim-${Date.now()}`,
          user_id: "u1",
          status: "unread",
          created_at: new Date().toISOString(),
        };
        setNotifications((prev) => [newNote, ...prev]);
        scheduleNext();
      }, WS_SIMULATION_INTERVAL);
    }

    scheduleNext();
  }, []);

  // -- Fallback polling ---------------------------------------------------------
  const startPolling = useCallback(() => {
    pollTimerRef.current = setInterval(() => {
      // In production: fetch /api/notifications and merge new ones
      // Here we just keep state as-is (mock already seeded)
    }, POLL_FALLBACK_INTERVAL);
  }, []);

  useEffect(() => {
    connectWS();
    startPolling();
    return () => {
      if (simTimerRef.current)  clearTimeout(simTimerRef.current);
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [connectWS, startPolling]);

  // -- Actions ------------------------------------------------------------------

  const markRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "read" as NotificationStatus } : n)),
    );
  }, []);

  const markUnread = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, status: "unread" as NotificationStatus } : n)),
    );
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" as NotificationStatus })));
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const deleteAll = useCallback(() => {
    setNotifications([]);
  }, []);

  const deleteRead = useCallback(() => {
    setNotifications((prev) => prev.filter((n) => n.status === "unread"));
  }, []);

  return {
    notifications,
    filtered,
    filter,
    setFilter,
    unreadCount,
    wsConnected,
    markRead,
    markUnread,
    markAllRead,
    deleteNotification,
    deleteAll,
    deleteRead,
  };
}
