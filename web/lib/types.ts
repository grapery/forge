export interface AdminUser {
  id: string
  username: string
  email: string
  displayName: string
  role: "super_admin" | "admin" | "operator" | "viewer"
  status: "active" | "disabled"
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
  category: string
  content: string
  contactInfo?: string
  status: string
  response?: string
  createdAt: number
  updatedAt?: number
}

export interface FeedbackStatusCount {
  received: number
  processing: number
  resolved: number
  closed: number
}

export interface Report {
  id: string
  reporterId: string
  reportedId: string
  reason: string
  status: string
  reporterName?: string
  reportedName?: string
  createdAt: number
  updatedAt?: number
}
