"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, MoreHorizontal, Play, Bookmark, Share2, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Agent } from "@/lib/types";

interface AgentCardProps {
  agent: Agent;
}

const QUICK_ACTIONS = [
  { label: "View Details",   icon: Eye,      color: "" },
  { label: "Bookmark",       icon: Bookmark, color: "text-blue-500" },
  { label: "Share",          icon: Share2,   color: "text-green-500" },
];

export function AgentCard({ agent }: AgentCardProps) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Card className="h-full transition-shadow hover:shadow-lg">
        <CardContent className="p-5">
          <div className="mb-3 flex items-start justify-between">
            <Link href={`/agents/${agent.id}`} className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
              {agent.icon_url ? (
                <img src={agent.icon_url} alt={agent.name} className="h-8 w-8 rounded" />
              ) : (
                <Bot className="h-6 w-6 text-primary" />
              )}
            </Link>

            <div className="flex items-center gap-1.5">
              <Badge variant="secondary" className="text-xs capitalize">
                {agent.execution_type?.toLowerCase()}
              </Badge>

              {/* Quick actions popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={(e) => e.preventDefault()}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Quick actions</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-44" align="end" sideOffset={6}>
                  <PopoverBody className="p-1">
                    {QUICK_ACTIONS.map((action, i) => (
                      <Button
                        key={action.label}
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start px-2"
                        onClick={(e) => e.preventDefault()}
                      >
                        <action.icon className={`mr-2 h-4 w-4 ${action.color}`} />
                        <span className="text-sm">{action.label}</span>
                      </Button>
                    ))}
                    <Separator className="my-1" />
                    <Link href={`/agents/${agent.id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-full justify-start px-2 text-primary"
                      >
                        <Play className="mr-2 h-4 w-4" />
                        <span className="text-sm">Run Agent</span>
                      </Button>
                    </Link>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Link href={`/agents/${agent.id}`}>
            <h3 className="mb-1 font-semibold hover:text-primary transition-colors">{agent.name}</h3>
          </Link>
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">
            {agent.description}
          </p>
          <Badge variant="outline" className="text-xs capitalize">
            {agent.category}
          </Badge>
        </CardContent>
      </Card>
    </motion.div>
  );
}
