import { api } from '@/lib/api-client';
import type { AuditLogsResponse } from '@/types/audit';

export const adminService = {
  async getAuditLogs(query?: {
    page?: number;
    limit?: number;
    action?: string;
    actorId?: string;
  }): Promise<{ success: boolean } & AuditLogsResponse> {
    const { data } = await api.get('/admin/audit-logs', { params: query });
    return data;
  },
};
