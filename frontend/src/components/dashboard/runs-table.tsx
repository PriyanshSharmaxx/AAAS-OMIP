"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Run } from "@/lib/types";
import { RUN_STATUS_MAP } from "@/lib/constants";

interface RunsTableProps {
  runs: Run[];
  loading: boolean;
}

export function RunsTable({ runs, loading }: RunsTableProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">No runs yet. Go explore some agents!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left font-medium">Run ID</th>
            <th className="px-4 py-3 text-left font-medium">Status</th>
            <th className="px-4 py-3 text-left font-medium">Started</th>
            <th className="px-4 py-3 text-left font-medium">Duration</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const statusInfo = RUN_STATUS_MAP[run.status] || { label: run.status, color: "gray" };
            const duration = run.started_at && run.completed_at
              ? `${Math.round((new Date(run.completed_at).getTime() - new Date(run.started_at).getTime()) / 1000)}s`
              : "-";

            return (
              <tr key={run.id} className="border-b transition-colors hover:bg-muted/30">
                <td className="px-4 py-3 font-mono text-xs">
                  {run.id.slice(0, 8)}...
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className={`${
                      statusInfo.color === "green" ? "border-green-500 text-green-500" :
                      statusInfo.color === "yellow" ? "border-yellow-500 text-yellow-500" :
                      statusInfo.color === "red" ? "border-red-500 text-red-500" :
                      "border-gray-500 text-gray-500"
                    }`}
                  >
                    {statusInfo.label}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {run.started_at ? new Date(run.started_at).toLocaleString() : "-"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{duration}</td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/dashboard/runs?id=${run.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="mr-1 h-4 w-4" /> View
                    </Button>
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
