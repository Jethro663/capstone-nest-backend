import type { SaveAssessmentEditorInput, AssessmentEditorResult } from "../../types/assessment";
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
  TeacherAssessmentSubmission,
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

type TeacherSubmissionAttemptPayload = {
  id?: string | null;
  attemptNumber?: number | null;
  score?: number | null;
  directScore?: number | null;
  submittedAt?: string | null;
  returnedAt?: string | null;
  teacherFeedback?: string | null;
  submittedFiles?: TeacherAssessmentSubmission["submittedFiles"];
  submittedFile?: TeacherAssessmentSubmission["submittedFile"];
};

type TeacherSubmissionPayload = Partial<TeacherAssessmentSubmission> & {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  attempt?: TeacherSubmissionAttemptPayload | null;
};

function normalizeTeacherSubmission(entry: TeacherSubmissionPayload): TeacherAssessmentSubmission {
  const attempt = entry.attempt;
  const studentName =
    entry.studentName ||
    [entry.firstName, entry.lastName]
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean)
      .join(" ") ||
    entry.studentEmail ||
    entry.email ||
    "Student";

  return {
    studentId: entry.studentId || "",
    studentName,
    studentEmail: entry.studentEmail || entry.email || undefined,
    status: entry.status || "not_started",
    latestAttemptId: entry.latestAttemptId ?? attempt?.id ?? null,
    latestAttemptNumber: entry.latestAttemptNumber ?? attempt?.attemptNumber ?? null,
    latestAttemptScore: entry.latestAttemptScore ?? attempt?.score ?? null,
    latestAttemptSubmittedAt: entry.latestAttemptSubmittedAt ?? attempt?.submittedAt ?? null,
    latestAttemptReturnedAt: entry.latestAttemptReturnedAt ?? attempt?.returnedAt ?? null,
    teacherFeedback: entry.teacherFeedback ?? attempt?.teacherFeedback ?? null,
    directScore: entry.directScore ?? attempt?.directScore ?? null,
    submittedFiles: entry.submittedFiles ?? attempt?.submittedFiles ?? null,
    submittedFile: entry.submittedFile ?? attempt?.submittedFile ?? null,
    timeline: entry.timeline ?? null,
  };
}

function normalizeTeacherSubmissionsResponse(
  data: TeacherAssessmentSubmissionsResponse,
): TeacherAssessmentSubmissionsResponse {
  return {
    ...data,
    submissions: data.submissions.map((entry) =>
      normalizeTeacherSubmission(entry as TeacherSubmissionPayload),
    ),
  };
}

export const assessmentsApi = {
  async uploadAuthorImage(kind: 'questions' | 'options', id: string, file: { uri: string; fileName?: string | null; mimeType?: string | null }) {
    const form = new FormData();
    form.append('image', { uri: file.uri, name: file.fileName ?? 'image.jpg', type: file.mimeType ?? 'image/jpeg' } as unknown as Blob);
    return unwrapEnvelope((await apiClient.post(`/assessments/${kind}/${id}/image`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data);
  },
  async uploadAuthorFile(id: string, kind: 'teacher-attachment' | 'rubric-source', file: { uri: string; name: string; mimeType?: string }) {
    const form = new FormData();
    form.append('file', { uri: file.uri, name: file.name, type: file.mimeType ?? 'application/octet-stream' } as unknown as Blob);
    return unwrapEnvelope((await apiClient.post(`/assessments/${id}/${kind}`, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data);
  },
  async saveEditor(id: string | undefined, input: SaveAssessmentEditorInput): Promise<AssessmentEditorResult> {
    const response = id ? await apiClient.put<ApiEnvelope<AssessmentEditorResult>>(`/assessments/${id}/editor`, input)
      : await apiClient.post<ApiEnvelope<AssessmentEditorResult>>('/assessments/editor', input);
    return unwrapEnvelope(response.data);
  },
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

  async delete(assessmentId: string) {
    const response = await apiClient.delete<ApiEnvelope<{ success?: boolean; message?: string }>>(
      `/assessments/${assessmentId}`,
    );
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
    return normalizeTeacherSubmissionsResponse(unwrapEnvelope(response.data));
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
