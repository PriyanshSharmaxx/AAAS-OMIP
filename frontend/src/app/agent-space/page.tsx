"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Plus,
  Upload,
  LayoutGrid,
  List,
  Rocket,
  FileCode2,
  Clock,
  Trash2,
  MoreHorizontal,
  Bot,
  GitBranch,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useAgentDrafts, useDeleteDraft, useUpdateDraft } from "@/lib/queries";
import type { AgentDraft } from "@/lib/types";
import { DeployDialog } from "@/components/agent-space/deploy-dialog";
import { CreateAgentDialog } from "@/components/agent-space/create-agent-dialog";
import { CopilotPanel } from "@/components/agent-space/copilot-panel";

const STATUS_STYLES: Record<string, string> = {
  draft:    "bg-muted text-muted-foreground",
  deployed: "bg-green-500/10 text-green-600",
  archived: "bg-secondary text-secondary-foreground",
};

// ─── Copilot sheet ────────────────────────────────────────────────────────────

function CopilotSheet({
  draft,
  open,
  onOpenChange,
}: {
  draft: AgentDraft;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const updateDraft = useUpdateDraft();

  const handleApply = async (change: Partial<AgentDraft>) => {
    await updateDraft.mutateAsync({ id: draft.id, data: change });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-0 border-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-primary" />
            AI Copilot
          </SheetTitle>
          <SheetDescription className="text-xs">
            Analyzing <span className="font-medium text-foreground">{draft.name}</span>
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 overflow-hidden mt-2 border-t">
          <CopilotPanel draft={draft} onApplyChanges={handleApply} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Draft card ───────────────────────────────────────────────────────────────

function DraftCard({
  draft,
  onDelete,
  onDeploy,
  onCopilot,
}: {
  draft: AgentDraft;
  onDelete: (id: string) => void;
  onDeploy: (draft: AgentDraft) => void;
  onCopilot: (draft: AgentDraft) => void;
}) {
  return (
    <Card className="group relative transition-shadow hover:shadow-md">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Bot className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{draft.name}</h3>
              <p className="text-xs text-muted-foreground capitalize">{draft.framework}</p>
            </div>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Agent actions</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48" align="end" sideOffset={6}>
              <PopoverBody className="p-1">
                <Link href={`/agent-space/builder/${draft.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                    <FileCode2 className="mr-2 h-4 w-4" />
                    <span className="text-sm">Open Builder</span>
                  </Button>
                </Link>
                <Link href={`/agent-space/versions/${draft.id}`}>
                  <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                    <GitBranch className="mr-2 h-4 w-4" />
                    <span className="text-sm">Version History</span>
                  </Button>
                </Link>
                <Separator className="my-1" />
                {draft.status !== "deployed" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full justify-start px-2 text-primary hover:text-primary"
                    onClick={() => onDeploy(draft)}
                  >
                    <Rocket className="mr-2 h-4 w-4" />
                    <span className="text-sm">Deploy</span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive"
                  onClick={() => onDelete(draft.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  <span className="text-sm">Delete</span>
                </Button>
              </PopoverBody>
            </PopoverContent>
          </Popover>
        </div>

        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
          {draft.description || "No description."}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[draft.status] || STATUS_STYLES.draft}`}>
            {draft.status}
          </span>
          <Badge variant="outline" className="text-xs">
            v{draft.version}
          </Badge>
          {draft.tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {/* ── Card footer: date + actions ── */}
        <div className="mt-4 flex items-center justify-between border-t pt-3 gap-2">
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            {new Date(draft.updated_at).toLocaleDateString()}
          </span>

          <div className="flex items-center gap-1.5">
            {/* ✨ Floating AI Copilot button */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 text-xs border-primary/30 text-primary hover:bg-primary/10 hover:border-primary hover:text-primary transition-all"
              onClick={() => onCopilot(draft)}
            >
              <Sparkles className="h-3 w-3" />
              AI Copilot
            </Button>

            <Link href={`/agent-space/builder/${draft.id}`}>
              <Button size="sm" variant="outline" className="h-7 text-xs">
                Open
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border py-20 text-center">
      <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
        <Boxes className="h-8 w-8 text-primary" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No agents yet</h3>
      <p className="mb-6 max-w-sm text-sm text-muted-foreground">
        Create your first agent using any supported framework, or import an existing one.
      </p>
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" /> Create Agent
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentSpacePage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [deployTarget, setDeployTarget] = useState<AgentDraft | null>(null);
  const [copilotTarget, setCopilotTarget] = useState<AgentDraft | null>(null);

  const statusFilter = tab === "all" ? undefined : tab;
  const { data, isLoading } = useAgentDrafts(statusFilter);
  const deleteDraft = useDeleteDraft();

  const drafts = data?.drafts ?? [];
  const total  = data?.total  ?? 0;

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this agent draft?")) return;
    await deleteDraft.mutateAsync(id);
  };

  const statsCards = [
    { label: "Total Agents", value: total,                                              icon: Boxes    },
    { label: "Deployed",     value: drafts.filter((d) => d.status === "deployed").length, icon: Rocket   },
    { label: "Drafts",       value: drafts.filter((d) => d.status === "draft").length,    icon: FileCode2 },
    { label: "Frameworks",   value: new Set(drafts.map((d) => d.framework)).size,         icon: GitBranch },
  ];

  return (
    <>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col pt-16">
        <div className="flex-1 px-4 py-8 md:px-8 max-w-7xl mx-auto w-full">

          {/* Header */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                <Boxes className="h-6 w-6 text-primary" />
                Agent Space
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create, build, and deploy AI agents with any framework
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => router.push("/agent-space/import")}>
                <Upload className="mr-2 h-4 w-4" /> Import
              </Button>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Create Agent
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsCards.map((s) => (
              <Card key={s.label}>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <s.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{s.value}</p>
                    <p className="text-sm text-muted-foreground">{s.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Tabs + view toggle */}
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="draft">Drafts</TabsTrigger>
                <TabsTrigger value="deployed">Deployed</TabsTrigger>
                <TabsTrigger value="archived">Archived</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-r-none border-r"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                className="h-9 w-9 rounded-l-none"
                onClick={() => setViewMode("list")}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-xl" />
              ))}
            </div>
          ) : drafts.length === 0 ? (
            <EmptyState onCreateClick={() => setCreateOpen(true)} />
          ) : (
            <div
              className={
                viewMode === "grid"
                  ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                  : "flex flex-col gap-3"
              }
            >
              {drafts.map((draft) => (
                <DraftCard
                  key={draft.id}
                  draft={draft}
                  onDelete={handleDelete}
                  onDeploy={setDeployTarget}
                  onCopilot={setCopilotTarget}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Dialogs / Sheets ── */}
      <CreateAgentDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(id) => router.push(`/agent-space/builder/${id}`)}
      />

      {deployTarget && (
        <DeployDialog
          draft={deployTarget}
          open={!!deployTarget}
          onOpenChange={(o) => !o && setDeployTarget(null)}
        />
      )}

      {copilotTarget && (
        <CopilotSheet
          draft={copilotTarget}
          open={!!copilotTarget}
          onOpenChange={(o) => !o && setCopilotTarget(null)}
        />
      )}
    </>
  );
}
