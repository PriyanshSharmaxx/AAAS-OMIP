"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: { value: number; label?: string };
  accent?: "primary" | "green" | "purple" | "orange" | "red";
  className?: string;
}

const ACCENT_STYLES = {
  primary: "bg-primary/10 text-primary",
  green:   "bg-green-500/10 text-green-500",
  purple:  "bg-purple-500/10 text-purple-500",
  orange:  "bg-orange-500/10 text-orange-500",
  red:     "bg-red-500/10 text-red-500",
};

export function StatCard({ title, value, subtitle, icon, trend, accent = "primary", className }: StatCardProps) {
  const isUp = (trend?.value ?? 0) >= 0;

  return (
    <div className={cn("rounded-xl border bg-card p-5 space-y-3", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", ACCENT_STYLES[accent])}>
          {icon}
        </div>
      </div>

      <div>
        <p className="text-2xl font-bold tracking-tight">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>

      {trend !== undefined && (
        <div className={cn("flex items-center gap-1 text-xs font-medium", isUp ? "text-green-500" : "text-red-500")}>
          {isUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          <span>{isUp ? "+" : ""}{trend.value}%</span>
          {trend.label && <span className="text-muted-foreground font-normal">{trend.label}</span>}
        </div>
      )}
    </div>
  );
}
