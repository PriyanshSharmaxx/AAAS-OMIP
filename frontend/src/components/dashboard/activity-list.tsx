"use client";

import { CheckCircle2, XCircle, Loader2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityItem } from "@/hooks/useDashboard";

interface ActivityListProps {
  items: ActivityItem[];
  className?: string;
}

const STATUS_CONFIG = {
  success: { icon: CheckCircle2, color: "text-green-500", label: "Success" },
  failed:  { icon: XCircle,      color: "text-destructive", label: "Failed" },
  running: { icon: Loader2,      color: "text-primary",    label: "Running" },
};

export function ActivityList({ items, className }: ActivityListProps) {
  return (
    <div className={cn("divide-y rounded-xl border bg-card overflow-hidden", className)}>
      {items.map((item) => {
        const cfg = STATUS_CONFIG[item.status];
        const Icon = cfg.icon;

        return (
          <div key={item.id} className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
            {/* Agent icon */}
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-lg">
              {item.agent_icon}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{item.agent_name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{item.category}</Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />{item.time}
                </span>
              </div>
            </div>

            {/* Duration */}
            <span className="text-xs text-muted-foreground hidden sm:block shrink-0">{item.duration}</span>

            {/* Status */}
            <div className={cn("flex items-center gap-1.5 text-xs font-medium shrink-0", cfg.color)}>
              <Icon className={cn("h-4 w-4", item.status === "running" && "animate-spin")} />
              <span className="hidden sm:block">{cfg.label}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
