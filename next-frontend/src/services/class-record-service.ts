import { api } from '@/lib/api-client';
import type {
  ClassRecord,
  FinalGrade,
  CreateClassRecordDto,
  RecordScoreDto,
  BulkRecordScoresDto,
  SpreadsheetData,
  ClassRecordScore,
  ClassAverageReport,
  GradeDistributionReport,
  InterventionReportRow,
} from '@/types/class-record';

export const classRecordService = {
  /** POST /class-record — Teacher, Admin */
  async generate(dto: CreateClassRecordDto): Promise<{ success: boolean; message?: string; data: ClassRecord }> {
    const { data } = await api.post('/class-record', dto);
    return data;
  },

  /** GET /class-record/:id — Teacher, Admin */
  async getById(id: string): Promise<{ success: boolean; data: ClassRecord }> {
    const { data } = await api.get(`/class-record/${id}`);
    return data;
  },

  /** GET /class-record/by-class/:classId — Teacher, Admin */
  async getByClass(classId: string): Promise<{ success?: boolean; data: ClassRecord[] }> {
    const { data } = await api.get(`/class-record/by-class/${classId}`);
    // Normalize: old backend returns raw array, new backend returns { success, data }
    return Array.isArray(data) ? { data } : data;
  },

  /** GET /class-record/:id/spreadsheet — Teacher, Admin */
  async getSpreadsheet(id: string): Promise<{ success?: boolean; data: SpreadsheetData }> {
    const { data } = await api.get(`/class-record/${id}/spreadsheet`);
    // Normalize: old backend returns raw object, new backend returns { success, data }
    if (data && typeof data === 'object' && 'success' in data) return data;
    return { data };
  },

  // --- Scores ---

  /** POST /class-record/items/:itemId/scores — Teacher, Admin */
  async recordScore(itemId: string, dto: RecordScoreDto): Promise<{ success: boolean; data: ClassRecordScore }> {
    const { data } = await api.post(`/class-record/items/${itemId}/scores`, dto);
    return data;
  },

  /** POST /class-record/items/:itemId/scores/bulk — Teacher, Admin */
  async recordScoresBulk(itemId: string, dto: BulkRecordScoresDto): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.post(`/class-record/items/${itemId}/scores/bulk`, dto);
    return data;
  },

  /** POST /class-record/items/:itemId/sync-scores — Teacher, Admin */
  async syncScores(itemId: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.post(`/class-record/items/${itemId}/sync-scores`);
    return data;
  },

  // --- Grades ---

  /** GET /class-record/:id/preview-grades — Teacher, Admin */
  async previewGrades(id: string): Promise<{ success: boolean; data: FinalGrade[] }> {
    const { data } = await api.get(`/class-record/${id}/preview-grades`);
    return data;
  },

  /** POST /class-record/:id/finalize — Teacher, Admin */
  async finalize(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.post(`/class-record/${id}/finalize`);
    return data;
  },

  /** GET /class-record/:id/final-grades — Teacher, Admin */
  async getFinalGrades(id: string): Promise<{ success: boolean; data: FinalGrade[] }> {
    const { data } = await api.get(`/class-record/${id}/final-grades`);
    return data;
  },

  /** GET /class-record/:id/final-grades/:studentId — All roles */
  async getStudentFinalGrade(id: string, studentId: string): Promise<{ success: boolean; data: FinalGrade }> {
    const { data } = await api.get(`/class-record/${id}/final-grades/${studentId}`);
    return data;
  },

  /** GET /class-record/adviser/section/:sectionId — Admin, Teacher */
  async getAdviserSection(sectionId: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/class-record/adviser/section/${sectionId}`);
    return data;
  },

  // --- Reports ---

  /** GET /class-record/:id/reports/class-average — Teacher, Admin */
  async getClassAverageReport(id: string): Promise<{ success: boolean; data: ClassAverageReport }> {
    const { data } = await api.get(`/class-record/${id}/reports/class-average`);
    return data;
  },

  /** GET /class-record/:id/reports/distribution — Teacher, Admin */
  async getDistributionReport(id: string): Promise<{ success: boolean; data: GradeDistributionReport }> {
    const { data } = await api.get(`/class-record/${id}/reports/distribution`);
    return data;
  },

  /** GET /class-record/:id/reports/intervention — Teacher, Admin */
  async getInterventionReport(id: string): Promise<{ success: boolean; data: InterventionReportRow[] }> {
    const { data } = await api.get(`/class-record/${id}/reports/intervention`);
    return data;
  },
};
