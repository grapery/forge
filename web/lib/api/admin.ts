import forgeClient from "./client"
import type {
  LoginRequest, LoginResponse, AdminUser, OverviewStats, PaginatedData,
  AdminOperationLog, Feedback, FeedbackStatusCount, Report, ReportStatusCounts,
  ContentReport, UserBlock, BlockCounts, ModerationSummary,
  PlatformUser, UserStatusCount, ContentItem, ContentStatusCount,
  TopicStats, PromptAuditRecord, PromptAuditSummary,
  CharacterItem, CharacterStatusCount,
  CommentItem, CommentStatusCount,
  AccountDeletionItem, AccountDeletionStatusCount,
  MembershipItem, MembershipSummary, MembershipUpsertRequest, MembershipRenewRequest, MembershipCancelRequest, SubscriptionPlanItem, SubscriptionOrderItem, OrderSummary,
  TokenTransactionItem, TokenSummary,
  AITaskItem, AITaskSummary, AIGenerationRecordItem, AIGenerationSummary,
  AgentItem, AgentSkillItem, AgentInteractionItem,
  TagItem,
  StyleConfigItem,
  GenreCatalogItem,
  InvitationCodeItem, ReferralItem,
  UserDeviceItem, DevicePlatformCount, NotificationItem,
  SearchHistoryItem, SearchTrend,
  ShareEventItem, ShareOverview,
  WorkflowDraft, CreateWorkflowDraftRequest, WorkflowBinding, WorkflowRelease, WorkflowCatalogEntry, WorkflowReleaseStats, PromptTemplateDraft, PromptTemplateDraftRequest,
  SafetyAssetItem, SafetyConversationItem,
} from "../types"

export const authApi = {
  login: (data: LoginRequest) =>
    forgeClient.post<any, LoginResponse>("/api/admin/auth/login", data),
  refresh: (refreshToken: string) =>
    forgeClient.post<any, LoginResponse>("/api/admin/auth/refresh", { refreshToken }),
  getProfile: () =>
    forgeClient.get<any, AdminUser>("/api/admin/auth/profile"),
  changePassword: (oldPassword: string, newPassword: string) =>
    forgeClient.put("/api/admin/auth/password", { oldPassword, newPassword }),
}

export const dashboardApi = {
  getOverview: (range?: "7d" | "30d" | "90d") =>
    forgeClient.get<any, OverviewStats>("/api/admin/dashboard/overview", { params: range ? { range } : undefined }),
  collectStats: (date?: string) =>
    forgeClient.post<any, { code: number; message: string }>("/api/admin/dashboard/collect-stats" + (date ? `?date=${date}` : "")),
}

export const adminUserApi = {
  list: (page = 1, pageSize = 20) =>
    forgeClient.get<any, PaginatedData<AdminUser>>("/api/admin/admin-users", { params: { page, pageSize } }),
  create: (data: { username: string; email: string; password: string; displayName?: string; role: string }) =>
    forgeClient.post<any, AdminUser>("/api/admin/admin-users", data),
  update: (id: string, data: { displayName?: string; role?: string; status?: string }) =>
    forgeClient.put<any, AdminUser>(`/api/admin/admin-users/${id}`, data),
  resetPassword: (id: string, newPassword: string) =>
    forgeClient.put(`/api/admin/admin-users/${id}/password-reset`, { newPassword }),
  delete: (id: string) =>
    forgeClient.delete(`/api/admin/admin-users/${id}`),
  getPermissions: (id: string) =>
    forgeClient.get<any, string[]>(`/api/admin/admin-users/${id}/permissions`),
  updatePermissions: (id: string, permissions: string[]) =>
    forgeClient.put(`/api/admin/admin-users/${id}/permissions`, { permissions }),
}

export const auditLogApi = {
  list: (params: { page?: number; pageSize?: number; adminId?: string; action?: string; resource?: string; startDate?: string; endDate?: string }) =>
    forgeClient.get<any, PaginatedData<AdminOperationLog>>("/api/admin/operations/log", { params }),
}

export const feedbackApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; category?: string; userId?: string; keyword?: string; overdue?: boolean }) =>
    forgeClient.get<any, PaginatedData<Feedback>>("/api/admin/feedback", {
      params: { ...params, overdue: params.overdue ? "1" : undefined },
    }),
  get: (id: string) =>
    forgeClient.get<any, Feedback>(`/api/admin/feedback/${id}`),
  update: (id: string, data: { status?: string; response?: string }) =>
    forgeClient.put<any, Feedback>(`/api/admin/feedback/${id}`, data),
  statusCounts: () =>
    forgeClient.get<any, FeedbackStatusCount>("/api/admin/feedback/counts"),
}

export const reportApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; overdue?: boolean; keyword?: string; reporterId?: string; reportedId?: string }) =>
    forgeClient.get<any, PaginatedData<Report>>("/api/admin/reports", {
      params: {
        ...params,
        overdue: params.overdue ? "1" : undefined,
      },
    }),
  get: (id: string) =>
    forgeClient.get<any, Report>(`/api/admin/reports/${id}`),
  review: (id: string, data: { status: string; remarks?: string }) =>
    forgeClient.put<any, Report>(`/api/admin/reports/${id}/review`, data),
  statusCounts: () =>
    forgeClient.get<any, ReportStatusCounts>("/api/admin/reports/counts"),
  listContent: (params: { page?: number; pageSize?: number; status?: string; contentType?: string; overdue?: boolean; keyword?: string; reporterId?: string }) =>
    forgeClient.get<any, PaginatedData<ContentReport>>("/api/admin/reports/content", {
      params: {
        ...params,
        overdue: params.overdue ? "1" : undefined,
      },
    }),
  getContent: (id: string) =>
    forgeClient.get<any, ContentReport>(`/api/admin/reports/content/${id}`),
  reviewContent: (id: string, data: { status: string; remarks?: string }) =>
    forgeClient.put<any, ContentReport>(`/api/admin/reports/content/${id}/review`, data),
  resolveContent: (id: string, data: { status: string; remarks?: string; actions?: string[] }) =>
    forgeClient.post<any, ContentReport>(`/api/admin/reports/content/${id}/resolve`, data),
  contentStatusCounts: () =>
    forgeClient.get<any, Record<string, number>>("/api/admin/reports/content/counts"),
  moderationSummary: () =>
    forgeClient.get<any, ModerationSummary>("/api/admin/reports/moderation-summary"),
  suspendUser: (userId: string) =>
    forgeClient.put(`/api/admin/users/${userId}/suspend`),
  activateUser: (userId: string) =>
    forgeClient.put(`/api/admin/users/${userId}/activate`),
}

export const blockApi = {
  list: (params: { page?: number; pageSize?: number; blockerId?: string; blockedId?: string; search?: string }) =>
    forgeClient.get<any, PaginatedData<UserBlock>>("/api/admin/blocks", { params }),
  get: (id: string) =>
    forgeClient.get<any, UserBlock>(`/api/admin/blocks/${id}`),
  counts: () =>
    forgeClient.get<any, BlockCounts>("/api/admin/blocks/counts"),
}

export const safetyReviewApi = {
  assets: (params: { page?: number; pageSize?: number; userId?: string; type?: string }) => forgeClient.get<any, PaginatedData<SafetyAssetItem>>("/api/admin/safety-review/assets", { params }),
  conversations: (params: { page?: number; pageSize?: number; userId?: string; sessionType?: string }) => forgeClient.get<any, PaginatedData<SafetyConversationItem>>("/api/admin/safety-review/conversations", { params }),
}

export const userApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; status?: string }) =>
    forgeClient.get<any, PaginatedData<PlatformUser>>("/api/admin/users", { params }),
  get: (id: string) =>
    forgeClient.get<any, PlatformUser>(`/api/admin/users/${id}`),
  statusCounts: () =>
    forgeClient.get<any, UserStatusCount>("/api/admin/users/counts"),
  suspend: (id: string) =>
    forgeClient.put(`/api/admin/users/${id}/suspend`),
  activate: (id: string) =>
    forgeClient.put(`/api/admin/users/${id}/activate`),
}

export const contentApi = {
  list: (params: { page?: number; pageSize?: number; contentType?: string; search?: string; status?: string; authorId?: string; lineage?: "root" | "continuation"; lifecycle?: "active" | "removed" | "all"; reportState?: "reported" | "pending_reports" | "unreported" }) =>
    forgeClient.get<any, PaginatedData<ContentItem>>("/api/admin/content", { params }),
  get: (contentType: string, id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/content/${contentType}/${id}`),
  statusCounts: (contentType: string) =>
    forgeClient.get<any, ContentStatusCount>(`/api/admin/content/${contentType}/counts`),
  action: (contentType: string, id: string, data: { action: string; reason?: string }) =>
    forgeClient.put(`/api/admin/content/${contentType}/${id}/action`, data),
}

export const topicApi = {
  list: (params: { page?: number; pageSize?: number; search?: string }) =>
    forgeClient.get<any, PaginatedData<TopicStats>>("/api/admin/topics", { params }),
  fragments: (topic: string, params: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<any>>(`/api/admin/topics/${encodeURIComponent(topic)}/fragments`, { params }),
  stories: (topic: string, params: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<any>>(`/api/admin/topics/${encodeURIComponent(topic)}/stories`, { params }),
}

export const promptApi = {
  list: (params: { page?: number; pageSize?: number; provider?: string; model?: string; promptKind?: string; relatedEntityType?: string }) =>
    forgeClient.get<any, PaginatedData<PromptAuditRecord>>("/api/admin/prompts/audit", { params }),
  get: (id: string) =>
    forgeClient.get<any, PromptAuditRecord>(`/api/admin/prompts/audit/${id}`),
  summary: () =>
    forgeClient.get<any, PromptAuditSummary>("/api/admin/prompts/audit/summary"),
}

export const promptTemplateApi = {
  list: (params: { page?: number; pageSize?: number; status?: string }) =>
    forgeClient.get<any, PaginatedData<PromptTemplateDraft>>("/api/admin/prompt-templates", { params }),
  create: (data: PromptTemplateDraftRequest) =>
    forgeClient.post<any, PromptTemplateDraft>("/api/admin/prompt-templates", data),
  update: (id: string, data: Omit<PromptTemplateDraftRequest, "key"> & { revision: number }) =>
    forgeClient.put<any, PromptTemplateDraft>(`/api/admin/prompt-templates/${id}`, data),
  cloneNextVersion: (id: string) =>
    forgeClient.post<any, PromptTemplateDraft>(`/api/admin/prompt-templates/${id}/clone`),
  submit: (id: string) => forgeClient.post(`/api/admin/prompt-templates/${id}/submit`),
  review: (id: string, decision: "approved" | "rejected", comment?: string) =>
    forgeClient.post(`/api/admin/prompt-templates/${id}/review`, { decision, comment }),
  publish: (id: string) => forgeClient.post(`/api/admin/prompt-templates/${id}/publish`),
}

export const workflowApi = {
  list: (params: { page?: number; pageSize?: number; status?: string }) =>
    forgeClient.get<any, PaginatedData<WorkflowDraft>>("/api/admin/workflows", { params }),
  get: (id: string) =>
    forgeClient.get<any, { draft: WorkflowDraft; approvals: Array<Record<string, unknown>> }>(`/api/admin/workflows/${id}`),
  create: (data: CreateWorkflowDraftRequest) =>
    forgeClient.post<any, WorkflowDraft>("/api/admin/workflows", data),
  generate: (prompt: string) =>
    forgeClient.post<any, CreateWorkflowDraftRequest>("/api/admin/workflows/generate", { prompt }),
  update: (id: string, data: Partial<CreateWorkflowDraftRequest> & { revision: number }) =>
    forgeClient.put<any, WorkflowDraft>(`/api/admin/workflows/${id}`, data),
  cloneNextVersion: (id: string) =>
    forgeClient.post<any, WorkflowDraft>(`/api/admin/workflows/${id}/clone`),
  submit: (id: string) => forgeClient.post(`/api/admin/workflows/${id}/submit`),
  review: (id: string, decision: "approved" | "rejected", comment?: string) =>
    forgeClient.post(`/api/admin/workflows/${id}/review`, { decision, comment }),
  publish: (id: string) => forgeClient.post<any, WorkflowRelease>(`/api/admin/workflows/${id}/publish`),
  bind: (data: WorkflowBinding) => forgeClient.post<any, WorkflowBinding>("/api/admin/workflows/bindings", data),
  pauseReleaseBindings: (releaseId: string) => forgeClient.post<any, { releaseId: string; disabledBindings: number }>(`/api/admin/workflows/releases/${releaseId}/pause-bindings`),
  rebindRelease: (releaseId: string, data: { surface: string; action: string; workflowKey: string }) => forgeClient.post<any, { releaseId: string; updatedBindings: number }>(`/api/admin/workflows/releases/${releaseId}/rebind`, data),
  listBindings: (params: { surface: string; action: string; tenantId?: string }) =>
    forgeClient.get<any, { items: WorkflowCatalogEntry[] }>("/api/admin/workflows/bindings", { params }),
  startTestRun: (id: string, data: { surface: string; action: string; input: Record<string, unknown>; testRun?: boolean }) =>
    forgeClient.post<any, Record<string, unknown>>(`/api/admin/workflows/${id}/test-runs`, data),
  getTestRun: (runId: string) =>
    forgeClient.get<any, Record<string, unknown>>(`/api/admin/workflows/test-runs/${encodeURIComponent(runId)}`),
  getTestRunResult: (runId: string) =>
    forgeClient.get<any, Record<string, unknown>>(`/api/admin/workflows/test-runs/${encodeURIComponent(runId)}/result`),
  listTestRuns: (releaseId: string) =>
    forgeClient.get<any, { items: Array<Record<string, unknown>> }>(`/api/admin/workflows/releases/${encodeURIComponent(releaseId)}/test-runs`),
  stats: (days = 30) =>
    forgeClient.get<any, { items: WorkflowReleaseStats[]; days: number }>("/api/admin/workflows/stats", { params: { days } }),
}

export const characterApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; isPublic?: boolean; authorId?: string; lifecycle?: "active" | "removed" | "all" }) =>
    forgeClient.get<any, PaginatedData<CharacterItem>>("/api/admin/characters", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/characters/${id}`),
  statusCounts: () =>
    forgeClient.get<any, CharacterStatusCount>("/api/admin/characters/counts"),
  action: (id: string, data: { action: string; reason?: string }) =>
    forgeClient.put(`/api/admin/characters/${id}/action`, data),
}

export const commentApi = {
  list: (params: { page?: number; pageSize?: number; targetType?: string; targetId?: string; authorId?: string; search?: string; lifecycle?: "active" | "removed" | "all" }) =>
    forgeClient.get<any, PaginatedData<CommentItem>>("/api/admin/comments", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/comments/${id}`),
  statusCounts: () =>
    forgeClient.get<any, CommentStatusCount>("/api/admin/comments/counts"),
  delete: (id: string) =>
    forgeClient.delete(`/api/admin/comments/${id}`),
  restore: (id: string) => forgeClient.put(`/api/admin/comments/${id}/restore`),
}

export const accountDeletionApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; userId?: string }) =>
    forgeClient.get<any, PaginatedData<AccountDeletionItem>>("/api/admin/account-deletions", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/account-deletions/${id}`),
  statusCounts: () =>
    forgeClient.get<any, AccountDeletionStatusCount>("/api/admin/account-deletions/counts"),
  action: (id: string, data: { action: string; reason?: string }) =>
    forgeClient.put(`/api/admin/account-deletions/${id}/action`, data),
}

// Membership API
export const membershipApi = {
  list: (params: { page?: number; pageSize?: number; tier?: string; status?: string; userId?: string }) =>
    forgeClient.get<any, PaginatedData<MembershipItem>>("/api/admin/memberships", { params }),
  summary: () =>
    forgeClient.get<any, MembershipSummary>("/api/admin/memberships/summary"),
  upsert: (req: MembershipUpsertRequest) =>
    forgeClient.post<any, { code: number; message: string }>("/api/admin/memberships", req),
  renew: (id: string, req: MembershipRenewRequest) =>
    forgeClient.post<any, { code: number; message: string }>(`/api/admin/memberships/${id}/renew`, req),
  cancel: (id: string, req: MembershipCancelRequest) =>
    forgeClient.post<any, { code: number; message: string }>(`/api/admin/memberships/${id}/cancel`, req),
}

// Plan API
export const planApi = {
  list: (params: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<SubscriptionPlanItem>>("/api/admin/plans", { params }),
  create: (data: Record<string, any>) =>
    forgeClient.post("/api/admin/plans", data),
  update: (id: string, data: Record<string, any>) =>
    forgeClient.put(`/api/admin/plans/${id}`, data),
}

// Order API
export const orderApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; userId?: string; dateFrom?: string; dateTo?: string }) =>
    forgeClient.get<any, PaginatedData<SubscriptionOrderItem>>("/api/admin/orders", { params }),
  get: (id: string) =>
    forgeClient.get<any, SubscriptionOrderItem>(`/api/admin/orders/${id}`),
  summary: () =>
    forgeClient.get<any, OrderSummary>("/api/admin/orders/summary"),
  refund: (id: string, data: { reason: string }) =>
    forgeClient.post(`/api/admin/orders/${id}/refund`, data),
}

// Token API
export const tokenApi = {
  list: (params: { page?: number; pageSize?: number; type?: string; userId?: string; dateFrom?: string; dateTo?: string; keyword?: string }) =>
    forgeClient.get<any, PaginatedData<TokenTransactionItem>>("/api/admin/tokens", { params }),
  summary: () =>
    forgeClient.get<any, TokenSummary>("/api/admin/tokens/summary"),
}

// AI Task API
export const aiTaskApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; type?: string; userId?: string; provider?: string; model?: string; dateFrom?: string; dateTo?: string }) =>
    forgeClient.get<any, PaginatedData<AITaskItem>>("/api/admin/ai-tasks", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/ai-tasks/${id}`),
  summary: () =>
    forgeClient.get<any, AITaskSummary>("/api/admin/ai-tasks/summary"),
  cancel: (id: string) =>
    forgeClient.post(`/api/admin/ai-tasks/${id}/cancel`),
}

// AI Generation API
export const aiGenerationApi = {
  list: (params: { page?: number; pageSize?: number; type?: string; status?: string; userId?: string; dateFrom?: string; dateTo?: string; keyword?: string; relatedEntityType?: string }) =>
    forgeClient.get<any, PaginatedData<AIGenerationRecordItem>>("/api/admin/ai-generations", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/ai-generations/${id}`),
  summary: () =>
    forgeClient.get<any, AIGenerationSummary>("/api/admin/ai-generations/summary"),
}

// Agent API
export const agentApi = {
  list: (params: { page?: number; pageSize?: number; status?: string }) =>
    forgeClient.get<any, PaginatedData<AgentItem>>("/api/admin/agents", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/agents/${id}`),
  skills: (id: string, params: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<AgentSkillItem>>(`/api/admin/agents/${id}/skills`, { params }),
  interactions: (id: string, params: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<AgentInteractionItem>>(`/api/admin/agents/${id}/interactions`, { params }),
  stats: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/agents/${id}/stats`),
  updateStatus: (id: string, data: { status: string }) =>
    forgeClient.put(`/api/admin/agents/${id}/status`, data),
}

// Tag API
export const tagApi = {
  list: (params: { page?: number; pageSize?: number; category?: string; search?: string }) =>
    forgeClient.get<any, PaginatedData<TagItem>>("/api/admin/tags", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/tags/${id}`),
  create: (data: { name: string; category: string }) =>
    forgeClient.post("/api/admin/tags", data),
  update: (id: string, data: { name?: string; category?: string }) =>
    forgeClient.put(`/api/admin/tags/${id}`, data),
  delete: (id: string) =>
    forgeClient.delete(`/api/admin/tags/${id}`),
}

// Style API
export const styleApi = {
  list: (params: { page?: number; pageSize?: number; search?: string; userId?: string }) =>
    forgeClient.get<any, PaginatedData<StyleConfigItem>>("/api/admin/styles", { params }),
  get: (id: string) =>
    forgeClient.get<any, Record<string, any>>(`/api/admin/styles/${id}`),
  update: (id: string, data: { description?: string; sampleImageUrl?: string }) =>
    forgeClient.put(`/api/admin/styles/${id}`, data),
  delete: (id: string) =>
    forgeClient.delete(`/api/admin/styles/${id}`),
}

// Genre API
export const genreApi = {
  list: (params: { page?: number; pageSize?: number; search?: string }) =>
    forgeClient.get<any, PaginatedData<GenreCatalogItem>>("/api/admin/genres", { params }),
  update: (id: string, data: Record<string, any>) =>
    forgeClient.put(`/api/admin/genres/${id}`, data),
}

// Invitation API
export const invitationApi = {
  listCodes: (params: { page?: number; pageSize?: number; isActive?: boolean; createdBy?: string }) =>
    forgeClient.get<any, PaginatedData<InvitationCodeItem>>("/api/admin/invitation-codes", { params }),
  createCode: (data: { maxUses?: number; expiresAt?: string; description?: string }) =>
    forgeClient.post("/api/admin/invitation-codes", data),
  toggleCode: (id: string, isActive: boolean) =>
    forgeClient.put(`/api/admin/invitation-codes/${id}?isActive=${isActive}`),
  listReferrals: (params: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<ReferralItem>>("/api/admin/referrals", { params }),
}

// Device API
export const deviceApi = {
  list: (params: { page?: number; pageSize?: number; userId?: string; platform?: string; isActive?: boolean }) =>
    forgeClient.get<any, PaginatedData<UserDeviceItem>>("/api/admin/devices", { params }),
  platformCounts: () =>
    forgeClient.get<any, DevicePlatformCount>("/api/admin/devices/counts"),
}

// Notification API
export const notificationApi = {
  list: (params: { page?: number; pageSize?: number; userId?: string; type?: string }) =>
    forgeClient.get<any, PaginatedData<NotificationItem>>("/api/admin/notifications", { params }),
  broadcast: (data: {
    title: string
    content: string
    type?: string
    link?: string
    userIds?: string[]
    allActive?: boolean
    platform?: string
  }) =>
    forgeClient.post<any, { sent: number; failed: number; total: number }>("/api/admin/notifications/broadcast", data),
}

// Search Analytics API
export const searchApi = {
  history: (params: { page?: number; pageSize?: number; type?: string; userId?: string }) =>
    forgeClient.get<any, PaginatedData<SearchHistoryItem>>("/api/admin/search/history", { params }),
  trends: (limit?: number) =>
    forgeClient.get<any, SearchTrend[]>("/api/admin/search/trends", { params: { limit } }),
}

export const shareApi = {
  overview: (range?: "7d" | "30d" | "90d") =>
    forgeClient.get<any, ShareOverview>("/api/admin/shares/overview", { params: range ? { range } : undefined }),
  events: (params: { page?: number; pageSize?: number; eventType?: string; kind?: string }) =>
    forgeClient.get<any, PaginatedData<ShareEventItem>>("/api/admin/shares/events", { params }),
}

export type OpsAssistantStatus = {
  configured: boolean
  provider: string
  model: string
  tools: number
  skills?: number
  mcp: boolean
}

export type OpsToolDef = {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export type OpsAnalysisSkill = {
  id: string
  title: string
  titleZh: string
  process: string
  processZh: string
  howToAnalyze: string
  howToAnalyzeZh: string
  suggestedTools: string[]
  chipPrompt: string
  chipPromptZh: string
}

export type OpsSession = {
  id: string
  adminId: string
  title: string
  status: string
  provider?: string
  model?: string
  skillId?: string
  createdAt: number
  updatedAt: number
}

export type OpsToolCallRecord = {
  id: string
  messageId: string
  sessionId: string
  name: string
  input?: string
  output?: string
  error?: string
  citation?: string
  createdAt: number
}

export type OpsSessionMessage = {
  id: string
  sessionId: string
  adminId: string
  role: "user" | "assistant"
  content: string
  seq: number
  createdAt: number
  tools?: OpsToolCallRecord[]
}

export type OpsSessionDetail = {
  session: OpsSession
  messages: OpsSessionMessage[]
}

export const opsAssistantApi = {
  status: () => forgeClient.get<any, OpsAssistantStatus>("/api/admin/ops-assistant/status"),
  tools: () => forgeClient.get<any, OpsToolDef[]>("/api/admin/ops-assistant/tools"),
  skills: () => forgeClient.get<any, OpsAnalysisSkill[]>("/api/admin/ops-assistant/skills"),
  getSkill: (id: string) => forgeClient.get<any, OpsAnalysisSkill>(`/api/admin/ops-assistant/skills/${id}`),
  listSessions: (params?: { page?: number; pageSize?: number }) =>
    forgeClient.get<any, PaginatedData<OpsSession>>("/api/admin/ops-assistant/sessions", { params }),
  createSession: (data?: { title?: string }) =>
    forgeClient.post<any, OpsSession>("/api/admin/ops-assistant/sessions", data || {}),
  getSession: (id: string) =>
    forgeClient.get<any, OpsSessionDetail>(`/api/admin/ops-assistant/sessions/${id}`),
  renameSession: (id: string, title: string) =>
    forgeClient.patch<any, OpsSession>(`/api/admin/ops-assistant/sessions/${id}`, { title }),
  deleteSession: (id: string) =>
    forgeClient.delete<any, { id: string; status: string }>(`/api/admin/ops-assistant/sessions/${id}`),
}
