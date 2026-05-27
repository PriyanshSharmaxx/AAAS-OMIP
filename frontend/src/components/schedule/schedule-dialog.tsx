"use client";

import { useState, useCallback } from "react";
import {
  Calendar, Clock, Zap, Globe, FileUp, Webhook,
  ChevronRight, ChevronLeft, Check, Plus, Trash2,
  Info, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner-1";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ScheduleType, DayOfWeek, OutputAction,
  SCHEDULE_TYPE_CONFIG, DAY_OF_WEEK_OPTIONS, OUTPUT_ACTION_CONFIG,
} from "@/lib/schedule-data";
import { CreateSchedulePayload } from "@/hooks/useScheduler";

// ---------------------------------------------------------------------------
// Step definitions
// ---------------------------------------------------------------------------

const STEPS = [
  { id: 1, label: "Frequency" },
  { id: 2, label: "Timing"    },
  { id: 3, label: "Config"    },
  { id: 4, label: "Confirm"   },
] as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map((s, i) => (
        <div key={s.id} className="flex items-center">
          <div
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
              current === s.id
                ? "border-primary bg-primary text-primary-foreground"
                : current > s.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-muted text-muted-foreground",
            )}
          >
            {current > s.id ? <Check className="h-3.5 w-3.5" /> : s.id}
          </div>
          <span
            className={cn(
              "ml-1.5 text-xs font-medium hidden sm:inline",
              current === s.id ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {s.label}
          </span>
          {i < STEPS.length - 1 && (
            <div className={cn("mx-2 h-px w-8 sm:w-12", current > s.id ? "bg-primary" : "bg-border")} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Step 1: Frequency type picker ──────────────────────────────────────────

function TypeIcon({ type }: { type: ScheduleType }) {
  const icons: Record<ScheduleType, React.ElementType> = {
    daily: Clock, weekly: Calendar, monthly: Calendar,
    webhook: Webhook, file_upload: FileUp, event: Zap,
  };
  const Icon = icons[type];
  return <Icon className="h-5 w-5" />;
}

interface Step1Props {
  value: ScheduleType;
  onChange: (t: ScheduleType) => void;
}

function Step1Frequency({ value, onChange }: Step1Props) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">How often should this agent run?</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(SCHEDULE_TYPE_CONFIG) as ScheduleType[]).map((type) => {
          const cfg = SCHEDULE_TYPE_CONFIG[type];
          return (
            <button
              key={type}
              onClick={() => onChange(type)}
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                value === type
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border bg-card hover:border-foreground/20 hover:bg-secondary/40",
              )}
            >
              <div className={cn(
                "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                value === type ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
              )}>
                <TypeIcon type={type} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold">{cfg.label}</span>
                  <span className="text-sm">{cfg.icon}</span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">{cfg.description}</p>
              </div>
              {value === type && (
                <Check className="ml-auto h-4 w-4 shrink-0 text-primary" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 2: Timing & trigger config ───────────────────────────────────────

interface Step2Props {
  type: ScheduleType;
  time: string;         setTime: (v: string) => void;
  day: DayOfWeek;       setDay: (v: DayOfWeek) => void;
  dayOfMonth: number;   setDayOfMonth: (v: number) => void;
  webhookUrl: string;   setWebhookUrl: (v: string) => void;
  eventSource: string;  setEventSource: (v: string) => void;
}

function Step2Timing({ type, time, setTime, day, setDay, dayOfMonth, setDayOfMonth, webhookUrl, setWebhookUrl, eventSource, setEventSource }: Step2Props) {
  const cfg = SCHEDULE_TYPE_CONFIG[type];

  if (type === "webhook") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Your agent will run every time this URL receives a POST request.</p>
        <div className="space-y-2">
          <Label htmlFor="webhook-url">Webhook Endpoint (auto-generated)</Label>
          <div className="flex gap-2">
            <Input
              id="webhook-url"
              value={webhookUrl || "https://api.omip.io/webhooks/new/trigger"}
              readOnly
              className="font-mono text-xs bg-muted"
            />
            <Button variant="outline" size="icon" type="button" title="Copy URL">
              <Globe className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> A secret header will be generated after saving for validation.
          </p>
        </div>
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Example trigger call:</p>
          <code>curl -X POST [webhook-url] \</code>
          <code>  -H "X-Omip-Secret: your_secret" \</code>
          <code>  -d '{`{"key": "value"}`}'</code>
        </div>
      </div>
    );
  }

  if (type === "file_upload") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Your agent runs automatically when a new file is uploaded to your connected storage.</p>
        <div className="rounded-lg border border-dashed p-6 text-center space-y-2">
          <FileUp className="mx-auto h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">Connect a storage bucket to enable this trigger.</p>
          <Button variant="outline" size="sm">Connect Storage</Button>
        </div>
      </div>
    );
  }

  if (type === "event") {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Run this agent when an external event fires.</p>
        <div className="space-y-2">
          <Label htmlFor="event-source">Event Source</Label>
          <Input
            id="event-source"
            placeholder="e.g. github.push, stripe.payment, slack.message"
            value={eventSource}
            onChange={(e) => setEventSource(e.target.value)}
          />
        </div>
        <div className="flex items-start gap-2 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
          <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Event triggers connect via the Omip Events SDK or incoming webhooks with a typed event envelope.
        </div>
      </div>
    );
  }

  // Timed schedules (daily, weekly, monthly)
  return (
    <div className="space-y-5">
      {/* Time picker */}
      <div className="space-y-2">
        <Label htmlFor="time-input">Time (24-hour)</Label>
        <div className="flex items-center gap-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <Input
            id="time-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="w-36"
          />
          <span className="text-xs text-muted-foreground">UTC</span>
        </div>
      </div>

      {/* Day-of-week (weekly) */}
      {type === "weekly" && (
        <div className="space-y-2">
          <Label>Day of Week</Label>
          <div className="flex flex-wrap gap-1.5">
            {DAY_OF_WEEK_OPTIONS.map((d) => (
              <button
                key={d.value}
                onClick={() => setDay(d.value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                  day === d.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-foreground/30",
                )}
              >
                {d.short}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Day-of-month (monthly) */}
      {type === "monthly" && (
        <div className="space-y-2">
          <Label htmlFor="dom">Day of Month (1–28)</Label>
          <Input
            id="dom"
            type="number"
            min={1}
            max={28}
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
            className="w-24"
          />
          <p className="text-xs text-muted-foreground">Capped at 28 for months with fewer days.</p>
        </div>
      )}

      {/* Preview */}
      <div className="rounded-lg border bg-primary/5 p-3">
        <p className="text-xs font-medium text-muted-foreground mb-1">Schedule preview</p>
        <p className="text-sm font-semibold">
          {type === "daily" && `Every day at ${time} UTC`}
          {type === "weekly" && `Every ${day} at ${time} UTC`}
          {type === "monthly" && `On the ${dayOfMonth}${ordinalSuffix(dayOfMonth)} of each month at ${time} UTC`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          cron: {buildCronPreview(type, time, day, dayOfMonth)}
        </p>
      </div>
    </div>
  );
}

function ordinalSuffix(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return s[(v-20)%10] || s[v] || s[0];
}

function buildCronPreview(type: ScheduleType, time: string, day: DayOfWeek, dom: number): string {
  const [h = "9", m = "0"] = time.split(":");
  const hr = parseInt(h, 10);
  const mn = parseInt(m, 10);
  const dayMap: Record<DayOfWeek, number> = { sunday:0,monday:1,tuesday:2,wednesday:3,thursday:4,friday:5,saturday:6 };
  if (type === "daily")   return `${mn} ${hr} * * *`;
  if (type === "weekly")  return `${mn} ${hr} * * ${dayMap[day] ?? 1}`;
  if (type === "monthly") return `${mn} ${hr} ${dom} * *`;
  return "* * * * *";
}

// ── Step 3: Input data + output actions ────────────────────────────────────

interface KVPair { key: string; value: string }

interface Step3Props {
  pairs: KVPair[];
  onAddPair: () => void;
  onChangePair: (i: number, field: "key" | "value", v: string) => void;
  onRemovePair: (i: number) => void;
  outputActions: OutputAction[];
  onToggleAction: (a: OutputAction) => void;
  maxRetries: number;
  setMaxRetries: (n: number) => void;
  scheduleName: string;
  setScheduleName: (v: string) => void;
}

function Step3Config({
  pairs, onAddPair, onChangePair, onRemovePair,
  outputActions, onToggleAction,
  maxRetries, setMaxRetries,
  scheduleName, setScheduleName,
}: Step3Props) {
  return (
    <div className="space-y-6">
      {/* Schedule name */}
      <div className="space-y-2">
        <Label htmlFor="sched-name">Schedule Name</Label>
        <Input
          id="sched-name"
          placeholder="e.g. Daily Research Digest"
          value={scheduleName}
          onChange={(e) => setScheduleName(e.target.value)}
        />
      </div>

      {/* Input data */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Static Input Data</Label>
          <Button variant="ghost" size="sm" onClick={onAddPair} className="h-7 gap-1 text-xs">
            <Plus className="h-3 w-3" /> Add field
          </Button>
        </div>
        <div className="space-y-2">
          {pairs.map((pair, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="key"
                value={pair.key}
                onChange={(e) => onChangePair(i, "key", e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Input
                placeholder="value"
                value={pair.value}
                onChange={(e) => onChangePair(i, "value", e.target.value)}
                className="flex-1 font-mono text-xs"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 text-destructive/60 hover:text-destructive"
                onClick={() => onRemovePair(i)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
          {pairs.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No input data configured. The agent will use its default inputs.
            </p>
          )}
        </div>
      </div>

      <Separator />

      {/* Output actions */}
      <div className="space-y-2">
        <Label>Output Actions (after execution)</Label>
        <div className="grid gap-2 sm:grid-cols-2">
          {(Object.keys(OUTPUT_ACTION_CONFIG) as OutputAction[]).map((action) => {
            const cfg = OUTPUT_ACTION_CONFIG[action];
            const selected = outputActions.includes(action);
            return (
              <button
                key={action}
                onClick={() => onToggleAction(action)}
                className={cn(
                  "flex items-start gap-2 rounded-lg border p-3 text-left transition-colors",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-foreground/20",
                )}
              >
                <div className={cn(
                  "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                  selected ? "border-primary bg-primary" : "border-border",
                )}>
                  {selected && <Check className="h-3 w-3 text-primary-foreground" />}
                </div>
                <div>
                  <p className="text-xs font-semibold">{cfg.label}</p>
                  <p className="text-[11px] text-muted-foreground">{cfg.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Separator />

      {/* Retry config */}
      <div className="flex items-center justify-between">
        <div>
          <Label>Max Retries</Label>
          <p className="text-xs text-muted-foreground mt-0.5">Retry on failure before marking as failed</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMaxRetries(Math.max(0, maxRetries - 1))}
            className="flex h-7 w-7 items-center justify-center rounded border hover:bg-muted"
          >
            −
          </button>
          <span className="w-6 text-center text-sm font-semibold">{maxRetries}</span>
          <button
            onClick={() => setMaxRetries(Math.min(5, maxRetries + 1))}
            className="flex h-7 w-7 items-center justify-center rounded border hover:bg-muted"
          >
            +
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 4: Confirm summary ────────────────────────────────────────────────

interface Step4Props {
  agentName: string;
  scheduleName: string;
  type: ScheduleType;
  time: string;
  day: DayOfWeek;
  dayOfMonth: number;
  outputActions: OutputAction[];
  inputPairs: KVPair[];
  maxRetries: number;
}

function Step4Confirm({ agentName, scheduleName, type, time, day, dayOfMonth, outputActions, inputPairs, maxRetries }: Step4Props) {
  const cfg = SCHEDULE_TYPE_CONFIG[type];
  const rows = [
    { label: "Agent",          value: agentName     },
    { label: "Schedule name",  value: scheduleName || `${agentName} — ${cfg.label}` },
    { label: "Frequency",      value: cfg.label     },
    ...(cfg.hasTiming ? [{ label: "Time", value: `${time} UTC` }] : []),
    ...(type === "weekly"  ? [{ label: "Day",      value: day }] : []),
    ...(type === "monthly" ? [{ label: "Day of month", value: String(dayOfMonth) }] : []),
    { label: "Max retries",    value: String(maxRetries) },
    { label: "Output actions", value: outputActions.map((a) => OUTPUT_ACTION_CONFIG[a].label).join(", ") || "None" },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Review your schedule before saving.</p>

      <div className="rounded-xl border divide-y">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between px-4 py-2.5">
            <span className="text-xs text-muted-foreground">{r.label}</span>
            <span className="text-xs font-medium capitalize">{r.value}</span>
          </div>
        ))}
        {inputPairs.length > 0 && (
          <div className="px-4 py-2.5">
            <span className="text-xs text-muted-foreground">Input fields</span>
            <div className="mt-1.5 space-y-0.5">
              {inputPairs.map((p, i) => (
                <div key={i} className="flex gap-2 text-xs font-mono">
                  <span className="text-muted-foreground">{p.key}:</span>
                  <span>{p.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3 text-xs text-emerald-700 dark:text-emerald-400">
        <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        This schedule will be active immediately after saving. You can pause it anytime from /schedule.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main dialog
// ---------------------------------------------------------------------------

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  agentId: string;
  agentName: string;
  onSave: (payload: CreateSchedulePayload) => Promise<any>;
}

export function ScheduleDialog({
  open, onOpenChange, agentId, agentName, onSave,
}: ScheduleDialogProps) {
  const [step, setStep]             = useState(1);
  const [type, setType]             = useState<ScheduleType>("daily");
  const [time, setTime]             = useState("09:00");
  const [day, setDay]               = useState<DayOfWeek>("monday");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [eventSource, setEventSource] = useState("");
  const [pairs, setPairs]           = useState<{key:string;value:string}[]>([]);
  const [outputActions, setOutputActions] = useState<OutputAction[]>(["dashboard"]);
  const [maxRetries, setMaxRetries] = useState(3);
  const [scheduleName, setScheduleName] = useState("");
  const [saving, setSaving]         = useState(false);

  function reset() {
    setStep(1); setType("daily"); setTime("09:00"); setDay("monday");
    setDayOfMonth(1); setWebhookUrl(""); setEventSource("");
    setPairs([]); setOutputActions(["dashboard"]); setMaxRetries(3);
    setScheduleName(""); setSaving(false);
  }

  function handleClose(v: boolean) {
    if (!v) reset();
    onOpenChange(v);
  }

  const addPair = useCallback(() => setPairs((p) => [...p, { key: "", value: "" }]), []);
  const changePair = useCallback((i: number, field: "key" | "value", v: string) => {
    setPairs((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: v } : p));
  }, []);
  const removePair = useCallback((i: number) => {
    setPairs((prev) => prev.filter((_, idx) => idx !== i));
  }, []);

  const toggleAction = useCallback((action: OutputAction) => {
    setOutputActions((prev) =>
      prev.includes(action) ? prev.filter((a) => a !== action) : [...prev, action],
    );
  }, []);

  function canAdvance(): boolean {
    if (step === 1) return true;
    if (step === 2) {
      if (type === "event" && !eventSource.trim()) return false;
      return true;
    }
    if (step === 3) return true;
    return true;
  }

  async function handleSave() {
    setSaving(true);
    const inputData: Record<string, string> = {};
    pairs.forEach(({ key, value }) => { if (key.trim()) inputData[key.trim()] = value; });

    await onSave({
      agent_id: agentId,
      agent_name: agentName,
      name: scheduleName.trim() || `${agentName} — ${SCHEDULE_TYPE_CONFIG[type].label}`,
      type,
      time,
      day: type === "weekly" ? day : undefined,
      day_of_month: type === "monthly" ? dayOfMonth : undefined,
      webhook_url: type === "webhook" ? webhookUrl : undefined,
      event_source: type === "event" ? eventSource : undefined,
      input_data: inputData,
      output_actions: outputActions,
      max_retries: maxRetries,
    });

    setSaving(false);
    handleClose(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Schedule Agent
          </DialogTitle>
          <DialogDescription>
            Automate <span className="font-medium text-foreground">{agentName}</span> to run on a schedule or trigger.
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="py-2">
          <StepIndicator current={step} />
        </div>

        <Separator />

        {/* Step content */}
        <div className="py-2 min-h-[320px]">
          {step === 1 && <Step1Frequency value={type} onChange={setType} />}
          {step === 2 && (
            <Step2Timing
              type={type} time={time} setTime={setTime}
              day={day} setDay={setDay}
              dayOfMonth={dayOfMonth} setDayOfMonth={setDayOfMonth}
              webhookUrl={webhookUrl} setWebhookUrl={setWebhookUrl}
              eventSource={eventSource} setEventSource={setEventSource}
            />
          )}
          {step === 3 && (
            <Step3Config
              pairs={pairs} onAddPair={addPair}
              onChangePair={changePair} onRemovePair={removePair}
              outputActions={outputActions} onToggleAction={toggleAction}
              maxRetries={maxRetries} setMaxRetries={setMaxRetries}
              scheduleName={scheduleName} setScheduleName={setScheduleName}
            />
          )}
          {step === 4 && (
            <Step4Confirm
              agentName={agentName} scheduleName={scheduleName}
              type={type} time={time} day={day} dayOfMonth={dayOfMonth}
              outputActions={outputActions} inputPairs={pairs}
              maxRetries={maxRetries}
            />
          )}
        </div>

        <Separator />

        {/* Navigation */}
        <div className="flex items-center justify-between pt-1">
          <Button
            variant="outline"
            onClick={() => step === 1 ? handleClose(false) : setStep((s) => s - 1)}
            className="gap-1.5"
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? "Cancel" : "Back"}
          </Button>

          {step < 4 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="gap-1.5"
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving} className="gap-1.5 min-w-[120px]">
              {saving ? (
                <>
                  <Spinner size={14} color="currentColor" />
                  Saving…
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" /> Save Schedule
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
