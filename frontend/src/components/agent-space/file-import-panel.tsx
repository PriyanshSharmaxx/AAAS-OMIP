"use client";

import { useState, useRef } from "react";
import {
  Upload, FileCode2, X, Cloud, GitBranch, HardDrive, CheckCircle2, AlertCircle,
  MoreHorizontal, Download, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
} from "@/components/ui/popover";
import { api } from "@/lib/api";
import type { AgentDraft } from "@/lib/types";

const ACCEPTED_EXTENSIONS = [".py", ".js", ".json", ".yaml", ".yml", ".zip"];

const CLOUD_SOURCES = [
  { id: "github", label: "GitHub", icon: GitBranch, placeholder: "https://github.com/user/repo" },
  { id: "drive", label: "Google Drive", icon: Cloud, placeholder: "Drive file/folder URL" },
  { id: "dropbox", label: "Dropbox", icon: Cloud, placeholder: "Dropbox shared link" },
  { id: "onedrive", label: "OneDrive", icon: Cloud, placeholder: "OneDrive shared link" },
];

interface FileImportPanelProps {
  draft: AgentDraft;
}

export function FileImportPanel({ draft }: FileImportPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [draggingOver, setDraggingOver] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ files: { name: string }[]; detected_framework: string | null } | null>(null);
  const [cloudUrl, setCloudUrl] = useState("");
  const [activeCloud, setActiveCloud] = useState<string | null>(null);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const valid = Array.from(files).filter((f) =>
      ACCEPTED_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext))
    );
    setPendingFiles((prev) => [...prev, ...valid]);
  };

  const removeFile = (idx: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const uploadFiles = async () => {
    if (!pendingFiles.length) return;
    setUploading(true);
    try {
      const meta = pendingFiles.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || "application/octet-stream",
      }));
      const result = await api.post<{ files: { name: string }[]; detected_framework: string | null }>(
        `/space/drafts/${draft.id}/files`,
        meta
      );
      setUploadResult(result);
      setPendingFiles([]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        className={`relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          draggingOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
        }`}
        onDragOver={(e) => { e.preventDefault(); setDraggingOver(true); }}
        onDragLeave={() => setDraggingOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDraggingOver(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Upload className="h-6 w-6 text-primary" />
        </div>
        <p className="font-medium">Drop files here or click to browse</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Supports: {ACCEPTED_EXTENSIONS.join(", ")}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => inputRef.current?.click()}
        >
          <HardDrive className="mr-2 h-4 w-4" /> Browse Files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {/* Pending files */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">
              {pendingFiles.length} file{pendingFiles.length > 1 ? "s" : ""} ready
            </Label>
            <Button size="sm" onClick={uploadFiles} disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
          {pendingFiles.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
              <span className="flex-1 truncate text-sm">{f.name}</span>
              <span className="text-xs text-muted-foreground">
                {(f.size / 1024).toFixed(1)} KB
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeFile(i)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload result */}
      {uploadResult && (
        <div className="flex items-start gap-3 rounded-lg border border-green-500/30 bg-green-500/5 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Upload successful</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {uploadResult.files.length} file{uploadResult.files.length > 1 ? "s" : ""} uploaded
            </p>
            {uploadResult.detected_framework && (
              <p className="text-xs mt-1">
                Detected framework:{" "}
                <Badge variant="secondary" className="text-xs">{uploadResult.detected_framework}</Badge>
              </p>
            )}
          </div>
        </div>
      )}

      {/* Existing files */}
      {draft.source_files && draft.source_files.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Files</Label>
          {draft.source_files.map((f, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border px-3 py-2">
              <FileCode2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="flex-1 truncate text-sm">{f.name}</span>
              <span className="text-xs text-muted-foreground shrink-0">
                {(f.size / 1024).toFixed(1)} KB
              </span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                    <span className="sr-only">File actions</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-40" align="end" sideOffset={6}>
                  <PopoverBody className="p-1">
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                      <Download className="mr-2 h-4 w-4 text-blue-500" />
                      <span className="text-sm">Download</span>
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2">
                      <Pencil className="mr-2 h-4 w-4" />
                      <span className="text-sm">Rename</span>
                    </Button>
                    <Separator className="my-1" />
                    <Button variant="ghost" size="sm" className="h-8 w-full justify-start px-2 text-destructive hover:text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span className="text-sm">Delete</span>
                    </Button>
                  </PopoverBody>
                </PopoverContent>
              </Popover>
            </div>
          ))}
        </div>
      )}

      {/* Cloud import */}
      <div className="space-y-3">
        <Label className="text-sm font-medium">Import from Cloud</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {CLOUD_SOURCES.map((src) => (
            <button
              key={src.id}
              type="button"
              onClick={() => setActiveCloud(activeCloud === src.id ? null : src.id)}
              className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                activeCloud === src.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
              }`}
            >
              <src.icon className="h-4 w-4 text-muted-foreground" />
              {src.label}
            </button>
          ))}
        </div>
        {activeCloud && (
          <div className="space-y-2">
            <Input
              placeholder={CLOUD_SOURCES.find((s) => s.id === activeCloud)?.placeholder}
              value={cloudUrl}
              onChange={(e) => setCloudUrl(e.target.value)}
            />
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-3">
              <AlertCircle className="h-4 w-4 text-yellow-600 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Cloud import requires authentication. Connect your accounts in Settings.
              </p>
            </div>
            <Button size="sm" variant="outline" disabled className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import from {CLOUD_SOURCES.find((s) => s.id === activeCloud)?.label}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
