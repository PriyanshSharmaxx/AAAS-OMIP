"use client";

import {
  CheckCircle2, XCircle, Info, CreditCard,
  Users, ShoppingBag, Trash2, MailOpen, Mail, ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Notification,
  NotificationType,
  NOTIFICATION_CONFIG,
  formatRelativeTime,
} from "@/lib/notification-data";

// ---------------------------------------------------------------------------
// Icon map
// ---------------------------------------------------------------------------

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  success:     CheckCircle2,
  error:       XCircle,
  info:        Info,
  billing:     CreditCard,
  team:        Users,
  marketplace: ShoppingBag,
};

// ---------------------------------------------------------------------------
// NotificationItem
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  notification: Notification;
  onMarkRead:   (id: string) => void;
  onMarkUnread: (id: string) => void;
  onDelete:     (id: string) => void;
  compact?:     boolean;
}

export function NotificationItem({
  notification: n,
  onMarkRead,
  onMarkUnread,
  onDelete,
  compact = false,
}: NotificationItemProps) {
  const cfg  = NOTIFICATION_CONFIG[n.type];
  const Icon = TYPE_ICONS[n.type];
  const isUnread = n.status === "unread";

  return (
    <div
      className={cn(
        "group relative flex gap-3 rounded-lg border p-3 transition-colors",
        isUnread
          ? "border-border bg-card"
          : "border-transparent bg-transparent",
        "hover:bg-secondary/50",
      )}
    >
      {/* Unread indicator dot */}
      {isUnread && (
        <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-primary" />
      )}

      {/* Icon */}
      <div
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          cfg.bgClass,
        )}
      >
        <Icon className={cn("h-4 w-4", cfg.colorClass)} />
      </div>

      {/* Body */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium leading-snug", isUnread ? "text-foreground" : "text-muted-foreground")}>
            {n.title}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground/60">
            {formatRelativeTime(n.created_at)}
          </span>
        </div>

        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
          {n.message}
        </p>

        {n.entity && !compact && (
          <div className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground/70">
            <ExternalLink className="h-3 w-3" />
            <span>{n.entity.label}</span>
          </div>
        )}
      </div>

      {/* Actions — shown on hover */}
      {!compact && (
        <div className="absolute bottom-2.5 right-2.5 hidden items-center gap-1 group-hover:flex">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            title={isUnread ? "Mark as read" : "Mark as unread"}
            onClick={() => isUnread ? onMarkRead(n.id) : onMarkUnread(n.id)}
          >
            {isUnread ? <MailOpen className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:text-destructive"
            title="Delete"
            onClick={() => onDelete(n.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
