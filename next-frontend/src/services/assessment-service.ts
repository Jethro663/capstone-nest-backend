import { api } from '@/lib/api-client';
import type {
  Assessment,
  AssessmentsByClassResponse,
  CreateAssessmentDto,
  UpdateAssessmentDto,
  AssessmentQuestion,
  CreateQuestionDto,
  UpdateQuestionDto,
  SubmitAssessmentDto,
  AssessmentAttempt,
  AttemptResult,
  AssessmentStats,
  SubmissionsResponse,
  QuestionAnalyticsResponse,
  OngoingAttemptResult,
  OngoingAttemptSummary,
  UpdateAttemptProgressDto,
  RubricCriterion,
  RubricScore,
} from '@/types/assessment';

function getDownloadFilename(contentDisposition: string | undefined, fallback: string) {
  if (!contentDisposition) return fallback;
  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const plainMatch = contentDisposition.match(/filename="?([^"]+)"?/i);
  return plainMatch?.[1] ?? fallback;
}

function triggerBrowserDownload(blob: Blob, filename: string) {
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
}

function openBlobInNewTab(blob: Blob) {
  const objectUrl = window.URL.createObjectURL(blob);
  const popup = window.open(objectUrl, '_blank', 'noopener,noreferrer');

  if (!popup) {
    window.URL.revokeObjectURL(objectUrl);
    throw new Error('Unable to open file preview');
  }

  window.setTimeout(() => {
    window.URL.revokeObjectURL(objectUrl);
  }, 60_000);
}

export const assessmentService = {
  /** GET /assessments/class/:classId — All roles */
  async getByClass(
    classId: string,
    query?: {
      page?: number;
      limit?: number;
      status?: 'all' | 'upcoming' | 'past_due' | 'completed';
    },
  ): Promise<AssessmentsByClassResponse> {
    const { data } = await api.get(`/assessments/class/${classId}`, {
      params: query,
    });
    return data;
  },

  /** GET /assessments/:id — All roles */
  async getById(id: string): Promise<{ success: boolean; message: string; data: Assessment }> {
    const { data } = await api.get(`/assessments/${id}`);
    return data;
  },

  /** POST /assessments — Admin, Teacher */
  async create(dto: CreateAssessmentDto): Promise<{ success: boolean; message: string; data: Assessment }> {
    const { data } = await api.post('/assessments', dto);
    return data;
  },

  /** PUT /assessments/:id — Admin, Teacher */
  async update(id: string, dto: UpdateAssessmentDto): Promise<{ success: boolean; message: string; data: Assessment }> {
    const { data } = await api.put(`/assessments/${id}`, dto);
    return data;
  },

  async releaseCore(
    id: string,
    dto: { isPublished: boolean },
  ): Promise<{ success: boolean; message: string; data: Assessment }> {
    const { data } = await api.patch(`/assessments/${id}/core-release`, dto);
    return data;
  },

  /** DELETE /assessments/:id — Admin, Teacher */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/assessments/${id}`);
    return data;
  },

  // --- Questions ---

  /** POST /assessments/questions — Admin, Teacher */
  async createQuestion(dto: CreateQuestionDto): Promise<{ success: boolean; message: string; data: AssessmentQuestion }> {
    const { data } = await api.post('/assessments/questions', dto);
    return data;
  },

  /** PUT /assessments/questions/:id — Admin, Teacher */
  async updateQuestion(id: string, dto: UpdateQuestionDto): Promise<{ success: boolean; message: string; data: AssessmentQuestion }> {
    const { data } = await api.put(`/assessments/questions/${id}`, dto);
    return data;
  },

  /** DELETE /assessments/questions/:id — Admin, Teacher */
  async deleteQuestion(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/assessments/questions/${id}`);
    return data;
  },

  /** POST /assessments/questions/:id/image — Upload question image */
  async uploadQuestionImage(questionId: string, file: File): Promise<{ success: boolean; message: string; data: { imageUrl: string } }> {
    const formData = new FormData();
    formData.append('image', file);
    const { data } = await api.post(`/assessments/questions/${questionId}/image`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  /** POST /assessments/:assessmentId/teacher-attachment — Upload teacher reference file */
  async uploadTeacherAttachment(
    assessmentId: string,
    file: File,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(
      `/assessments/${assessmentId}/teacher-attachment`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data;
  },

  /** POST /assessments/:assessmentId/submission-file — Upload student submission file */
  async uploadSubmissionFile(
    assessmentId: string,
    file: File,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      attemptId: string;
      file: {
        id: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        uploadedAt: string;
      };
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(
      `/assessments/${assessmentId}/submission-file`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data;
  },

  async downloadTeacherAttachment(assessmentId: string, fallbackName = 'teacher-attachment') {
    const response = await api.get(`/assessments/${assessmentId}/teacher-attachment/download`, {
      responseType: 'blob',
    });
    const filename = getDownloadFilename(response.headers['content-disposition'], fallbackName);
    triggerBrowserDownload(response.data, filename);
  },

  async downloadAttemptSubmissionFile(attemptId: string, fallbackName = 'submission-file') {
    const response = await api.get(`/assessments/attempts/${attemptId}/submission-file/download`, {
      responseType: 'blob',
    });
    const filename = getDownloadFilename(response.headers['content-disposition'], fallbackName);
    triggerBrowserDownload(response.data, filename);
  },

  async getAttemptSubmissionFileBlob(attemptId: string, fallbackName = 'submission-file') {
    const response = await api.get(`/assessments/attempts/${attemptId}/submission-file/download`, {
      responseType: 'blob',
    });
    return {
      blob: response.data as Blob,
      filename: getDownloadFilename(response.headers['content-disposition'], fallbackName),
    };
  },

  async openAttemptSubmissionFile(attemptId: string, fallbackName = 'submission-file') {
    const { blob } = await this.getAttemptSubmissionFileBlob(attemptId, fallbackName);
    openBlobInNewTab(blob);
  },

  // --- Attempts ---

  /** POST /assessments/:assessmentId/start — Admin, Student */
  async startAttempt(assessmentId: string): Promise<{ success: boolean; message: string; data: OngoingAttemptResult }> {
    const { data } = await api.post(`/assessments/${assessmentId}/start`);
    return data;
  },

  /** GET /assessments/:assessmentId/ongoing-attempt — Admin, Student */
  async getOngoingAttempt(assessmentId: string): Promise<{ success: boolean; message: string; data: OngoingAttemptResult | null }> {
    const { data } = await api.get(`/assessments/${assessmentId}/ongoing-attempt`);
    return data;
  },

  /** GET /assessments/attempts/ongoing — Admin, Student */
  async getOngoingAttempts(): Promise<{ success: boolean; message: string; data: OngoingAttemptSummary[]; count: number }> {
    const { data } = await api.get('/assessments/attempts/ongoing');
    return data;
  },

  /** PATCH /assessments/attempts/:attemptId/progress — Admin, Student */
  async updateAttemptProgress(attemptId: string, dto: UpdateAttemptProgressDto): Promise<{ success: boolean; message: string; data: AssessmentAttempt }> {
    const { data } = await api.patch(`/assessments/attempts/${attemptId}/progress`, dto);
    return data;
  },

  /** POST /assessments/submit — Admin, Student */
  async submit(dto: SubmitAssessmentDto): Promise<{ success: boolean; message: string; data: unknown }> {
    const { data } = await api.post('/assessments/submit', dto);
    return data;
  },

  async uploadRubricSource(
    assessmentId: string,
    file: File,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      file: {
        id: string;
        originalName: string;
        mimeType: string;
        sizeBytes: number;
        uploadedAt: string;
      };
      rubricParseStatus: string;
      rubricParseError?: string | null;
      rubricRawText?: string;
      rubricCriteria: RubricCriterion[];
    };
  }> {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(
      `/assessments/${assessmentId}/rubric-source`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );
    return data;
  },

  async reviewRubric(
    assessmentId: string,
    rubricCriteria: RubricCriterion[],
  ): Promise<{ success: boolean; message: string; data: Assessment }> {
    const { data } = await api.put(`/assessments/${assessmentId}/rubric-review`, {
      rubricCriteria,
    });
    return data;
  },

  async unsubmitFileUpload(assessmentId: string): Promise<{ success: boolean; message: string; data: AssessmentAttempt }> {
    const { data } = await api.post(`/assessments/${assessmentId}/unsubmit-file-upload`);
    return data;
  },

  /** GET /assessments/attempts/:attemptId/results — All roles */
  async getAttemptResults(attemptId: string): Promise<{ success: boolean; message: string; data: AttemptResult }> {
    const { data } = await api.get(`/assessments/attempts/${attemptId}/results`);
    return data;
  },

  /** GET /assessments/:assessmentId/student-attempts — All roles */
  async getStudentAttempts(assessmentId: string): Promise<{ success: boolean; message: string; data: AssessmentAttempt[]; count: number }> {
    const { data } = await api.get(`/assessments/${assessmentId}/student-attempts`);
    return data;
  },

  /** GET /assessments/:assessmentId/all-attempts — Admin, Teacher */
  async getAllAttempts(assessmentId: string): Promise<{ success: boolean; message: string; data: AssessmentAttempt[]; count: number }> {
    const { data } = await api.get(`/assessments/${assessmentId}/all-attempts`);
    return data;
  },

  /** GET /assessments/:assessmentId/stats — Admin, Teacher */
  async getStats(assessmentId: string): Promise<{ success: boolean; message: string; data: AssessmentStats }> {
    const { data } = await api.get(`/assessments/${assessmentId}/stats`);
    return data;
  },

  // --- Submissions & Grade Return (MS Teams-like) ---

  /** GET /assessments/:assessmentId/submissions — Teacher, Admin */
  async getSubmissions(assessmentId: string): Promise<{ success: boolean; message: string; data: SubmissionsResponse }> {
    const { data } = await api.get(`/assessments/${assessmentId}/submissions`);
    return data;
  },

  /** POST /assessments/attempts/:attemptId/return — Teacher, Admin */
  async returnGrade(
    attemptId: string,
    payload: {
      teacherFeedback?: string;
      directScore?: number;
      rubricScores?: RubricScore[];
    } = {},
  ): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/assessments/attempts/${attemptId}/return`, {
      teacherFeedback: payload.teacherFeedback || undefined,
      directScore: payload.directScore,
      rubricScores: payload.rubricScores,
    });
    return data;
  },

  /** POST /assessments/:assessmentId/return-all — Teacher, Admin */
  async returnAllGrades(assessmentId: string, feedback?: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/assessments/${assessmentId}/return-all`, {
      teacherFeedback: feedback || undefined,
    });
    return data;
  },

  /** GET /assessments/:assessmentId/question-analytics — Teacher, Admin */
  async getQuestionAnalytics(assessmentId: string): Promise<{ success: boolean; message: string; data: QuestionAnalyticsResponse }> {
    const { data } = await api.get(`/assessments/${assessmentId}/question-analytics`);
    return data;
  },
};
