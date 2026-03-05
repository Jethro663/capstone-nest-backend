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

  // --- Attempts ---

  /** POST /assessments/:assessmentId/start — Admin, Student */
  async startAttempt(assessmentId: string): Promise<{ success: boolean; message: string; data: { attempt: AssessmentAttempt; timeLimitMinutes: number | null } }> {
    const { data } = await api.post(`/assessments/${assessmentId}/start`);
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
};
