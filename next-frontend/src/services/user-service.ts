import { api } from '@/lib/api-client';
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user';

export interface UsersQuery {
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface UsersListResponse {
  success: boolean;
  users: User[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ResetUserPasswordResponse {
  success: boolean;
  message: string;
  userId: string;
  generatedPassword: string;
}

export const userService = {
  /** GET /users/all — Admin only */
  async getAll(query?: UsersQuery): Promise<UsersListResponse> {
    const { data } = await api.get('/users/all', { params: query });
    return data;
  },

  /** GET /users/:id — Admin only */
  async getById(id: string): Promise<{ success: boolean; data: { user: User } }> {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },

  /** POST /users/create — Admin only */
  async create(dto: CreateUserDto): Promise<{ success: boolean; message: string; data: { user: User } }> {
    const { data } = await api.post('/users/create', dto);
    return data;
  },

  /** PUT /users/update/:id — Admin only */
  async update(id: string, dto: UpdateUserDto): Promise<{ success: boolean; message: string; data: { user: User } }> {
    const { data } = await api.put(`/users/update/${id}`, dto);
    return data;
  },

  /** DELETE /users/delete/:id — Admin only */
  async delete(id: string): Promise<{ success: boolean; message: string }> {
    const { data } = await api.delete(`/users/delete/${id}`);
    return data;
  },

  /** PATCH /users/:id/suspend — Admin only */
  async suspend(id: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.patch(`/users/${id}/suspend`);
    return data;
  },

  /** PATCH /users/:id/reactivate — Admin only */
  async reactivate(id: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.patch(`/users/${id}/reactivate`);
    return data;
  },

  /** DELETE /users/:id/soft-delete — Admin only */
  async softDelete(id: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.delete(`/users/${id}/soft-delete`);
    return data;
  },

  /** GET /users/:id/export — Admin only (JSON download) */
  async exportUser(id: string): Promise<Blob> {
    const { data } = await api.get(`/users/${id}/export`, { responseType: 'blob' });
    return data;
  },

  /** DELETE /users/:id/purge — Admin only */
  async purge(id: string): Promise<{ success: boolean; message?: string }> {
    const { data } = await api.delete(`/users/${id}/purge`);
    return data;
  },

  /** POST /users/:id/reset-password — Admin only */
  async resetPassword(id: string): Promise<ResetUserPasswordResponse> {
    const { data } = await api.post(`/users/${id}/reset-password`);
    return data;
  },
};
