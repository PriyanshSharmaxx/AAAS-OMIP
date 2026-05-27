"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Run, RunLog } from "@/lib/types";
import { RUN_STATUS_MAP } from "@/lib/constants";

interface RunDetailProps {
  run: Run;
  logs: RunLog[];
}

export function RunDetail({ run, logs }: RunDetailProps) {
  const statusInfo = RUN_STATUS_MAP[run.status] || { label: run.status, color: "gray" };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Run Details</h2>
          <p className="font-mono text-sm text-muted-foreground">{run.id}</p>
        </div>
        <Badge
          variant="outline"
          className={`text-sm ${
            statusInfo.color === "green" ? "border-green-500 text-green-500" :
            statusInfo.color === "yellow" ? "border-yellow-500 text-yellow-500" :
            statusInfo.color === "red" ? "border-red-500 text-red-500" :
            "border-gray-500 text-gray-500"
          }`}
        >
          {statusInfo.label}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Input Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
              {JSON.stringify(run.input_data, null, 2)}
            </pre>
          </CardContent>
        </Card>

        {/* Output */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Output Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded-lg bg-muted p-3 text-xs">
              {run.output_data ? JSON.stringify(run.output_data, null, 2) : "Waiting for output..."}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Execution Logs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-80">
            {logs.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No logs yet.</p>
            ) : (
              <div className="space-y-1">
                {logs.map((log) => (
                  <div key={log.id} className="flex items-start gap-2 rounded px-2 py-1 font-mono text-xs hover:bg-muted/50">
                    <span className="shrink-0 text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`shrink-0 font-semibold ${
                        log.level === "ERROR" ? "text-red-500" :
                        log.level === "WARN" ? "text-yellow-500" :
                        "text-blue-500"
                      }`}
                    >
                      [{log.level}]
                    </span>
                    <span className="break-all">{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
