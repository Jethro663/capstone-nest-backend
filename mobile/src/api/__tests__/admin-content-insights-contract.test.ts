import { apiClient } from "../client";
import { adminApi } from "../services/admin";
import {
  adminChatbotApi,
  resolveAdminActionRoute,
} from "../services/admin-chatbot";
import { announcementsApi } from "../services/announcements";
import { assessmentsApi } from "../services/assessments";
import { evaluationsApi } from "../services/evaluations";
import { reportsApi } from "../services/reports";

jest.mock("../client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));
jest.mock("../services/protected-files", () => ({
  downloadProtectedFile: jest.fn(),
  openLocalFile: jest.fn(),
}));

describe("administrator Content and Insights service parity", () => {
  beforeEach(() => jest.clearAllMocks());

  it("uses constant-request assessment and announcement inventory endpoints", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [],
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 1,
      },
    });
    await announcementsApi.getAdminPage({ page: 1, limit: 25, search: "exam" });
    await assessmentsApi.getAdminPage({ page: 1, limit: 25, search: "exam" });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/admin/announcements", {
      params: { page: 1, limit: 25, search: "exam" },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(
      2,
      "/assessments/admin/inventory",
      { params: { page: 1, limit: 25, search: "exam" } },
    );
  });

  it("preserves all typed report routes", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: [], filters: {}, generatedAt: "now" },
    });
    await reportsApi.getStudentMasterList({ page: 2, limit: 25 });
    expect(apiClient.get).toHaveBeenCalledWith("/reports/student-master-list", {
      params: { page: 2, limit: 25 },
    });
  });

  it("requests response rows and summary with administrator filters", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: { rows: [], count: 0 } },
    });
    await evaluationsApi.getEvaluations({
      targetModule: "lms",
      audienceRole: "teacher",
    });
    expect(apiClient.get).toHaveBeenCalledWith("/lxp/evaluations", {
      params: { targetModule: "lms", audienceRole: "teacher" },
    });
  });

  it("exposes AI health, history, session, rename, delete, and message contracts", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: { success: true, data: [] },
    });
    (apiClient.patch as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.delete as jest.Mock).mockResolvedValue({
      data: { success: true, data: {} },
    });
    (apiClient.post as jest.Mock).mockResolvedValue({
      data: { success: true, data: { reply: "Ready", sources: [] } },
    });
    await adminChatbotApi.getHealth();
    await adminChatbotApi.getHistory();
    await adminChatbotApi.getSession("session-1");
    await adminChatbotApi.renameSession("session-1", "Weekly review");
    await adminChatbotApi.deleteSession("session-1");
    await adminChatbotApi.sendMessage({ message: "Show attendance" });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/ai/health");
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/ai/admin/history");
    expect(apiClient.get).toHaveBeenNthCalledWith(
      3,
      "/ai/admin/sessions/session-1",
    );
    expect(apiClient.patch).toHaveBeenCalledWith(
      "/ai/admin/sessions/session-1",
      { title: "Weekly review" },
    );
    expect(apiClient.delete).toHaveBeenCalledWith(
      "/ai/admin/sessions/session-1",
    );
    expect(apiClient.post).toHaveBeenCalledWith("/ai/admin/chat", {
      message: "Show attendance",
    });
  });

  it("maps only allowlisted AI action destinations", () => {
    expect(resolveAdminActionRoute("reports")).toBe("AdminReports");
    expect(resolveAdminActionRoute("system_settings")).toBe("AdminSettings");
    expect(resolveAdminActionRoute("users")).toBe("AdminUsers");
    expect(resolveAdminActionRoute("unknown")).toBeNull();
  });

  it("passes all server audit filters and exports through the backend", async () => {
    (apiClient.get as jest.Mock).mockResolvedValue({
      data: {
        success: true,
        data: [],
        page: 1,
        limit: 25,
        total: 0,
        totalPages: 1,
      },
      headers: {},
    });
    await adminApi.getAuditPage({
      page: 1,
      limit: 25,
      action: "user",
      actorId: "actor-1",
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    await adminApi.exportActivity({
      dateFrom: "2026-01-01",
      dateTo: "2026-01-31",
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(1, "/admin/audit-logs", {
      params: {
        page: 1,
        limit: 25,
        action: "user",
        actorId: "actor-1",
        dateFrom: "2026-01-01",
        dateTo: "2026-01-31",
      },
    });
    expect(apiClient.get).toHaveBeenNthCalledWith(2, "/admin/activity-export", {
      params: { dateFrom: "2026-01-01", dateTo: "2026-01-31" },
      responseType: "text",
    });
  });
});
