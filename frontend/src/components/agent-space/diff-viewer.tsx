"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DiffViewerProps {
  before: string;
  after: string;
  defaultOpen?: boolean;
}

type LineType = "removed" | "added" | "context";

interface DiffLine {
  type: LineType;
  text: string;
}

function computeLineDiff(before: string, after: string): DiffLine[] {
  const beforeLines = before.split("\n");
  const afterLines  = after.split("\n");

  const result: DiffLine[] = [];

  // Simple LCS-based diff (Myers' algorithm lite)
  // Build an m×n matrix of longest common subsequences
  const m = beforeLines.length;
  const n = afterLines.length;
  const lcs: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (beforeLines[i - 1] === afterLines[j - 1]) {
        lcs[i][j] = lcs[i - 1][j - 1] + 1;
      } else {
        lcs[i][j] = Math.max(lcs[i - 1][j], lcs[i][j - 1]);
      }
    }
  }

  // Backtrack through the LCS table to build the diff
  const lines: DiffLine[] = [];
  let i = m, j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && beforeLines[i - 1] === afterLines[j - 1]) {
      lines.unshift({ type: "context", text: beforeLines[i - 1] });
      i--; j--;
    } else if (j > 0 && (i === 0 || lcs[i][j - 1] >= lcs[i - 1][j])) {
      lines.unshift({ type: "added", text: afterLines[j - 1] });
      j--;
    } else {
      lines.unshift({ type: "removed", text: beforeLines[i - 1] });
      i--;
    }
  }

  return lines;
}

const LINE_STYLES: Record<LineType, string> = {
  removed: "bg-red-500/10 text-red-600 dark:text-red-400 before:content-['-'] before:mr-2 before:opacity-70",
  added:   "bg-green-500/10 text-green-700 dark:text-green-400 before:content-['+'] before:mr-2 before:opacity-70",
  context: "text-muted-foreground",
};

export function DiffViewer({ before, after, defaultOpen = false }: DiffViewerProps) {
  const [open, setOpen] = useState(defaultOpen);
  const lines = open ? computeLineDiff(before, after) : [];

  return (
    <div className="mt-2 rounded-lg border overflow-hidden">
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-full justify-between rounded-none border-b px-3 text-xs font-medium hover:bg-muted/60"
        onClick={() => setOpen(!open)}
      >
        <span className="text-muted-foreground">View Changes (diff)</span>
        {open ? (
          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        )}
      </Button>

      {open && (
        <div className="overflow-x-auto bg-muted/20">
          <pre className="p-3 text-xs font-mono leading-relaxed">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className={cn(
                  "flex items-start gap-1 px-1 rounded",
                  LINE_STYLES[line.type]
                )}
              >
                <span className="shrink-0 select-none w-3 text-center opacity-60">
                  {line.type === "removed" ? "−" : line.type === "added" ? "+" : " "}
                </span>
                <span className="break-all">{line.text || " "}</span>
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
}
