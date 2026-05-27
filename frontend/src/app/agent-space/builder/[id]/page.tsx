"use client";

import { use, useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Save,
  Rocket,
  GitBranch,
  Settings,
  Upload,
  Loader2,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAgentDraft, useUpdateDraft } from "@/lib/queries";
import { FlowCanvas } from "@/components/agent-space/flow-canvas";
import { ConfigPanel } from "@/components/agent-space/config-panel";
import { FileImportPanel } from "@/components/agent-space/file-import-panel";
import { DeployDialog } from "@/components/agent-space/deploy-dialog";
import { CopilotPanel } from "@/components/agent-space/copilot-panel";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import type { AgentDraft, FlowData } from "@/lib/types";

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: draft, isLoading } = useAgentDraft(id);
  const updateDraft = useUpdateDraft();
  const [saved, setSaved] = useState(false);
  const [deployOpen, setDeployOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [localFlow, setLocalFlow] = useState<FlowData | null>(null);
  const [activeTab, setActiveTab] = useState<string>("visual");

  const handleFlowChange = useCallback((flow: FlowData) => {
    setLocalFlow(flow);
    setSaved(false);
  }, []);

  const handleSave = async () => {
    if (!draft) return;
    await updateDraft.mutateAsync({
      id: draft.id,
      data: { flow_data: localFlow ?? draft.flow_data ?? { nodes: [], edges: [] } },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  /** Called by the Copilot panel when the user clicks "Apply Changes" */
  const handleCopilotApply = useCallback(
    async (change: Partial<AgentDraft>) => {
      if (!draft) return;
      await updateDraft.mutateAsync({ id: draft.id, data: change });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
    [draft, updateDraft]
  );

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col pt-16">
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="flex-1 m-4 rounded-xl" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <p className="text-muted-foreground">Draft not found.</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex min-h-screen flex-col pt-16">
        {/* ── Top bar ── */}
        <div className="flex items-center justify-between border-b bg-background px-4 py-2 sticky top-16 z-30">
          <div className="flex items-center gap-3">
            <Link href="/agent-space">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-sm font-semibold leading-none">{draft.name}</h1>
              <p className="text-xs text-muted-foreground mt-0.5 capitalize">
                {draft.framework} · v{draft.version}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href={`/agent-space/versions/${draft.id}`}>
              <Button variant="ghost" size="sm" className="gap-1.5">
                <GitBranch className="h-3.5 w-3.5" /> History
              </Button>
            </Link>

            {/* Copilot shortcut button */}
            <Button
              variant={copilotOpen ? "secondary" : "ghost"}
              size="sm"
              className="gap-1.5"
              onClick={() => setCopilotOpen(true)}
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              AI Copilot
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={updateDraft.isPending}
            >
              {updateDraft.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : saved ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saved ? "Saved" : "Save"}
            </Button>

            <Button size="sm" className="gap-1.5" onClick={() => setDeployOpen(true)}>
              <Rocket className="h-3.5 w-3.5" /> Deploy
            </Button>
          </div>
        </div>

        {/* ── Main area ── */}
        <div className="flex flex-1 overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="flex flex-col flex-1 w-full overflow-hidden"
          >
            <div className="shrink-0 border-b px-4 bg-background">
              <TabsList className="mt-2">
                <TabsTrigger value="visual">
                  Visual Builder
                </TabsTrigger>
                <TabsTrigger value="files">
                  <Upload className="mr-1.5 h-3.5 w-3.5" /> Files
                </TabsTrigger>
                <TabsTrigger value="config">
                  <Settings className="mr-1.5 h-3.5 w-3.5" /> Config
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="visual" className="flex-1 m-0 data-[state=active]:flex flex-col overflow-hidden">
              <FlowCanvas
                initialFlow={localFlow ?? draft.flow_data}
                onChange={handleFlowChange}
              />
            </TabsContent>

            <TabsContent value="files" className="flex-1 overflow-y-auto p-4">
              <FileImportPanel draft={draft} />
            </TabsContent>

            <TabsContent value="config" className="flex-1 overflow-y-auto p-4">
              <ConfigPanel draft={draft} />
            </TabsContent>

          </Tabs>
        </div>
      </div>

      {deployOpen && (
        <DeployDialog
          draft={draft}
          open={deployOpen}
          onOpenChange={setDeployOpen}
        />
      )}

      {/* ── Floating AI Copilot button (always visible) ── */}
      <button
        onClick={() => setCopilotOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground shadow-lg ring-2 ring-primary/20 hover:bg-primary/90 hover:ring-primary/40 active:scale-95 transition-all duration-150"
        aria-label="Open AI Copilot"
      >
        <Sparkles className="h-4 w-4" />
        AI Copilot
      </button>

      {/* ── Copilot sheet (slides in from right) ── */}
      <Sheet open={copilotOpen} onOpenChange={setCopilotOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-4 pt-4 pb-0 border-0">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              AI Copilot
            </SheetTitle>
            <SheetDescription className="text-xs">
              Analyzing{" "}
              <span className="font-medium text-foreground">{draft.name}</span>
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 overflow-hidden mt-2 border-t">
            <CopilotPanel draft={draft} onApplyChanges={handleCopilotApply} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

