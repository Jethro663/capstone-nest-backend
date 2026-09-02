import { apiClient } from "../client";
import type {
  AssessmentHistoryQuery,
  AssessmentHistoryResponse,
  TeacherPaginatedReportResponse,
  TeacherReportQuery,
  TeacherReportRow,
  TranscriptQuery,
  TranscriptResponse,
} from "../../types/report";

export const reportsApi = {
  async getTranscript(query?: TranscriptQuery) {
    const response = await apiClient.get<TranscriptResponse>("/profiles/me/transcript", {
      params: query,
    });
    return response.data;
  },

  async getAssessmentHistory(query?: AssessmentHistoryQuery) {
    const response = await apiClient.get<AssessmentHistoryResponse>(
      "/profiles/me/assessment-history",
      { params: query },
    );
    return response.data;
  },

  async getClassEnrollment(query?: TeacherReportQuery) {
    const response = await apiClient.get<TeacherPaginatedReportResponse<TeacherReportRow[]>>(
      "/reports/class-enrollment",
      { params: query },
    );
    return response.data;
  },

  async getStudentPerformance(query?: TeacherReportQuery) {
    const response = await apiClient.get<TeacherPaginatedReportResponse<TeacherReportRow[]>>(
      "/reports/student-performance",
      { params: query },
    );
    return response.data;
  },

  async getAssessmentSummary(query?: TeacherReportQuery) {
    const response = await apiClient.get<TeacherPaginatedReportResponse<TeacherReportRow[]>>(
      "/reports/assessment-summary",
      { params: query },
    );
    return response.data;
  },

  async getInterventionParticipation(query?: TeacherReportQuery) {
    const response = await apiClient.get<TeacherPaginatedReportResponse<TeacherReportRow[]>>(
      "/reports/intervention-participation",
      { params: query },
    );
    return response.data;
  },

  async getSystemUsage(query?: TeacherReportQuery) {
    const response = await apiClient.get<TeacherPaginatedReportResponse<TeacherReportRow[] | Record<string, unknown>>>(
      "/reports/system-usage",
      { params: query },
    );
    return response.data;
  },

  async exportCsv(
    report: "student-master-list" | "class-enrollment" | "student-performance" | "assessment-summary" | "intervention-participation" | "system-usage",
    query?: TeacherReportQuery,
  ) {
    const response = await apiClient.get<string>(`/reports/${report}`, {
      params: { ...query, page: undefined, limit: undefined, export: "csv" },
      responseType: "text",
    });
    const disposition = String(response.headers?.["content-disposition"] ?? "");
    const fileName = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `${report}.csv`;
    return { csv: response.data, fileName };
  },
};
