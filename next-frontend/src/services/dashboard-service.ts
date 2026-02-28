import { api } from '@/lib/api-client';
import type { Lesson } from '@/types/lesson';
import type { ClassItem } from '@/types/class';
import type { Assessment } from '@/types/assessment';

export interface AdminDashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalAdmins: number;
  totalClasses: number;
  totalSections: number;
  activeClasses: number;
  totalEnrollments: number;
  [key: string]: unknown;
}

export const dashboardService = {
  /** GET /admin/dashboard/stats — Admin */
  async getAdminStats(): Promise<{ success: boolean; data: AdminDashboardStats; timestamp: string }> {
    const { data } = await api.get('/admin/dashboard/stats');
    return data;
  },

  /** GET /teacher/lessons — Teacher, Admin */
  async getTeacherLessons(): Promise<{ success: boolean; data: Lesson[]; count: number }> {
    const { data } = await api.get('/teacher/lessons');
    return data;
  },

  /** GET /teacher/classes — Teacher, Admin */
  async getTeacherClasses(): Promise<{ success: boolean; data: ClassItem[]; count: number }> {
    const { data } = await api.get('/teacher/classes');
    return data;
  },

  /** GET /teacher/assessments — Teacher, Admin */
  async getTeacherAssessments(): Promise<{ success: boolean; data: Assessment[]; count: number }> {
    const { data } = await api.get('/teacher/assessments');
    return data;
  },
};
