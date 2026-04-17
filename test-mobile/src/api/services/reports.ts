import { apiClient } from "../client";
import type {
  AssessmentSummaryRow,
  ClassEnrollmentRow,
  InterventionParticipationRow,
  ReportQuery,
  ReportResponse,
  StudentMasterListRow,
  StudentPerformanceReportRow,
  SystemUsageReport,
} from "../../types/report";

export const reportsApi = {
  async getStudentMasterList(query?: ReportQuery) {
    const response = await apiClient.get<ReportResponse<StudentMasterListRow[]>>("/reports/student-master-list", {
      params: query,
    });
    return response.data;
  },

  async getClassEnrollment(query?: ReportQuery) {
    const response = await apiClient.get<ReportResponse<ClassEnrollmentRow[]>>("/reports/class-enrollment", {
      params: query,
    });
    return response.data;
  },

  async getStudentPerformance(query?: ReportQuery) {
    const response = await apiClient.get<ReportResponse<StudentPerformanceReportRow[]>>("/reports/student-performance", {
      params: query,
    });
    return response.data;
  },

  async getInterventionParticipation(query?: ReportQuery) {
    const response = await apiClient.get<ReportResponse<InterventionParticipationRow[]>>(
      "/reports/intervention-participation",
      { params: query },
    );
    return response.data;
  },

  async getAssessmentSummary(query?: ReportQuery) {
    const response = await apiClient.get<ReportResponse<AssessmentSummaryRow[]>>("/reports/assessment-summary", {
      params: query,
    });
    return response.data;
  },

  async getSystemUsage(query?: ReportQuery) {
    const response = await apiClient.get<ReportResponse<SystemUsageReport>>("/reports/system-usage", {
      params: query,
    });
    return response.data;
  },
};
