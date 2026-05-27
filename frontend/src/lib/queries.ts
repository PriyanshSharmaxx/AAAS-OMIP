import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api } from "./api";
import type {
  Agent,
  AgentListResponse,
  AgentCostBreakdown,
  Run,
  RunListResponse,
  RunLog,
  Secret,
  TokenResponse,
  User,
} from "./types";

// ---------------------------------------------------------------------------
// Query-key factories
// ---------------------------------------------------------------------------

export const queryKeys = {
  agents: {
    all: ["agents"] as const,
    list: (params?: AgentQueryParams) => ["agents", "list", params] as const,
    detail: (id: string) => ["agents", "detail", id] as const,
    cost: (id: string) => ["agents", "cost", id] as const,
  },
  runs: {
    all: ["runs"] as const,
    list: (params?: RunQueryParams) => ["runs", "list", params] as const,
    detail: (id: string) => ["runs", "detail", id] as const,
    logs: (runId: string) => ["runs", "logs", runId] as const,
  },
  creator: {
    agents: ["creator", "agents"] as const,
    stats: ["creator", "stats"] as const,
  },
  dashboard: {
    stats: ["dashboard", "stats"] as const,
    secrets: ["dashboard", "secrets"] as const,
  },
  tools: ["tools"] as const,
  currentUser: ["auth", "me"] as const,
  userCredits: ["user", "credits"] as const,
  leaderboard: ["leaderboard"] as const,
  team: {
    all: ["teams"] as const,
    detail: (id: string) => ["teams", "detail", id] as const,
  },
  apiProducts: ["api-products"] as const,
};

// ---------------------------------------------------------------------------
// Param types
// ---------------------------------------------------------------------------

export interface AgentQueryParams {
  search?: string;
  category?: string;
  skip?: number;
  limit?: number;
}

export interface RunQueryParams {
  skip?: number;
  limit?: number;
}

// ---------------------------------------------------------------------------
// Helper: build query string from params object
// ---------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toQueryString(params?: any): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ""
  );
  if (entries.length === 0) return "";
  const qs = new URLSearchParams(
    entries.map(([k, v]) => [k, String(v)])
  ).toString();
  return `?${qs}`;
}

// ---------------------------------------------------------------------------
// Query hooks
// ---------------------------------------------------------------------------

export function useAgents(
  params?: AgentQueryParams,
  options?: Omit<
    UseQueryOptions<AgentListResponse>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<AgentListResponse>({
    queryKey: queryKeys.agents.list(params),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AgentListResponse }>(
        `/agents${toQueryString(params)}`
      );
      return res.data;
    },
    retry: 1,                   // one retry then give up — avoids long spinner
    staleTime: 30_000,          // cache for 30s
    ...options,
  });
}

export function useAgent(
  id: string,
  options?: Omit<UseQueryOptions<Agent>, "queryKey" | "queryFn">
) {
  return useQuery<Agent>({
    queryKey: queryKeys.agents.detail(id),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Agent }>(`/agents/${id}`);
      return res.data;
    },
    enabled: !!id,
    ...options,
  });
}

export function useRuns(
  params?: RunQueryParams,
  options?: Omit<UseQueryOptions<RunListResponse>, "queryKey" | "queryFn">
) {
  return useQuery<RunListResponse>({
    queryKey: queryKeys.runs.list(params),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: RunListResponse }>(
        `/dashboard/runs${toQueryString(params)}`
      );
      return res.data;
    },
    ...options,
  });
}

export function useRun(
  id: string,
  options?: Omit<UseQueryOptions<Run>, "queryKey" | "queryFn">
) {
  return useQuery<Run>({
    queryKey: queryKeys.runs.detail(id),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Run }>(`/runs/${id}`);
      return res.data;
    },
    enabled: !!id,
    ...options,
  });
}

export function useRunLogs(
  runId: string,
  options?: Omit<UseQueryOptions<RunLog[]>, "queryKey" | "queryFn">
) {
  return useQuery<RunLog[]>({
    queryKey: queryKeys.runs.logs(runId),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: RunLog[] }>(
        `/runs/${runId}/logs`
      );
      return res.data;
    },
    enabled: !!runId,
    ...options,
  });
}

export function useCreatorAgents(
  options?: Omit<UseQueryOptions<AgentListResponse>, "queryKey" | "queryFn">
) {
  return useQuery<AgentListResponse>({
    queryKey: queryKeys.creator.agents,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AgentListResponse }>(
        "/creator/agents"
      );
      return res.data;
    },
    ...options,
  });
}

export interface CreatorStatsData {
  total_agents: number;
  total_runs: number;
  completed_runs: number;
  success_rate: number;
}

export function useCreatorStats(
  options?: Omit<
    UseQueryOptions<CreatorStatsData>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<CreatorStatsData>({
    queryKey: queryKeys.creator.stats,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: CreatorStatsData }>(
        "/creator/stats"
      );
      return res.data;
    },
    ...options,
  });
}

export interface DashboardStatsData {
  total_runs: number;
  completed_runs: number;
  failed_runs: number;
  running_runs: number;
}

export function useDashboardStats(
  options?: Omit<
    UseQueryOptions<DashboardStatsData>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<DashboardStatsData>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: DashboardStatsData }>(
        "/dashboard/stats"
      );
      return res.data;
    },
    ...options,
  });
}

export function useSecrets(
  options?: Omit<UseQueryOptions<Secret[]>, "queryKey" | "queryFn">
) {
  return useQuery<Secret[]>({
    queryKey: queryKeys.dashboard.secrets,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Secret[] }>(
        "/dashboard/secrets"
      );
      return res.data;
    },
    ...options,
  });
}

export function useTools(
  options?: Omit<
    UseQueryOptions<Record<string, unknown>[]>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<Record<string, unknown>[]>({
    queryKey: queryKeys.tools,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: Record<string, unknown>[] }>(
        "/tools"
      );
      return res.data;
    },
    ...options,
  });
}

export function useCurrentUser(
  options?: Omit<UseQueryOptions<User>, "queryKey" | "queryFn">
) {
  return useQuery<User>({
    queryKey: queryKeys.currentUser,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: User }>("/auth/me");
      return res.data;
    },
    retry: false,
    ...options,
  });
}

/** Fetches current user's credit balance. Refreshes every 30 s. */
export function useUserCredits(
  options?: Omit<
    UseQueryOptions<{ credits: number; totalCreditsUsed: number }>,
    "queryKey" | "queryFn"
  >
) {
  return useQuery<{ credits: number; totalCreditsUsed: number }>({
    queryKey: queryKeys.userCredits,
    queryFn: async () => {
      const res = await api.get<{
        success: boolean;
        data: { credits: number; totalCreditsUsed: number };
      }>("/user/credits");
      return res.data;
    },
    staleTime: 30_000,
    retry: false,
    ...options,
  });
}

/** Fetches the estimated credit cost for running a specific agent. */
export function useAgentCost(
  agentId: string,
  options?: Omit<UseQueryOptions<AgentCostBreakdown>, "queryKey" | "queryFn">
) {
  return useQuery<AgentCostBreakdown>({
    queryKey: queryKeys.agents.cost(agentId),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: AgentCostBreakdown }>(
        `/agents/${agentId}/cost`,
      );
      return res.data;
    },
    enabled: !!agentId,
    staleTime: 60_000,
    retry: false,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks
// ---------------------------------------------------------------------------

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation<
    TokenResponse,
    Error,
    { email: string; password: string }
  >({
    mutationFn: (credentials) =>
      api.post<TokenResponse>("/auth/login", credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.currentUser });
    },
  });
}

export function useSignup() {
  return useMutation<
    TokenResponse,
    Error,
    {
      email: string;
      username: string;
      password: string;
      role?: string;
      organization?: string;
      expertise?: string;
    }
  >({
    mutationFn: (data) => api.post<TokenResponse>("/auth/signup", data),
  });
}

export function useCreateRun() {
  const queryClient = useQueryClient();
  return useMutation<
    Run,
    Error,
    { agent_id: string; input_data: Record<string, unknown>; api_key?: string }
  >({
    mutationFn: (data) => api.post<Run>("/runs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.runs.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.stats });
      // Refresh credit balance after each run
      queryClient.invalidateQueries({ queryKey: queryKeys.userCredits });
    },
  });
}

export function useCreateAgent() {
  const queryClient = useQueryClient();
  return useMutation<Agent, Error, Partial<Agent>>({
    mutationFn: (data) => api.post<Agent>("/creator/agents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.creator.agents });
      queryClient.invalidateQueries({ queryKey: queryKeys.creator.stats });
    },
  });
}

export function useUpdateAgent() {
  const queryClient = useQueryClient();
  return useMutation<Agent, Error, { id: string; data: Partial<Agent> }>({
    mutationFn: ({ id, data }) =>
      api.put<Agent>(`/creator/agents/${id}`, data),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({
        queryKey: queryKeys.agents.detail(variables.id),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.creator.agents });
    },
  });
}

export function useDeleteAgent() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/creator/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.creator.agents });
      queryClient.invalidateQueries({ queryKey: queryKeys.creator.stats });
    },
  });
}

export function useCreateSecret() {
  const queryClient = useQueryClient();
  return useMutation<
    Secret,
    Error,
    { name: string; provider: string; value: string }
  >({
    mutationFn: (data) => api.post<Secret>("/dashboard/secrets", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.secrets });
    },
  });
}

export function useDeleteSecret() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/dashboard/secrets/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.secrets });
    },
  });
}

// ---------------------------------------------------------------------------
// External API Marketplace hooks
// ---------------------------------------------------------------------------

import type {
  ApiProduct,
  ApiProductListResponse,
  ApiKeyRecord,
  ApiUsageStats,
} from "./types";

export interface ApiProductQueryParams {
  category?: string;
  search?:   string;
  pricing?:  "free" | "per_call" | "monthly";
  page?:     number;
  limit?:    number;
}

export const apiMarketplaceKeys = {
  products: (params?: ApiProductQueryParams) => ["apis", "products", params] as const,
  product:  (id: string) => ["apis", "product", id] as const,
  myKeys:   ["apis", "my-keys"] as const,
  usage:    (apiId?: string) => ["apis", "usage", apiId] as const,
};

/** Browse the external API marketplace catalogue */
export function useApiProducts(
  params?: ApiProductQueryParams,
  options?: Omit<UseQueryOptions<ApiProductListResponse>, "queryKey" | "queryFn">,
) {
  return useQuery<ApiProductListResponse>({
    queryKey: apiMarketplaceKeys.products(params),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ApiProductListResponse }>(
        `/apis${toQueryString(params)}`
      );
      return res.data;
    },
    staleTime: 60_000,
    ...options,
  });
}

/** Get a single ApiProduct with subscription status */
export function useApiProduct(
  id: string,
  options?: Omit<UseQueryOptions<ApiProduct>, "queryKey" | "queryFn">,
) {
  return useQuery<ApiProduct>({
    queryKey: apiMarketplaceKeys.product(id),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ApiProduct }>(`/apis/${id}`);
      return res.data;
    },
    enabled: !!id,
    ...options,
  });
}

/** List the current user's active API keys */
export function useMyApiKeys(
  options?: Omit<UseQueryOptions<ApiKeyRecord[]>, "queryKey" | "queryFn">,
) {
  return useQuery<ApiKeyRecord[]>({
    queryKey: apiMarketplaceKeys.myKeys,
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: ApiKeyRecord[] }>("/apis/my-keys");
      return res.data;
    },
    staleTime: 30_000,
    ...options,
  });
}

/** Subscribe to an ApiProduct — returns the issued ApiKey record */
export function useSubscribeToApi() {
  const queryClient = useQueryClient();
  return useMutation<ApiKeyRecord, Error, { apiId: string; planId?: string }>({
    mutationFn: async ({ apiId, planId }) => {
      const res = await api.post<{ success: boolean; data: ApiKeyRecord }>(
        `/apis/${apiId}/subscribe`,
        { planId }
      );
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiMarketplaceKeys.myKeys });
      // Invalidate all product queries so isSubscribed refreshes
      queryClient.invalidateQueries({ queryKey: ["apis", "products"] });
      queryClient.invalidateQueries({ queryKey: ["apis", "product"] });
    },
  });
}

/** Unsubscribe from an ApiProduct */
export function useUnsubscribeFromApi() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (apiId: string) => api.delete<void>(`/apis/${apiId}/subscribe`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiMarketplaceKeys.myKeys });
      queryClient.invalidateQueries({ queryKey: ["apis", "products"] });
      queryClient.invalidateQueries({ queryKey: ["apis", "product"] });
    },
  });
}

/** Attach a subscribed API to an agent's tools */
export function useAddApiToAgent() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { agentId: string; apiId: string }>({
    mutationFn: ({ agentId, apiId }) =>
      api.post<void>(`/agents/${agentId}/add-api`, { apiId }),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(vars.agentId) });
    },
  });
}

/** Detach an API from an agent's tools */
export function useRemoveApiFromAgent() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { agentId: string; apiId: string }>({
    mutationFn: ({ agentId, apiId }) =>
      api.delete<void>(`/agents/${agentId}/remove-api/${apiId}`),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(vars.agentId) });
    },
  });
}

/** Revoke an API key */
export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (keyId: string) => api.delete<void>(`/apis/keys/${keyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiMarketplaceKeys.myKeys });
    },
  });
}

/** Rotate an API key (new key, same subscription) */
export function useRotateApiKey() {
  const queryClient = useQueryClient();
  return useMutation<ApiKeyRecord, Error, string>({
    mutationFn: async (keyId: string) => {
      const res = await api.post<{ success: boolean; data: ApiKeyRecord }>(`/apis/keys/${keyId}/rotate`, {});
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: apiMarketplaceKeys.myKeys });
    },
  });
}

/** Usage statistics for the current user, optionally scoped to one API */
export function useApiUsageStats(
  apiId?: string,
  options?: Omit<UseQueryOptions<ApiUsageStats>, "queryKey" | "queryFn">,
) {
  return useQuery<ApiUsageStats>({
    queryKey: apiMarketplaceKeys.usage(apiId),
    queryFn: async () => {
      const path = apiId ? `/apis/usage/${apiId}` : "/apis/usage";
      const res = await api.get<{ success: boolean; data: ApiUsageStats }>(path);
      return res.data;
    },
    staleTime: 30_000,
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Agent Space hooks
// ---------------------------------------------------------------------------

import type {
  AgentDraft,
  AgentDraftListResponse,
  AgentVersion,
  DeploymentInfo,
} from "./types";

export const spaceKeys = {
  all: ["space"] as const,
  drafts: (status?: string) => ["space", "drafts", status] as const,
  draft: (id: string) => ["space", "draft", id] as const,
  versions: (draftId: string) => ["space", "versions", draftId] as const,
};

export function useAgentDrafts(
  statusFilter?: string,
  options?: Omit<UseQueryOptions<AgentDraftListResponse>, "queryKey" | "queryFn">
) {
  return useQuery<AgentDraftListResponse>({
    queryKey: spaceKeys.drafts(statusFilter),
    queryFn: async () => {
      // Map frontend "drafts" concept to backend /agents with status filters
      const status = statusFilter === "deployed" ? "ACTIVE" : (statusFilter === "archived" ? "ARCHIVED" : "DRAFT");
      const res = await api.get<{ success: boolean; data: any[] }>(`/agents?status=${status}`);
      // The frontend expects AgentDraftListResponse { drafts: AgentDraft[] }
      // We map the backend Agent model to AgentDraft
      return {
        drafts: res.data.map((a: any) => ({
          ...a,
          status: a.status === "ACTIVE" ? "deployed" : (a.status === "ARCHIVED" ? "archived" : "draft"),
          flow_data: a.config?.flow_data || null,
        })),
        total: res.data.length,
      };
    },
    ...options,
  });
}

export function useAgentDraft(
  id: string,
  options?: Omit<UseQueryOptions<AgentDraft>, "queryKey" | "queryFn">
) {
  return useQuery<AgentDraft>({
    queryKey: spaceKeys.draft(id),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any }>(`/agents/${id}`);
      const a = res.data;
      return {
        ...a,
        status: a.status === "ACTIVE" ? "deployed" : (a.status === "ARCHIVED" ? "archived" : "draft"),
        flow_data: a.config?.flow_data || null,
      };
    },
    enabled: !!id,
    ...options,
  });
}

export function useAgentVersions(
  draftId: string,
  options?: Omit<UseQueryOptions<AgentVersion[]>, "queryKey" | "queryFn">
) {
  return useQuery<AgentVersion[]>({
    queryKey: spaceKeys.versions(draftId),
    queryFn: async () => {
      const res = await api.get<{ success: boolean; data: any[] }>(`/agents/${draftId}/versions`);
      return res.data;
    },
    enabled: !!draftId,
    ...options,
  });
}

export function useCreateDraft() {
  const queryClient = useQueryClient();
  return useMutation<
    AgentDraft,
    Error,
    { name: string; description?: string; framework: string; category?: string; tags?: string[]; teamId?: string }
  >({
    mutationFn: async (data) => {
      const res = await api.post<any>("/agents", { ...data, status: "DRAFT" });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useUpdateDraft() {
  const queryClient = useQueryClient();
  return useMutation<AgentDraft, Error, { id: string; data: Partial<AgentDraft> }>({
    mutationFn: async ({ id, data }) => {
      // Map frontend flow_data into backend config object
      const updatePayload: any = { ...data };
      if (data.flow_data) {
        updatePayload.config = {
          ...(data.config || {}),
          flow_data: data.flow_data,
        };
        delete updatePayload.flow_data;
      }
      const res = await api.patch<any>(`/agents/${id}`, updatePayload);
      return res.data;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.draft(vars.id) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useDeleteDraft() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (id) => api.delete<void>(`/agents/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useDeployDraft() {
  const queryClient = useQueryClient();
  return useMutation<
    DeploymentInfo,
    Error,
    { draftId: string; visibility: string }
  >({
    mutationFn: async ({ draftId, visibility }) => {
      // Create a version snapshot before deploying
      await api.post(`/agents/${draftId}/versions`, { changelog: "Auto-saved on deployment" });
      // Deploy by promoting status to ACTIVE
      const res = await api.patch<any>(`/agents/${draftId}`, { 
        status: "ACTIVE", 
        isPublic: visibility === "public" || visibility === "paid"
      });
      return { 
        status: "live",
        visibility: visibility,
        endpoint_url: `/api/v1/agents/${draftId}/run`,
      } as unknown as DeploymentInfo;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

export function useCreateVersion() {
  const queryClient = useQueryClient();
  return useMutation<AgentVersion, Error, { draftId: string; changelog: string }>({
    mutationFn: async ({ draftId, changelog }) => {
      const res = await api.post<any>(`/agents/${draftId}/versions`, { changelog });
      return res.data;
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.versions(vars.draftId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.draft(vars.draftId) });
    },
  });
}

export function useRollbackVersion() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { draftId: string; versionId: string; changelog?: string }>({
    mutationFn: async ({ draftId, versionId, changelog }) => {
      await api.post(`/agents/${draftId}/versions/${versionId}/rollback`, { changelog });
    },
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: spaceKeys.versions(vars.draftId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.draft(vars.draftId) });
      queryClient.invalidateQueries({ queryKey: spaceKeys.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Leaderboard, Team, API Marketplace
// ---------------------------------------------------------------------------

export function useLeaderboard() {
  return useQuery({
    queryKey: queryKeys.leaderboard,
    queryFn: () => api.get<any>("/leaderboard"),
    retry: 1,
    staleTime: 60_000,
  });
}

export function useTeam(teamId: string) {
  return useQuery({
    queryKey: queryKeys.team.detail(teamId),
    queryFn: () => api.get<any>(`/teams/${teamId}`),
    retry: 1,
    enabled: !!teamId,
  });
}


export function useSystemHealth() {
  return useQuery<any>({
    queryKey: ["system-health"],
    queryFn: async () => {
      const res = await api.get<any>("/health");
      return res.data;
    },
    refetchInterval: 10000, // refresh every 10s
  });
}
