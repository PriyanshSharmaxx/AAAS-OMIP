"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RunsTable } from "@/components/dashboard/runs-table";
import { RunDetail } from "@/components/dashboard/run-detail";
import { useRuns, useRun, useRunLogs } from "@/lib/queries";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

function RunsContent() {
  const searchParams = useSearchParams();
  const selectedRunId = searchParams.get("id");
  const [page, setPage] = useState(0);
  const limit = 20;

  const { data: runsData, isLoading } = useRuns({ skip: page * limit, limit });
  const { data: selectedRun } = useRun(selectedRunId || "");
  const { data: logs } = useRunLogs(selectedRunId || "");

  return (
    <div className="space-y-6">
      {selectedRunId && selectedRun ? (
        <>
          <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back to Runs
          </Button>
          <RunDetail run={selectedRun} logs={logs || []} />
        </>
      ) : (
        <>
          <div>
            <h1 className="text-2xl font-bold">My Runs</h1>
            <p className="text-muted-foreground">View all your agent execution history.</p>
          </div>

          <RunsTable runs={runsData?.runs || []} loading={isLoading} />

          {runsData && runsData.total > limit && (
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page + 1} of {Math.ceil(runsData.total / limit)}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={(page + 1) * limit >= runsData.total}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RunsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<Skeleton className="h-96 w-full" />}>
        <RunsContent />
      </Suspense>
    </DashboardLayout>
  );
}
