import { apiClient } from "../client";
import { normalizeArray, unwrapEnvelope } from "../http";
import { fetchAllPages, normalizePageEnvelope } from "../pagination";
import type { ApiEnvelope } from "../../types/api";
import type { AdminHealth, AdminOverview, AdminUserList, AuditLogPage, ClassTemplateSummary, CreateAdminUserDto } from "../../types/admin";
import type { User } from "../../types/user";

export const adminApi = {
  async getOverview() {
    const response = await apiClient.get<ApiEnvelope<AdminOverview>>("/admin/overview");
    return unwrapEnvelope(response.data);
  },

  async getUsersPage(query: { role?: string; status?: string; gradeLevel?: string; page?: number; limit?: number; includeStatusCounts?: boolean } = {}) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 100;
    const response = await apiClient.get<AdminUserList & { success?: boolean }>("/users/all", { params: { ...query, page, limit } });
    return normalizePageEnvelope<User>({ data: response.data.users, page: response.data.page, limit: response.data.limit, total: response.data.total, totalPages: response.data.totalPages }, page, limit);
  },

  async getAllUsers(query: { role?: string; status?: string; gradeLevel?: string } = {}) {
    return fetchAllPages((page, limit) => adminApi.getUsersPage({ ...query, page, limit }), { key: (user) => user.id });
  },

  async getUser(id: string) {
    const response = await apiClient.get<ApiEnvelope<{ user: User }>>(`/users/${id}`);
    return unwrapEnvelope(response.data).user;
  },

  async createUser(payload: CreateAdminUserDto) {
    const response = await apiClient.post<ApiEnvelope<{ user: User }>>("/users/create", payload);
    return unwrapEnvelope(response.data).user;
  },

  async updateUser(id: string, payload: Partial<CreateAdminUserDto>) {
    const response = await apiClient.put<ApiEnvelope<{ user: User }>>(`/users/update/${id}`, payload);
    return unwrapEnvelope(response.data).user;
  },

  async setUserLifecycle(id: string, action: "suspend" | "reactivate" | "archive") {
    if (action === "archive") return (await apiClient.delete(`/users/${id}/soft-delete`)).data;
    return (await apiClient.patch(`/users/${id}/${action}`)).data;
  },

  async resetUserPassword(id: string) {
    return (await apiClient.post<{ success: boolean; message: string; userId: string; generatedPassword: string }>(`/users/${id}/reset-password`)).data;
  },

  async getAuditPage(query: { page?: number; limit?: number; action?: string } = {}) {
    const response = await apiClient.get<AuditLogPage & { success?: boolean }>("/admin/audit-logs", { params: query });
    return response.data;
  },

  async getAllAudit(query: { action?: string } = {}) {
    return fetchAllPages(async (page, limit) => {
      const payload = await adminApi.getAuditPage({ ...query, page, limit });
      return normalizePageEnvelope({ data: payload.data, page: payload.page, limit: payload.limit, total: payload.total, totalPages: payload.totalPages }, page, limit);
    }, { key: (entry) => entry.id });
  },

  async getReadiness() {
    const response = await apiClient.get<ApiEnvelope<AdminHealth>>("/health/ready");
    return unwrapEnvelope(response.data);
  },

  async getLiveness() {
    return (await apiClient.get<{ status: string; timestamp: string }>("/health/live")).data;
  },

  async getTemplates() {
    const response = await apiClient.get<ApiEnvelope<ClassTemplateSummary[]>>("/class-templates");
    return normalizeArray<ClassTemplateSummary>(unwrapEnvelope(response.data));
  },

  async createTemplate(payload: { name: string; subjectCode: string; subjectGradeLevel: string }) {
    const response = await apiClient.post<ApiEnvelope<ClassTemplateSummary>>("/class-templates", payload);
    return unwrapEnvelope(response.data);
  },

  async publishTemplate(id: string, status: "draft" | "published") {
    const response = await apiClient.post<ApiEnvelope<ClassTemplateSummary>>(`/class-templates/${id}/publish`, { status });
    return unwrapEnvelope(response.data);
  },
};
