import { apiClient } from "../client";
import type {
  AdminReportKey,
  AdminReportQuery,
  AssessmentSummaryRow,
  AssessmentHistoryQuery,
  AssessmentHistoryResponse,
  ClassEnrollmentRow,
  InterventionParticipationRow,
  StudentMasterListRow,
  StudentPerformanceReportRow,
  SystemUsageReport,
  TeacherPaginatedReportResponse,
  TeacherReportQuery,
  TeacherReportRow,
  TranscriptQuery,
  TranscriptResponse,
} from "../../types/report";

export const reportsApi = {
  async getStudentMasterList(query?: AdminReportQuery) {
    return (
      await apiClient.get<
        TeacherPaginatedReportResponse<StudentMasterListRow[]>
      >("/reports/student-master-list", { params: query })
    ).data;
  },
  async getTranscript(query?: TranscriptQuery) {
    const response = await apiClient.get<TranscriptResponse>(
      "/profiles/me/transcript",
      {
        params: query,
      },
    );
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
    const response = await apiClient.get<
      TeacherPaginatedReportResponse<ClassEnrollmentRow[]>
    >("/reports/class-enrollment", { params: query });
    return response.data;
  },

  async getStudentPerformance(query?: TeacherReportQuery) {
    const response = await apiClient.get<
      TeacherPaginatedReportResponse<StudentPerformanceReportRow[]>
    >("/reports/student-performance", { params: query });
    return response.data;
  },

  async getAssessmentSummary(query?: TeacherReportQuery) {
    const response = await apiClient.get<
      TeacherPaginatedReportResponse<AssessmentSummaryRow[]>
    >("/reports/assessment-summary", { params: query });
    return response.data;
  },

  async getInterventionParticipation(query?: TeacherReportQuery) {
    const response = await apiClient.get<
      TeacherPaginatedReportResponse<InterventionParticipationRow[]>
    >("/reports/intervention-participation", { params: query });
    return response.data;
  },

  async getSystemUsage(query?: TeacherReportQuery) {
    const response = await apiClient.get<
      TeacherPaginatedReportResponse<SystemUsageReport>
    >("/reports/system-usage", { params: query });
    return response.data;
  },

  async exportCsv(report: AdminReportKey, query?: TeacherReportQuery) {
    // Web uses the intervention-participation dataset for the class-record CSV;
    // the richer class-record cards come from its three governed endpoints.
    const endpoint =
      report === "class-record" ? "intervention-participation" : report;
    const response = await apiClient.get<string>(`/reports/${endpoint}`, {
      params: { ...query, page: undefined, limit: undefined, export: "csv" },
      responseType: "text",
    });
    const disposition = String(response.headers?.["content-disposition"] ?? "");
    const fileName =
      disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? `${report}.csv`;
    return { csv: response.data, fileName };
  },
};
