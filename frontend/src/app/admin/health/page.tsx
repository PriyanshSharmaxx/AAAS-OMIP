"use client";

import { useSystemHealth } from "@/lib/queries";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Activity, 
  Database, 
  Server, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  BarChart3,
  RefreshCw,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export default function AdminHealthPage() {
  const { data: health, isLoading, isError, refetch, isRefetching } = useSystemHealth();

  if (isLoading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center min-h-[400px] gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Diagnostics in progress...</p>
      </div>
    );
  }

  if (isError || !health) {
    return (
      <div className="p-8">
        <Card className="border-destructive bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <CardTitle>System Connectivity Error</CardTitle>
            </div>
            <CardDescription>
              Failed to fetch real-time health data. The control plane may be unreachable.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()} variant="outline">Retry Connection</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOk = health.status === "ok";

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <Activity className="h-8 w-8 text-primary" />
            Platform Observability
          </h1>
          <p className="text-muted-foreground mt-1">Real-time health monitoring and queue diagnostics.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status</p>
            <Badge className={cn(
              "px-3 py-1",
              isOk ? "bg-green-500 hover:bg-green-600" : "bg-yellow-500 hover:bg-yellow-600"
            )}>
              {isOk ? "Healthy" : "Degraded"}
            </Badge>
          </div>
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => refetch()} 
            disabled={isRefetching}
            className={cn(isRefetching && "animate-spin")}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Critical Infrastructure ── */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="relative overflow-hidden border-2">
          <div className={cn(
            "absolute top-0 left-0 w-1 h-full",
            health.database.ok ? "bg-green-500" : "bg-red-500"
          )} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Database className="h-4 w-4" />
              Database (PostgreSQL)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">{health.database.latencyMs}ms</span>
              <span className={cn(
                "text-[10px] font-bold uppercase",
                health.database.ok ? "text-green-600" : "text-red-600"
              )}>
                {health.database.ok ? "Online" : "Offline"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2">
          <div className={cn(
            "absolute top-0 left-0 w-1 h-full",
            health.redis.ok ? "bg-green-500" : "bg-red-500"
          )} />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4" />
              Cache & Queues (Redis)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">{health.redis.latencyMs}ms</span>
              <span className={cn(
                "text-[10px] font-bold uppercase",
                health.redis.ok ? "text-green-600" : "text-red-600"
              )}>
                {health.redis.ok ? "Online" : "Offline"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-2 border-primary/20">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Server className="h-4 w-4" />
              Core API Server
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-black">{Math.floor(health.uptime / 3600)}h {Math.floor((health.uptime % 3600) / 60)}m</span>
              <span className="text-[10px] font-bold uppercase text-primary">v1.0.0</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Queue Diagnostics ── */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          Background Job Queues
        </h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(health.queues).map(([name, counts]: [string, any]) => (
            <Card key={name} className="border-muted/40">
              <CardHeader className="py-4 border-b">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-bold capitalize">
                    {name.replace(/([A-Z])/g, ' $1').trim()}
                  </CardTitle>
                  <div className="flex items-center gap-1.5">
                    <div className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      counts.active > 0 ? "bg-blue-500 animate-pulse" : "bg-muted"
                    )} />
                    <span className="text-[10px] font-medium text-muted-foreground">
                      {counts.active > 0 ? "Active" : "Idle"}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Waiting</p>
                    <p className={cn("text-lg font-black", counts.waiting > 10 ? "text-yellow-600" : "")}>
                      {counts.waiting}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Active</p>
                    <p className="text-lg font-black text-blue-600">{counts.active}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-bold mb-0.5">Failed</p>
                    <p className={cn("text-lg font-black", counts.failed > 0 ? "text-red-600" : "")}>
                      {counts.failed}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* ── System Audit ── */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-muted/40">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Scheduler Efficiency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border">
              <div className="space-y-1">
                <p className="text-sm font-medium">Active Cron Tasks</p>
                <p className="text-xs text-muted-foreground">Persistent repeatable jobs in Redis</p>
              </div>
              <p className="text-3xl font-black">{health.activeCrons}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-muted/40">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              Health Integrity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">System Timestamp</span>
              <span className="font-mono">{new Date(health.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Diagnostic Latency</span>
              <span className="font-bold text-green-600">&lt; 1ms</span>
            </div>
            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-[100%]" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
