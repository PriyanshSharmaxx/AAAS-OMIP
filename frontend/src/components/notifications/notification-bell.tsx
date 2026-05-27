"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Bell, BellOff, Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "./notification-item";

// ---------------------------------------------------------------------------
// NotificationBell — navbar dropdown
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const {
    notifications,
    unreadCount,
    wsConnected,
    markRead,
    markUnread,
    markAllRead,
    deleteNotification,
  } = useNotifications();

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  // Show at most 5 in dropdown
  const preview = notifications.slice(0, 5);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="relative"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center",
              "rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground",
              "animate-in zoom-in-50 duration-200",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </Button>

      {/* Dropdown */}
      {open && (
        <div
          className={cn(
            "absolute right-0 top-full z-50 mt-2 w-[380px]",
            "rounded-xl border bg-card shadow-xl",
            "animate-in slide-in-from-top-2 fade-in-0 duration-200",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold">Notifications</h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* WS status */}
              <span
                title={wsConnected ? "Real-time connected" : "Polling mode"}
                className="flex items-center"
              >
                {wsConnected ? (
                  <Wifi className="h-3 w-3 text-emerald-500" />
                ) : (
                  <WifiOff className="h-3 w-3 text-muted-foreground/50" />
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[11px] text-muted-foreground hover:text-primary transition-colors"
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <Separator />

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto">
            {preview.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10 text-center">
                <BellOff className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">All caught up!</p>
              </div>
            ) : (
              <div className="space-y-0.5 p-2">
                {preview.map((n) => (
                  <NotificationItem
                    key={n.id}
                    notification={n}
                    onMarkRead={markRead}
                    onMarkUnread={markUnread}
                    onDelete={deleteNotification}
                    compact
                  />
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] text-muted-foreground">
              {notifications.length} total notification{notifications.length !== 1 ? "s" : ""}
            </span>
            <Link
              href="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-primary hover:underline"
            >
              View all →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
