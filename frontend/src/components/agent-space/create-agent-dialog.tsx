"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  FileCode2, Link as LinkIcon, Users, UsersRound, Cpu, Sparkles, Database,
  Workflow, Server, Globe, MousePointerClick,
} from "lucide-react";
import { AGENT_FRAMEWORKS, COMPLEXITY_LABELS } from "@/lib/agent-frameworks";
import { AGENT_CATEGORIES } from "@/lib/constants";
import { useCreateDraft } from "@/lib/queries";
import type { AgentFramework } from "@/lib/types";

const FRAMEWORK_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  python: FileCode2,
  langchain: LinkIcon,
  autogen: Users,
  crewai: UsersRound,
  "semantic-kernel": Cpu,
  "openai-functions": Sparkles,
  llamaindex: Database,
  n8n: Workflow,
  nodejs: Server,
  "rest-api": Globe,
  "no-code": MousePointerClick,
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onCreated: (id: string) => void;
}

export function CreateAgentDialog({ open, onOpenChange, onCreated }: Props) {
  const [step, setStep] = useState<"framework" | "details">("framework");
  const [selected, setSelected] = useState<AgentFramework | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("automation");
  const [teamId, setTeamId] = useState<string>("personal");
  const [teams, setTeams] = useState<{id: string, name: string}[]>([]);
  const createDraft = useCreateDraft();

  useEffect(() => {
    async function fetchTeams() {
      try {
        const res = await api.get<{ success: boolean; data: any[] }>("/teams");
        setTeams(res.data || []);
      } catch (err) {
        console.error("Failed to fetch teams", err);
      }
    }
    if (open) fetchTeams();
  }, [open]);

  const reset = () => {
    setStep("framework");
    setSelected(null);
    setName("");
    setDescription("");
    setCategory("automation");
    setTeamId("personal");
  };

  const handleClose = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const handleCreate = async () => {
    if (!selected || !name.trim()) return;
    const draft = await createDraft.mutateAsync({
      name: name.trim(),
      description: description.trim(),
      framework: selected.id,
      category,
      teamId: teamId === "personal" ? undefined : teamId,
    });
    reset();
    onOpenChange(false);
    onCreated(draft.id);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === "framework" ? "Choose Framework" : "Agent Details"}
          </DialogTitle>
        </DialogHeader>

        {step === "framework" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select the framework you want to use to build your agent.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {AGENT_FRAMEWORKS.map((fw) => {
                const Icon = FRAMEWORK_ICONS[fw.id] ?? FileCode2;
                const isSelected = selected?.id === fw.id;
                const cx = COMPLEXITY_LABELS[fw.complexity];
                return (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setSelected(fw)}
                    className={`group flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/40"
                    }`}
                  >
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      isSelected ? "bg-primary/15" : "bg-muted"
                    }`}>
                      <Icon className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{fw.name}</span>
                        {isSelected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {fw.description}
                      </p>
                      <span className={`mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${cx.color}`}>
                        {cx.label}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="flex justify-end pt-2">
              <Button disabled={!selected} onClick={() => setStep("details")}>
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selected && (
              <div className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <Badge variant="outline">{selected.name}</Badge>
                <span className="text-muted-foreground">framework selected</span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="agent-name">Agent Name *</Label>
              <Input
                id="agent-name"
                placeholder="My Awesome Agent"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent-desc">Description</Label>
              <Textarea
                id="agent-desc"
                placeholder="What does this agent do?"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Workspace</Label>
              <Select value={teamId} onValueChange={setTeamId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal">Personal Workspace</SelectItem>
                  {teams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("framework")}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button
                disabled={!name.trim() || createDraft.isPending}
                onClick={handleCreate}
              >
                {createDraft.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create & Open Builder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
