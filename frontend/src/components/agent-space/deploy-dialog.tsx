"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, Globe, DollarSign, CheckCircle2, Rocket } from "lucide-react";
import { useDeployDraft } from "@/lib/queries";
import type { AgentDraft, DeploymentInfo } from "@/lib/types";

type Visibility = "private" | "public" | "paid";

const OPTIONS: {
  value: Visibility;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can access this agent via its endpoint.",
    icon: Lock,
  },
  {
    value: "public",
    label: "Public Marketplace",
    description: "Publish to the Omip marketplace. Anyone can run it for free.",
    icon: Globe,
  },
  {
    value: "paid",
    label: "Monetized",
    description: "Publish to marketplace with a usage fee. Earn per execution.",
    icon: DollarSign,
  },
];

interface DeployDialogProps {
  draft: AgentDraft;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export function DeployDialog({ draft, open, onOpenChange }: DeployDialogProps) {
  const [visibility, setVisibility] = useState<Visibility>("private");
  const [deployed, setDeployed] = useState<DeploymentInfo | null>(null);
  const deployDraft = useDeployDraft();

  const handleDeploy = async () => {
    const result = await deployDraft.mutateAsync({ draftId: draft.id, visibility });
    setDeployed(result);
  };

  const handleClose = (o: boolean) => {
    if (!o) setDeployed(null);
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" /> Deploy Agent
          </DialogTitle>
          <DialogDescription>
            Deploy <strong>{draft.name}</strong> to make it accessible.
          </DialogDescription>
        </DialogHeader>

        {deployed ? (
          <div className="space-y-4 py-2">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10">
                <CheckCircle2 className="h-7 w-7 text-green-500" />
              </div>
              <div>
                <h3 className="font-semibold">Deployed Successfully!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your agent is {deployed.status === "live" ? "live" : "building"}.
                </p>
              </div>
            </div>
            {deployed.endpoint_url && (
              <div className="rounded-lg border bg-muted/40 p-3 space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Endpoint URL</p>
                <code className="text-xs break-all">{deployed.endpoint_url}</code>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Visibility</p>
                <p className="font-medium capitalize">{deployed.visibility}</p>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium capitalize text-green-600">{deployed.status}</p>
              </div>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Choose deployment visibility:</p>
            <div className="space-y-2">
              {OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setVisibility(opt.value)}
                  className={`w-full flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-all ${
                    visibility === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                    visibility === opt.value ? "bg-primary/15" : "bg-muted"
                  }`}>
                    <opt.icon className={`h-5 w-5 ${visibility === opt.value ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">{opt.label}</p>
                    <p className="text-sm text-muted-foreground">{opt.description}</p>
                  </div>
                </button>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={handleDeploy}
              disabled={deployDraft.isPending}
            >
              {deployDraft.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="mr-2 h-4 w-4" />
              )}
              Deploy as {OPTIONS.find((o) => o.value === visibility)?.label}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
