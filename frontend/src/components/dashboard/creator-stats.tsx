"use client";

import { Bot, Play, CheckCircle, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface CreatorStatsProps {
  stats: {
    total_agents: number;
    total_runs: number;
    completed_runs: number;
    success_rate: number;
  };
}

export function CreatorStats({ stats }: CreatorStatsProps) {
  const cards = [
    { label: "Total Agents", value: stats.total_agents, icon: Bot, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Total Runs", value: stats.total_runs, icon: Play, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Completed", value: stats.completed_runs, icon: CheckCircle, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Success Rate", value: `${stats.success_rate}%`, icon: TrendingUp, color: "text-orange-500", bg: "bg-orange-500/10" },
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
