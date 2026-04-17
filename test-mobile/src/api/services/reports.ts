import { apiClient } from "../client";
import type {
  AssessmentHistoryQuery,
  AssessmentHistoryResponse,
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
};
