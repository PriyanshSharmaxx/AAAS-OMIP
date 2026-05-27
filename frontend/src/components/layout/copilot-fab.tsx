"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Bot, Send, RotateCcw, Zap, TrendingDown, AlertTriangle, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

// ─── Minimal standalone chat (no AgentDraft required) ────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS: Record<string, string> = {
  "Make my agent faster":
    "To reduce latency:\n\n• **Lower `max_tokens`** — set only what you need (try 512)\n• **Enable parallel tool calls** — add `\"parallel_tools\": true` to config\n• **Switch to a faster model** — `gpt-4o-mini` or `claude-3-5-haiku` are 3–5× faster\n• **Add caching** — `\"cache_enabled\": true` cuts repeat calls to <10ms",
  "Reduce cost":
    "Cost-saving options:\n\n• **Downgrade model** — `gpt-4o-mini` costs ~95% less than `gpt-4`\n• **Trim `max_tokens`** — output tokens are billed; reduce to the minimum you need\n• **Enable response caching** — avoid re-running identical prompts\n• **Compress your system prompt** — every token costs; remove filler instructions",
  "Fix errors":
    "Common error patterns:\n\n• **Add retry logic** — `\"retry_attempts\": 3, \"retry_backoff\": \"exponential\"`\n• **Handle rate limits** — catch 429s and add jitter to retries\n• **Validate tool outputs** — check for null/empty before passing to next step\n• **Improve the system prompt** — ambiguous instructions cause unpredictable outputs",
  "Improve output":
    "To improve output quality:\n\n• **Add explicit output format instructions** — tell the model exactly what structure to return\n• **Lower temperature** — set to `0.2` for factual tasks, `0.7` for creative\n• **Use few-shot examples** — add 2–3 example input/output pairs to your prompt\n• **Constrain the scope** — narrower prompts produce more consistent results",
};

const QUICK = [
  { label: "Make my agent faster", icon: Gauge },
  { label: "Reduce cost",          icon: TrendingDown },
  { label: "Fix errors",           icon: AlertTriangle },
  { label: "Improve output",       icon: Sparkles },
];

let _id = 0;
const uid = () => `m-${Date.now()}-${++_id}`;

function renderMarkdown(text: string): React.ReactNode {
  return text.split("\n").map((line, i, arr) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={j}>{p.slice(2, -2)}</strong>
        : <span key={j}>{p}</span>
    );
    return (
      <span key={i}>
        {parts}
        {i < arr.length - 1 && <br />}
      </span>
    );
  });
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-3 py-2.5 rounded-xl rounded-tl-sm bg-muted/60 w-fit">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.8s" }}
        />
      ))}
    </div>
  );
}

export function CopilotFab() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const constraintsRef = useRef(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your **AI Copilot**. Ask me how to optimize your agents:\n\n• *\"Make my agent faster\"*\n• *\"Reduce cost\"*\n• *\"Fix errors\"*\n• *\"Improve output quality\"*",
    },
  ]);
  const [typing, setTyping] = useState(false);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || typing) return;
    setInput("");

    setMessages((prev) => [...prev, { id: uid(), role: "user", text: trimmed }]);
    setTyping(true);

    await new Promise((r) => setTimeout(r, 900 + Math.random() * 600));

    // Match a known suggestion or give a generic helpful reply
    const matched = Object.keys(SUGGESTIONS).find((k) =>
      trimmed.toLowerCase().includes(k.toLowerCase().split(" ")[1])
    );
    const reply =
      SUGGESTIONS[trimmed] ??
      (matched ? SUGGESTIONS[matched] : null) ??
      `Great question! To optimize **"${trimmed}"**, open any agent in Agent Space, then I can analyze its config, prompt, model, and logs to give you specific recommendations.\n\nYou can also click the **AI Copilot** button on any agent card for a targeted analysis.`;

    setTyping(false);
    setMessages((prev) => [...prev, { id: uid(), role: "assistant", text: reply }]);
  };

  const clear = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      text: "Hi! I'm your **AI Copilot**. Ask me how to optimize your agents:\n\n• *\"Make my agent faster\"*\n• *\"Reduce cost\"*\n• *\"Fix errors\"*\n• *\"Improve output quality\"*",
    }]);
  };

  return (
    <>
      {/* ── Drag Constraints Container ── */}
      <div ref={constraintsRef} className="fixed inset-0 pointer-events-none z-50 overflow-hidden" />

      {/* ── Floating button ── */}
      <motion.button
        drag
        dragConstraints={constraintsRef}
        dragElastic={0.1}
        dragMomentum={false}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "flex items-center gap-2",
          "rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground",
          "shadow-lg shadow-primary/30",
          "ring-2 ring-primary/20",
          "hover:bg-primary/90 hover:shadow-primary/40 hover:ring-primary/40",
          "transition-shadow duration-150 pointer-events-auto cursor-grab active:cursor-grabbing",
          // pulse ring animation to draw attention
          "before:absolute before:inset-0 before:rounded-full before:ring-2 before:ring-primary/40 before:animate-ping before:opacity-0 hover:before:opacity-0"
        )}
        aria-label="Open AI Copilot"
      >
        <Sparkles className="h-4 w-4" />
        <span className="hidden sm:inline">AI Copilot</span>
      </motion.button>

      {/* ── Sheet ── */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">

          {/* Header */}
          <SheetHeader className="px-4 pt-4 pb-3 border-b shrink-0 pr-10">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-sm leading-none">AI Copilot</SheetTitle>
                <SheetDescription className="text-[11px] mt-0.5">
                  Agent optimization assistant
                </SheetDescription>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={clear} title="Clear chat">
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </SheetHeader>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div key={msg.id} className={cn("flex gap-2.5", isUser && "flex-row-reverse")}>
                  {!isUser && (
                    <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "rounded-xl px-3 py-2 text-sm leading-relaxed max-w-[85%]",
                      isUser
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : "bg-muted/70 text-foreground rounded-tl-sm"
                    )}
                  >
                    {renderMarkdown(msg.text)}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="flex gap-2.5">
                <div className="shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <TypingDots />
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="shrink-0 border-t bg-card/40 px-3 py-2">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {QUICK.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  onClick={() => send(label)}
                  className="shrink-0 flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <Icon className="h-3 w-3" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="shrink-0 border-t bg-card/60 px-3 py-3">
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask anything about your agents…"
                rows={1}
                className="min-h-[36px] max-h-[100px] resize-none text-sm py-2 bg-background border-muted focus-visible:ring-1"
                disabled={typing}
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => send(input)}
                disabled={!input.trim() || typing}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-1 text-[10px] text-muted-foreground">
              Shift+Enter for new line
            </p>
          </div>

        </SheetContent>
      </Sheet>
    </>
  );
}
