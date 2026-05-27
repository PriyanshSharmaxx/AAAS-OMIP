/**
 * Marketplace Intelligence Layer
 *
 * Contains:
 *  - Extended agent catalog with analytics metadata
 *  - Smart ranking algorithm (usage 40% / success 25% / rating 20% / recency 15%)
 *  - Trending detection (growth over last 72h)
 *  - Personalized recommendations (role + category affinity)
 *  - Featured collections
 *
 * In production: replace mock data with API calls to:
 *   GET /api/agents?sort=rank_score
 *   GET /api/agents/trending
 *   GET /api/recommendations/user
 *   GET /api/agents/featured
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type AgentPricing = "free" | "paid" | "subscription";
export type AgentDifficulty = "beginner" | "intermediate" | "advanced";

export interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  category: string;               // fine-grained (e.g. "Sales", "HR")
  tags: string[];
  icon_url: string | null;
  creator_name: string;
  creator_id: string;
  is_public: boolean;
  version: string;
  execution_type: string;
  // Analytics
  runs_count: number;
  runs_24h: number;               // for trending
  runs_prev_24h: number;          // for trending delta
  success_rate: number;           // 0-100
  rating: number;                 // 0-5
  reviews_count: number;
  // Computed
  rank_score: number;
  trending_score: number;
  // Discovery
  pricing: AgentPricing;
  pricing_label: string;
  difficulty: AgentDifficulty;
  requires_api: boolean;
  use_cases: string[];
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  cta: string;
  gradient: string;              // Tailwind gradient classes
  icon: string;                  // lucide icon name
  agentIds: string[];
  badge?: string;
}

export interface FilterState {
  search: string;
  categories: string[];
  businessFunctions: string[];
  industries: string[];
  pricing: AgentPricing[];
  difficulty: AgentDifficulty[];
  execution: string[];
  sort: "rank" | "trending" | "newest" | "rating" | "runs";
}

// ─── Ranking algorithm ────────────────────────────────────────────────────────

/** Normalise a value to [0, 1] given a max reference */
function norm(value: number, max: number): number {
  return max === 0 ? 0 : Math.min(value / max, 1);
}

/** Recency score: decays linearly from 1 (today) to 0 (180+ days ago) */
function recencyScore(updatedAt: string): number {
  const days = (Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - days / 180);
}

export function computeRankScore(agent: Omit<MarketplaceAgent, "rank_score" | "trending_score">, maxRuns: number): number {
  const usageNorm    = norm(agent.runs_count, maxRuns);
  const successNorm  = norm(agent.success_rate, 100);
  const ratingNorm   = norm(agent.rating, 5);
  const recency      = recencyScore(agent.updated_at);
  return (
    usageNorm   * 0.40 +
    successNorm * 0.25 +
    ratingNorm  * 0.20 +
    recency     * 0.15
  );
}

export function computeTrendingScore(runs24h: number, runsPrev24h: number): number {
  if (runsPrev24h === 0) return runs24h > 0 ? 2 : 0;
  return runs24h / runsPrev24h;
}

// ─── Extended catalog ─────────────────────────────────────────────────────────

const _rawAgents = [
  // ── Development ──
  { id: "ag-1",  name: "AutoCoder Pro",     description: "AI-powered code generation and review across 20+ languages. Integrates with GitHub for seamless PR workflows.",             category: "Development",  tags: ["code","github","ai"],           creator_name: "DevForge Labs",   creator_id: "c1", version: "2.4", execution_type: "CONTAINER", runs_count: 48520, runs_24h: 1840, runs_prev_24h: 1200, success_rate: 97, rating: 4.9, reviews_count: 1247, pricing: "subscription" as AgentPricing, pricing_label: "$19/mo",       difficulty: "intermediate" as AgentDifficulty, requires_api: true,  use_cases: ["Generate boilerplate code","Automated PR review","Refactor legacy code","Generate unit tests"],  created_at: "2026-01-15T10:00:00Z", updated_at: "2026-04-06T14:00:00Z" },
  { id: "ag-2",  name: "TestRunner AI",     description: "Generates unit, integration, and E2E tests. Supports Jest, Pytest, Cypress, and Playwright.",                              category: "Development",  tags: ["testing","jest","ci"],          creator_name: "QualityFirst",    creator_id: "c7", version: "1.9", execution_type: "CONTAINER", runs_count: 19870, runs_24h: 920,  runs_prev_24h: 600,  success_rate: 94, rating: 4.7, reviews_count: 389,  pricing: "free" as AgentPricing,         pricing_label: "Free",          difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Unit test generation","E2E test suites","Coverage analysis"],                                  created_at: "2026-02-10T11:00:00Z", updated_at: "2026-04-05T10:00:00Z" },
  { id: "ag-3",  name: "SecScan Pro",       description: "Security scanning agent that audits your codebase, checks dependencies, and generates compliance reports.",                category: "Development",  tags: ["security","sast","devops"],     creator_name: "ShieldSec",       creator_id: "c10",version: "3.0", execution_type: "CONTAINER", runs_count: 13890, runs_24h: 700,  runs_prev_24h: 480,  success_rate: 98, rating: 4.8, reviews_count: 567,  pricing: "subscription" as AgentPricing, pricing_label: "$39/mo",       difficulty: "advanced" as AgentDifficulty,     requires_api: false, use_cases: ["OWASP vulnerability scan","CVE audit","Compliance reports"],                                   created_at: "2025-11-01T10:00:00Z", updated_at: "2026-04-04T17:00:00Z" },
  // ── Data & Analytics ──
  { id: "ag-4",  name: "DataPipe ETL",      description: "Automated data extraction, transformation, and loading. Connects to 50+ data sources including SQL, NoSQL, and APIs.",     category: "Analytics",    tags: ["etl","sql","data"],             creator_name: "PipelineIO",      creator_id: "c2", version: "3.1", execution_type: "CONTAINER", runs_count: 37890, runs_24h: 1560, runs_prev_24h: 900,  success_rate: 96, rating: 4.8, reviews_count: 892,  pricing: "paid" as AgentPricing,         pricing_label: "$0.02/run",     difficulty: "intermediate" as AgentDifficulty, requires_api: true,  use_cases: ["SQL/NoSQL migration","Scheduled ETL jobs","Spreadsheet transformation"],                       created_at: "2025-11-20T08:00:00Z", updated_at: "2026-04-07T09:00:00Z" },
  { id: "ag-5",  name: "InsightMiner",      description: "Business intelligence agent that analyzes data and surfaces actionable insights with natural language queries.",              category: "Analytics",    tags: ["bi","charts","nlp"],            creator_name: "DataViz Labs",    creator_id: "c9", version: "1.6", execution_type: "CONTAINER", runs_count: 15230, runs_24h: 810,  runs_prev_24h: 520,  success_rate: 93, rating: 4.6, reviews_count: 421,  pricing: "paid" as AgentPricing,         pricing_label: "$0.10/query",   difficulty: "beginner" as AgentDifficulty,     requires_api: true,  use_cases: ["Natural language BI queries","Auto-generate dashboards","Trend detection"],                    created_at: "2026-01-05T13:00:00Z", updated_at: "2026-04-07T12:00:00Z" },
  // ── Marketing & Sales ──
  { id: "ag-6",  name: "SocialPulse AI",    description: "Monitors social media trends, generates engagement reports, and auto-schedules posts across Twitter/X, LinkedIn, Instagram.", category: "Marketing",  tags: ["social","content","scheduling"],creator_name: "GrowthStack",     creator_id: "c3", version: "1.8", execution_type: "API",       runs_count: 31450, runs_24h: 1380, runs_prev_24h: 870,  success_rate: 92, rating: 4.7, reviews_count: 654,  pricing: "subscription" as AgentPricing, pricing_label: "$29/mo",       difficulty: "beginner" as AgentDifficulty,     requires_api: true,  use_cases: ["Brand monitoring","Post scheduling","Competitor analysis"],                                    created_at: "2026-02-01T12:00:00Z", updated_at: "2026-04-07T16:00:00Z" },
  { id: "ag-7",  name: "EmailGenius",       description: "AI email assistant that drafts, personalises, and sends cold outreach campaigns. A/B tests subject lines.",                  category: "Sales",        tags: ["email","outreach","crm"],       creator_name: "OutreachAI",      creator_id: "c6", version: "1.5", execution_type: "API",       runs_count: 22340, runs_24h: 1100, runs_prev_24h: 620,  success_rate: 89, rating: 4.6, reviews_count: 512,  pricing: "subscription" as AgentPricing, pricing_label: "$15/mo",       difficulty: "beginner" as AgentDifficulty,     requires_api: true,  use_cases: ["Cold outreach at scale","A/B test subject lines","Follow-up sequences"],                       created_at: "2026-01-20T09:00:00Z", updated_at: "2026-04-06T13:00:00Z" },
  { id: "ag-8",  name: "LeadScore AI",      description: "Scores and prioritises inbound leads using firmographic data, intent signals, and CRM history.",                             category: "Sales",        tags: ["leads","crm","scoring"],        creator_name: "PipelinePro",     creator_id: "c11",version: "2.1", execution_type: "API",       runs_count: 11200, runs_24h: 640,  runs_prev_24h: 310,  success_rate: 91, rating: 4.5, reviews_count: 287,  pricing: "paid" as AgentPricing,         pricing_label: "$0.01/lead",    difficulty: "intermediate" as AgentDifficulty, requires_api: true,  use_cases: ["Lead scoring","ICP matching","CRM enrichment"],                                                created_at: "2026-03-01T09:00:00Z", updated_at: "2026-04-07T11:00:00Z" },
  // ── HR & Productivity ──
  { id: "ag-9",  name: "HireAssist",        description: "Screens resumes, schedules interviews, and generates structured evaluation reports for hiring teams.",                        category: "HR",           tags: ["recruiting","hr","automation"],  creator_name: "TalentOps",       creator_id: "c12",version: "1.3", execution_type: "API",       runs_count: 8900,  runs_24h: 480,  runs_prev_24h: 240,  success_rate: 95, rating: 4.7, reviews_count: 198,  pricing: "subscription" as AgentPricing, pricing_label: "$45/mo",       difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Resume screening","Interview scheduling","Evaluation reports"],                                 created_at: "2026-03-10T10:00:00Z", updated_at: "2026-04-07T08:00:00Z" },
  { id: "ag-10", name: "MeetingScribe",     description: "Transcribes meetings, extracts action items, and sends summaries to Slack or email automatically.",                          category: "Productivity", tags: ["meetings","transcription","slack"],creator_name: "FlowWork",      creator_id: "c4", version: "2.3", execution_type: "API",       runs_count: 29100, runs_24h: 1250, runs_prev_24h: 780,  success_rate: 93, rating: 4.7, reviews_count: 643,  pricing: "free" as AgentPricing,         pricing_label: "Free",          difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Meeting transcription","Action item extraction","Slack summaries"],                            created_at: "2025-12-15T08:00:00Z", updated_at: "2026-04-06T12:00:00Z" },
  { id: "ag-11", name: "DocuMind",          description: "Extracts data from PDFs, invoices, contracts, and forms using OCR and NLP with 99.2% accuracy.",                            category: "Productivity", tags: ["ocr","pdf","documents"],         creator_name: "AI Docs Co",      creator_id: "c5", version: "2.0", execution_type: "CONTAINER", runs_count: 25670, runs_24h: 1050, runs_prev_24h: 670,  success_rate: 99, rating: 4.8, reviews_count: 743,  pricing: "paid" as AgentPricing,         pricing_label: "$0.05/page",    difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Invoice data extraction","Contract parsing","Form digitisation"],                              created_at: "2025-12-05T14:00:00Z", updated_at: "2026-04-07T08:00:00Z" },
  // ── Automation & Infra ──
  { id: "ag-12", name: "InfraWatch",        description: "Real-time infrastructure monitoring. Detects anomalies, auto-scales resources, and sends intelligent alerts.",               category: "DevOps",       tags: ["monitoring","cloud","alerts"],   creator_name: "CloudOps Inc",    creator_id: "c4", version: "4.0", execution_type: "CONTAINER", runs_count: 28900, runs_24h: 1340, runs_prev_24h: 840,  success_rate: 99, rating: 4.9, reviews_count: 1089, pricing: "subscription" as AgentPricing, pricing_label: "$49/mo",       difficulty: "advanced" as AgentDifficulty,     requires_api: true,  use_cases: ["24/7 infra monitoring","Auto-scaling","Cost optimisation"],                                    created_at: "2025-09-10T06:00:00Z", updated_at: "2026-04-06T11:00:00Z" },
  { id: "ag-13", name: "FlowBuilder",       description: "Visual workflow automation connecting Notion, Slack, Google Sheets, and Airtable with natural language.",                    category: "Automation",   tags: ["workflow","no-code","integrations"],creator_name: "AutomateHQ",    creator_id: "c8", version: "2.2", execution_type: "N8N",       runs_count: 17650, runs_24h: 980,  runs_prev_24h: 580,  success_rate: 90, rating: 4.5, reviews_count: 298,  pricing: "free" as AgentPricing,         pricing_label: "Free",          difficulty: "beginner" as AgentDifficulty,     requires_api: true,  use_cases: ["Connect SaaS apps","Build multi-step workflows","Webhook automation"],                         created_at: "2025-10-15T07:00:00Z", updated_at: "2026-04-05T15:00:00Z" },
  // ── Finance ──
  { id: "ag-14", name: "FinanceTracker AI", description: "Reads bank statements, categorises expenses, and delivers weekly financial health reports.",                                 category: "Finance",      tags: ["finance","expenses","reporting"],creator_name: "MoneyBot Labs",   creator_id: "c4", version: "1.2", execution_type: "API",       runs_count: 9800,  runs_24h: 420,  runs_prev_24h: 250,  success_rate: 95, rating: 4.6, reviews_count: 312,  pricing: "paid" as AgentPricing,         pricing_label: "$0.03/report",  difficulty: "beginner" as AgentDifficulty,     requires_api: true,  use_cases: ["Expense categorisation","Financial health reports","Budget tracking"],                         created_at: "2025-12-20T10:00:00Z", updated_at: "2026-04-04T14:00:00Z" },
  // ── Research / AI ──
  { id: "ag-15", name: "ResearchBot",       description: "Deep-research assistant that searches, summarises, and cites sources across the web and academic databases.",                category: "Research",     tags: ["research","web","citations"],    creator_name: "KnowledgeAI",     creator_id: "c3", version: "3.1", execution_type: "API",       runs_count: 24500, runs_24h: 1120, runs_prev_24h: 660,  success_rate: 91, rating: 4.8, reviews_count: 867,  pricing: "paid" as AgentPricing,         pricing_label: "$0.04/query",   difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Academic research","Competitive analysis","Fact-checking"],                                    created_at: "2025-10-05T09:00:00Z", updated_at: "2026-04-07T10:00:00Z" },
  { id: "ag-16", name: "ContentWriter",     description: "Generates SEO-optimised blog posts, social copy, and email campaigns tailored to your brand voice.",                         category: "Marketing",    tags: ["content","seo","writing"],       creator_name: "WordCraft AI",    creator_id: "c2", version: "2.0", execution_type: "API",       runs_count: 33200, runs_24h: 1460, runs_prev_24h: 910,  success_rate: 88, rating: 4.6, reviews_count: 934,  pricing: "subscription" as AgentPricing, pricing_label: "$25/mo",       difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Blog post generation","SEO meta content","Email campaigns"],                                   created_at: "2025-11-10T12:00:00Z", updated_at: "2026-04-07T09:00:00Z" },
  { id: "ag-17", name: "SEO Optimizer",     description: "Audits your pages, fixes technical issues, and drafts keyword-targeted meta content automatically.",                          category: "Marketing",    tags: ["seo","audit","keywords"],        creator_name: "RankBoost",       creator_id: "c5", version: "1.5", execution_type: "API",       runs_count: 18700, runs_24h: 890,  runs_prev_24h: 510,  success_rate: 90, rating: 4.5, reviews_count: 441,  pricing: "paid" as AgentPricing,         pricing_label: "$0.05/audit",   difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["Technical SEO audit","Keyword research","Meta content generation"],                            created_at: "2026-01-25T11:00:00Z", updated_at: "2026-04-06T15:00:00Z" },
  { id: "ag-18", name: "SupportBot Pro",    description: "Handles tier-1 customer queries 24/7, escalates complex issues, and learns from every conversation.",                       category: "Support",      tags: ["support","chatbot","zendesk"],   creator_name: "CareOps",         creator_id: "c3", version: "4.2", execution_type: "CONTAINER", runs_count: 41200, runs_24h: 1680, runs_prev_24h: 1050, success_rate: 94, rating: 4.7, reviews_count: 1102, pricing: "subscription" as AgentPricing, pricing_label: "$35/mo",       difficulty: "beginner" as AgentDifficulty,     requires_api: false, use_cases: ["24/7 customer support","Ticket deflection","Escalation routing"],                             created_at: "2025-08-15T09:00:00Z", updated_at: "2026-04-07T11:00:00Z" },
];

// ── Compute scores and export catalog ────────────────────────────────────────

const maxRuns = Math.max(..._rawAgents.map((a) => a.runs_count));

export const MARKETPLACE_AGENTS: MarketplaceAgent[] = _rawAgents.map((a) => {
  const base = {
    ...a,
    is_public: true,
    icon_url: null,
  };
  return {
    ...base,
    rank_score:     computeRankScore(base, maxRuns),
    trending_score: computeTrendingScore(a.runs_24h, a.runs_prev_24h),
  } as MarketplaceAgent;
});

// ─── Sorted views ─────────────────────────────────────────────────────────────

export const RANKED_AGENTS = [...MARKETPLACE_AGENTS].sort((a, b) => b.rank_score - a.rank_score);

export const TRENDING_AGENTS = [...MARKETPLACE_AGENTS]
  .sort((a, b) => b.trending_score - a.trending_score)
  .slice(0, 8);

export const NEWEST_AGENTS = [...MARKETPLACE_AGENTS]
  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  .slice(0, 6);

// ─── Featured collections ─────────────────────────────────────────────────────

export const FEATURED_COLLECTIONS: FeaturedCollection[] = [
  {
    id: "col-1",
    title: "Getting Started with AI",
    description: "Beginner-friendly agents that require no setup. Start automating in minutes.",
    cta: "Explore Collection",
    gradient: "from-violet-500/20 via-purple-500/10 to-blue-500/20",
    icon: "Sparkles",
    badge: "Recommended",
    agentIds: ["ag-10", "ag-13", "ag-11", "ag-15"],
  },
  {
    id: "col-2",
    title: "Sales & Marketing Toolkit",
    description: "Grow revenue with AI-powered outreach, content, and lead management.",
    cta: "View Toolkit",
    gradient: "from-orange-500/20 via-red-500/10 to-pink-500/20",
    icon: "TrendingUp",
    badge: "Popular",
    agentIds: ["ag-6", "ag-7", "ag-16", "ag-17", "ag-8"],
  },
  {
    id: "col-3",
    title: "For Power Users & Developers",
    description: "Advanced agents for code generation, testing, security, and infrastructure.",
    cta: "Build Faster",
    gradient: "from-cyan-500/20 via-blue-500/10 to-indigo-500/20",
    icon: "Code2",
    agentIds: ["ag-1", "ag-2", "ag-3", "ag-12", "ag-4"],
  },
  {
    id: "col-4",
    title: "HR & Operations Automation",
    description: "Streamline hiring, meetings, documents, and financial reporting.",
    cta: "Automate Now",
    gradient: "from-emerald-500/20 via-green-500/10 to-teal-500/20",
    icon: "Users",
    agentIds: ["ag-9", "ag-10", "ag-11", "ag-14"],
  },
];

// ─── Personalized recommendations ────────────────────────────────────────────

export type UserRole = "USER" | "CREATOR";

const ROLE_AFFINITIES: Record<UserRole, string[]> = {
  USER:    ["Productivity", "Research", "Support", "Automation"],
  CREATOR: ["Development", "DevOps", "Analytics", "Marketing"],
};

const CATEGORY_RELATED: Record<string, string[]> = {
  Development:  ["DevOps", "Analytics"],
  Marketing:    ["Sales", "Research"],
  Sales:        ["Marketing", "Support"],
  Analytics:    ["Finance", "Development"],
  HR:           ["Productivity", "Automation"],
  Productivity: ["HR", "Support"],
  DevOps:       ["Development", "Analytics"],
  Finance:      ["Analytics", "Productivity"],
  Support:      ["Sales", "Productivity"],
  Research:     ["Analytics", "Development"],
  Automation:   ["Productivity", "DevOps"],
};

export function getPersonalizedRecommendations(
  role: UserRole,
  usedAgentIds: string[] = [],
  preferredCategories: string[] = []
): MarketplaceAgent[] {
  const affinities = ROLE_AFFINITIES[role] ?? ROLE_AFFINITIES.USER;
  const expanded = [
    ...preferredCategories,
    ...affinities,
    ...preferredCategories.flatMap((c) => CATEGORY_RELATED[c] ?? []),
  ];
  const categorySet = new Set(expanded);

  const unused = MARKETPLACE_AGENTS.filter((a) => !usedAgentIds.includes(a.id));

  const scored = unused.map((a) => ({
    agent: a,
    score:
      (categorySet.has(a.category) ? 0.5 : 0) +
      a.rank_score * 0.3 +
      (a.pricing === "free" ? 0.1 : 0) +
      (a.difficulty === "beginner" ? 0.1 : 0),
  }));

  return scored
    .sort((x, y) => y.score - x.score)
    .slice(0, 6)
    .map((x) => x.agent);
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

export const FILTER_CATEGORIES = [
  "Development", "DevOps", "Analytics", "Marketing",
  "Sales", "HR", "Productivity", "Finance", "Support",
  "Research", "Automation",
];

export const BUSINESS_FUNCTIONS = [
  "Sales", "Marketing", "HR", "Finance", "Operations", "Customer Support",
];

export const INDUSTRIES = [
  "SaaS / Tech", "E-Commerce", "Healthcare", "Finance", "Education",
  "Media", "Real Estate", "Consulting",
];

export const EXECUTION_TYPES = ["API", "CONTAINER", "N8N", "SERVERLESS"];

export function applyFilters(agents: MarketplaceAgent[], filters: FilterState): MarketplaceAgent[] {
  let result = agents;

  if (filters.search.trim()) {
    const q = filters.search.toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );
  }
  if (filters.categories.length > 0) {
    result = result.filter((a) => filters.categories.includes(a.category));
  }
  if (filters.pricing.length > 0) {
    result = result.filter((a) => filters.pricing.includes(a.pricing));
  }
  if (filters.difficulty.length > 0) {
    result = result.filter((a) => filters.difficulty.includes(a.difficulty));
  }
  if (filters.execution.length > 0) {
    result = result.filter((a) => filters.execution.includes(a.execution_type));
  }

  switch (filters.sort) {
    case "rank":     return [...result].sort((a, b) => b.rank_score - a.rank_score);
    case "trending": return [...result].sort((a, b) => b.trending_score - a.trending_score);
    case "newest":   return [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    case "rating":   return [...result].sort((a, b) => b.rating - a.rating);
    case "runs":     return [...result].sort((a, b) => b.runs_count - a.runs_count);
    default:         return result;
  }
}
