// ---------------------------------------------------------------------------
// Leaderboard & Social Proof — Types & Mock Data
// ---------------------------------------------------------------------------

export type LeaderboardTab   = "creators" | "agents" | "apis" | "reviews";
export type LeaderboardPeriod = "daily" | "weekly" | "monthly";
export type AgentCategory    = "all" | "marketing" | "development" | "automation" | "research" | "data" | "finance" | "support";

// ---------------------------------------------------------------------------
// Creator stats
// ---------------------------------------------------------------------------

export interface CreatorStat {
  id: string;
  username: string;
  avatar_initials: string;
  avatar_color: string;      // Tailwind bg class
  bio: string;
  total_runs: number;
  revenue_usd: number;
  avg_rating: number;
  agent_count: number;
  review_count: number;
  badges: CreatorBadge[];
  joined: string;            // ISO
  trending: boolean;
  growth_rate: number;       // percentage
  top_categories: string[];
  success_rate: number;      // 0-100
}

export type CreatorBadge = "top_creator" | "top_rated" | "trending" | "verified" | "power_user";

// ---------------------------------------------------------------------------
// Agent stats
// ---------------------------------------------------------------------------

export interface AgentStat {
  id: string;
  name: string;
  description: string;
  category: AgentCategory;
  creator_id: string;
  creator_name: string;
  total_runs: number;
  success_rate: number;   // 0–100
  avg_rating: number;
  review_count: number;
  price_usd: number;       // 0 = free
  trending: boolean;
  top_rated: boolean;
  tags: string[];
  growth_rate: number;       // percentage
  tokens_optimized: boolean;
  last_run: string;          // ISO
}

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export interface AgentReview {
  id: string;
  agent_id: string;
  agent_name: string;
  reviewer_id: string;
  reviewer_name: string;
  reviewer_initials: string;
  rating: number;           // 1–5
  title: string;
  body: string;
  created_at: string;
  helpful_count: number;
  verified_purchase: boolean;
}

// ---------------------------------------------------------------------------
// API Stats
// ---------------------------------------------------------------------------

export interface ApiStat {
  id: string;
  name: string;
  provider: string;
  category: string;
  total_calls: number;
  uptime: number;          // 0-100
  latency_ms: number;
  avg_rating: number;
  price_per_1k: number;    // USD
  trending: boolean;
  is_verified: boolean;
  usage_growth: number;    // percentage
  active_keys: number;
}

// ---------------------------------------------------------------------------
// Config maps
// ---------------------------------------------------------------------------

export const BADGE_CONFIG: Record<CreatorBadge, { label: string; emoji: string; colorClass: string; bgClass: string }> = {
  top_creator: { label: "#1 Creator",  emoji: "🏆", colorClass: "text-amber-600",  bgClass: "bg-amber-500/10"   },
  top_rated:   { label: "Top Rated",   emoji: "⭐", colorClass: "text-yellow-600", bgClass: "bg-yellow-500/10"  },
  trending:    { label: "Trending",    emoji: "🔥", colorClass: "text-orange-600", bgClass: "bg-orange-500/10"  },
  verified:    { label: "Verified",    emoji: "✓",  colorClass: "text-emerald-600",bgClass: "bg-emerald-500/10" },
  power_user:  { label: "Power User",  emoji: "⚡", colorClass: "text-blue-600",   bgClass: "bg-blue-500/10"    },
};

export const PERIOD_LABELS: Record<LeaderboardPeriod, string> = {
  daily:   "Today",
  weekly:  "This Week",
  monthly: "This Month",
};

export const CATEGORY_LABELS: Record<AgentCategory, string> = {
  all:         "All Categories",
  marketing:   "Marketing",
  development: "Development",
  automation:  "Automation",
  research:    "Research",
  data:        "Data & Analytics",
  finance:     "Finance",
  support:     "Customer Support",
};

// ---------------------------------------------------------------------------
// Mock creators
// ---------------------------------------------------------------------------

export const MOCK_CREATORS: CreatorStat[] = [
  {
    id: "c1",
    username: "alexchen_dev",
    avatar_initials: "AC",
    avatar_color: "bg-violet-500",
    bio: "AI agent engineer. Building tools that actually work. 12+ agents published.",
    total_runs: 248_340,
    revenue_usd: 18_920,
    avg_rating: 4.9,
    agent_count: 12,
    review_count: 847,
    badges: ["top_creator", "verified", "trending"],
    joined: "2023-08-14T00:00:00Z",
    trending: true,
    growth_rate: 24.5,
    top_categories: ["Development", "DevOps"],
    success_rate: 98.2,
  },
  {
    id: "c2",
    username: "mariagomez",
    avatar_initials: "MG",
    avatar_color: "bg-pink-500",
    bio: "Marketing automation specialist. Growth hacker. 5M+ emails sent via my agents.",
    total_runs: 197_210,
    revenue_usd: 14_380,
    avg_rating: 4.8,
    agent_count: 8,
    review_count: 623,
    badges: ["top_rated", "verified"],
    joined: "2023-10-02T00:00:00Z",
    trending: false,
    growth_rate: 12.8,
    top_categories: ["Marketing", "Sales"],
    success_rate: 94.5,
  },
  {
    id: "c3",
    username: "rahul_builds",
    avatar_initials: "RB",
    avatar_color: "bg-emerald-500",
    bio: "Full-stack developer turned agent creator. Open-source first.",
    total_runs: 163_540,
    revenue_usd: 9_740,
    avg_rating: 4.7,
    agent_count: 15,
    review_count: 514,
    badges: ["verified", "power_user"],
    joined: "2024-01-18T00:00:00Z",
    trending: true,
    growth_rate: 31.2,
    top_categories: ["Automation", "Productivity"],
    success_rate: 92.8,
  },
  {
    id: "c4",
    username: "datanerds_io",
    avatar_initials: "DN",
    avatar_color: "bg-blue-500",
    bio: "Data pipeline agents for analysts who hate ETL boilerplate.",
    total_runs: 140_890,
    revenue_usd: 21_500,
    avg_rating: 4.6,
    agent_count: 6,
    review_count: 389,
    badges: ["verified"],
    joined: "2023-11-29T00:00:00Z",
    trending: false,
    growth_rate: 8.4,
    top_categories: ["Analytics", "Data"],
    success_rate: 96.1,
  },
  {
    id: "c5",
    username: "nocode_wizard",
    avatar_initials: "NW",
    avatar_color: "bg-amber-500",
    bio: "Making AI accessible. No code required. 50k+ users onboarded.",
    total_runs: 98_300,
    revenue_usd: 6_120,
    avg_rating: 4.5,
    agent_count: 9,
    review_count: 271,
    badges: ["trending"],
    joined: "2024-03-05T00:00:00Z",
    trending: true,
    growth_rate: 45.0,
    top_categories: ["Education", "No-Code"],
    success_rate: 89.4,
  },
  {
    id: "c6",
    username: "llm_labs",
    avatar_initials: "LL",
    avatar_color: "bg-cyan-500",
    bio: "Research-grade agents for serious use cases. Cited in 3 papers.",
    total_runs: 76_420,
    revenue_usd: 12_880,
    avg_rating: 4.8,
    agent_count: 4,
    review_count: 198,
    badges: ["top_rated", "verified"],
    joined: "2024-02-11T00:00:00Z",
    trending: false,
    growth_rate: 15.2,
    top_categories: ["Research", "Academic"],
    success_rate: 99.1,
  },
  {
    id: "c7",
    username: "sarahk_automate",
    avatar_initials: "SK",
    avatar_color: "bg-rose-500",
    bio: "Ops automation for small teams. ex-Zapier engineer.",
    total_runs: 61_040,
    revenue_usd: 4_380,
    avg_rating: 4.4,
    agent_count: 7,
    review_count: 156,
    badges: [],
    joined: "2024-04-22T00:00:00Z",
    trending: false,
    growth_rate: 5.7,
    top_categories: ["Automation", "Operations"],
    success_rate: 91.2,
  },
];

// ---------------------------------------------------------------------------
// Mock agents
// ---------------------------------------------------------------------------

export const MOCK_AGENTS: AgentStat[] = [
  {
    id: "a1",
    name: "ResearchBot Pro",
    description: "Deep web research with source validation, citations, and structured summaries.",
    category: "research",
    creator_id: "c1",
    creator_name: "alexchen_dev",
    total_runs: 89_220,
    success_rate: 97.4,
    avg_rating: 4.9,
    review_count: 342,
    price_usd: 0,
    trending: true,
    top_rated: true,
    tags: ["research", "citations", "GPT-4"],
    growth_rate: 18.2,
    tokens_optimized: true,
    last_run: "2026-04-07T14:10:00Z",
  },
  {
    id: "a2",
    name: "CampaignCraft AI",
    description: "End-to-end marketing campaign creator — briefs, copy, A/B variants, scheduling.",
    category: "marketing",
    creator_id: "c2",
    creator_name: "mariagomez",
    total_runs: 71_800,
    success_rate: 95.1,
    avg_rating: 4.8,
    review_count: 281,
    price_usd: 12,
    trending: true,
    top_rated: false,
    tags: ["marketing", "copywriting", "automation"],
    growth_rate: 34.5,
    tokens_optimized: false,
    last_run: "2026-04-07T13:45:00Z",
  },
  {
    id: "a3",
    name: "DataSynth",
    description: "Generate synthetic datasets with schema validation and distribution control.",
    category: "data",
    creator_id: "c4",
    creator_name: "datanerds_io",
    total_runs: 64_330,
    success_rate: 99.2,
    avg_rating: 4.7,
    review_count: 204,
    price_usd: 9.99,
    trending: false,
    top_rated: true,
    tags: ["data", "ML", "synthetic"],
    growth_rate: 5.8,
    tokens_optimized: true,
    last_run: "2026-04-07T12:30:00Z",
  },
  {
    id: "a4",
    name: "CodeReviewer Agent",
    description: "Automated PR review with security scanning, style guide enforcement, and fixes.",
    category: "development",
    creator_id: "c1",
    creator_name: "alexchen_dev",
    total_runs: 58_940,
    success_rate: 93.7,
    avg_rating: 4.6,
    review_count: 189,
    price_usd: 0,
    trending: false,
    top_rated: false,
    tags: ["code-review", "security", "CI/CD"],
    growth_rate: 12.1,
    tokens_optimized: true,
    last_run: "2026-04-06T10:00:00Z",
  },
  {
    id: "a5",
    name: "EmailBlast Pro",
    description: "Personalized mass email with dynamic variables, tracking, and bounce handling.",
    category: "marketing",
    creator_id: "c2",
    creator_name: "mariagomez",
    total_runs: 52_100,
    success_rate: 96.8,
    avg_rating: 4.7,
    review_count: 167,
    price_usd: 7.99,
    trending: true,
    top_rated: false,
    tags: ["email", "personalization", "SMTP"],
    growth_rate: 22.4,
    tokens_optimized: false,
    last_run: "2026-04-05T09:00:00Z",
  },
  {
    id: "a6",
    name: "AutoReport Builder",
    description: "Pull from any data source, generate PDF/Notion/Slides reports on schedule.",
    category: "automation",
    creator_id: "c3",
    creator_name: "rahul_builds",
    total_runs: 44_780,
    success_rate: 98.1,
    avg_rating: 4.8,
    review_count: 143,
    price_usd: 14.99,
    trending: false,
    top_rated: true,
    tags: ["reporting", "PDF", "automation"],
    growth_rate: 14.8,
    tokens_optimized: true,
    last_run: "2026-04-04T15:30:00Z",
  },
  {
    id: "a7",
    name: "SlackOps Bot",
    description: "Slack command processor — ticket triage, standup collection, release notes.",
    category: "automation",
    creator_id: "c7",
    creator_name: "sarahk_automate",
    total_runs: 38_420,
    success_rate: 94.5,
    avg_rating: 4.5,
    review_count: 112,
    price_usd: 0,
    trending: true,
    top_rated: false,
    tags: ["slack", "operations", "productivity"],
    growth_rate: 31.5,
    tokens_optimized: false,
    last_run: "2026-04-03T11:20:00Z",
  },
  {
    id: "a8",
    name: "LitReview AI",
    description: "Academic literature review — 100+ papers summarized, gap analysis, BibTeX.",
    category: "research",
    creator_id: "c6",
    creator_name: "llm_labs",
    total_runs: 29_610,
    success_rate: 96.3,
    avg_rating: 4.9,
    review_count: 98,
    price_usd: 19.99,
    trending: false,
    top_rated: true,
    tags: ["academic", "research", "literature"],
    growth_rate: 9.2,
    tokens_optimized: true,
    last_run: "2026-04-02T16:45:00Z",
  },
];

// ---------------------------------------------------------------------------
// Mock reviews
// ---------------------------------------------------------------------------

export const MOCK_REVIEWS: AgentReview[] = [
  {
    id: "r1",
    agent_id: "a1",
    agent_name: "ResearchBot Pro",
    reviewer_id: "u10",
    reviewer_name: "Priya S.",
    reviewer_initials: "PS",
    rating: 5,
    title: "Replaced my entire research workflow",
    body: "I used to spend 3 hours on literature reviews. ResearchBot Pro handles it in 8 minutes with proper citations. Absolutely incredible.",
    created_at: "2026-04-07T14:22:00Z",
    helpful_count: 47,
    verified_purchase: true,
  },
  {
    id: "r2",
    agent_id: "a2",
    agent_name: "CampaignCraft AI",
    reviewer_id: "u11",
    reviewer_name: "Tom H.",
    reviewer_initials: "TH",
    rating: 5,
    title: "Best marketing agent I've tested",
    body: "Generated 10 A/B variants for our Black Friday campaign in under a minute. CTR improved 34%. Worth every penny.",
    created_at: "2026-04-06T09:15:00Z",
    helpful_count: 38,
    verified_purchase: true,
  },
  {
    id: "r3",
    agent_id: "a3",
    agent_name: "DataSynth",
    reviewer_id: "u12",
    reviewer_name: "Lena K.",
    reviewer_initials: "LK",
    rating: 5,
    title: "99.2% success rate is not a lie",
    body: "Generated 50,000 synthetic records for our ML pipeline. Schema validated perfectly. Saved us weeks of labeling.",
    created_at: "2026-04-05T17:48:00Z",
    helpful_count: 29,
    verified_purchase: true,
  },
  {
    id: "r4",
    agent_id: "a4",
    agent_name: "CodeReviewer Agent",
    reviewer_id: "u13",
    reviewer_name: "James M.",
    reviewer_initials: "JM",
    rating: 4,
    title: "Solid but misses some edge cases",
    body: "Caught 12 security issues in our codebase that our senior engineer missed. Occasionally flags false positives on custom DSLs, but overall excellent.",
    created_at: "2026-04-04T11:30:00Z",
    helpful_count: 22,
    verified_purchase: false,
  },
  {
    id: "r5",
    agent_id: "a6",
    agent_name: "AutoReport Builder",
    reviewer_id: "u14",
    reviewer_name: "Yuki T.",
    reviewer_initials: "YT",
    rating: 5,
    title: "Automated our weekly board reports",
    body: "Set it up to pull from Notion + GA4 every Monday. Board gets a polished PDF with executive summary before 9 AM. Game changer.",
    created_at: "2026-04-03T08:00:00Z",
    helpful_count: 51,
    verified_purchase: true,
  },
  {
    id: "r6",
    agent_id: "a5",
    agent_name: "EmailBlast Pro",
    reviewer_id: "u15",
    reviewer_name: "Carlos R.",
    reviewer_initials: "CR",
    rating: 4,
    title: "Great deliverability, minor UI issues",
    body: "Open rates jumped from 18% to 31% after switching to EmailBlast Pro's personalization engine. Dashboard is a bit clunky but the core is rock solid.",
    created_at: "2026-04-02T20:10:00Z",
    helpful_count: 18,
    verified_purchase: true,
  },
  {
    id: "r7",
    agent_id: "a8",
    agent_name: "LitReview AI",
    reviewer_id: "u16",
    reviewer_name: "Dr. Anna W.",
    reviewer_initials: "AW",
    rating: 5,
    title: "Finally, a research agent that cites correctly",
    body: "APA, MLA, Chicago — all correct on first pass. Reviewed 87 papers for my dissertation lit review. Would not have finished without this.",
    created_at: "2026-04-01T15:45:00Z",
    helpful_count: 63,
    verified_purchase: true,
  },
  {
    id: "r8",
    agent_id: "a7",
    agent_name: "SlackOps Bot",
    reviewer_id: "u17",
    reviewer_name: "Mike D.",
    reviewer_initials: "MD",
    rating: 4,
    title: "Standup collection is magic",
    body: "Pings the team at 9:30, compiles responses, posts summary to #standups at 10. Free tier is plenty for a 20-person team.",
    created_at: "2026-03-30T13:20:00Z",
    helpful_count: 34,
    verified_purchase: false,
  },
];

// ---------------------------------------------------------------------------
// Mock APIs
// ---------------------------------------------------------------------------

export const MOCK_APIS: ApiStat[] = [
  {
    id: "api1",
    name: "OpenAI GPT-4",
    provider: "OpenAI",
    category: "LLM",
    total_calls: 12_450_000,
    uptime: 99.98,
    latency_ms: 240,
    avg_rating: 4.9,
    price_per_1k: 0.03,
    trending: true,
    is_verified: true,
    usage_growth: 15.2,
    active_keys: 4820,
  },
  {
    id: "api2",
    name: "Anthropic Claude 3",
    provider: "Anthropic",
    category: "LLM",
    total_calls: 8_210_000,
    uptime: 99.95,
    latency_ms: 180,
    avg_rating: 4.8,
    price_per_1k: 0.015,
    trending: true,
    is_verified: true,
    usage_growth: 28.4,
    active_keys: 3150,
  },
  {
    id: "api3",
    name: "Google Gemini Pro",
    provider: "Google",
    category: "LLM",
    total_calls: 5_890_000,
    uptime: 99.99,
    latency_ms: 120,
    avg_rating: 4.7,
    price_per_1k: 0.005,
    trending: true,
    is_verified: true,
    usage_growth: 42.1,
    active_keys: 2840,
  },
  {
    id: "api4",
    name: "Stripe Payment API",
    provider: "Stripe",
    category: "Finance",
    total_calls: 45_200_000,
    uptime: 100.0,
    latency_ms: 45,
    avg_rating: 4.9,
    price_per_1k: 0.50,
    trending: false,
    is_verified: true,
    usage_growth: 4.2,
    active_keys: 12500,
  },
  {
    id: "api5",
    name: "GitHub Octokit",
    provider: "GitHub",
    category: "DevOps",
    total_calls: 21_340_000,
    uptime: 99.9,
    latency_ms: 85,
    avg_rating: 4.6,
    price_per_1k: 0,
    trending: false,
    is_verified: true,
    usage_growth: 2.1,
    active_keys: 9420,
  },
];

// ---------------------------------------------------------------------------
// Filtering & sorting helpers
// ---------------------------------------------------------------------------

export function applyCreatorFilters(
  creators: CreatorStat[],
  period: LeaderboardPeriod,
): CreatorStat[] {
  // In production: period would filter server-side by time window
  // Here we sort by total_runs and apply minor random scaling per period
  const scale = period === "daily" ? 0.01 : period === "weekly" ? 0.07 : 1;
  return [...creators].sort(
    (a, b) => b.total_runs * scale - a.total_runs * scale,
  );
}

export function applyAgentFilters(
  agents: AgentStat[],
  period: LeaderboardPeriod,
  category: AgentCategory,
): AgentStat[] {
  let result = category === "all" ? agents : agents.filter((a) => a.category === category);
  const scale = period === "daily" ? 0.01 : period === "weekly" ? 0.07 : 1;
  return [...result].sort(
    (a, b) => b.total_runs * scale - a.total_runs * scale,
  );
}

export function applyApiFilters(
  apis: ApiStat[],
  period: LeaderboardPeriod,
): ApiStat[] {
  const scale = period === "daily" ? 0.01 : period === "weekly" ? 0.07 : 1;
  return [...apis].sort(
    (a, b) => b.total_calls * scale - a.total_calls * scale,
  );
}

export function applyReviewFilters(
  reviews: AgentReview[],
  minRating: number,
): AgentReview[] {
  return reviews
    .filter((r) => r.rating >= minRating)
    .sort((a, b) => b.helpful_count - a.helpful_count);
}

export function formatCalls(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

export function formatRuns(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export function formatRevenue(usd: number): string {
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(1)}k`;
  return `$${usd}`;
}

export function renderStars(rating: number): string {
  return "★".repeat(Math.round(rating)) + "☆".repeat(5 - Math.round(rating));
}

// "Your rank" mock — simulates the current user's position
export const CURRENT_USER_RANK = {
  creator_rank: 14,
  agent_rank: 9,
  total_runs: 12_340,
  revenue_usd: 890,
  avg_rating: 4.3,
};
