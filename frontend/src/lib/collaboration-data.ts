// ─── Types ────────────────────────────────────────────────────────────────────

export type NodeType = "input" | "agent" | "output" | "condition" | "delay";
export type ExecutionMode = "sequential" | "parallel";
export type WorkflowStatus = "draft" | "active" | "running" | "completed" | "failed";
export type AgentRole = "researcher" | "writer" | "executor" | "reviewer" | "coordinator";

export interface NodePosition {
  x: number;
  y: number;
}

export interface WorkflowNode {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  agentId?: string;
  position: NodePosition;
  config: {
    model?: string;
    temperature?: number;
    max_tokens?: number;
    timeout?: number;
    retry?: number;
    input_key?: string;
    output_key?: string;
    condition?: string;
    delay_ms?: number;
  };
}

export interface WorkflowEdge {
  id: string;
  sourceId: string;
  targetId: string;
  label?: string;
  dataKey?: string;
}

export interface WorkflowRun {
  id: string;
  started_at: string;
  completed_at?: string;
  status: "running" | "completed" | "failed";
  nodes_completed: number;
  nodes_total: number;
  output?: Record<string, unknown>;
  error?: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: WorkflowStatus;
  mode: ExecutionMode;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  created_at: string;
  updated_at: string;
  last_run?: string;
  run_count: number;
  success_rate: number;
  creator: string;
  tags: string[];
  estimated_duration_s: number;
}

export interface AgentTeamMember {
  agentId: string;
  agentName: string;
  role: AgentRole;
  category: string;
  description: string;
}

export interface AgentTeam {
  id: string;
  name: string;
  description: string;
  members: AgentTeamMember[];
  sharedContext: string;
  created_at: string;
}

// ─── Mock workflows ───────────────────────────────────────────────────────────

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: "wf-001",
    name: "Research → Write → Publish",
    description: "Automated content pipeline: research a topic, draft an article, then publish to CMS.",
    status: "active",
    mode: "sequential",
    run_count: 47,
    success_rate: 0.94,
    estimated_duration_s: 45,
    creator: "Demo User",
    tags: ["content", "research", "publishing"],
    created_at: "2025-03-10T10:00:00Z",
    updated_at: "2025-03-28T14:22:00Z",
    last_run: "2025-03-28T14:22:00Z",
    nodes: [
      {
        id: "n1",
        type: "input",
        label: "Topic Input",
        description: "User provides a research topic",
        position: { x: 80, y: 160 },
        config: { input_key: "topic" },
      },
      {
        id: "n2",
        type: "agent",
        label: "Research Agent",
        description: "Gathers data, sources, and insights",
        agentId: "research-agent-01",
        position: { x: 280, y: 160 },
        config: { model: "gpt-4o", temperature: 0.3, max_tokens: 4096, retry: 2 },
      },
      {
        id: "n3",
        type: "agent",
        label: "Writing Agent",
        description: "Transforms research into polished prose",
        agentId: "writing-agent-01",
        position: { x: 490, y: 160 },
        config: { model: "gpt-4o", temperature: 0.7, max_tokens: 8192, retry: 1 },
      },
      {
        id: "n4",
        type: "agent",
        label: "Email Agent",
        description: "Sends the article to subscribers via email",
        agentId: "email-agent-01",
        position: { x: 700, y: 160 },
        config: { model: "gpt-4o-mini", temperature: 0.2, retry: 3 },
      },
      {
        id: "n5",
        type: "output",
        label: "Published",
        description: "Article published and emailed",
        position: { x: 900, y: 160 },
        config: { output_key: "publish_url" },
      },
    ],
    edges: [
      { id: "e1", sourceId: "n1", targetId: "n2", dataKey: "topic" },
      { id: "e2", sourceId: "n2", targetId: "n3", dataKey: "research_output" },
      { id: "e3", sourceId: "n3", targetId: "n4", dataKey: "article_draft" },
      { id: "e4", sourceId: "n4", targetId: "n5", dataKey: "send_result" },
    ],
  },
  {
    id: "wf-002",
    name: "Code Review Pipeline",
    description: "Analyze a PR, generate review comments, and post them to GitHub.",
    status: "active",
    mode: "sequential",
    run_count: 128,
    success_rate: 0.97,
    estimated_duration_s: 30,
    creator: "Demo Creator",
    tags: ["dev", "code-review", "github"],
    created_at: "2025-02-20T08:00:00Z",
    updated_at: "2025-03-25T11:10:00Z",
    last_run: "2025-03-25T11:10:00Z",
    nodes: [
      {
        id: "n1",
        type: "input",
        label: "PR URL",
        description: "GitHub PR link",
        position: { x: 80, y: 160 },
        config: { input_key: "pr_url" },
      },
      {
        id: "n2",
        type: "agent",
        label: "Code Analyzer",
        description: "Reads diff, identifies issues",
        agentId: "code-analyzer-01",
        position: { x: 290, y: 160 },
        config: { model: "gpt-4o", temperature: 0.1, max_tokens: 8192, retry: 2 },
      },
      {
        id: "n3",
        type: "agent",
        label: "Review Writer",
        description: "Generates actionable review comments",
        agentId: "review-writer-01",
        position: { x: 500, y: 160 },
        config: { model: "gpt-4o", temperature: 0.4, max_tokens: 4096 },
      },
      {
        id: "n4",
        type: "output",
        label: "GitHub Comment",
        description: "Review posted to PR",
        position: { x: 710, y: 160 },
        config: { output_key: "comment_url" },
      },
    ],
    edges: [
      { id: "e1", sourceId: "n1", targetId: "n2" },
      { id: "e2", sourceId: "n2", targetId: "n3" },
      { id: "e3", sourceId: "n3", targetId: "n4" },
    ],
  },
  {
    id: "wf-003",
    name: "Market Intelligence Report",
    description: "Scrape market data, analyse trends, and generate a PDF report.",
    status: "draft",
    mode: "parallel",
    run_count: 8,
    success_rate: 0.875,
    estimated_duration_s: 90,
    creator: "Demo User",
    tags: ["research", "analytics", "report"],
    created_at: "2025-03-18T16:00:00Z",
    updated_at: "2025-03-26T09:00:00Z",
    nodes: [
      {
        id: "n1",
        type: "input",
        label: "Market Sector",
        description: "Target industry/sector",
        position: { x: 80, y: 200 },
        config: { input_key: "sector" },
      },
      {
        id: "n2",
        type: "agent",
        label: "Data Scraper",
        description: "Gathers real-time market data",
        agentId: "scraper-agent-01",
        position: { x: 300, y: 100 },
        config: { model: "gpt-4o", temperature: 0.1, retry: 3 },
      },
      {
        id: "n3",
        type: "agent",
        label: "Trend Analyst",
        description: "Identifies patterns and predictions",
        agentId: "analyst-agent-01",
        position: { x: 300, y: 300 },
        config: { model: "gpt-4o", temperature: 0.2, retry: 2 },
      },
      {
        id: "n4",
        type: "agent",
        label: "Report Generator",
        description: "Compiles data into a professional PDF",
        agentId: "report-agent-01",
        position: { x: 530, y: 200 },
        config: { model: "gpt-4o", temperature: 0.3, max_tokens: 16384 },
      },
      {
        id: "n5",
        type: "output",
        label: "PDF Report",
        description: "Final market intelligence document",
        position: { x: 750, y: 200 },
        config: { output_key: "report_url" },
      },
    ],
    edges: [
      { id: "e1", sourceId: "n1", targetId: "n2" },
      { id: "e2", sourceId: "n1", targetId: "n3" },
      { id: "e3", sourceId: "n2", targetId: "n4" },
      { id: "e4", sourceId: "n3", targetId: "n4" },
      { id: "e5", sourceId: "n4", targetId: "n5" },
    ],
  },
  {
    id: "wf-004",
    name: "Customer Support Triage",
    description: "Classify incoming tickets, route to correct agent, and draft reply.",
    status: "active",
    mode: "sequential",
    run_count: 312,
    success_rate: 0.99,
    estimated_duration_s: 12,
    creator: "Demo Creator",
    tags: ["support", "automation", "crm"],
    created_at: "2025-01-15T12:00:00Z",
    updated_at: "2025-03-29T08:00:00Z",
    last_run: "2025-03-29T08:00:00Z",
    nodes: [
      {
        id: "n1",
        type: "input",
        label: "Ticket",
        description: "Customer support ticket text",
        position: { x: 80, y: 160 },
        config: { input_key: "ticket_text" },
      },
      {
        id: "n2",
        type: "agent",
        label: "Classifier",
        description: "Detects category, urgency, sentiment",
        agentId: "classifier-agent-01",
        position: { x: 280, y: 160 },
        config: { model: "gpt-4o-mini", temperature: 0.0, retry: 2 },
      },
      {
        id: "n3",
        type: "condition",
        label: "Urgency Check",
        description: "Route by urgency level",
        position: { x: 480, y: 160 },
        config: { condition: "urgency === 'high'" },
      },
      {
        id: "n4",
        type: "agent",
        label: "Support Writer",
        description: "Drafts empathetic resolution reply",
        agentId: "support-writer-01",
        position: { x: 680, y: 160 },
        config: { model: "gpt-4o", temperature: 0.5, max_tokens: 2048 },
      },
      {
        id: "n5",
        type: "output",
        label: "Reply Sent",
        description: "Draft reply ready for human review",
        position: { x: 880, y: 160 },
        config: { output_key: "draft_reply" },
      },
    ],
    edges: [
      { id: "e1", sourceId: "n1", targetId: "n2" },
      { id: "e2", sourceId: "n2", targetId: "n3" },
      { id: "e3", sourceId: "n3", targetId: "n4" },
      { id: "e4", sourceId: "n4", targetId: "n5" },
    ],
  },
];

// ─── Mock agent teams ─────────────────────────────────────────────────────────

export const MOCK_TEAMS: AgentTeam[] = [
  {
    id: "team-001",
    name: "Content Studio",
    description: "A crew of agents that researches, writes, edits, and publishes long-form content.",
    sharedContext: "content_type=blog&tone=professional&language=en",
    created_at: "2025-03-01T00:00:00Z",
    members: [
      { agentId: "research-agent-01", agentName: "ResearchBot", role: "researcher", category: "Research", description: "Gathers citations, facts, and source material." },
      { agentId: "writing-agent-01", agentName: "WriteGPT", role: "writer", category: "Productivity", description: "Turns research into compelling prose." },
      { agentId: "review-agent-01", agentName: "EditorAI", role: "reviewer", category: "Productivity", description: "Proofreads and improves clarity." },
      { agentId: "email-agent-01", agentName: "SendBot", role: "executor", category: "Automation", description: "Publishes and distributes final content." },
    ],
  },
  {
    id: "team-002",
    name: "Dev Ops Crew",
    description: "Automates code review, testing, deployment, and monitoring.",
    sharedContext: "repo=github&language=typescript&ci=github_actions",
    created_at: "2025-02-14T00:00:00Z",
    members: [
      { agentId: "code-analyzer-01", agentName: "CodeScan", role: "researcher", category: "Development", description: "Reads and understands the codebase." },
      { agentId: "review-writer-01", agentName: "ReviewGPT", role: "writer", category: "Development", description: "Writes review comments and suggestions." },
      { agentId: "deploy-agent-01", agentName: "DeployBot", role: "executor", category: "DevOps", description: "Triggers CI/CD pipelines and monitors rollout." },
    ],
  },
];

// ─── Node type config ─────────────────────────────────────────────────────────

export const NODE_TYPE_CONFIG: Record<NodeType, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  input: {
    label: "Input",
    color: "text-sky-600 dark:text-sky-400",
    bgColor: "bg-sky-500/10",
    borderColor: "border-sky-400/40",
    description: "Entry point — receives external data",
  },
  agent: {
    label: "Agent",
    color: "text-violet-600 dark:text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-400/40",
    description: "AI agent that processes and transforms data",
  },
  output: {
    label: "Output",
    color: "text-emerald-600 dark:text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-400/40",
    description: "Final result or downstream action",
  },
  condition: {
    label: "Condition",
    color: "text-amber-600 dark:text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-400/40",
    description: "Conditional branch based on data value",
  },
  delay: {
    label: "Delay",
    color: "text-slate-600 dark:text-slate-400",
    bgColor: "bg-slate-500/10",
    borderColor: "border-slate-400/40",
    description: "Wait before passing data downstream",
  },
};

export const STATUS_CONFIG: Record<WorkflowStatus, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground" },
  active:    { label: "Active",    color: "bg-green-500/15 text-green-600 dark:text-green-400" },
  running:   { label: "Running",   color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  completed: { label: "Completed", color: "bg-primary/15 text-primary" },
  failed:    { label: "Failed",    color: "bg-red-500/15 text-red-500" },
};

export const ROLE_CONFIG: Record<AgentRole, { color: string; icon: string }> = {
  researcher:  { color: "bg-sky-500/10 text-sky-600 dark:text-sky-400",      icon: "🔍" },
  writer:      { color: "bg-violet-500/10 text-violet-600 dark:text-violet-400", icon: "✍️" },
  executor:    { color: "bg-green-500/10 text-green-600 dark:text-green-400",   icon: "⚡" },
  reviewer:    { color: "bg-amber-500/10 text-amber-600 dark:text-amber-400",   icon: "👁️" },
  coordinator: { color: "bg-pink-500/10 text-pink-600 dark:text-pink-400",      icon: "🎯" },
};
