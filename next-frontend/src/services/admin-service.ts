import { api } from '@/lib/api-client';
import type { AuditLogsResponse, UsageSummary } from '@/types/audit';

const OVERVIEW_CACHE_TTL_MS = 15_000;

type HealthReadiness = {
  ready: boolean;
  timestamp: string;
  dependencies: {
    database: { ok: boolean; message?: string };
    redis: { ok: boolean; message?: string };
    aiService: { ok: boolean; degraded?: boolean; message?: string };
  };
};

export interface AdminOverviewResponse {
  success: boolean;
  message: string;
  data: {
    stats: {
      totalUsers: number;
      totalStudents: number;
      totalTeachers: number;
      totalAdmins: number;
      totalClasses: number;
      totalSections: number;
      activeClasses: number;
      totalEnrollments: number;
      fetchedAt: string;
    };
    usageSummary: UsageSummary;
    analyticsOverview: {
      totals: {
        teachers: number;
        students: number;
        classes: number;
        activeInterventions: number;
        atRiskStudents: number;
      };
      action: string;
    };
    readiness: HealthReadiness;
    fetchedAt: string;
  };
}

let overviewCache:
  | {
      expiresAt: number;
      value: AdminOverviewResponse;
    }
  | null = null;
let overviewPromise: Promise<AdminOverviewResponse> | null = null;

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

  async getOverview(options?: {
    force?: boolean;
  }): Promise<AdminOverviewResponse> {
    const force = options?.force ?? false;
    const now = Date.now();

    if (!force && overviewCache && overviewCache.expiresAt > now) {
      return overviewCache.value;
    }

    if (!force && overviewPromise) {
      return overviewPromise;
    }

    overviewPromise = api
      .get('/admin/overview')
      .then(({ data }) => {
        overviewCache = {
          value: data,
          expiresAt: Date.now() + OVERVIEW_CACHE_TTL_MS,
        };
        return data;
      })
      .finally(() => {
        overviewPromise = null;
      });

    return overviewPromise;
  },

  async getHealthLive(): Promise<{ status: string; timestamp: string }> {
    const { data } = await api.get('/health/live');
    return data;
  },

  async getHealthReadiness(): Promise<{
    success: boolean;
    message: string;
    data: {
      ready: boolean;
      timestamp: string;
      dependencies: {
        database: { ok: boolean; message?: string };
        redis: { ok: boolean; message?: string };
        aiService: { ok: boolean; degraded?: boolean; message?: string };
      };
    };
  }> {
    const { data } = await api.get('/health/ready');
    return data;
  },

  getActivityExportUrl(query?: { dateFrom?: string; dateTo?: string }) {
    const params = new URLSearchParams();
    if (query?.dateFrom) params.set('dateFrom', query.dateFrom);
    if (query?.dateTo) params.set('dateTo', query.dateTo);
    return `/api/admin/activity-export${params.size ? `?${params.toString()}` : ''}`;
  },
};
