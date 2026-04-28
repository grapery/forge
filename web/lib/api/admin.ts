import forgeClient from "./client"
import type { LoginRequest, LoginResponse, AdminUser, OverviewStats, PaginatedData, AdminOperationLog, Feedback, FeedbackStatusCount, Report } from "../types"

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
  getOverview: () =>
    forgeClient.get<any, OverviewStats>("/api/admin/dashboard/overview"),
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
}

export const auditLogApi = {
  list: (params: { page?: number; pageSize?: number; adminId?: string; action?: string; resource?: string }) =>
    forgeClient.get<any, PaginatedData<AdminOperationLog>>("/api/admin/operations/log", { params }),
}

export const feedbackApi = {
  list: (params: { page?: number; pageSize?: number; status?: string; category?: string }) =>
    forgeClient.get<any, PaginatedData<Feedback>>("/api/admin/feedback", { params }),

  get: (id: string) =>
    forgeClient.get<any, Feedback>(`/api/admin/feedback/${id}`),

  update: (id: string, data: { status?: string; response?: string }) =>
    forgeClient.put<any, Feedback>(`/api/admin/feedback/${id}`, data),

  statusCounts: () =>
    forgeClient.get<any, FeedbackStatusCount>("/api/admin/feedback/counts"),
}

export const reportApi = {
  list: (params: { page?: number; pageSize?: number; status?: string }) =>
    forgeClient.get<any, PaginatedData<Report>>("/api/admin/reports", { params }),

  get: (id: string) =>
    forgeClient.get<any, Report>(`/api/admin/reports/${id}`),

  review: (id: string, data: { status: string; remarks?: string }) =>
    forgeClient.put<any, Report>(`/api/admin/reports/${id}/review`, data),

  statusCounts: () =>
    forgeClient.get<any, Record<string, number>>("/api/admin/reports/counts"),

  suspendUser: (userId: string) =>
    forgeClient.put(`/api/admin/users/${userId}/suspend`),

  activateUser: (userId: string) =>
    forgeClient.put(`/api/admin/users/${userId}/activate`),
}
