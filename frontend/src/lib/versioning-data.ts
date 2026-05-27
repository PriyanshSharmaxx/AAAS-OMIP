// ─── Types ────────────────────────────────────────────────────────────────────

export type VersionStatus = "draft" | "stable" | "archived" | "published";
export type BranchType = "main" | "feature" | "experimental" | "hotfix";

export interface AgentSnapshot {
  prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  tools: string[];
  apis: string[];
  config: Record<string, string | number | boolean>;
}

export interface DiffSummary {
  prompt_changed: boolean;
  prompt_change_pct: number;       // % of lines changed
  tools_added: string[];
  tools_removed: string[];
  apis_added: string[];
  apis_removed: string[];
  config_changed: string[];
  model_changed: boolean;
}

export interface AgentCommit {
  id: string;
  short_id: string;
  branch: string;
  agent_id: string;
  author: string;
  author_email: string;
  message: string;
  timestamp: string;
  snapshot: AgentSnapshot;
  parent_id?: string;
  tags: string[];
  status: VersionStatus;
  diff: DiffSummary;
  size_bytes: number;
  approved_by?: string;
}

export interface AgentBranch {
  name: string;
  type: BranchType;
  head_commit_id: string;
  created_by: string;
  created_at: string;
  is_protected: boolean;
  description: string;
  commits_ahead: number;
  commits_behind: number;
}

export interface MergeRequest {
  id: string;
  title: string;
  from_branch: string;
  to_branch: string;
  author: string;
  status: "open" | "merged" | "closed" | "conflicted";
  created_at: string;
  conflicts: string[];
}

export interface VersionedAgent {
  id: string;
  name: string;
  description: string;
  category: string;
  current_branch: string;
  branches: AgentBranch[];
  commits: AgentCommit[];
  merge_requests: MergeRequest[];
  total_versions: number;
  last_commit_at: string;
  contributors: string[];
}

// ─── Mock snapshot helpers ────────────────────────────────────────────────────

const BASE_PROMPT_V1 = `You are a research assistant. Your job is to:
1. Search the web for relevant sources
2. Summarize findings clearly
3. Cite all references

Be concise and factual. Do not hallucinate.`;

const BASE_PROMPT_V2 = `You are an expert research assistant with access to web search.
Your responsibilities:
1. Conduct thorough web searches using multiple queries
2. Cross-reference information from different sources
3. Produce structured summaries with clear headings
4. Cite all references with URLs and access dates
5. Flag any conflicting information

Maintain a neutral, academic tone. Accuracy over speed.`;

const BASE_PROMPT_V3 = `You are an expert research assistant with web search capabilities.
Your responsibilities:
1. Conduct thorough, multi-query web searches
2. Cross-reference and validate information from 3+ sources
3. Produce structured reports with executive summary, key findings, and references
4. Cite all sources with URLs, authors, and publication dates
5. Flag conflicting information and provide balanced analysis
6. Estimate source credibility and recency

Maintain academic tone. Prioritize accuracy and completeness.`;

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_VERSIONED_AGENTS: VersionedAgent[] = [
  {
    id: "agent-001",
    name: "ResearchBot Pro",
    description: "Web research and summarization agent with citation support.",
    category: "Research",
    current_branch: "main",
    total_versions: 8,
    last_commit_at: "2025-03-29T10:30:00Z",
    contributors: ["Demo User", "Demo Creator"],
    merge_requests: [
      {
        id: "mr-001",
        title: "Add multilingual support",
        from_branch: "feature/multilingual",
        to_branch: "main",
        author: "Demo Creator",
        status: "open",
        created_at: "2025-03-28T08:00:00Z",
        conflicts: [],
      },
    ],
    branches: [
      {
        name: "main",
        type: "main",
        head_commit_id: "c8f2a1b",
        created_by: "Demo User",
        created_at: "2025-01-01T00:00:00Z",
        is_protected: true,
        description: "Production-stable branch",
        commits_ahead: 0,
        commits_behind: 0,
      },
      {
        name: "feature/multilingual",
        type: "feature",
        head_commit_id: "d9e3b2c",
        created_by: "Demo Creator",
        created_at: "2025-03-20T00:00:00Z",
        is_protected: false,
        description: "Adding language detection and translation",
        commits_ahead: 2,
        commits_behind: 1,
      },
      {
        name: "experimental/gpt-4o",
        type: "experimental",
        head_commit_id: "a1f4c3d",
        created_by: "Demo User",
        created_at: "2025-03-10T00:00:00Z",
        is_protected: false,
        description: "Testing GPT-4o integration",
        commits_ahead: 1,
        commits_behind: 3,
      },
    ],
    commits: [
      {
        id: "c8f2a1b3d4e5f6a7",
        short_id: "c8f2a1b",
        branch: "main",
        agent_id: "agent-001",
        author: "Demo User",
        author_email: "demo@aas.com",
        message: "feat: improve prompt clarity and add source credibility scoring",
        timestamp: "2025-03-29T10:30:00Z",
        tags: ["v2.1", "production-ready"],
        status: "published",
        parent_id: "b7e1d0a2c3b4e5f6",
        size_bytes: 4280,
        approved_by: "Demo Creator",
        snapshot: {
          prompt: BASE_PROMPT_V3,
          model: "gpt-4o",
          temperature: 0.3,
          max_tokens: 8192,
          tools: ["web_search", "summarizer", "citation_formatter", "credibility_scorer"],
          apis: ["SearchNova", "TranslateX"],
          config: { retry: 2, cache_ttl: 300, streaming: true },
        },
        diff: {
          prompt_changed: true,
          prompt_change_pct: 22,
          tools_added: ["credibility_scorer"],
          tools_removed: [],
          apis_added: [],
          apis_removed: [],
          config_changed: [],
          model_changed: false,
        },
      },
      {
        id: "b7e1d0a2c3b4e5f6",
        short_id: "b7e1d0a",
        branch: "main",
        agent_id: "agent-001",
        author: "Demo Creator",
        author_email: "creator@aas.com",
        message: "feat: upgrade to GPT-4o, add TranslateX API",
        timestamp: "2025-03-22T14:10:00Z",
        tags: ["v2.0"],
        status: "stable",
        parent_id: "a6d0c9b1b2a3d4e5",
        size_bytes: 3940,
        snapshot: {
          prompt: BASE_PROMPT_V2,
          model: "gpt-4o",
          temperature: 0.3,
          max_tokens: 8192,
          tools: ["web_search", "summarizer", "citation_formatter"],
          apis: ["SearchNova", "TranslateX"],
          config: { retry: 2, cache_ttl: 300, streaming: true },
        },
        diff: {
          prompt_changed: true,
          prompt_change_pct: 48,
          tools_added: [],
          tools_removed: [],
          apis_added: ["TranslateX"],
          apis_removed: [],
          config_changed: [],
          model_changed: true,
        },
      },
      {
        id: "a6d0c9b1b2a3d4e5",
        short_id: "a6d0c9b",
        branch: "main",
        agent_id: "agent-001",
        author: "Demo User",
        author_email: "demo@aas.com",
        message: "fix: improve citation accuracy, add retry logic",
        timestamp: "2025-03-15T09:45:00Z",
        tags: [],
        status: "stable",
        parent_id: "9c5e8a0b1a9c8b7a",
        size_bytes: 3610,
        snapshot: {
          prompt: BASE_PROMPT_V2,
          model: "gpt-4o-mini",
          temperature: 0.3,
          max_tokens: 4096,
          tools: ["web_search", "summarizer", "citation_formatter"],
          apis: ["SearchNova"],
          config: { retry: 2, cache_ttl: 300, streaming: false },
        },
        diff: {
          prompt_changed: false,
          prompt_change_pct: 0,
          tools_added: [],
          tools_removed: [],
          apis_added: [],
          apis_removed: [],
          config_changed: ["retry", "streaming"],
          model_changed: false,
        },
      },
      {
        id: "9c5e8a0b1a9c8b7a",
        short_id: "9c5e8a0",
        branch: "main",
        agent_id: "agent-001",
        author: "Demo User",
        author_email: "demo@aas.com",
        message: "feat: add citation formatter tool, SearchNova integration",
        timestamp: "2025-03-05T16:20:00Z",
        tags: ["v1.0"],
        status: "stable",
        parent_id: "8b4d7f9a0b9d8c6b",
        size_bytes: 3200,
        snapshot: {
          prompt: BASE_PROMPT_V1,
          model: "gpt-4o-mini",
          temperature: 0.5,
          max_tokens: 4096,
          tools: ["web_search", "summarizer", "citation_formatter"],
          apis: ["SearchNova"],
          config: { retry: 1, cache_ttl: 0, streaming: false },
        },
        diff: {
          prompt_changed: false,
          prompt_change_pct: 0,
          tools_added: ["citation_formatter"],
          tools_removed: [],
          apis_added: ["SearchNova"],
          apis_removed: [],
          config_changed: [],
          model_changed: false,
        },
      },
      {
        id: "8b4d7f9a0b9d8c6b",
        short_id: "8b4d7f9",
        branch: "main",
        agent_id: "agent-001",
        author: "Demo User",
        author_email: "demo@aas.com",
        message: "init: initial commit",
        timestamp: "2025-01-10T12:00:00Z",
        tags: ["v0.1"],
        status: "archived",
        size_bytes: 1840,
        snapshot: {
          prompt: BASE_PROMPT_V1,
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 2048,
          tools: ["web_search", "summarizer"],
          apis: [],
          config: { retry: 0, cache_ttl: 0, streaming: false },
        },
        diff: {
          prompt_changed: false,
          prompt_change_pct: 0,
          tools_added: ["web_search", "summarizer"],
          tools_removed: [],
          apis_added: [],
          apis_removed: [],
          config_changed: [],
          model_changed: false,
        },
      },
    ],
  },
  {
    id: "agent-002",
    name: "CodeReview AI",
    description: "Automated code review with issue detection and PR comment generation.",
    category: "Development",
    current_branch: "main",
    total_versions: 5,
    last_commit_at: "2025-03-25T11:10:00Z",
    contributors: ["Demo Creator"],
    merge_requests: [],
    branches: [
      {
        name: "main",
        type: "main",
        head_commit_id: "e2c4a6b",
        created_by: "Demo Creator",
        created_at: "2025-02-01T00:00:00Z",
        is_protected: true,
        description: "Production branch",
        commits_ahead: 0,
        commits_behind: 0,
      },
      {
        name: "hotfix/security-scan",
        type: "hotfix",
        head_commit_id: "f3d5b7c",
        created_by: "Demo Creator",
        created_at: "2025-03-24T00:00:00Z",
        is_protected: false,
        description: "Add SAST security scanning capability",
        commits_ahead: 1,
        commits_behind: 0,
      },
    ],
    commits: [
      {
        id: "e2c4a6b8d0f2e4c6",
        short_id: "e2c4a6b",
        branch: "main",
        agent_id: "agent-002",
        author: "Demo Creator",
        author_email: "creator@aas.com",
        message: "feat: add TypeScript-aware analysis, improve PR comment quality",
        timestamp: "2025-03-25T11:10:00Z",
        tags: ["v1.4", "beta"],
        status: "stable",
        parent_id: "d1b3a5c7e9f1d3b5",
        size_bytes: 5120,
        snapshot: {
          prompt: "You are an expert code reviewer specializing in TypeScript, React, and Node.js. Analyze the provided code diff and generate actionable, specific review comments.",
          model: "gpt-4o",
          temperature: 0.1,
          max_tokens: 8192,
          tools: ["code_analyzer", "diff_parser", "pr_commenter", "ts_checker"],
          apis: ["GitHub"],
          config: { retry: 2, streaming: true, language_modes: "ts,js,tsx,jsx" },
        },
        diff: {
          prompt_changed: true,
          prompt_change_pct: 15,
          tools_added: ["ts_checker"],
          tools_removed: [],
          apis_added: [],
          apis_removed: [],
          config_changed: ["language_modes"],
          model_changed: false,
        },
      },
      {
        id: "d1b3a5c7e9f1d3b5",
        short_id: "d1b3a5c",
        branch: "main",
        agent_id: "agent-002",
        author: "Demo Creator",
        author_email: "creator@aas.com",
        message: "fix: reduce false positives in security analysis",
        timestamp: "2025-03-10T09:00:00Z",
        tags: ["v1.3"],
        status: "stable",
        parent_id: "c0a2b4d6f8e0c2a4",
        size_bytes: 4800,
        snapshot: {
          prompt: "You are an expert code reviewer. Analyze the provided code diff and generate actionable review comments.",
          model: "gpt-4o",
          temperature: 0.1,
          max_tokens: 8192,
          tools: ["code_analyzer", "diff_parser", "pr_commenter"],
          apis: ["GitHub"],
          config: { retry: 2, streaming: true, language_modes: "js,ts" },
        },
        diff: {
          prompt_changed: false,
          prompt_change_pct: 0,
          tools_added: [],
          tools_removed: [],
          apis_added: [],
          apis_removed: [],
          config_changed: [],
          model_changed: false,
        },
      },
    ],
  },
  {
    id: "agent-003",
    name: "EmailCraft",
    description: "AI-powered email drafting with tone detection and template management.",
    category: "Productivity",
    current_branch: "main",
    total_versions: 3,
    last_commit_at: "2025-03-18T15:00:00Z",
    contributors: ["Demo User"],
    merge_requests: [],
    branches: [
      {
        name: "main",
        type: "main",
        head_commit_id: "f4e6c8a",
        created_by: "Demo User",
        created_at: "2025-03-01T00:00:00Z",
        is_protected: true,
        description: "Main stable branch",
        commits_ahead: 0,
        commits_behind: 0,
      },
    ],
    commits: [
      {
        id: "f4e6c8a0b2d4f6e8",
        short_id: "f4e6c8a",
        branch: "main",
        agent_id: "agent-003",
        author: "Demo User",
        author_email: "demo@aas.com",
        message: "feat: add tone auto-detection, multilingual templates",
        timestamp: "2025-03-18T15:00:00Z",
        tags: ["v1.0", "production-ready"],
        status: "published",
        parent_id: "e3d5b7c9a1e3d5b7",
        size_bytes: 3600,
        snapshot: {
          prompt: "You are an expert email writer. Detect the appropriate tone and craft professional, engaging emails.",
          model: "gpt-4o",
          temperature: 0.7,
          max_tokens: 4096,
          tools: ["tone_detector", "template_engine", "email_formatter"],
          apis: ["TranslateX"],
          config: { retry: 1, streaming: false },
        },
        diff: {
          prompt_changed: true,
          prompt_change_pct: 30,
          tools_added: ["tone_detector"],
          tools_removed: [],
          apis_added: ["TranslateX"],
          apis_removed: [],
          config_changed: [],
          model_changed: true,
        },
      },
    ],
  },
];

// ─── Config ───────────────────────────────────────────────────────────────────

export const VERSION_STATUS_CONFIG: Record<VersionStatus, { label: string; color: string }> = {
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground" },
  stable:    { label: "Stable",    color: "bg-green-500/15 text-green-600 dark:text-green-400" },
  archived:  { label: "Archived",  color: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
  published: { label: "Published", color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
};

export const BRANCH_TYPE_CONFIG: Record<BranchType, { color: string; label: string }> = {
  main:         { color: "text-primary",   label: "Main" },
  feature:      { color: "text-violet-500", label: "Feature" },
  experimental: { color: "text-amber-500", label: "Experimental" },
  hotfix:       { color: "text-red-500",   label: "Hotfix" },
};

// ─── Diff computation ─────────────────────────────────────────────────────────

export interface LineDiff {
  type: "added" | "removed" | "unchanged";
  content: string;
}

export function computePromptDiff(before: string, after: string): LineDiff[] {
  const aLines = before.split("\n");
  const bLines = after.split("\n");
  const result: LineDiff[] = [];

  let ai = 0, bi = 0;
  while (ai < aLines.length || bi < bLines.length) {
    const aLine = aLines[ai];
    const bLine = bLines[bi];
    if (ai >= aLines.length) {
      result.push({ type: "added",   content: bLines[bi++] });
    } else if (bi >= bLines.length) {
      result.push({ type: "removed", content: aLines[ai++] });
    } else if (aLine === bLine) {
      result.push({ type: "unchanged", content: aLine });
      ai++; bi++;
    } else {
      result.push({ type: "removed", content: aLine });
      result.push({ type: "added",   content: bLine });
      ai++; bi++;
    }
  }
  return result;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (days > 0) return `${days}d ago`;
  if (hrs  > 0) return `${hrs}h ago`;
  if (mins > 0) return `${mins}m ago`;
  return "just now";
}
