// ---------------------------------------------------------------------------
// Scheduled Agents System — Types, Data & Cron Builder
// ---------------------------------------------------------------------------

export type ScheduleType =
  | "daily"
  | "weekly"
  | "monthly"
  | "webhook"
  | "file_upload"
  | "event";

export type ScheduleStatus = "active" | "paused" | "failed" | "completed";

export type DayOfWeek =
  | "monday" | "tuesday" | "wednesday" | "thursday"
  | "friday" | "saturday" | "sunday";

export type OutputAction = "email" | "dashboard" | "chain_agent" | "database" | "webhook_out";

export type RunStatus = "success" | "failed" | "running" | "pending";

// ---------------------------------------------------------------------------
// Core schedule entity
// ---------------------------------------------------------------------------

export interface Schedule {
  id: string;
  user_id: string;
  agent_id: string;
  agent_name: string;
  name: string;                            // human label, e.g. "Daily Research Digest"
  type: ScheduleType;
  cron_expression: string;                 // computed; e.g. "0 9 * * 1"
  // Timing config
  time: string;                            // "HH:MM" 24h
  day?: DayOfWeek;                         // weekly
  day_of_month?: number;                   // monthly (1–31)
  // Trigger config (webhook / event)
  webhook_url?: string;
  webhook_secret?: string;
  event_source?: string;
  // Execution config
  input_data: Record<string, string>;      // static input key→value
  output_actions: OutputAction[];
  // Reliability
  retry_count: number;                     // current retry counter
  max_retries: number;
  // State
  status: ScheduleStatus;
  next_run?: string;                       // ISO
  last_run?: string;                       // ISO
  last_run_status?: RunStatus;
  last_run_duration_ms?: number;
  total_runs: number;
  total_successes: number;
  total_failures: number;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// Schedule run log entry
// ---------------------------------------------------------------------------

export interface ScheduleRun {
  id: string;
  schedule_id: string;
  agent_id: string;
  started_at: string;
  completed_at?: string;
  status: RunStatus;
  duration_ms?: number;
  retry_attempt: number;
  output_summary?: string;
  error_message?: string;
  logs: ScheduleLog[];
}

export interface ScheduleLog {
  timestamp: string;
  level: "info" | "warn" | "error" | "success";
  message: string;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

export const SCHEDULE_TYPE_CONFIG: Record<
  ScheduleType,
  { label: string; description: string; icon: string; hasTiming: boolean; hasWebhook: boolean }
> = {
  daily:       { label: "Daily",        description: "Runs at a specific time every day",          icon: "☀️", hasTiming: true,  hasWebhook: false },
  weekly:      { label: "Weekly",       description: "Runs on a specific day each week",            icon: "📅", hasTiming: true,  hasWebhook: false },
  monthly:     { label: "Monthly",      description: "Runs on a specific date each month",          icon: "🗓️", hasTiming: true,  hasWebhook: false },
  webhook:     { label: "Webhook",      description: "Triggered by an incoming HTTP request",       icon: "🔗", hasTiming: false, hasWebhook: true  },
  file_upload: { label: "File Upload",  description: "Triggered when a new file is uploaded",      icon: "📁", hasTiming: false, hasWebhook: false },
  event:       { label: "Event-based",  description: "Triggered by an external platform event",    icon: "⚡", hasTiming: false, hasWebhook: false },
};

export const STATUS_CONFIG: Record<
  ScheduleStatus,
  { label: string; colorClass: string; bgClass: string; dotClass: string }
> = {
  active:    { label: "Active",    colorClass: "text-emerald-600", bgClass: "bg-emerald-500/10", dotClass: "bg-emerald-500" },
  paused:    { label: "Paused",    colorClass: "text-amber-600",   bgClass: "bg-amber-500/10",   dotClass: "bg-amber-500"   },
  failed:    { label: "Failed",    colorClass: "text-red-600",     bgClass: "bg-red-500/10",     dotClass: "bg-red-500"     },
  completed: { label: "Completed", colorClass: "text-blue-600",    bgClass: "bg-blue-500/10",    dotClass: "bg-blue-500"    },
};

export const RUN_STATUS_CONFIG: Record<
  RunStatus,
  { label: string; colorClass: string; bgClass: string }
> = {
  success: { label: "Success", colorClass: "text-emerald-600", bgClass: "bg-emerald-500/10" },
  failed:  { label: "Failed",  colorClass: "text-red-600",     bgClass: "bg-red-500/10"     },
  running: { label: "Running", colorClass: "text-blue-600",    bgClass: "bg-blue-500/10"    },
  pending: { label: "Pending", colorClass: "text-amber-600",   bgClass: "bg-amber-500/10"   },
};

export const OUTPUT_ACTION_CONFIG: Record<
  OutputAction,
  { label: string; description: string }
> = {
  email:       { label: "Send Email",          description: "Email results to your inbox"         },
  dashboard:   { label: "Save to Dashboard",   description: "Store output in your run history"    },
  chain_agent: { label: "Chain to Agent",      description: "Pass output to another agent"        },
  database:    { label: "Store in Database",   description: "Persist structured output to DB"     },
  webhook_out: { label: "Outbound Webhook",    description: "POST results to an external URL"     },
};

export const DAY_OF_WEEK_OPTIONS: { value: DayOfWeek; label: string; short: string }[] = [
  { value: "monday",    label: "Monday",    short: "Mon" },
  { value: "tuesday",   label: "Tuesday",   short: "Tue" },
  { value: "wednesday", label: "Wednesday", short: "Wed" },
  { value: "thursday",  label: "Thursday",  short: "Thu" },
  { value: "friday",    label: "Friday",    short: "Fri" },
  { value: "saturday",  label: "Saturday",  short: "Sat" },
  { value: "sunday",    label: "Sunday",    short: "Sun" },
];

const DAY_CRON_INDEX: Record<DayOfWeek, number> = {
  sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
  thursday: 4, friday: 5, saturday: 6,
};

// ---------------------------------------------------------------------------
// Cron expression builder
// ---------------------------------------------------------------------------

export function buildCronExpression(
  type: ScheduleType,
  time: string,           // "HH:MM"
  day?: DayOfWeek,
  dayOfMonth?: number,
): string {
  const [h = "9", m = "0"] = time.split(":");
  const hour   = parseInt(h, 10);
  const minute = parseInt(m, 10);

  switch (type) {
    case "daily":   return `${minute} ${hour} * * *`;
    case "weekly":  return `${minute} ${hour} * * ${day ? DAY_CRON_INDEX[day] : 1}`;
    case "monthly": return `${minute} ${hour} ${dayOfMonth ?? 1} * *`;
    default:        return "* * * * *"; // event-driven — cron irrelevant
  }
}

// ---------------------------------------------------------------------------
// Next-run calculator (client-side approximation)
// ---------------------------------------------------------------------------

export function computeNextRun(cron: string, type: ScheduleType): string {
  const now = new Date();
  if (type === "webhook" || type === "file_upload" || type === "event") {
    return "On trigger";
  }
  const parts = cron.split(" ");
  if (parts.length < 5) return "—";
  const minute = parseInt(parts[0], 10);
  const hour   = parseInt(parts[1], 10);

  const next = new Date(now);
  next.setSeconds(0);
  next.setMilliseconds(0);
  next.setMinutes(minute);
  next.setHours(hour);

  if (type === "daily") {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (type === "weekly") {
    const targetDay = parseInt(parts[4], 10);
    const currentDay = next.getDay();
    let daysUntil = (targetDay - currentDay + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
  } else if (type === "monthly") {
    const targetDate = parseInt(parts[2], 10);
    next.setDate(targetDate);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDate);
    }
  }

  return next.toISOString();
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

function ago(days: number, hours = 0): string {
  return new Date(Date.now() - (days * 86_400_000 + hours * 3_600_000)).toISOString();
}

function fromNow(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

export const MOCK_SCHEDULES: Schedule[] = [
  {
    id: "sch-1",
    user_id: "u1",
    agent_id: "trending-1",
    agent_name: "ResearchBot Pro",
    name: "Daily Research Digest",
    type: "daily",
    cron_expression: "0 9 * * *",
    time: "09:00",
    input_data: { topic: "AI industry news", depth: "comprehensive", language: "en" },
    output_actions: ["email", "dashboard"],
    retry_count: 0,
    max_retries: 3,
    status: "active",
    next_run: fromNow(14),
    last_run: ago(0, 10),
    last_run_status: "success",
    last_run_duration_ms: 8_420,
    total_runs: 47,
    total_successes: 46,
    total_failures: 1,
    created_at: ago(47),
    updated_at: ago(2),
  },
  {
    id: "sch-2",
    user_id: "u1",
    agent_id: "trending-2",
    agent_name: "CampaignCraft AI",
    name: "Weekly Marketing Report",
    type: "weekly",
    cron_expression: "0 8 * * 1",
    time: "08:00",
    day: "monday",
    input_data: { campaigns: "all", period: "last_7_days", format: "executive" },
    output_actions: ["email", "dashboard", "database"],
    retry_count: 0,
    max_retries: 3,
    status: "active",
    next_run: fromNow(72),
    last_run: ago(7),
    last_run_status: "success",
    last_run_duration_ms: 14_200,
    total_runs: 12,
    total_successes: 12,
    total_failures: 0,
    created_at: ago(84),
    updated_at: ago(7),
  },
  {
    id: "sch-3",
    user_id: "u1",
    agent_id: "trending-3",
    agent_name: "DataSynth",
    name: "GitHub Push Webhook",
    type: "webhook",
    cron_expression: "* * * * *",
    time: "00:00",
    webhook_url: "https://api.omip.io/webhooks/sch-3/trigger",
    webhook_secret: "whs_•••••••••••",
    input_data: { dataset: "user_events", rows: "1000", schema: "auto" },
    output_actions: ["database", "dashboard"],
    retry_count: 1,
    max_retries: 5,
    status: "active",
    last_run: ago(0, 2),
    last_run_status: "success",
    last_run_duration_ms: 3_100,
    total_runs: 89,
    total_successes: 87,
    total_failures: 2,
    created_at: ago(30),
    updated_at: ago(0, 2),
  },
  {
    id: "sch-4",
    user_id: "u1",
    agent_id: "trending-4",
    agent_name: "CodeReviewer Agent",
    name: "Nightly Code Audit",
    type: "daily",
    cron_expression: "0 2 * * *",
    time: "02:00",
    input_data: { repo: "omip/frontend", branch: "main", severity: "high" },
    output_actions: ["email", "dashboard"],
    retry_count: 3,
    max_retries: 3,
    status: "failed",
    last_run: ago(0, 1),
    last_run_status: "failed",
    last_run_duration_ms: 30_000,
    total_runs: 21,
    total_successes: 18,
    total_failures: 3,
    created_at: ago(21),
    updated_at: ago(0, 1),
  },
  {
    id: "sch-5",
    user_id: "u1",
    agent_id: "trending-5",
    agent_name: "EmailBlast Pro",
    name: "Monthly Newsletter",
    type: "monthly",
    cron_expression: "0 10 1 * *",
    time: "10:00",
    day_of_month: 1,
    input_data: { template: "newsletter_v3", segment: "all_subscribers", preview_text: "auto" },
    output_actions: ["dashboard"],
    retry_count: 0,
    max_retries: 3,
    status: "paused",
    next_run: fromNow(480),
    last_run: ago(9),
    last_run_status: "success",
    last_run_duration_ms: 22_800,
    total_runs: 3,
    total_successes: 3,
    total_failures: 0,
    created_at: ago(90),
    updated_at: ago(5),
  },
];

// Mock run history for sch-1
export const MOCK_SCHEDULE_RUNS: ScheduleRun[] = [
  {
    id: "run-1a",
    schedule_id: "sch-1",
    agent_id: "trending-1",
    started_at: ago(0, 10),
    completed_at: new Date(Date.now() - 10 * 3600_000 + 8420).toISOString(),
    status: "success",
    duration_ms: 8_420,
    retry_attempt: 0,
    output_summary: "Generated 2,400-word research digest on AI industry trends. 14 sources cited.",
    logs: [
      { timestamp: ago(0, 10), level: "info",    message: "Job started by scheduler (cron: 0 9 * * *)" },
      { timestamp: ago(0, 10), level: "info",    message: "Queued in BullMQ worker pool" },
      { timestamp: ago(0, 10), level: "info",    message: "Agent execution started" },
      { timestamp: ago(0, 10), level: "info",    message: "Fetching 14 news sources..." },
      { timestamp: ago(0, 10), level: "success", message: "Research complete — 2,400 words generated" },
      { timestamp: ago(0, 10), level: "info",    message: "Output action: email sent to user@omip.io" },
      { timestamp: ago(0, 10), level: "info",    message: "Output action: saved to dashboard run history" },
      { timestamp: ago(0, 10), level: "success", message: "Job completed in 8.42s" },
    ],
  },
  {
    id: "run-1b",
    schedule_id: "sch-1",
    agent_id: "trending-1",
    started_at: ago(1, 10),
    completed_at: new Date(Date.now() - 34 * 3600_000 + 9100).toISOString(),
    status: "success",
    duration_ms: 9_100,
    retry_attempt: 0,
    output_summary: "Research digest on AI regulation trends. 11 sources cited.",
    logs: [
      { timestamp: ago(1, 10), level: "info",    message: "Job started by scheduler" },
      { timestamp: ago(1, 10), level: "success", message: "Job completed in 9.1s" },
    ],
  },
  {
    id: "run-1c",
    schedule_id: "sch-1",
    agent_id: "trending-1",
    started_at: ago(5, 10),
    completed_at: new Date(Date.now() - 5 * 86_400_000 - 10 * 3600_000 + 30000).toISOString(),
    status: "failed",
    duration_ms: 30_000,
    retry_attempt: 2,
    error_message: "OpenAI API timeout after 30s — max retries reached (3/3)",
    logs: [
      { timestamp: ago(5, 10), level: "info",  message: "Job started by scheduler" },
      { timestamp: ago(5, 10), level: "warn",  message: "API call timeout (attempt 1/3) — retrying in 5s" },
      { timestamp: ago(5, 10), level: "warn",  message: "API call timeout (attempt 2/3) — retrying in 5s" },
      { timestamp: ago(5, 10), level: "error", message: "API call timeout (attempt 3/3) — job failed" },
      { timestamp: ago(5, 10), level: "info",  message: "Failure notification sent to user" },
    ],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function formatScheduleType(type: ScheduleType, day?: DayOfWeek, dayOfMonth?: number): string {
  switch (type) {
    case "daily":       return "Every day";
    case "weekly":      return day ? `Every ${day.charAt(0).toUpperCase() + day.slice(1)}` : "Weekly";
    case "monthly":     return dayOfMonth ? `Monthly on the ${ordinal(dayOfMonth)}` : "Monthly";
    case "webhook":     return "Webhook trigger";
    case "file_upload": return "File upload trigger";
    case "event":       return "Event trigger";
  }
}

function ordinal(n: number): string {
  const s = ["th","st","nd","rd"];
  const v = n % 100;
  return n + (s[(v-20)%10] || s[v] || s[0]);
}

export function formatDuration(ms?: number): string {
  if (!ms) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatNextRun(iso?: string): string {
  if (!iso) return "—";
  if (iso === "On trigger") return "On trigger";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  if (diffMs < 0) return "Overdue";
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `in ${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `in ${diffDay}d`;
}

export function formatLastRun(iso?: string): string {
  if (!iso) return "Never";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

export function successRate(s: Schedule): number {
  if (s.total_runs === 0) return 0;
  return Math.round((s.total_successes / s.total_runs) * 100);
}
