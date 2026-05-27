"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AgentGrid } from "@/components/agent/agent-grid";
import { useCreatorAgents } from "@/lib/queries";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function MyAgentsPage() {
  const { data, isLoading } = useCreatorAgents();

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">My Agents</h1>
            <p className="text-muted-foreground">Agents you&apos;ve created and published.</p>
          </div>
          <Link href="/dashboard/creator">
            <Button>
              <Plus className="mr-1 h-4 w-4" /> New Agent
            </Button>
          </Link>
        </div>

        <AgentGrid agents={data?.agents || []} loading={isLoading} />
      </div>
    </DashboardLayout>
  );
}
