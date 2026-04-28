import { api } from '@/lib/api-client';
import type {
  AssessmentSummaryRow,
  ClassEnrollmentRow,
  InterventionParticipationRow,
  PaginatedReportResponse,
  ReportQuery,
  ReportTab,
  StudentMasterListRow,
  StudentPerformanceReportRow,
  SystemUsageReport,
} from '@/types/report';

const reportEndpointByTab: Record<ReportTab, string> = {
  classRecord: '/reports/intervention-participation',
  studentMasterList: '/reports/student-master-list',
  classEnrollment: '/reports/class-enrollment',
  studentPerformance: '/reports/student-performance',
  interventionParticipation: '/reports/intervention-participation',
  assessmentSummary: '/reports/assessment-summary',
  systemUsage: '/reports/system-usage',
};

export const reportService = {
  async getStudentMasterList(
    query?: ReportQuery,
  ): Promise<PaginatedReportResponse<StudentMasterListRow[]>> {
    const { data } = await api.get('/reports/student-master-list', {
      params: query,
    });
    return data;
  },

  async getClassEnrollment(
    query?: ReportQuery,
  ): Promise<PaginatedReportResponse<ClassEnrollmentRow[]>> {
    const { data } = await api.get('/reports/class-enrollment', {
      params: query,
    });
    return data;
  },

  async getStudentPerformance(
    query?: ReportQuery,
  ): Promise<PaginatedReportResponse<StudentPerformanceReportRow[]>> {
    const { data } = await api.get('/reports/student-performance', {
      params: query,
    });
    return data;
  },

  async getInterventionParticipation(
    query?: ReportQuery,
  ): Promise<PaginatedReportResponse<InterventionParticipationRow[]>> {
    const { data } = await api.get('/reports/intervention-participation', {
      params: query,
    });
    return data;
  },

  async getAssessmentSummary(
    query?: ReportQuery,
  ): Promise<PaginatedReportResponse<AssessmentSummaryRow[]>> {
    const { data } = await api.get('/reports/assessment-summary', {
      params: query,
    });
    return data;
  },

  async getSystemUsage(
    query?: ReportQuery,
  ): Promise<PaginatedReportResponse<SystemUsageReport>> {
    const { data } = await api.get('/reports/system-usage', { params: query });
    return data;
  },

  async exportCsv(tab: ReportTab, query?: ReportQuery): Promise<Blob> {
    const { data } = await api.get(reportEndpointByTab[tab], {
      params: { ...query, export: 'csv' },
      responseType: 'blob',
    });
    return data;
  },
};
