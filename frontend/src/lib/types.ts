export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  is_active: boolean;
  created_at: string;
  /** Current credit balance */
  credits?: number;
  /** Lifetime credits consumed */
  total_credits_used?: number;
}

export interface AgentCostBreakdown {
  credits: number;
  breakdown: { base: number; tools: number; model: number };
}

export interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  icon_url: string | null;
  creator_id: string;
  is_public: boolean;
  version: string;
  execution_type: string;
  config: Record<string, unknown>;
  permissions: { name: string; description: string; required: boolean }[];
  tools: string[];
  created_at: string;
  updated_at: string;
  /** Licensing tier. "subscription" is treated as "paid" at download time. */
  pricing?: "free" | "paid" | "subscription";
  /** Download model: "full" | "restricted" */
  download_type?: "full" | "restricted";
}

export interface Run {
  id: string;
  agent_id: string;
  user_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface RunLog {
  id: string;
  run_id: string;
  level: string;
  message: string;
  timestamp: string;
}

export interface AgentListResponse {
  agents: Agent[];
  total: number;
}

export interface RunListResponse {
  runs: Run[];
  total: number;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
}

export interface Plan {
  name: string;
  price: number;
  features: string[];
}

export interface Secret {
  id: string;
  name: string;
  provider: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Master Agent Runner
// ---------------------------------------------------------------------------

export interface Integration {
  name: string;
  label: string;
  description: string;
  purpose: string;
  scopes: string[];
  icon: string;
  required: boolean;
  sensitiveLevel: "none" | "low" | "medium" | "high";
  toolType: "email" | "code" | "database" | "file" | "api" | "messaging" | "calendar" | "crm";
  accessTypes: ("read" | "write" | "execute")[];
  oauthRequired?: boolean;
}

export interface IntegrationPermission {
  name: string;
  description: string;
  scope: string;
  required: boolean;
  granted: boolean;
}

export interface RunSession {
  id: string;
  user_id: string;
  agent_id: string;
  run_id: string | null;
  user_type: string | null;
  api_type: string | null;
  api_config: Record<string, unknown> | null;
  mcp_config: Record<string, unknown> | null;
  permissions_validated: boolean;
  api_validated: boolean;
  status: string;
  output_data: Record<string, unknown> | null;
  logs: ExecutionLog[];
  error: string | null;
  created_at: string;
  updated_at: string | null;
}

export interface ExecutionLog {
  timestamp: string;
  level: string;
  message: string;
  step: string | null;
}

export interface ValidationResult {
  valid: boolean;
  missing_permissions: string[];
  requires_api: boolean;
  api_status: string;
  errors: string[];
}

export interface ExecutionResult {
  session_id: string;
  run_id: string | null;
  status: string;
  output_data: Record<string, unknown> | null;
  api_endpoint: string | null;
  api_credentials: Record<string, string> | null;
  logs: ExecutionLog[];
  error: string | null;
}

export type WizardStep =
  | "permissions"
  | "user_type"
  | "api_config"
  | "review"
  | "executing"
  | "complete";

// ---------------------------------------------------------------------------
// MCP (Model Context Protocol)
// ---------------------------------------------------------------------------

export interface McpServer {
  id: string;
  name: string;
  description: string;
  transport: "stdio" | "sse" | "http";
  command?: string;      // for stdio: e.g. "npx -y @modelcontextprotocol/server-filesystem"
  url?: string;          // for sse/http
  env?: Record<string, string>;  // env vars the MCP server needs
  required: boolean;
  enabled: boolean;
}

export interface McpConfig {
  servers: McpServer[];
}

// ---------------------------------------------------------------------------
// Agent Space
// ---------------------------------------------------------------------------

export type AgentSpaceStatus = "draft" | "deployed" | "archived";
export type DeploymentVisibility = "private" | "public" | "paid";

export interface AgentFramework {
  id: string;
  name: string;
  description: string;
  icon: string;
  complexity: "beginner" | "intermediate" | "advanced";
  language: "python" | "javascript" | "no-code";
  fileTypes: string[];
}

export interface AgentDraft {
  id: string;
  name: string;
  description: string;
  framework: string;
  category: string;
  tags: string[];
  status: AgentSpaceStatus;
  version: string;
  config: Record<string, unknown>;
  permissions: { name: string; description: string; required: boolean }[];
  tools: string[];
  env_vars: Record<string, string>;
  flow_data: FlowData | null;
  source_files: SourceFile[];
  deployment: DeploymentInfo | null;
  creator_id: string;
  created_at: string;
  updated_at: string;
}

export interface SourceFile {
  name: string;
  size: number;
  type: string;
  uploaded_at: string;
}

export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export interface FlowNode {
  id: string;
  type: "input" | "llm" | "api_call" | "tool" | "condition" | "output";
  label: string;
  position: { x: number; y: number };
  config: Record<string, unknown>;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface DeploymentInfo {
  id: string;
  agent_draft_id: string;
  visibility: DeploymentVisibility;
  status: "pending" | "building" | "live" | "failed" | "stopped";
  endpoint_url: string | null;
  agent_id: string | null;
  created_at: string;
}

export interface AgentVersion {
  id: string;
  agent_draft_id: string;
  version: string;
  changelog: string;
  flow_data: FlowData | null;
  config: Record<string, unknown>;
  created_at: string;
}

export interface AgentDraftListResponse {
  drafts: AgentDraft[];
  total: number;
}

// ---------------------------------------------------------------------------
// External API Marketplace
// ---------------------------------------------------------------------------

export interface ApiProduct {
  id:              string;
  name:            string;
  description:     string;
  category:        string;
  baseUrl:         string;
  pricingType:     "free" | "per_call" | "monthly";
  pricePerCall:    number | null;  // USD cents
  priceMonthly:    number | null;  // USD cents
  freeCallsPerDay: number;
  authType:        "api_key" | "oauth" | "bearer" | "none";
  isVerified:      boolean;
  isActive:        boolean;
  isFeatured:      boolean;
  isTrending:      boolean;
  rating:          number;
  reviewsCount:    number;
  requestCount:    number;
  tags:            string[];
  latencyMs:       number;
  uptimePct:       number;
  version:         string;
  createdAt:       string;
  updatedAt:       string;
  // Provider info
  provider: {
    id:          string;
    username:    string;
    displayName: string | null;
    avatarUrl:   string | null;
    bio?:        string | null;
  };
  // Pricing plans
  plans: ApiPlan[];
  // Annotated server-side when the requesting user is authenticated
  isSubscribed?:   boolean;
  /** Only present in getById when isSubscribed === true */
  apiKey?:         string | null;
  activePlan?:     ApiPlan | null;
}

export interface ApiPlan {
  id:          string;
  apiId:       string;
  name:        string;
  description: string | null;
  price:       number; // USD cents
  limit:       number; // calls per day
  features:    string[];
  createdAt:   string;
}

export interface ApiProductListResponse {
  products: ApiProduct[];
  total:    number;
  page:     number;
  pages:    number;
}

export interface ApiKeyRecord {
  id:          string;
  key:         string;
  isActive:    boolean;
  totalCalls:  number;
  lastUsedAt:  string | null;
  createdAt:   string;
  usageLast30: number;
  apiProduct: {
    id:          string;
    name:        string;
    category:    string;
    pricingType: string;
    pricePerCall: number | null;
    priceMonthly: number | null;
    isVerified:  boolean;
    rating:      number;
    latencyMs:   number;
    uptimePct:   number;
  };
  plan?: ApiPlan | null;
}

export interface ApiUsageEntry {
  id:         string;
  apiId:      string;
  apiKeyId:   string;
  statusCode: number | null;
  latencyMs:  number | null;
  endpoint:   string;
  createdAt:  string;
  apiProduct: { name: string; category: string };
}

export interface ApiUsageStats {
  total:  number;
  recent: ApiUsageEntry[];
  byApi:  { apiId: string; _count: { id: number } }[];
}
