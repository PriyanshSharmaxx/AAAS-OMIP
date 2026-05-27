// ---------------------------------------------------------------------------
// Notification System — Types & Mock Data
// ---------------------------------------------------------------------------

export type NotificationType =
  | "success"
  | "error"
  | "info"
  | "billing"
  | "team"
  | "marketplace";

export type NotificationStatus = "read" | "unread";

export type NotificationFilter = "all" | "errors" | "billing" | "activity";

export interface NotificationEntity {
  type: "agent" | "api" | "run" | "team" | "review";
  id: string;
  label: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  created_at: string;
  entity?: NotificationEntity;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

export const NOTIFICATION_CONFIG: Record<
  NotificationType,
  { label: string; filterKey: NotificationFilter; colorClass: string; bgClass: string }
> = {
  success:     { label: "Success",     filterKey: "activity",  colorClass: "text-emerald-500", bgClass: "bg-emerald-500/10" },
  error:       { label: "Error",       filterKey: "errors",    colorClass: "text-red-500",     bgClass: "bg-red-500/10"     },
  info:        { label: "Info",        filterKey: "activity",  colorClass: "text-blue-500",    bgClass: "bg-blue-500/10"    },
  billing:     { label: "Billing",     filterKey: "billing",   colorClass: "text-amber-500",   bgClass: "bg-amber-500/10"   },
  team:        { label: "Team",        filterKey: "activity",  colorClass: "text-violet-500",  bgClass: "bg-violet-500/10"  },
  marketplace: { label: "Marketplace", filterKey: "activity",  colorClass: "text-cyan-500",    bgClass: "bg-cyan-500/10"    },
};

// ---------------------------------------------------------------------------
// Mock notifications
// ---------------------------------------------------------------------------

function ago(minutes: number): string {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

export const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "n1",
    user_id: "u1",
    type: "success",
    title: "Agent run completed",
    message: "ResearchBot Pro finished processing your query in 12.4s with 98% confidence.",
    status: "unread",
    created_at: ago(2),
    entity: { type: "agent", id: "agent-research-pro", label: "ResearchBot Pro" },
  },
  {
    id: "n2",
    user_id: "u1",
    type: "error",
    title: "Agent execution failed",
    message: "CodeReviewer Agent encountered a timeout after 30s. Check API key validity.",
    status: "unread",
    created_at: ago(8),
    entity: { type: "agent", id: "agent-code-reviewer", label: "CodeReviewer Agent" },
  },
  {
    id: "n3",
    user_id: "u1",
    type: "billing",
    title: "Usage limit at 80%",
    message: "You've used 8,000 / 10,000 API calls this month. Upgrade to avoid interruptions.",
    status: "unread",
    created_at: ago(15),
  },
  {
    id: "n4",
    user_id: "u1",
    type: "team",
    title: "Alex Chen joined your team",
    message: "Alex Chen accepted the invitation and joined as an Editor.",
    status: "unread",
    created_at: ago(42),
    entity: { type: "team", id: "team-1", label: "Omip Dev Team" },
  },
  {
    id: "n5",
    user_id: "u1",
    type: "marketplace",
    title: "New 5-star review",
    message: 'DataSynth received a new 5-star review: "Best automation agent I\'ve used!"',
    status: "read",
    created_at: ago(90),
    entity: { type: "review", id: "review-42", label: "DataSynth" },
  },
  {
    id: "n6",
    user_id: "u1",
    type: "info",
    title: "API key rotated",
    message: "Your OpenAI API key was automatically rotated for security. Update integrations if needed.",
    status: "read",
    created_at: ago(180),
    entity: { type: "api", id: "api-openai", label: "OpenAI Integration" },
  },
  {
    id: "n7",
    user_id: "u1",
    type: "billing",
    title: "Invoice generated",
    message: "Your April invoice for $49.00 (Pro Plan) is ready. View in billing settings.",
    status: "read",
    created_at: ago(1440),
  },
  {
    id: "n8",
    user_id: "u1",
    type: "success",
    title: "DataSynth API purchased",
    message: "A user purchased access to your DataSynth API — $9.99 added to your revenue.",
    status: "read",
    created_at: ago(2880),
    entity: { type: "api", id: "api-datasynth", label: "DataSynth API" },
  },
  {
    id: "n9",
    user_id: "u1",
    type: "error",
    title: "Deployment build failed",
    message: "SentimentScanner v2.1.0 build failed: missing environment variable OPENAI_KEY.",
    status: "read",
    created_at: ago(4320),
    entity: { type: "agent", id: "agent-sentiment", label: "SentimentScanner" },
  },
  {
    id: "n10",
    user_id: "u1",
    type: "team",
    title: "Agent shared with team",
    message: "Maria G. shared ResearchBot Pro with your team Workspace.",
    status: "read",
    created_at: ago(7200),
    entity: { type: "agent", id: "agent-research-pro", label: "ResearchBot Pro" },
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function filterNotifications(
  notifications: Notification[],
  filter: NotificationFilter,
): Notification[] {
  if (filter === "all") return notifications;
  return notifications.filter(
    (n) => NOTIFICATION_CONFIG[n.type].filterKey === filter,
  );
}

export function formatRelativeTime(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
