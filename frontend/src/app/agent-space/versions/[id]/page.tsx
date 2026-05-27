"use client";

import { use, useState } from "react";
import Link from "next/link";
import { ArrowLeft, GitBranch, Plus, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAgentVersions, useAgentDraft, useCreateVersion, useRollbackVersion } from "@/lib/queries";

export default function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: draft, isLoading: draftLoading } = useAgentDraft(id);
  const { data: versions, isLoading: versionsLoading } = useAgentVersions(id);
  const createVersion = useCreateVersion();
  const rollbackVersion = useRollbackVersion();
  const [open, setOpen] = useState(false);
  const [changelog, setChangelog] = useState("");

  const handleCreate = async () => {
    await createVersion.mutateAsync({ draftId: id, changelog });
    setOpen(false);
    setChangelog("");
  };

  const isLoading = draftLoading || versionsLoading;

  return (
    <>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col pt-16">
        <div className="px-4 py-8 md:px-8 max-w-3xl mx-auto w-full">
          <div className="mb-6 flex items-center gap-3">
            <Link href={`/agent-space/builder/${id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="flex items-center gap-2 text-xl font-bold">
                <GitBranch className="h-5 w-5 text-primary" />
                Version History
              </h1>
              {draft && (
                <p className="text-sm text-muted-foreground mt-0.5">{draft.name}</p>
              )}
            </div>
            <Button size="sm" className="ml-auto gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="h-3.5 w-3.5" /> New Version
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : !versions?.length ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-16 text-center">
              <GitBranch className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="font-semibold">No versions yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Create a version snapshot to track changes.
              </p>
              <Button className="mt-4" size="sm" onClick={() => setOpen(true)}>
                Create First Version
              </Button>
            </div>
          ) : (
            <div className="relative space-y-0">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
              {versions.map((v, i) => (
                <div key={v.id} className="relative flex gap-4 pb-6">
                  {/* Timeline dot */}
                  <div className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 ${
                    i === 0 ? "border-primary bg-primary/10" : "border-border bg-background"
                  }`}>
                    <GitBranch className={`h-4 w-4 ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <Card className="flex-1">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant={i === 0 ? "default" : "secondary"} className="text-xs">
                              v{v.version || (versions.length - i)}
                            </Badge>
                            {i === 0 && (
                              <Badge variant="outline" className="text-xs text-green-600 border-green-500/40">
                                Latest
                              </Badge>
                            )}
                          </div>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {v.changelog || "No changelog provided."}
                          </p>
                        </div>
                        {i !== 0 && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 text-xs"
                            onClick={() => {
                              if (confirm("Restore this version? This will overwrite your current draft.")) {
                                rollbackVersion.mutate({ draftId: id, versionId: v.id });
                              }
                            }}
                            disabled={rollbackVersion.isPending}
                          >
                            Restore
                          </Button>
                        )}
                      </div>
                      <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        {new Date(v.created_at).toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Changelog</Label>
              <Textarea
                placeholder="What changed in this version?"
                rows={4}
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={createVersion.isPending}
            >
              {createVersion.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Version
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
