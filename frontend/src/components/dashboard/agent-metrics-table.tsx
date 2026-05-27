"use client";

import { MoreHorizontal, BarChart2, Settings, Pause, Trash2, ExternalLink, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { AgentMetric } from "@/hooks/useDashboard";

interface AgentMetricsTableProps {
  metrics: AgentMetric[];
  showRevenue?: boolean;
}

export function AgentMetricsTable({ metrics, showRevenue = false }: AgentMetricsTableProps) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Runs</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Success</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden sm:table-cell">Avg Time</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Errors</th>
              {showRevenue && (
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Revenue</th>
              )}
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {metrics.map((m) => (
              <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{m.runs.toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  <span className={cn(
                    "font-medium",
                    m.success_rate >= 95 ? "text-green-500" : m.success_rate >= 85 ? "text-yellow-500" : "text-destructive"
                  )}>
                    {m.success_rate}%
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground hidden sm:table-cell">{m.avg_time}</td>
                <td className="px-4 py-3 text-right hidden md:table-cell">
                  <Badge
                    variant={m.error_rate < 5 ? "secondary" : "destructive"}
                    className="text-[10px]"
                  >
                    {m.error_rate}%
                  </Badge>
                </td>
                {showRevenue && (
                  <td className="px-4 py-3 text-right font-medium text-green-500">
                    ${m.revenue.toLocaleString()}
                  </td>
                )}
                <td className="px-4 py-3 text-right">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Actions for {m.name}</span>
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-44" align="end" sideOffset={6}>
                      <PopoverBody className="p-1">
                        <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                          <BarChart2 className="mr-2 h-4 w-4 text-blue-500" />
                          <span className="text-sm">Analytics</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                          <Settings className="mr-2 h-4 w-4" />
                          <span className="text-sm">Configure</span>
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          <span className="text-sm">View Logs</span>
                        </Button>
                        <Separator className="my-1" />
                        <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive">
                          <Pause className="mr-2 h-4 w-4" />
                          <span className="text-sm">Pause</span>
                        </Button>
                      </PopoverBody>
                    </PopoverContent>
                  </Popover>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Deployment status table ────────────────────────────────────────────────

import type { DeploymentItem } from "@/hooks/useDashboard";

const DEPLOY_STATUS = {
  live:   { label: "Live",   cls: "bg-green-500/10 text-green-500" },
  draft:  { label: "Draft",  cls: "bg-yellow-500/10 text-yellow-500" },
  failed: { label: "Failed", cls: "bg-destructive/10 text-destructive" },
};

export function DeploymentTable({ deployments }: { deployments: DeploymentItem[] }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Agent</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground hidden sm:table-cell">Version</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground hidden md:table-cell">Deployed</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Runs</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {deployments.map((d) => {
              const st = DEPLOY_STATUS[d.status];
              return (
                <tr key={d.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{d.name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", st.cls)}>
                      {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">{d.version}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground text-xs hidden md:table-cell">{d.deployed_at}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{d.runs.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions for {d.name}</span>
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-44" align="end" sideOffset={6}>
                        <PopoverBody className="p-1">
                          <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                            <ExternalLink className="mr-2 h-4 w-4 text-blue-500" />
                            <span className="text-sm">View Live</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                            <RotateCcw className="mr-2 h-4 w-4" />
                            <span className="text-sm">Rollback</span>
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                            <Settings className="mr-2 h-4 w-4" />
                            <span className="text-sm">Settings</span>
                          </Button>
                          <Separator className="my-1" />
                          <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span className="text-sm">Delete</span>
                          </Button>
                        </PopoverBody>
                      </PopoverContent>
                    </Popover>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
