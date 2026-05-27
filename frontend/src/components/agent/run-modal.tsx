"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useUIStore } from "@/store/ui-store";
import { useCreateRun } from "@/lib/queries";
import { Agent } from "@/lib/types";

interface RunModalProps {
  agent: Agent;
}

export function RunModal({ agent }: RunModalProps) {
  const { runModalOpen, closeRunModal } = useUIStore();
  const createRun = useCreateRun();
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [inputData, setInputData] = useState("{}");
  const [error, setError] = useState("");
  const [runResult, setRunResult] = useState<{ id: string; status: string } | null>(null);

  const handleRun = async () => {
    setError("");
    try {
      JSON.parse(inputData);
    } catch {
      setError("Invalid JSON input");
      return;
    }

    try {
      const result = await createRun.mutateAsync({
        agent_id: agent.id,
        input_data: JSON.parse(inputData),
        api_key: apiKey || undefined,
      });
      setRunResult({ id: result.id, status: result.status });
    } catch {
      setError("Failed to start run. Please try again.");
    }
  };

  return (
    <Dialog open={runModalOpen} onOpenChange={(open) => !open && closeRunModal()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Run: {agent.name}</DialogTitle>
          <DialogDescription>{agent.description}</DialogDescription>
        </DialogHeader>

        {runResult ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-secondary/50 p-4 text-center">
              <Badge className="mb-2" variant={runResult.status === "COMPLETED" ? "default" : "secondary"}>
                {runResult.status}
              </Badge>
              <p className="text-sm text-muted-foreground">Run ID: {runResult.id}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={closeRunModal}>
                Close
              </Button>
              <Button className="flex-1" onClick={() => window.location.href = `/dashboard/runs`}>
                View in Dashboard
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>LLM Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                  <SelectItem value="google">Google AI</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>API Key</Label>
              <Input
                type="password"
                placeholder="Enter your API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Your key is encrypted and never stored in plain text.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Input Data (JSON)</Label>
              <Textarea
                placeholder='{"prompt": "..."}'
                value={inputData}
                onChange={(e) => setInputData(e.target.value)}
                className="font-mono text-sm"
                rows={4}
              />
            </div>

            {agent.permissions && agent.permissions.length > 0 && (
              <div className="space-y-2">
                <Label>Required Permissions</Label>
                <div className="flex flex-wrap gap-2">
                  {agent.permissions.map((perm, i) => (
                    <Badge key={i} variant={perm.required ? "default" : "outline"} className="text-xs">
                      {perm.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={closeRunModal}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleRun} disabled={createRun.isPending}>
                {createRun.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Run Agent
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
