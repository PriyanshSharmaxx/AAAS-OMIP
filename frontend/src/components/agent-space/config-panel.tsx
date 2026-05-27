"use client";

import { useState } from "react";
import { Plus, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AGENT_CATEGORIES } from "@/lib/constants";
import { useUpdateDraft } from "@/lib/queries";
import type { AgentDraft } from "@/lib/types";

interface ConfigPanelProps {
  draft: AgentDraft;
}

export function ConfigPanel({ draft }: ConfigPanelProps) {
  const updateDraft = useUpdateDraft();
  const [saved, setSaved] = useState(false);

  const [name, setName] = useState(draft.name);
  const [description, setDescription] = useState(draft.description || "");
  const [category, setCategory] = useState(draft.category);
  const [tags, setTags] = useState<string[]>(draft.tags || []);
  const [tagInput, setTagInput] = useState("");
  const [permissions, setPermissions] = useState<{ name: string; description: string; required: boolean }[]>(
    (draft.permissions as { name: string; description: string; required: boolean }[]) || []
  );
  const [envVars, setEnvVars] = useState<{ key: string; value: string }[]>(
    Object.entries(draft.env_vars || {}).map(([key, value]) => ({ key, value }))
  );
  const [configJson, setConfigJson] = useState(JSON.stringify(draft.config || {}, null, 2));

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
    }
    setTagInput("");
  };

  const addEnvVar = () => setEnvVars([...envVars, { key: "", value: "" }]);
  const removeEnvVar = (i: number) => setEnvVars(envVars.filter((_, idx) => idx !== i));
  const updateEnvVar = (i: number, field: "key" | "value", val: string) => {
    const updated = [...envVars];
    updated[i] = { ...updated[i], [field]: val };
    setEnvVars(updated);
  };

  const addPermission = () =>
    setPermissions([...permissions, { name: "", description: "", required: false }]);
  const removePermission = (i: number) =>
    setPermissions(permissions.filter((_, idx) => idx !== i));
  const updatePermission = (i: number, field: string, val: string | boolean) => {
    const updated = [...permissions];
    updated[i] = { ...updated[i], [field]: val };
    setPermissions(updated);
  };

  const handleSave = async () => {
    let parsedConfig: Record<string, unknown> = {};
    try {
      parsedConfig = JSON.parse(configJson);
    } catch {
      // keep empty
    }
    const envObj: Record<string, string> = {};
    envVars.forEach(({ key, value }) => {
      if (key) envObj[key] = value;
    });

    await updateDraft.mutateAsync({
      id: draft.id,
      data: {
        name,
        description,
        category,
        tags,
        permissions,
        env_vars: envObj,
        config: parsedConfig,
      },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Basic info */}
      <div className="space-y-4">
        <h3 className="font-semibold">Basic Info</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Agent Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
          <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2 mb-2">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs">
                {t}
                <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Add tag..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              className="h-8"
            />
            <Button type="button" variant="outline" size="sm" onClick={addTag}>Add</Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Permissions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Required Permissions</h3>
          <Button type="button" variant="outline" size="sm" onClick={addPermission}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        {permissions.map((p, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                placeholder="Permission name (e.g. Gmail)"
                value={p.name}
                onChange={(e) => updatePermission(i, "name", e.target.value)}
              />
              <Input
                placeholder="Description"
                value={p.description}
                onChange={(e) => updatePermission(i, "description", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <Switch
                  checked={p.required}
                  onCheckedChange={(c) => updatePermission(i, "required", c)}
                />
                Required
              </label>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => removePermission(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Separator />

      {/* Env vars */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Environment Variables</h3>
          <Button type="button" variant="outline" size="sm" onClick={addEnvVar}>
            <Plus className="mr-1 h-3 w-3" /> Add
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Variables are encrypted at rest. Values are masked after saving.
        </p>
        {envVars.map((env, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input
              placeholder="KEY"
              value={env.key}
              onChange={(e) => updateEnvVar(i, "key", e.target.value)}
              className="font-mono text-xs"
            />
            <Input
              placeholder="value"
              type="password"
              value={env.value}
              onChange={(e) => updateEnvVar(i, "value", e.target.value)}
              className="font-mono text-xs"
            />
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => removeEnvVar(i)}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Separator />

      {/* Config JSON */}
      <div className="space-y-2">
        <h3 className="font-semibold">Advanced Config (JSON)</h3>
        <Textarea
          className="font-mono text-xs"
          rows={6}
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
        />
      </div>

      <Button onClick={handleSave} disabled={updateDraft.isPending} className="w-full">
        {updateDraft.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : saved ? (
          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
        ) : null}
        {saved ? "Saved!" : "Save Configuration"}
      </Button>
    </div>
  );
}
