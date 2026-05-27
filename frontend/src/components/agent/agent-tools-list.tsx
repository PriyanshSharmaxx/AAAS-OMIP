import { Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface AgentToolsListProps {
  tools: string[];
}

export function AgentToolsList({ tools }: AgentToolsListProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wrench className="h-5 w-5" />
          Tools Used
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {tools.map((tool, i) => (
            <li key={i}>
              <div className="flex items-center gap-3 py-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
                  <Wrench className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-sm font-medium capitalize">{tool}</span>
              </div>
              {i < tools.length - 1 && <Separator className="mt-2" />}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
