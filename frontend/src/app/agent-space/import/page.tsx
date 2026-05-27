"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Upload, FileCode2, X, Cloud, Github, Loader2, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AGENT_FRAMEWORKS } from "@/lib/agent-frameworks";
import { useCreateDraft } from "@/lib/queries";

const ACCEPTED = [".py", ".js", ".json", ".yaml", ".yml", ".zip"];

export default function ImportPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [name, setName] = useState("");
  const [framework, setFramework] = useState("python");
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);
  const createDraft = useCreateDraft();

  const handleFiles = (list: FileList | null) => {
    if (!list) return;
    const valid = Array.from(list).filter((f) =>
      ACCEPTED.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setFiles((prev) => [...prev, ...valid]);
    if (!name && valid.length) {
      setName(valid[0].name.replace(/\.\w+$/, "").replace(/[-_]/g, " "));
    }
  };

  const handleImport = async () => {
    if (!name.trim() || !files.length) return;
    setImporting(true);
    try {
      const draft = await createDraft.mutateAsync({
        name: name.trim(),
        framework,
        description: `Imported from ${files.map((f) => f.name).join(", ")}`,
      });
      setDone(true);
      setTimeout(() => router.push(`/agent-space/builder/${draft.id}`), 1200);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col pt-16">
      <div className="px-4 py-8 md:px-8 max-w-2xl mx-auto w-full">
        <div className="mb-6 flex items-center gap-3">
          <Link href="/agent-space">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold">Import Agent</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Import an existing agent from files or a repository
            </p>
          </div>
        </div>

        {done ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Import Successful!</h3>
              <p className="text-sm text-muted-foreground mt-1">Redirecting to builder…</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Drop zone */}
            <div
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
                dragOver ? "border-primary bg-primary/5" : "border-border"
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            >
              <Upload className="mb-3 h-10 w-10 text-muted-foreground" />
              <p className="font-medium">Drop your agent files here</p>
              <p className="mt-1 text-sm text-muted-foreground">{ACCEPTED.join(", ")}</p>
              <Button variant="outline" size="sm" className="mt-4" onClick={() => inputRef.current?.click()}>
                Browse Files
              </Button>
              <input
                ref={inputRef}
                type="file"
                multiple
                accept={ACCEPTED.join(",")}
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {/* Selected files */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
                    <FileCode2 className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate text-sm">{f.name}</span>
                    <span className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</span>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Config */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Agent Name</Label>
                <Input placeholder="My Agent" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Framework</Label>
                <Select value={framework} onValueChange={setFramework}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGENT_FRAMEWORKS.map((fw) => (
                      <SelectItem key={fw.id} value={fw.id}>{fw.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Cloud sources note */}
            <div className="rounded-xl border border-dashed p-4">
              <p className="text-sm font-medium mb-3">Import from Cloud</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { label: "GitHub Repository", icon: Github },
                  { label: "Google Drive", icon: Cloud },
                  { label: "Dropbox", icon: Cloud },
                  { label: "OneDrive", icon: Cloud },
                ].map((src) => (
                  <button
                    key={src.label}
                    type="button"
                    disabled
                    className="flex items-center gap-2 rounded-lg border p-3 text-sm text-muted-foreground opacity-60 cursor-not-allowed"
                  >
                    <src.icon className="h-4 w-4" />
                    {src.label}
                    <span className="ml-auto text-xs">Soon</span>
                  </button>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!name.trim() || !files.length || importing}
              onClick={handleImport}
            >
              {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Import & Open Builder
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
