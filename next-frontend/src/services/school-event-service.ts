import { api } from '@/lib/api-client';
import type {
  CreateSchoolEventDto,
  QuerySchoolEvents,
  SchoolEvent,
  UpdateSchoolEventDto,
} from '@/types/school-event';

export const schoolEventService = {
  /** GET /school-events - Admin, Teacher, Student */
  async getAll(query?: QuerySchoolEvents): Promise<{
    success: boolean;
    message: string;
    data: SchoolEvent[];
  }> {
    const { data } = await api.get('/school-events', { params: query });
    return data;
  },

  /** POST /school-events - Admin */
  async create(dto: CreateSchoolEventDto): Promise<{
    success: boolean;
    message: string;
    data: SchoolEvent;
  }> {
    const { data } = await api.post('/school-events', dto);
    return data;
  },

  /** PATCH /school-events/:id - Admin */
  async update(id: string, dto: UpdateSchoolEventDto): Promise<{
    success: boolean;
    message: string;
    data: SchoolEvent;
  }> {
    const { data } = await api.patch(`/school-events/${id}`, dto);
    return data;
  },

  /** DELETE /school-events/:id - Admin (soft-delete) */
  async remove(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/school-events/${id}`);
    return data;
  },
};
