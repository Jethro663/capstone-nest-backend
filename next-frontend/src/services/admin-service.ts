import { api } from '@/lib/api-client';
import type { AuditLogsResponse, UsageSummary } from '@/types/audit';

export const adminService = {
  async getAuditLogs(query?: {
    page?: number;
    limit?: number;
    action?: string;
    actorId?: string;
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ success: boolean } & AuditLogsResponse> {
    const { data } = await api.get('/admin/audit-logs', { params: query });
    return data;
  },

  async getUsageSummary(query?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<{ success: boolean; data: UsageSummary }> {
    const { data } = await api.get('/admin/usage-summary', { params: query });
    return data;
  },

  getActivityExportUrl(query?: { dateFrom?: string; dateTo?: string }) {
    const params = new URLSearchParams();
    if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query?.dateTo) params.set('dateTo', query.dateTo);
    return `/api/admin/activity-export${params.size ? `?${params.toString()}` : ''}`;
  },
};
