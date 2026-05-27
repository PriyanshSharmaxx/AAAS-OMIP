// ─── Types ────────────────────────────────────────────────────────────────────

export type TeamRole = "admin" | "editor" | "viewer";
export type TeamPlan = "free" | "pro" | "enterprise";
export type MemberStatus = "active" | "pending" | "inactive";
export type ResourceType = "agent" | "member" | "workflow" | "branch" | "permission" | "billing";
export type PermissionAction = "view" | "edit" | "execute" | "publish";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  joined_at: string;
  last_active: string;
  status: MemberStatus;
  contributions: number;   // number of commits / edits
  agents_created: number;
}

export interface ResourcePermission {
  resource_id: string;
  resource_name: string;
  resource_type: "agent" | "workflow";
  actions: PermissionAction[];
}

export interface TeamAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  owner_id: string;
  owner_name: string;
  branch: string;
  version: string;
  status: "active" | "draft" | "archived";
  last_edited_by: string;
  last_edited_at: string;
  run_count: number;
  permissions: Record<TeamRole, PermissionAction[]>;
}

export interface TeamActivityLog {
  id: string;
  member_id: string;
  member_name: string;
  member_role: TeamRole;
  action: string;
  action_type: "create" | "edit" | "delete" | "publish" | "invite" | "run" | "rollback" | "merge" | "permission";
  resource_type: ResourceType;
  resource_name: string;
  timestamp: string;
  details?: string;
}

export interface TeamStats {
  total_agents: number;
  active_agents: number;
  total_runs: number;
  runs_this_week: number;
  success_rate: number;
  total_commits: number;
  open_merge_requests: number;
}

export interface Team {
  id: string;
  name: string;
  description: string;
  avatar_letter: string;
  avatar_color: string;
  created_at: string;
  plan: TeamPlan;
  members: TeamMember[];
  agents: TeamAgent[];
  activity_logs: TeamActivityLog[];
  stats: TeamStats;
  settings: {
    require_review_for_publish: boolean;
    allow_public_agents: boolean;
    two_factor_required: boolean;
    default_branch_protection: boolean;
  };
}

// ─── Role config ──────────────────────────────────────────────────────────────

export const ROLE_CONFIG: Record<TeamRole, {
  label: string;
  color: string;
  bgColor: string;
  permissions: PermissionAction[];
  description: string;
}> = {
  admin: {
    label: "Admin",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    permissions: ["view", "edit", "execute", "publish"],
    description: "Full control — manage billing, members, and all agents",
  },
  editor: {
    label: "Editor",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-500/10",
    permissions: ["view", "edit", "execute"],
    description: "Create and edit agents and workflows",
  },
  viewer: {
    label: "Viewer",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-500/10",
    permissions: ["view"],
    description: "Read-only access to all team resources",
  },
};

export const ACTION_TYPE_CONFIG: Record<TeamActivityLog["action_type"], { color: string; icon: string }> = {
  create:     { color: "text-green-600 dark:text-green-400",  icon: "+" },
  edit:       { color: "text-blue-600 dark:text-blue-400",    icon: "✎" },
  delete:     { color: "text-red-500",                         icon: "✕" },
  publish:    { color: "text-primary",                         icon: "↑" },
  invite:     { color: "text-violet-600 dark:text-violet-400", icon: "✉" },
  run:        { color: "text-amber-600 dark:text-amber-400",   icon: "▶" },
  rollback:   { color: "text-orange-600 dark:text-orange-400", icon: "↩" },
  merge:      { color: "text-cyan-600 dark:text-cyan-400",     icon: "⤙" },
  permission: { color: "text-slate-600 dark:text-slate-400",   icon: "⚙" },
};

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_TEAM: Team = {
  id: "team-001",
  name: "Omip Alpha Team",
  description: "Core product team building the next generation of AI agents on the Omip platform.",
  avatar_letter: "O",
  avatar_color: "bg-primary/15 text-primary",
  created_at: "2025-01-15T00:00:00Z",
  plan: "pro",
  settings: {
    require_review_for_publish: true,
    allow_public_agents: true,
    two_factor_required: false,
    default_branch_protection: true,
  },
  stats: {
    total_agents: 9,
    active_agents: 7,
    total_runs: 1847,
    runs_this_week: 312,
    success_rate: 0.962,
    total_commits: 84,
    open_merge_requests: 2,
  },
  members: [
    {
      id: "m-001",
      name: "Alex Rivera",
      email: "alex@example.com",
      role: "admin",
      joined_at: "2025-01-15T00:00:00Z",
      last_active: "2025-03-29T09:15:00Z",
      status: "active",
      contributions: 38,
      agents_created: 4,
    },
    {
      id: "m-002",
      name: "Jamie Chen",
      email: "jamie@example.com",
      role: "editor",
      joined_at: "2025-01-20T00:00:00Z",
      last_active: "2025-03-28T17:45:00Z",
      status: "active",
      contributions: 24,
      agents_created: 3,
    },
    {
      id: "m-003",
      name: "Sam Patel",
      email: "sam@example.com",
      role: "editor",
      joined_at: "2025-02-05T00:00:00Z",
      last_active: "2025-03-27T11:30:00Z",
      status: "active",
      contributions: 16,
      agents_created: 2,
    },
    {
      id: "m-004",
      name: "Jordan Wu",
      email: "jordan@example.com",
      role: "viewer",
      joined_at: "2025-02-18T00:00:00Z",
      last_active: "2025-03-25T14:00:00Z",
      status: "active",
      contributions: 4,
      agents_created: 0,
    },
    {
      id: "m-005",
      name: "Taylor Kim",
      email: "taylor@example.com",
      role: "editor",
      joined_at: "2025-03-01T00:00:00Z",
      last_active: "2025-03-20T09:00:00Z",
      status: "pending",
      contributions: 0,
      agents_created: 0,
    },
  ],
  agents: [
    {
      id: "ta-001",
      name: "ResearchBot Pro",
      description: "Web research and summarization agent with citation support.",
      category: "Research",
      owner_id: "m-001",
      owner_name: "Alex Rivera",
      branch: "main",
      version: "v2.1",
      status: "active",
      last_edited_by: "Alex Rivera",
      last_edited_at: "2025-03-29T10:30:00Z",
      run_count: 412,
      permissions: {
        admin:  ["view", "edit", "execute", "publish"],
        editor: ["view", "edit", "execute"],
        viewer: ["view"],
      },
    },
    {
      id: "ta-002",
      name: "CodeReview AI",
      description: "Automated code review with issue detection and PR comments.",
      category: "Development",
      owner_id: "m-002",
      owner_name: "Jamie Chen",
      branch: "main",
      version: "v1.4",
      status: "active",
      last_edited_by: "Jamie Chen",
      last_edited_at: "2025-03-25T11:10:00Z",
      run_count: 688,
      permissions: {
        admin:  ["view", "edit", "execute", "publish"],
        editor: ["view", "edit", "execute"],
        viewer: ["view"],
      },
    },
    {
      id: "ta-003",
      name: "EmailCraft",
      description: "AI-powered email drafting with tone detection.",
      category: "Productivity",
      owner_id: "m-001",
      owner_name: "Alex Rivera",
      branch: "main",
      version: "v1.0",
      status: "active",
      last_edited_by: "Sam Patel",
      last_edited_at: "2025-03-18T15:00:00Z",
      run_count: 294,
      permissions: {
        admin:  ["view", "edit", "execute", "publish"],
        editor: ["view", "edit", "execute"],
        viewer: ["view"],
      },
    },
    {
      id: "ta-004",
      name: "DataPipeline Bot",
      description: "ETL automation agent for structured data processing.",
      category: "Analytics",
      owner_id: "m-003",
      owner_name: "Sam Patel",
      branch: "feature/v2",
      version: "v1.2-beta",
      status: "draft",
      last_edited_by: "Sam Patel",
      last_edited_at: "2025-03-22T08:30:00Z",
      run_count: 47,
      permissions: {
        admin:  ["view", "edit", "execute", "publish"],
        editor: ["view", "edit"],
        viewer: ["view"],
      },
    },
    {
      id: "ta-005",
      name: "SupportBot",
      description: "Customer support triage and response drafting agent.",
      category: "Support",
      owner_id: "m-002",
      owner_name: "Jamie Chen",
      branch: "main",
      version: "v3.0",
      status: "active",
      last_edited_by: "Jamie Chen",
      last_edited_at: "2025-03-29T08:00:00Z",
      run_count: 406,
      permissions: {
        admin:  ["view", "edit", "execute", "publish"],
        editor: ["view", "edit", "execute"],
        viewer: ["view"],
      },
    },
  ],
  activity_logs: [
    { id: "al-001", member_id: "m-001", member_name: "Alex Rivera",  member_role: "admin",  action: "Published ResearchBot Pro v2.1 to marketplace", action_type: "publish",    resource_type: "agent",  resource_name: "ResearchBot Pro",   timestamp: "2025-03-29T10:35:00Z" },
    { id: "al-002", member_id: "m-002", member_name: "Jamie Chen",   member_role: "editor", action: "Committed feat: TypeScript-aware analysis",         action_type: "edit",       resource_type: "agent",  resource_name: "CodeReview AI",     timestamp: "2025-03-25T11:10:00Z" },
    { id: "al-003", member_id: "m-001", member_name: "Alex Rivera",  member_role: "admin",  action: "Invited Taylor Kim as Editor",                       action_type: "invite",     resource_type: "member", resource_name: "Taylor Kim",        timestamp: "2025-03-24T14:00:00Z" },
    { id: "al-004", member_id: "m-003", member_name: "Sam Patel",    member_role: "editor", action: "Created branch feature/v2 for DataPipeline Bot",     action_type: "create",     resource_type: "branch", resource_name: "feature/v2",        timestamp: "2025-03-22T08:30:00Z" },
    { id: "al-005", member_id: "m-002", member_name: "Jamie Chen",   member_role: "editor", action: "Ran CodeReview AI on PR #142",                        action_type: "run",        resource_type: "agent",  resource_name: "CodeReview AI",     timestamp: "2025-03-21T16:20:00Z" },
    { id: "al-006", member_id: "m-001", member_name: "Alex Rivera",  member_role: "admin",  action: "Updated viewer permissions for Jordan Wu",            action_type: "permission", resource_type: "permission", resource_name: "Jordan Wu",      timestamp: "2025-03-20T10:00:00Z" },
    { id: "al-007", member_id: "m-003", member_name: "Sam Patel",    member_role: "editor", action: "Rolled back EmailCraft to v0.9",                      action_type: "rollback",   resource_type: "agent",  resource_name: "EmailCraft",        timestamp: "2025-03-18T15:30:00Z", details: "Reverted to stable version after performance regression" },
    { id: "al-008", member_id: "m-001", member_name: "Alex Rivera",  member_role: "admin",  action: "Merged feature/citation-v2 into main",               action_type: "merge",      resource_type: "branch", resource_name: "feature/citation-v2", timestamp: "2025-03-15T09:50:00Z" },
    { id: "al-009", member_id: "m-002", member_name: "Jamie Chen",   member_role: "editor", action: "Created SupportBot v3.0 agent",                       action_type: "create",     resource_type: "agent",  resource_name: "SupportBot",        timestamp: "2025-03-10T13:00:00Z" },
    { id: "al-010", member_id: "m-004", member_name: "Jordan Wu",    member_role: "viewer", action: "Viewed ResearchBot Pro dashboard",                    action_type: "run",        resource_type: "agent",  resource_name: "ResearchBot Pro",   timestamp: "2025-03-05T11:00:00Z" },
  ],
};

// ─── Helper ───────────────────────────────────────────────────────────────────

export function formatRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}

export function getMemberInitials(name: string): string {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}
