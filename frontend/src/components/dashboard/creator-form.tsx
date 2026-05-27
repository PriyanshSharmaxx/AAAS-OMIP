"use client";

import { useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AGENT_CATEGORIES } from "@/lib/constants";
import { useCreateAgent, useUpdateAgent } from "@/lib/queries";
import { Agent } from "@/lib/types";

interface CreatorFormProps {
  agent?: Agent;
  onSuccess?: () => void;
}

export function CreatorForm({ agent, onSuccess }: CreatorFormProps) {
  const isEditing = !!agent;
  const createAgent = useCreateAgent();
  const updateAgent = useUpdateAgent();

  const [name, setName] = useState(agent?.name || "");
  const [description, setDescription] = useState(agent?.description || "");
  const [category, setCategory] = useState(agent?.category || "automation");
  const [executionType, setExecutionType] = useState(agent?.execution_type || "API");
  const [iconUrl, setIconUrl] = useState(agent?.icon_url || "");
  const [config, setConfig] = useState(agent?.config ? JSON.stringify(agent.config, null, 2) : "{}");
  const [isPublic, setIsPublic] = useState(agent?.is_public ?? true);
  const [permissions, setPermissions] = useState<{ name: string; description: string; required: boolean }[]>(
    (agent?.permissions as { name: string; description: string; required: boolean }[]) || []
  );
  const [error, setError] = useState("");

  const addPermission = () => {
    setPermissions([...permissions, { name: "", description: "", required: false }]);
  };

  const removePermission = (index: number) => {
    setPermissions(permissions.filter((_, i) => i !== index));
  };

  const updatePermission = (index: number, field: string, value: string | boolean) => {
    const updated = [...permissions];
    updated[index] = { ...updated[index], [field]: value };
    setPermissions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name || !description || !category) {
      setError("Name, description, and category are required.");
      return;
    }

    let parsedConfig;
    try {
      parsedConfig = JSON.parse(config);
    } catch {
      setError("Invalid JSON in config field.");
      return;
    }

    const payload = {
      name,
      description,
      category,
      execution_type: executionType,
      icon_url: iconUrl || undefined,
      config: parsedConfig,
      permissions: permissions.filter((p) => p.name),
      tools: [],
    };

    try {
      if (isEditing && agent) {
        await updateAgent.mutateAsync({ id: agent.id, data: payload });
      } else {
        await createAgent.mutateAsync(payload);
      }
      onSuccess?.();
    } catch {
      setError("Failed to save agent. Please try again.");
    }
  };

  const isPending = createAgent.isPending || updateAgent.isPending;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEditing ? "Edit Agent" : "Create New Agent"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Agent Name</Label>
              <Input placeholder="My Agent" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AGENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea placeholder="What does this agent do?" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Execution Type</Label>
              <Select value={executionType} onValueChange={setExecutionType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="API">API</SelectItem>
                  <SelectItem value="CONTAINER">Container</SelectItem>
                  <SelectItem value="N8N">n8n Workflow</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Icon URL (optional)</Label>
              <Input placeholder="https://..." value={iconUrl} onChange={(e) => setIconUrl(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Configuration (JSON)</Label>
            <Textarea className="font-mono text-sm" placeholder="{}" value={config} onChange={(e) => setConfig(e.target.value)} rows={5} />
          </div>

          {/* Permissions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Permissions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addPermission}>
                <Plus className="mr-1 h-3 w-3" /> Add
              </Button>
            </div>
            {permissions.map((perm, i) => (
              <div key={i} className="flex items-start gap-2 rounded-lg border p-3">
                <div className="flex-1 space-y-2">
                  <Input placeholder="Permission name" value={perm.name} onChange={(e) => updatePermission(i, "name", e.target.value)} />
                  <Input placeholder="Description" value={perm.description} onChange={(e) => updatePermission(i, "description", e.target.value)} />
                  <label className="flex items-center gap-2 text-sm">
                    <Switch checked={perm.required} onCheckedChange={(c) => updatePermission(i, "required", c)} />
                    Required
                  </label>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removePermission(i)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            <Label>Public (visible in marketplace)</Label>
          </div>

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Agent" : "Create Agent"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
