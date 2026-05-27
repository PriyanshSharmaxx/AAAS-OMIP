"use client";

import Link from "next/link";
import { Bot, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Agent } from "@/lib/types";

interface AgentDetailHeaderProps {
  agent: Agent;
}

export function AgentDetailHeader({ agent }: AgentDetailHeaderProps) {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
          {agent.icon_url ? (
            <img src={agent.icon_url} alt={agent.name} className="h-10 w-10 rounded-lg" />
          ) : (
            <Bot className="h-8 w-8 text-primary" />
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <p className="mt-1 text-muted-foreground">{agent.description}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="capitalize">
              <Tag className="mr-1 h-3 w-3" />
              {agent.category}
            </Badge>
            <Badge variant="secondary" className="capitalize">
              {agent.execution_type?.toLowerCase()}
            </Badge>
            <Badge variant="outline">v{agent.version || "1.0"}</Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              {new Date(agent.created_at).toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>
      <Link href={`/run/${agent.id}`}>
        <Button size="lg" className="shrink-0">
          Run Agent
        </Button>
      </Link>
    </div>
  );
}
