import { apiClient } from "../client";
import { unwrapEnvelope } from "../http";
import { downloadProtectedFile, openLocalFile } from "./protected-files";
import type { ApiEnvelope } from "../../types/api";
import type {
  Assessment,
  AssessmentAttempt,
  AssessmentQuestion,
  AttemptResult,
  CreateAssessmentDto,
  CreateQuestionDto,
  OngoingAttemptResult,
  RemovedAssessmentSubmissionFiles,
  SubmitAssessmentDto,
  TeacherAssessmentSubmissionsResponse,
  UpdateAssessmentDto,
  UpdateAttemptProgressDto,
  UpdateQuestionDto,
  UploadedAssessmentFile,
  UploadedAssessmentSubmission,
} from "../../types/assessment";
import type {
  AssessmentHistoryQuery,
  AssessmentHistoryResponse,
} from "../../types/report";

export type AssessmentAttemptList = AssessmentAttempt[];
export type AssessmentAttemptDetail = AttemptResult;
export type AssessmentHistoryList = AssessmentHistoryResponse;

export const assessmentsApi = {
  async create(payload: CreateAssessmentDto) {
    const response = await apiClient.post<ApiEnvelope<Assessment>>("/assessments", payload);
    return unwrapEnvelope(response.data);
  },

  async getByClass(classId: string) {
    const response = await apiClient.get<ApiEnvelope<Assessment[]>>(`/assessments/class/${classId}`);
    return unwrapEnvelope(response.data);
  },

  async getById(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<Assessment>>(`/assessments/${assessmentId}`);
    return unwrapEnvelope(response.data);
  },

  async getAssessmentHistory(query?: AssessmentHistoryQuery) {
    const response = await apiClient.get<AssessmentHistoryResponse>(
      "/profiles/me/assessment-history",
      { params: query },
    );
    return response.data;
  },

  async startAttempt(assessmentId: string) {
    const response = await apiClient.post<
      ApiEnvelope<OngoingAttemptResult>
    >(`/assessments/${assessmentId}/start`, {});
    return unwrapEnvelope(response.data);
  },

  async getOngoingAttempt(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<OngoingAttemptResult | null>>(
      `/assessments/${assessmentId}/ongoing-attempt`,
    );
    return unwrapEnvelope(response.data);
  },

  async submit(payload: SubmitAssessmentDto) {
    const response = await apiClient.post<ApiEnvelope<unknown>>("/assessments/submit", payload);
    return unwrapEnvelope(response.data);
  },

  async updateAttemptProgress(attemptId: string, payload: UpdateAttemptProgressDto) {
    const response = await apiClient.patch<ApiEnvelope<AssessmentAttempt>>(
      `/assessments/attempts/${attemptId}/progress`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async uploadSubmissionFile(
    assessmentId: string,
    file: { uri: string; name: string; type?: string | null },
  ) {
    const formData = new FormData();
    formData.append("file", {
      uri: file.uri,
      name: file.name,
      type: file.type || "application/octet-stream",
    } as unknown as Blob);

    const response = await apiClient.post<ApiEnvelope<UploadedAssessmentSubmission>>(
      `/assessments/${assessmentId}/submission-file`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return unwrapEnvelope(response.data);
  },

  async removeSubmissionFile(assessmentId: string, fileId: string) {
    const response = await apiClient.delete<ApiEnvelope<RemovedAssessmentSubmissionFiles>>(
      `/assessments/${assessmentId}/submission-files/${fileId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async unsubmitFileUploadAssessment(assessmentId: string) {
    const response = await apiClient.post<ApiEnvelope<AssessmentAttempt>>(
      `/assessments/${assessmentId}/unsubmit-file-upload`,
      {},
    );
    return unwrapEnvelope(response.data);
  },

  async getStudentAttempts(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<AssessmentAttempt[]>>(
      `/assessments/${assessmentId}/student-attempts`,
    );
    return unwrapEnvelope(response.data);
  },

  async getAttemptResults(attemptId: string) {
    const response = await apiClient.get<ApiEnvelope<AttemptResult>>(`/assessments/attempts/${attemptId}/results`);
    return unwrapEnvelope(response.data);
  },

  async update(assessmentId: string, payload: UpdateAssessmentDto) {
    const response = await apiClient.put<ApiEnvelope<Assessment>>(`/assessments/${assessmentId}`, payload);
    return unwrapEnvelope(response.data);
  },

  async createQuestion(payload: CreateQuestionDto) {
    const response = await apiClient.post<ApiEnvelope<AssessmentQuestion>>(
      "/assessments/questions",
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async updateQuestion(questionId: string, payload: UpdateQuestionDto) {
    const response = await apiClient.put<ApiEnvelope<AssessmentQuestion>>(
      `/assessments/questions/${questionId}`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async deleteQuestion(questionId: string) {
    const response = await apiClient.delete<ApiEnvelope<{ success?: boolean }>>(
      `/assessments/questions/${questionId}`,
    );
    return unwrapEnvelope(response.data);
  },

  async getTeacherSubmissions(assessmentId: string) {
    const response = await apiClient.get<ApiEnvelope<TeacherAssessmentSubmissionsResponse>>(
      `/assessments/${assessmentId}/submissions`,
    );
    return unwrapEnvelope(response.data);
  },

  async returnGrade(
    attemptId: string,
    payload: {
      teacherFeedback?: string;
      directScore?: number;
    } = {},
  ) {
    const response = await apiClient.post<ApiEnvelope<{ success?: boolean }>>(
      `/assessments/attempts/${attemptId}/return`,
      payload,
    );
    return unwrapEnvelope(response.data);
  },

  async unreturnGrade(attemptId: string) {
    const response = await apiClient.post<ApiEnvelope<{ success?: boolean }>>(
      `/assessments/attempts/${attemptId}/unreturn`,
      {},
    );
    return unwrapEnvelope(response.data);
  },

  async downloadTeacherAttachment(assessmentId: string, fallbackName = "teacher-attachment") {
    return downloadProtectedFile({
      pathname: `/assessments/${assessmentId}/teacher-attachment/download`,
      fallbackName,
      persistent: true,
      openAfterDownload: true,
    });
  },

  async openTeacherAttachment(assessmentId: string, fallbackName = "teacher-attachment") {
    const download = await downloadProtectedFile({
      pathname: `/assessments/${assessmentId}/teacher-attachment/download`,
      fallbackName,
    });
    await openLocalFile(download.uri);
    return download;
  },

  async downloadAttemptSubmissionFile(attemptId: string, fallbackName = "submission-file") {
    return downloadProtectedFile({
      pathname: `/assessments/attempts/${attemptId}/submission-file/download`,
      fallbackName,
      persistent: true,
      openAfterDownload: true,
    });
  },

  async openAttemptSubmissionFile(attemptId: string, fallbackName = "submission-file") {
    const download = await downloadProtectedFile({
      pathname: `/assessments/attempts/${attemptId}/submission-file/download`,
      fallbackName,
    });
    await openLocalFile(download.uri);
    return download;
  },

  async downloadAttemptSubmissionAttachmentFile(
    attemptId: string,
    fileId: string,
    fallbackName = "submission-file",
  ) {
    return downloadProtectedFile({
      pathname: `/assessments/attempts/${attemptId}/submission-files/${fileId}/download`,
      fallbackName,
      persistent: true,
      openAfterDownload: true,
    });
  },

  async openAttemptSubmissionAttachmentFile(
    attemptId: string,
    fileId: string,
    fallbackName = "submission-file",
  ) {
    const download = await downloadProtectedFile({
      pathname: `/assessments/attempts/${attemptId}/submission-files/${fileId}/download`,
      fallbackName,
    });
    await openLocalFile(download.uri);
    return download;
  },
};
