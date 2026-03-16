import { api } from '@/lib/api-client';
import type {
  Assessment,
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
} from '@/types/assessment';

export const assessmentService = {
  /** GET /assessments/class/:classId — All roles */
  async getByClass(classId: string): Promise<{ success: boolean; message: string; data: Assessment[]; count: number }> {
    const { data } = await api.get(`/assessments/class/${classId}`);
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

  getTeacherAttachmentDownloadUrl(assessmentId: string) {
    return `/api/assessments/${assessmentId}/teacher-attachment/download`;
  },

  getAttemptSubmissionDownloadUrl(attemptId: string) {
    return `/api/assessments/attempts/${attemptId}/submission-file/download`;
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
  async returnGrade(attemptId: string, feedback?: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.post(`/assessments/attempts/${attemptId}/return`, {
      teacherFeedback: feedback || undefined,
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
