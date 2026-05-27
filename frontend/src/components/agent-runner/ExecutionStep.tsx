"use client";

import { useEffect, useRef } from "react";
import { Loader2, Terminal, CheckCircle2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ExecutionLog } from "@/lib/types";

interface ExecutionStepProps {
  executing: boolean;
  logs: ExecutionLog[];
}

const LEVEL_STYLES: Record<string, string> = {
  info: "text-blue-400",
  debug: "text-muted-foreground",
  warning: "text-yellow-400",
  warn: "text-yellow-400",
  error: "text-red-400",
  success: "text-green-400",
};

export function ExecutionStep({ executing, logs }: ExecutionStepProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  return (
    <div className="space-y-4">
      {/* Status bar */}
      <div className="flex items-center gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        {executing ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <p className="font-semibold text-sm">Agent is running…</p>
              <p className="text-xs text-muted-foreground">Live logs below</p>
            </div>
          </>
        ) : logs.length > 0 ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <div>
              <p className="font-semibold text-sm">Execution complete</p>
              <p className="text-xs text-muted-foreground">See results on the next screen</p>
            </div>
          </>
        ) : (
          <>
            <Terminal className="h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Waiting for execution to start…</p>
          </>
        )}
      </div>

      {/* Log terminal */}
      <div className="h-64 overflow-y-auto rounded-xl border bg-black/80 p-3 font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-muted-foreground opacity-50">No logs yet…</p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2 py-0.5">
              <span className="shrink-0 text-muted-foreground opacity-50">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <Badge
                variant="outline"
                className={`shrink-0 border-0 bg-transparent px-0 text-[10px] uppercase ${
                  LEVEL_STYLES[log.level] ?? "text-foreground"
                }`}
              >
                {log.level}
              </Badge>
              <span className={`break-all leading-relaxed ${LEVEL_STYLES[log.level] ?? "text-foreground"}`}>
                {log.message}
              </span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Log count */}
      {logs.length > 0 && (
        <p className="text-right text-xs text-muted-foreground">
          {logs.length} log{logs.length !== 1 ? "s" : ""}
          {executing && " — live"}
        </p>
      )}
    </div>
  );
}
