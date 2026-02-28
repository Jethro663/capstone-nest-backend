import { api } from '@/lib/api-client';
import type {
  Gradebook,
  GradebookCategory,
  GradebookItem,
  GradebookScore,
  FinalGrade,
  CreateGradebookDto,
  CreateCategoryDto,
  UpdateCategoryDto,
  CreateItemDto,
  UpdateItemDto,
  RecordScoreDto,
  BulkRecordScoresDto,
} from '@/types/gradebook';

export const gradebookService = {
  /** POST /gradebook — Teacher, Admin */
  async create(dto: CreateGradebookDto): Promise<{ success: boolean; message?: string; data: Gradebook }> {
    const { data } = await api.post('/gradebook', dto);
    return data;
  },

  /** GET /gradebook/:id — Teacher, Admin */
  async getById(id: string): Promise<{ success: boolean; data: Gradebook }> {
    const { data } = await api.get(`/gradebook/${id}`);
    return data;
  },

  /** GET /gradebook/by-class/:classId — Teacher, Admin */
  async getByClass(classId: string): Promise<{ success: boolean; data: Gradebook[] }> {
    const { data } = await api.get(`/gradebook/by-class/${classId}`);
    return data;
  },

  // --- Categories ---

  /** POST /gradebook/:id/categories — Teacher, Admin */
  async createCategory(gradebookId: string, dto: CreateCategoryDto): Promise<{ success: boolean; data: GradebookCategory }> {
    const { data } = await api.post(`/gradebook/${gradebookId}/categories`, dto);
    return data;
  },

  /** PATCH /gradebook/categories/:categoryId — Teacher, Admin */
  async updateCategory(categoryId: string, dto: UpdateCategoryDto): Promise<{ success: boolean; data: GradebookCategory }> {
    const { data } = await api.patch(`/gradebook/categories/${categoryId}`, dto);
    return data;
  },

  /** DELETE /gradebook/categories/:categoryId — Teacher, Admin */
  async deleteCategory(categoryId: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.delete(`/gradebook/categories/${categoryId}`);
    return data;
  },

  // --- Items ---

  /** POST /gradebook/:id/items — Teacher, Admin */
  async createItem(gradebookId: string, dto: CreateItemDto): Promise<{ success: boolean; data: GradebookItem }> {
    const { data } = await api.post(`/gradebook/${gradebookId}/items`, dto);
    return data;
  },

  /** PATCH /gradebook/items/:itemId — Teacher, Admin */
  async updateItem(itemId: string, dto: Partial<CreateItemDto>): Promise<{ success: boolean; data: GradebookItem }> {
    const { data } = await api.patch(`/gradebook/items/${itemId}`, dto);
    return data;
  },

  /** DELETE /gradebook/items/:itemId — Teacher, Admin */
  async deleteItem(itemId: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.delete(`/gradebook/items/${itemId}`);
    return data;
  },

  // --- Scores ---

  /** POST /gradebook/items/:itemId/scores — Teacher, Admin */
  async recordScore(itemId: string, dto: RecordScoreDto): Promise<{ success: boolean; data: GradebookScore }> {
    const { data } = await api.post(`/gradebook/items/${itemId}/scores`, dto);
    return data;
  },

  /** POST /gradebook/items/:itemId/scores/bulk — Teacher, Admin */
  async recordScoresBulk(itemId: string, dto: BulkRecordScoresDto): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.post(`/gradebook/items/${itemId}/scores/bulk`, dto);
    return data;
  },

  /** POST /gradebook/items/:itemId/sync-scores — Teacher, Admin */
  async syncScores(itemId: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.post(`/gradebook/items/${itemId}/sync-scores`);
    return data;
  },

  // --- Final Grades ---

  /** GET /gradebook/:id/preview-grades — Teacher, Admin */
  async previewGrades(id: string): Promise<{ success: boolean; data: FinalGrade[] }> {
    const { data } = await api.get(`/gradebook/${id}/preview-grades`);
    return data;
  },

  /** POST /gradebook/:id/finalize — Teacher, Admin */
  async finalize(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.post(`/gradebook/${id}/finalize`);
    return data;
  },

  /** GET /gradebook/:id/final-grades — Teacher, Admin */
  async getFinalGrades(id: string): Promise<{ success: boolean; data: FinalGrade[] }> {
    const { data } = await api.get(`/gradebook/${id}/final-grades`);
    return data;
  },

  /** GET /gradebook/:gradebookId/final-grades/:studentId — All roles */
  async getStudentFinalGrade(gradebookId: string, studentId: string): Promise<{ success: boolean; data: FinalGrade }> {
    const { data } = await api.get(`/gradebook/${gradebookId}/final-grades/${studentId}`);
    return data;
  },

  /** GET /gradebook/adviser/section/:sectionId — Admin, Teacher */
  async getAdviserSection(sectionId: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/gradebook/adviser/section/${sectionId}`);
    return data;
  },

  // --- Reports ---

  /** GET /gradebook/:id/reports/class-average — Teacher, Admin */
  async getClassAverageReport(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/gradebook/${id}/reports/class-average`);
    return data;
  },

  /** GET /gradebook/:id/reports/distribution — Teacher, Admin */
  async getDistributionReport(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/gradebook/${id}/reports/distribution`);
    return data;
  },

  /** GET /gradebook/:id/reports/intervention — Teacher, Admin */
  async getInterventionReport(id: string): Promise<{ success: boolean; data: unknown }> {
    const { data } = await api.get(`/gradebook/${id}/reports/intervention`);
    return data;
  },
};
