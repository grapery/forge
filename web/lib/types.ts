export interface AdminUser {
  id: string
  username: string
  email: string
  displayName: string
  role: "super_admin" | "admin" | "operator" | "viewer"
  status: "active" | "disabled"
  permissions: string[]
  lastLoginAt?: number | null
  lastLoginIp?: string
  createdAt: number
  updatedAt: number
}

export interface LoginRequest {
  username: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: AdminUser
}

export interface OverviewStats {
  totalUsers: number
  totalStories: number
  totalStoryboards: number
  totalFragments: number
  totalCharacters: number
  totalAITasks: number
  activeMemberships: number
  totalOrders: number
  totalTokenTransactions: number
  totalForkEvents: number
  totalTokenConsumed: number
  pendingUserReports?: number
  pendingContentReports?: number
  overdueReportsTotal?: number
  openFeedback?: number
  overdueFeedback?: number
  criticalFeedback?: number
  trends: DailyTrend[]
}

export interface DailyTrend {
  date: string
  totalUsers: number
  newUsers: number
  totalStories: number
  newStories: number
  totalCharacters: number
  newCharacters: number
  totalOrders: number
  newOrders: number
  newRevenue: number
  totalAITasks: number
  newAITasks: number
  totalFragments: number
  newFragments: number
  totalStoryboards: number
  newStoryboards: number
  forkEvents: number
  tokenConsumed: number
}

export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface AdminOperationLog {
  id: string
  adminId: string
  adminName: string
  action: string
  resource: string
  resourceId: string
  beforeValue?: string
  afterValue?: string
  ip: string
  userAgent: string
  createdAt: number
}

export interface Feedback {
  id: string
  userId: string
  userName?: string
  category: string
  content: string
  contactInfo?: string
  status: string
  response?: string
  createdAt: number
  updatedAt?: number
  userNotified?: boolean
}

export interface FeedbackStatusCount {
  received: number
  processing: number
  resolved: number
  closed: number
  overdue?: number
  critical?: number
}

export interface Report {
  id: string
  reporterId: string
  reportedId: string
  reason: string
  status: string
  isOverdue?: boolean
  reporterName?: string
  reportedName?: string
  reviewRemarks?: string
  reviewedBy?: string
  reviewedAt?: number
  createdAt: number
  updatedAt?: number
  reporterNotified?: boolean
}

export interface ReportStatusCounts {
  pending: number
  reviewed: number
  resolved: number
  dismissed: number
  overdue: number
}

export interface ContentReport {
  id: string
  reporterId: string
  contentType: string
  contentId: string
  reason: string
  status: string
  isOverdue?: boolean
  reporterName?: string
  creatorId?: string
  creatorName?: string
  contentTitle?: string
  contentPreview?: string
  contentStatus?: string
  contentDeleted?: boolean
  reviewRemarks?: string
  reviewedBy?: string
  reviewedAt?: number
  createdAt: number
  updatedAt?: number
  reporterNotified?: boolean
}

export interface UserBlock {
  id: string
  blockerId: string
  blockedId: string
  blockerName?: string
  blockedName?: string
  createdAt: number
}

export interface BlockCounts {
  total: number
  last7Days: number
}

export interface ModerationSummary {
  pendingUserReports: number
  pendingContentReports: number
  overdueTotal: number
}

export interface PlatformUser {
  id: string
  username: string
  email: string
  displayName: string
  avatar: string
  background: string
  bio: string
  location: string
  website: string
  phone: string
  status: string
  emailVerified: boolean
  followers: number
  following: number
  storyboardCount: number
  fragmentsCount: number
  points: number
  referralCode: string
  lastLoginAt: number | null
  createdAt: number
  updatedAt: number
}

export interface UserStatusCount {
  active: number
  suspended: number
  deleted: number
}

export interface ContentItem {
  id: string
  title: string
  contentType: string
  authorId: string
  authorName: string
  status: string
  visibility: string
  likes: number
  comments: number
  createdAt: number
  updatedAt: number
}

export interface ContentStatusCount {
  total: number
  published: number
  draft: number
  other: number
}

export interface TopicStats {
  topic: string
  fragmentCount: number
  storyCount: number
  latestActivity: number
}

export interface PromptAuditRecord {
  id: string
  runId: string
  relatedEntityType: string
  relatedEntityId: string
  step: string
  promptKind: string
  promptTemplateVersion: string
  provider: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt: string
  userPrompt: string
  finalPrompt: string
  output: string
  inputTokens: number
  outputTokens: number
  alignmentSnapshotHash: string
  fullPromptHash: string
  referenceImageUrls: string
  tokenUsageJson: string
  metadataJson: string
  createdAt: number
}

export interface PromptAuditSummary {
  totalRecords: number
  totalTokens: number
  topProviders: { provider: string; count: number }[]
}

// Character management types
export interface CharacterItem {
  id: string
  name: string
  storyId: string
  authorId: string
  authorName: string
  description: string
  avatar: string
  poster: string
  portrait: string
  portraitGenerationStatus: string
  isPublic: boolean
  aiGenerated: boolean
  sourceType: string
  aiStyle: string
  likes: number
  comments: number
  shares: number
  followers: number
  stories: number
  createdAt: number
  updatedAt: number
}

export interface CharacterStatusCount {
  total: number
  public: number
  private: number
  aiGenerated: number
}

// Comment management types
export interface CommentItem {
  id: string
  authorId: string
  authorName: string
  content: string
  targetType: string
  targetId: string
  parentId: string
  rootId: string
  likes: number
  dislikes: number
  replyCount: number
  createdAt: number
}

export interface CommentStatusCount {
  total: number
  storyComments: number
  fragmentComments: number
  characterComments: number
}

// Account deletion types
export interface AccountDeletionItem {
  id: string
  userId: string
  userName: string
  reason: string
  feedback: string
  status: string
  requestedAt: number
  scheduledDeletionAt: number
  processedAt: number | null
  cancelledAt: number | null
  cancelledReason: string
  createdAt: number
}

export interface AccountDeletionStatusCount {
  pending: number
  processing: number
  completed: number
  cancelled: number
}

// Payment & Subscription types
export interface MembershipItem {
  id: string
  userId: string
  userName: string
  tier: string
  status: string
  startDate: number
  endDate: number | null
  autoRenew: boolean
  tokenQuota: number
  tokenUsed: number
  storageQuota: number
  storageUsed: number
  createdAt: number
  updatedAt: number
}

export interface MembershipSummary {
  freeCount: number
  basicCount: number
  proCount: number
  premiumCount: number
  totalActive: number
}

export type MembershipTier = "basic" | "pro" | "premium"

export interface MembershipUpsertRequest {
  userId: string
  tier: MembershipTier
  tokenQuota: number
  endDate: number
  autoRenew: boolean
  reason: string
}

export interface MembershipRenewRequest {
  extendDays: number
  topUpTokens?: number
  reason: string
}

export interface MembershipCancelRequest {
  reason: string
}

export interface SubscriptionPlanItem {
  id: string
  name: string
  membershipTier: string
  billingPeriod: string
  price: number
  currency: string
  tokenQuota: number
  maxStories: number
  maxCharacters: number
  features: string
  isActive: boolean
  sortOrder: number
  createdAt: number
}

export interface SubscriptionOrderItem {
  id: string
  userId: string
  userName: string
  planId: string
  planName: string
  status: string
  paymentMethod: string
  paymentId?: string
  amount: number
  currency: string
  startDate?: number
  endDate?: number
  createdAt: number
  updatedAt?: number
  paidAt: number | null
}

export interface OrderSummary {
  totalRevenue: number
  totalOrders: number
  pendingCount: number
  completedCount: number
  refundedCount: number
  /** @deprecated use pendingCount */
  pendingOrders?: number
  /** @deprecated use completedCount */
  paidOrders?: number
}

// Token transaction types
export interface TokenTransactionItem {
  id: string
  userId: string
  userName: string
  type: string
  amount: number
  balance: number
  description: string
  referenceId: string
  createdAt: number
}

export interface TokenSummary {
  totalConsumed: number
  totalRecharged: number
  totalRefunded: number
  totalGifted: number
}

// AI Task types
export interface AITaskItem {
  id: string
  userId: string
  userName: string
  type: string
  status: string
  provider: string
  model: string
  tokensUsed: number
  progress: number
  relatedEntityId: string
  relatedEntityType: string
  errorMessage: string
  createdAt: number
  startedAt: number | null
  completedAt: number | null
}

export interface AITaskSummary {
  totalTasks: number
  pendingTasks: number
  completedTasks: number
  failedTasks: number
  totalTokens: number
  topProviders: { provider: string; count: number }[]
}

export interface AIGenerationRecordItem {
  id: string
  userId: string
  userName: string
  type: string
  provider: string
  model: string
  originalPrompt: string
  enhancedPrompt: string
  inputTokens: number
  outputTokens: number
  totalTokens: number
  imageCount: number
  videoCount: number
  status: string
  durationMs: number
  relatedEntityId: string
  relatedEntityType: string
  errorMessage: string
  createdAt: number
}

export interface AIGenerationSummary {
  totalRecords: number
  totalTokens: number
  totalImages: number
  totalVideos: number
  avgDurationMs: number
}

// Agent types
export interface AgentItem {
  id: string
  characterId: string
  characterName: string
  name: string
  description: string
  status: string
  provider: string
  model: string
  interactionCount: number
  skillCount: number
  createdAt: number
  updatedAt: number
}

export interface AgentSkillItem {
  id: string
  agentId: string
  name: string
  displayName: string
  description: string
  type: string
  status: string
  usageCount: number
  successCount: number
  failureCount: number
  avgExecutionTime: number
  priority: number
  enabled: boolean
  createdAt: number
}

export interface AgentInteractionItem {
  id: string
  agentId: string
  userId: string
  characterId: string
  type: string
  tokensUsed: number
  duration: number
  success: boolean
  createdAt: number
}

// Tag management types
export interface TagItem {
  id: string
  name: string
  category: string
  usageCount: number
  createdAt: number
}

// Style config types
export interface StyleConfigItem {
  id: string
  style: string
  description: string
  sampleImageUrl: string
  userId: string
  userName: string
  createdAt: number
  updatedAt: number
}

// Genre catalog types
export interface GenreCatalogItem {
  id: string
  slug: string
  pageIndex: number
  sortOrder: number
  titleZh: string
  titleEn: string
  titleJa: string
  emoji: string
  source: string
  createdAt: number
}

// Invitation code types
export interface InvitationCodeItem {
  id: string
  code: string
  createdBy: string
  createdByName: string
  usedBy: string
  usedByName: string
  usedAt: number
  isActive: boolean
  maxUses: number
  currentUses: number
  expiresAt: number
  description: string
  createdAt: number
}

export interface ReferralItem {
  id: string
  referrerId: string
  referrerName: string
  refereeId: string
  refereeName: string
  referralCode: string
  pointsEarned: number
  status: string
  createdAt: number
}

// Device types
export interface UserDeviceItem {
  id: string
  userId: string
  userName: string
  deviceToken: string
  platform: string
  pushProvider: string
  deviceModel: string
  osVersion: string
  appVersion: string
  isActive: boolean
  lastActiveAt: number
  createdAt: number
}

export interface DevicePlatformCount {
  ios: number
  android: number
  other: number
}

// Notification types
export interface NotificationItem {
  id: string
  userId: string
  type: string
  title: string
  content: string
  link?: string
  read: boolean
  createdAt: number
}

// Search analytics types
export interface SearchHistoryItem {
  id: string
  userId: string
  userName: string
  query: string
  type: string
  resultCount: number
  createdAt: number
}

export interface SearchTrend {
  query: string
  count: number
}

// Share analytics types
export interface ShareEventItem {
  id: string
  eventType: string
  kind: string
  contentId: string
  userId?: string
  userName?: string
  platform?: string
  source?: string
  createdAt: number
}

export interface ShareKindCount {
  kind: string
  count: number
}

export interface ShareTrendPoint {
  date: string
  issues: number
  opens: number
}

export interface ShareOverview {
  totalIssues: number
  totalOpens: number
  issuesToday: number
  opensToday: number
  openRate: number
  byKindIssues: ShareKindCount[]
  byKindOpens: ShareKindCount[]
  daily: ShareTrendPoint[]
}

export interface WorkflowNode {
  id: string
  type: string
  activity?: string
  dependsOn?: string[]
  config?: Record<string, unknown>
}

export interface WorkflowDraft {
  id: string
  key: string
  version: number
  revision: number
  name: string
  description?: string
  status: "draft" | "reviewing" | "approved" | "rejected" | "released"
  manifest?: Record<string, unknown>
  definition: {
    inputSchema?: Record<string, unknown>
    outputSchema?: Record<string, unknown>
    nodes: WorkflowNode[]
  }
  promptBundle?: Record<string, string>
  policies?: {
    maxDurationSeconds?: number
    maxParallelism?: number
    maxAttempts?: number
  }
  createdBy: string
  updatedBy: string
  approvedBy?: string[]
  releaseId?: string
  releaseChecksum?: string
  createdAt: string
  updatedAt: string
}

export interface CreateWorkflowDraftRequest {
  key: string
  name: string
  description?: string
  manifest?: Record<string, unknown>
  definition: WorkflowDraft["definition"]
  promptBundle?: Record<string, string>
  policies?: WorkflowDraft["policies"]
}

export interface WorkflowBinding {
  id?: string
  surface: string
  action: string
  tenantId?: string
  workflowKey?: string
  releaseId: string
  priority?: number
  enabled: boolean
  conditions?: Record<string, unknown>
}

export interface WorkflowRelease {
  id: string
  key: string
  version: number
  checksum: string
}

export interface WorkflowCatalogEntry {
  binding: WorkflowBinding
  release: WorkflowRelease
}

export interface PromptTemplateDraft {
  id: string
  key: string
  version: number
  revision: number
  type: "text" | "chat" | "image"
  systemTemplate?: string
  userTemplate?: string
  variablesSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  modelConfig?: Record<string, unknown>
  status: "draft" | "reviewing" | "approved" | "rejected" | "released"
  createdBy: string
  updatedBy: string
  approvedBy?: string[]
  releaseId?: string
  releaseChecksum?: string
  createdAt: string
  updatedAt: string
}

export interface PromptTemplateDraftRequest {
  key: string
  type: PromptTemplateDraft["type"]
  systemTemplate?: string
  userTemplate?: string
  variablesSchema?: Record<string, unknown>
  outputSchema?: Record<string, unknown>
  modelConfig?: Record<string, unknown>
}
