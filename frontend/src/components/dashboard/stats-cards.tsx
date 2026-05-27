"use client";

import { Play, CheckCircle, XCircle, Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardsProps {
  stats: {
    total_runs: number;
    completed_runs: number;
    failed_runs: number;
    running_runs?: number;
    total_agents?: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    { label: "Total Runs", value: stats.total_runs, icon: Play, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Completed", value: stats.completed_runs, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Failed", value: stats.failed_runs, icon: XCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { label: "Active", value: stats.running_runs ?? stats.total_agents ?? 0, icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <CardContent className="flex items-center gap-4 p-5">
            <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${card.bg}`}>
              <card.icon className={`h-6 w-6 ${card.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{card.value}</p>
              <p className="text-sm text-muted-foreground">{card.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
