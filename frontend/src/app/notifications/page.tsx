"use client";

import { useState } from "react";
import {
  Bell, BellOff, Trash2, CheckCheck, MailOpen,
  Filter, Wifi, WifiOff, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/notification-item";
import { NotificationFilter, NOTIFICATION_CONFIG } from "@/lib/notification-data";

// ---------------------------------------------------------------------------
// Filter tabs
// ---------------------------------------------------------------------------

const FILTERS: { key: NotificationFilter; label: string }[] = [
  { key: "all",      label: "All" },
  { key: "errors",   label: "Errors" },
  { key: "billing",  label: "Billing" },
  { key: "activity", label: "Activity" },
];

// ---------------------------------------------------------------------------
// Stats row
// ---------------------------------------------------------------------------

function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-xl font-bold", color)}>{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const {
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
  } = useNotifications();

  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const totalErrors   = notifications.filter((n) => n.type === "error").length;
  const totalBilling  = notifications.filter((n) => n.type === "billing").length;
  const totalActivity = notifications.filter(
    (n) => NOTIFICATION_CONFIG[n.type].filterKey === "activity",
  ).length;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(filtered.map((n) => n.id)));
  }

  function clearSelection() {
    setSelected(new Set());
    setBulkMode(false);
  }

  function bulkMarkRead() {
    selected.forEach((id) => markRead(id));
    clearSelection();
  }

  function bulkDelete() {
    selected.forEach((id) => deleteNotification(id));
    clearSelection();
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto max-w-3xl px-4 py-8">

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Notifications</h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {wsConnected ? (
                    <Wifi className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <WifiOff className="h-3 w-3 text-muted-foreground/40" />
                  )}
                  <span className="text-xs text-muted-foreground">
                    {wsConnected ? "Real-time updates active" : "Polling every 30s"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setBulkMode((b) => !b)}
              className={cn(bulkMode && "border-primary text-primary")}
            >
              <Filter className="mr-1.5 h-3.5 w-3.5" />
              {bulkMode ? "Exit Select" : "Select"}
            </Button>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={markAllRead}>
                <CheckCheck className="mr-1.5 h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>
        </div>

        {/* ── Stats ───────────────────────────────────────────────────── */}
        <div className="mb-6 grid grid-cols-4 gap-4 rounded-xl border bg-card p-4">
          <StatPill label="Total"    value={notifications.length} color="text-foreground" />
          <StatPill label="Unread"   value={unreadCount}          color="text-primary"    />
          <StatPill label="Errors"   value={totalErrors}          color="text-red-500"    />
          <StatPill label="Billing"  value={totalBilling}         color="text-amber-500"  />
        </div>

        {/* ── Filter tabs ─────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex gap-1 rounded-lg border bg-card p-1">
            {FILTERS.map((f) => {
              const count =
                f.key === "all"
                  ? notifications.length
                  : notifications.filter(
                      (n) => NOTIFICATION_CONFIG[n.type].filterKey === f.key,
                    ).length;
              return (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    filter === f.key
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {f.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0 text-[10px] font-bold",
                        filter === f.key
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Bulk action bar */}
          {bulkMode && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {selected.size} selected
              </span>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                Select all
              </Button>
              {selected.size > 0 && (
                <>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={bulkMarkRead}>
                    <MailOpen className="mr-1 h-3 w-3" />
                    Mark read
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-destructive hover:text-destructive"
                    onClick={bulkDelete}
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── Notification list ────────────────────────────────────────── */}
        <div className="space-y-1.5">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-20 text-center">
              <BellOff className="h-10 w-10 text-muted-foreground/25" />
              <div>
                <p className="font-medium text-muted-foreground">No notifications</p>
                <p className="text-sm text-muted-foreground/60">
                  {filter === "all"
                    ? "You're all caught up!"
                    : `No ${filter} notifications found.`}
                </p>
              </div>
            </div>
          ) : (
            filtered.map((n) => (
              <div key={n.id} className="flex items-start gap-2">
                {bulkMode && (
                  <button
                    onClick={() => toggleSelect(n.id)}
                    className={cn(
                      "mt-3.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
                      selected.has(n.id)
                        ? "border-primary bg-primary"
                        : "border-border bg-background",
                    )}
                    aria-label="Select notification"
                  >
                    {selected.has(n.id) && (
                      <CheckCheck className="h-2.5 w-2.5 text-primary-foreground" />
                    )}
                  </button>
                )}
                <div className="flex-1">
                  <NotificationItem
                    notification={n}
                    onMarkRead={markRead}
                    onMarkUnread={markUnread}
                    onDelete={deleteNotification}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Bottom bulk actions ──────────────────────────────────────── */}
        {notifications.length > 0 && (
          <>
            <Separator className="mt-8 mb-4" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{notifications.length} total notifications</span>
              <div className="flex gap-3">
                <button
                  onClick={deleteRead}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete read
                </button>
                <button
                  onClick={deleteAll}
                  className="flex items-center gap-1 text-destructive/70 hover:text-destructive transition-colors"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear all
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
