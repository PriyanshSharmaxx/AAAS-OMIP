"use client";

import { useState, useCallback, useRef } from "react";
import { analyzeAgent } from "@/lib/copilot-engine";
import type { CopilotMessage, CopilotSuggestion } from "@/lib/copilot-engine";
import type { AgentDraft } from "@/lib/types";

let msgId = 0;
const nextId = () => `msg-${Date.now()}-${++msgId}`;

interface UseCopilotOptions {
  draft: AgentDraft;
  onApply: (change: Partial<AgentDraft>) => Promise<void>;
}

interface UseCopilotReturn {
  messages: CopilotMessage[];
  isAnalyzing: boolean;
  autoFix: boolean;
  appliedIds: Set<string>;
  dismissedIds: Set<string>;
  setAutoFix: (v: boolean) => void;
  send: (instruction: string) => Promise<void>;
  apply: (suggestion: CopilotSuggestion) => Promise<void>;
  dismiss: (id: string) => void;
  clear: () => void;
}

const WELCOME: CopilotMessage = {
  id: "welcome",
  role: "copilot",
  text: "Hi! I'm your **AI Copilot**. Tell me what you'd like to improve:\n\n- *\"Make this agent faster\"*\n- *\"Reduce cost\"*\n- *\"Fix errors\"*\n- *\"Improve output quality\"*\n- *\"Optimize everything\"*",
  timestamp: new Date(),
};

export function useCopilot({ draft, onApply }: UseCopilotOptions): UseCopilotReturn {
  const [messages, setMessages] = useState<CopilotMessage[]>([WELCOME]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoFix, setAutoFix] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  // Track the current draft in a ref so async callbacks get the latest value
  const draftRef = useRef(draft);
  draftRef.current = draft;

  const addMessage = useCallback((msg: Omit<CopilotMessage, "id" | "timestamp">) => {
    setMessages((prev) => [
      ...prev,
      { ...msg, id: nextId(), timestamp: new Date() },
    ]);
  }, []);

  const send = useCallback(
    async (instruction: string) => {
      if (!instruction.trim() || isAnalyzing) return;

      // Add user message
      addMessage({ role: "user", text: instruction });
      setIsAnalyzing(true);

      try {
        const analysis = await analyzeAgent(instruction, draftRef.current);

        addMessage({
          role: "copilot",
          text: analysis.summary,
          analysis,
        });

        // Auto-fix: apply all low-effort suggestions automatically
        if (autoFix) {
          const safeOnes = analysis.suggestions.filter(
            (s) => s.effort === "low" && s.impact !== "high"
          );
          for (const s of safeOnes) {
            await applyChange(s);
          }
          if (safeOnes.length > 0) {
            addMessage({
              role: "copilot",
              text: `Auto-fix applied **${safeOnes.length}** safe optimization${safeOnes.length > 1 ? "s" : ""} automatically.`,
            });
          }
        }
      } catch {
        addMessage({
          role: "copilot",
          text: "Sorry, I encountered an error while analyzing your agent. Please try again.",
        });
      } finally {
        setIsAnalyzing(false);
      }
    },
    [isAnalyzing, autoFix, addMessage]
  );

  const applyChange = useCallback(
    async (suggestion: CopilotSuggestion) => {
      const { change } = suggestion;
      const update: Partial<AgentDraft> = {};

      if (change.config) {
        update.config = { ...draftRef.current.config, ...change.config };
      }
      if (change.description) update.description = change.description;
      if (change.name) update.name = change.name;
      if (change.tags) {
        update.tags = [...new Set([...(draftRef.current.tags ?? []), ...change.tags])];
      }

      await onApply(update);
      setAppliedIds((prev) => new Set(prev).add(suggestion.id));
    },
    [onApply]
  );

  const apply = useCallback(
    async (suggestion: CopilotSuggestion) => {
      try {
        await applyChange(suggestion);
        addMessage({
          role: "copilot",
          text: `✅ **${suggestion.title}** applied successfully. The agent config has been updated and saved.`,
        });
      } catch {
        addMessage({
          role: "copilot",
          text: `❌ Failed to apply **${suggestion.title}**. Please try saving manually.`,
        });
      }
    },
    [applyChange, addMessage]
  );

  const dismiss = useCallback((id: string) => {
    setDismissedIds((prev) => new Set(prev).add(id));
  }, []);

  const clear = useCallback(() => {
    setMessages([WELCOME]);
    setAppliedIds(new Set());
    setDismissedIds(new Set());
  }, []);

  return {
    messages,
    isAnalyzing,
    autoFix,
    appliedIds,
    dismissedIds,
    setAutoFix,
    send,
    apply,
    dismiss,
    clear,
  };
}
