"use client";

import { Code2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UserTypeStepProps {
  saving: boolean;
  onSelect: (type: "technical" | "non_technical") => void;
}

const OPTIONS = [
  {
    value: "technical" as const,
    icon: Code2,
    title: "Technical User",
    description:
      "I'm comfortable with APIs, JSON configs, and code-level settings. Show me all options.",
  },
  {
    value: "non_technical" as const,
    icon: Users,
    title: "Non-Technical User",
    description:
      "I prefer simple guided setup. Help me configure everything with sensible defaults.",
  },
];

export function UserTypeStep({ saving, onSelect }: UserTypeStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Choose how you&apos;d like to configure this agent. This affects the complexity of the
        options shown in the next steps.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => onSelect(opt.value)}
            className="group flex flex-col items-start rounded-xl border p-5 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
              <opt.icon className="h-5 w-5 text-primary" />
            </div>
            <span className="font-semibold">{opt.title}</span>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              {opt.description}
            </p>
          </button>
        ))}
      </div>

      {saving && (
        <div className="flex items-center justify-center py-2">
          <Button disabled className="w-full">
            Saving…
          </Button>
        </div>
      )}
    </div>
  );
}
