import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import type { ApiEnvelope } from "../../types/api";
import type {
  BulkRecordScoresDto,
  ClassAverageReport,
  ClassRecord,
  ClassRecordItem,
  ClassRecordScore,
  CreateClassRecordDto,
  FinalGrade,
  GradeDistributionReport,
  GradingPeriod,
  InterventionReportRow,
  RecordScoreDto,
  SpreadsheetData,
  UpdateClassRecordItemDto,
} from "../../types/class-record";

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export const classRecordApi = {
  async generate(payload: CreateClassRecordDto) {
    const response = await apiClient.post<ApiEnvelope<ClassRecord>>("/class-record", payload);
    return unwrapEnvelope(response.data);
  },

  async getById(id: string) {
    const response = await apiClient.get<ApiEnvelope<ClassRecord>>(`/class-record/${id}`);
    return unwrapEnvelope(response.data);
  },

  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<ClassRecord[]> | ClassRecord[]>(`/class-record/by-class/${classId}`);
    const payload = response.data as ApiEnvelope<ClassRecord[]> | ClassRecord[];
    return normalizeArray<ClassRecord>(unwrapEnvelope(payload));
  },

  async getSpreadsheet(id: string) {
    const response = await apiClient.get<ApiEnvelope<SpreadsheetData> | SpreadsheetData>(`/class-record/${id}/spreadsheet`);
    return unwrapEnvelope(response.data);
  },

  async recordScore(itemId: string, payload: RecordScoreDto) {
    const response = await apiClient.post<ApiEnvelope<ClassRecordScore>>(`/class-record/items/${itemId}/scores`, payload);
    return unwrapEnvelope(response.data);
  },

  async updateItem(itemId: string, payload: UpdateClassRecordItemDto) {
    const response = await apiClient.patch<ApiEnvelope<ClassRecordItem>>(`/class-record/items/${itemId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async recordScoresBulk(itemId: string, payload: BulkRecordScoresDto) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(`/class-record/items/${itemId}/scores/bulk`, payload);
    return unwrapEnvelope(response.data);
  },

  async syncScores(itemId: string) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(`/class-record/items/${itemId}/sync-scores`);
    return unwrapEnvelope(response.data);
  },

  async previewGrades(id: string) {
    const response = await apiClient.get<ApiEnvelope<FinalGrade[]>>(`/class-record/${id}/preview-grades`);
    return normalizeArray<FinalGrade>(unwrapEnvelope(response.data));
  },

  async finalize(id: string) {
    const response = await apiClient.post<ApiEnvelope<unknown>>(`/class-record/${id}/finalize`);
    return unwrapEnvelope(response.data);
  },

  async reopen(id: string) {
    const response = await apiClient.post<ApiEnvelope<ClassRecord>>(`/class-record/${id}/reopen`);
    return unwrapEnvelope(response.data);
  },

  async getFinalGrades(id: string) {
    const response = await apiClient.get<ApiEnvelope<FinalGrade[]>>(`/class-record/${id}/final-grades`);
    return normalizeArray<FinalGrade>(unwrapEnvelope(response.data));
  },

  async getClassAverageReport(id: string) {
    const response = await apiClient.get<ApiEnvelope<ClassAverageReport>>(`/class-record/${id}/reports/class-average`);
    return unwrapEnvelope(response.data);
  },

  async getDistributionReport(id: string) {
    const response = await apiClient.get<ApiEnvelope<GradeDistributionReport>>(`/class-record/${id}/reports/distribution`);
    return unwrapEnvelope(response.data);
  },

  async getInterventionReport(id: string) {
    const response = await apiClient.get<ApiEnvelope<InterventionReportRow[]>>(`/class-record/${id}/reports/intervention`);
    return normalizeArray<InterventionReportRow>(unwrapEnvelope(response.data));
  },

  listQuarters(): GradingPeriod[] {
    return ["Q1", "Q2", "Q3", "Q4"];
  },
};
