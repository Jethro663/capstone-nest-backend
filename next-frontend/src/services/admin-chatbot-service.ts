import axios from 'axios';
import { api } from '@/lib/api-client';
import {
  getAccessToken,
  setAccessToken,
} from '@/lib/api-client';
import { refreshSessionAccessToken } from '@/lib/session-refresh';
import type {
  AdminAnalyticsChatRequest,
  AdminAnalyticsChatResponse,
  AdminAnalyticsChart,
  AdminAnalyticsHealthStatus,
  AdminAnalyticsHistorySummary,
  AdminAnalyticsSessionDetail,
  AdminAnalyticsSessionMessage,
  AdminAnalyticsSource,
  AdminAssistantAction,
  AdminAssistantActionTarget,
  AdminAssistantDataView,
  AdminAssistantScope,
  AdminAssistantTimeRange,
} from '@/types/admin-chatbot';

const DIRECT_ADMIN_CHAT_TIMEOUT_MS = 70_000;

type Envelope<T> = {
  success?: boolean;
  message?: string;
  data: T;
};

const ADMIN_ACTION_ROUTES: Record<AdminAssistantActionTarget, string> = {
  reports: '/dashboard/admin/reports',
  evaluations: '/dashboard/admin/evaluations',
  audit: '/dashboard/admin/audit',
  diagnostics: '/dashboard/admin/diagnostics',
  announcements: '/dashboard/admin/announcements',
  users: '/dashboard/admin/users',
  sections: '/dashboard/admin/sections',
  classes: '/dashboard/admin/classes',
  system_settings: '/dashboard/admin/system-settings',
  roster_import: '/dashboard/admin/roster-import',
};

const ADMIN_TIME_RANGES = new Set<AdminAssistantTimeRange>([
  'current_period',
  'last_7_days',
  'last_30_days',
  'all_available',
]);

function normalizeEnvelope<T>(payload: unknown): Envelope<T> {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return payload as Envelope<T>;
  }
  return { data: payload as T };
}

function normalizeHealth(payload: Record<string, unknown> | undefined): AdminAnalyticsHealthStatus {
  return {
    online:
      payload?.runtimeAvailable === true ||
      payload?.cloudAvailable === true ||
      payload?.ollamaOnline === true ||
      payload?.ollamaAvailable === true,
    model:
      (typeof payload?.model === 'string' && payload.model) ||
      (typeof payload?.configuredModel === 'string' && payload.configuredModel) ||
      (typeof payload?.configuredTextModel === 'string' && payload.configuredTextModel) ||
      'unknown',
  };
}

function normalizeChart(payload: unknown): AdminAnalyticsChart | null {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const type = record.type;
  const title = record.title;
  const labels = Array.isArray(record.labels)
    ? record.labels.filter((label): label is string => typeof label === 'string')
    : [];
  const rawSeries = Array.isArray(record.series)
    ? record.series
    : [];

  if (
    (type !== 'bar' && type !== 'line' && type !== 'pie' && type !== 'donut') ||
    typeof title !== 'string' ||
    !labels.length
  ) {
    return null;
  }

  const series = rawSeries
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const seriesRecord = item as Record<string, unknown>;
      const name = seriesRecord.name;
      const data = Array.isArray(seriesRecord.data)
        ? seriesRecord.data
            .map((value) => (typeof value === 'number' ? value : Number(value)))
            .filter((value) => Number.isFinite(value))
        : [];

      if (typeof name !== 'string' || !name.trim() || !data.length) {
        return null;
      }

      return {
        name: name.trim(),
        data,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  if (!series.length) return null;

  return {
    type,
    title,
    labels,
    series,
    yAxisLabel:
      typeof record.yAxisLabel === 'string' ? record.yAxisLabel : null,
    xAxisLabel:
      typeof record.xAxisLabel === 'string' ? record.xAxisLabel : null,
  };
}

function normalizeSources(payload: unknown): AdminAnalyticsSource[] {
  if (!Array.isArray(payload)) return [];

  const normalized: AdminAnalyticsSource[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const source = record.source;
    if (typeof source !== 'string' || !source.trim()) continue;

    normalized.push({
      source: source.trim(),
      label:
        typeof record.label === 'string' && record.label.trim()
          ? record.label.trim()
          : source.trim(),
      filters:
        record.filters && typeof record.filters === 'object'
          ? (record.filters as Record<string, unknown>)
          : {},
      window: typeof record.window === 'string' ? record.window : null,
      recordCount:
        typeof record.recordCount === 'number' && record.recordCount >= 0
          ? record.recordCount
          : null,
      total:
        typeof record.total === 'number' && record.total >= 0
          ? record.total
          : null,
      truncated: record.truncated === true,
      href:
        typeof record.href === 'string' &&
        record.href.startsWith('/dashboard/admin')
          ? record.href
          : null,
    });
  }
  return normalized;
}

function normalizeScope(payload: unknown): AdminAssistantScope | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const timeRange = record.timeRange;
  if (
    typeof timeRange !== 'string' ||
    !ADMIN_TIME_RANGES.has(timeRange as AdminAssistantTimeRange)
  ) {
    return null;
  }
  const gradingPeriod = record.gradingPeriod;
  return {
    timeRange: timeRange as AdminAssistantTimeRange,
    schoolYear:
      typeof record.schoolYear === 'string' ? record.schoolYear : null,
    gradingPeriod:
      gradingPeriod === 'Q1' ||
      gradingPeriod === 'Q2' ||
      gradingPeriod === 'Q3' ||
      gradingPeriod === 'Q4'
        ? gradingPeriod
        : null,
    periodLabel:
      typeof record.periodLabel === 'string' ? record.periodLabel : null,
    ...(typeof record.classId === 'string' ? { classId: record.classId } : {}),
    ...(typeof record.sectionId === 'string'
      ? { sectionId: record.sectionId }
      : {}),
    ...(typeof record.studentId === 'string'
      ? { studentId: record.studentId }
      : {}),
    ...(typeof record.teacherId === 'string'
      ? { teacherId: record.teacherId }
      : {}),
  };
}

function normalizeDataView(payload: unknown): AdminAssistantDataView | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.title !== 'string' || !record.title.trim()) return null;
  if (!Array.isArray(record.columns) || !Array.isArray(record.rows)) return null;
  const columns = record.columns
    .slice(0, 6)
    .filter((column): column is string => typeof column === 'string')
    .map((column) => column.trim())
    .filter(Boolean);
  if (!columns.length) return null;

  const rows: string[][] = [];
  for (const row of record.rows.slice(0, 20)) {
    if (!Array.isArray(row) || row.length !== columns.length) return null;
    if (!row.every((cell) => typeof cell === 'string')) return null;
    rows.push(row.map((cell) => cell.trim()));
  }

  return {
    title: record.title.trim(),
    columns,
    rows,
    total:
      typeof record.total === 'number' && record.total >= 0
        ? record.total
        : null,
    truncated: record.truncated === true,
  };
}

function normalizeSuggestedPrompts(payload: unknown): string[] {
  if (!Array.isArray(payload)) return [];
  const prompts: string[] = [];
  for (const prompt of payload) {
    if (typeof prompt !== 'string' || !prompt.trim()) continue;
    const normalized = prompt.trim().slice(0, 180);
    if (!prompts.includes(normalized)) prompts.push(normalized);
    if (prompts.length === 3) break;
  }
  return prompts;
}

function normalizeAction(payload: unknown): AdminAssistantAction | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const target = record.target;
  const kind = record.kind;
  if (
    typeof target !== 'string' ||
    !(target in ADMIN_ACTION_ROUTES) ||
    (kind !== 'navigate' && kind !== 'draft') ||
    typeof record.label !== 'string' ||
    !record.label.trim() ||
    typeof record.description !== 'string' ||
    !record.description.trim()
  ) {
    return null;
  }
  const typedTarget = target as AdminAssistantActionTarget;
  const expectedHref = ADMIN_ACTION_ROUTES[typedTarget];
  if (record.href !== expectedHref) return null;

  let draft: AdminAssistantAction['draft'] = null;
  if (kind === 'draft') {
    if (typedTarget !== 'announcements' || !record.draft || typeof record.draft !== 'object') {
      return null;
    }
    const draftRecord = record.draft as Record<string, unknown>;
    if (
      typeof draftRecord.title !== 'string' ||
      !draftRecord.title.trim() ||
      typeof draftRecord.body !== 'string' ||
      !draftRecord.body.trim()
    ) {
      return null;
    }
    const audience = draftRecord.audience;
    draft = {
      title: draftRecord.title.trim().slice(0, 120),
      body: draftRecord.body.trim().slice(0, 2000),
      audience:
        audience === 'students' ||
        audience === 'teachers' ||
        audience === 'admins'
          ? audience
          : 'all',
    };
  }

  return {
    kind,
    target: typedTarget,
    label: record.label.trim().slice(0, 100),
    description: record.description.trim().slice(0, 280),
    href: expectedHref,
    draft,
  };
}

function normalizeHistorySummary(payload: unknown): AdminAnalyticsHistorySummary[] {
  if (!Array.isArray(payload)) return [];

  const normalized: AdminAnalyticsHistorySummary[] = [];
  for (const item of payload) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const sessionId =
      typeof record.sessionId === 'string'
        ? record.sessionId
        : typeof record.session_id === 'string'
          ? record.session_id
          : null;
    if (!sessionId) continue;

    normalized.push({
      sessionId,
      sessionType:
        typeof record.sessionType === 'string'
          ? record.sessionType
          : typeof record.session_type === 'string'
            ? record.session_type
            : null,
      title:
        typeof record.title === 'string' && record.title.trim()
          ? record.title
          : 'Admin analytics chat',
      preview:
        typeof record.preview === 'string' ? record.preview : 'No preview available',
      updatedAt:
        typeof record.updatedAt === 'string'
          ? record.updatedAt
          : typeof record.updated_at === 'string'
            ? record.updated_at
            : new Date().toISOString(),
      messageCount:
        typeof record.messageCount === 'number'
          ? record.messageCount
          : typeof record.message_count === 'number'
            ? record.message_count
            : undefined,
    });
  }
  return normalized;
}

function normalizeSessionMessage(payload: unknown): AdminAnalyticsSessionMessage | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const id = typeof record.id === 'string' ? record.id : crypto.randomUUID();
  const role = record.role === 'user' ? 'user' : record.role === 'assistant' ? 'assistant' : null;
  const content = typeof record.content === 'string' ? record.content : null;
  if (!role || !content) return null;

  return {
    id,
    role,
    content,
    createdAt:
      typeof record.createdAt === 'string'
        ? record.createdAt
        : typeof record.created_at === 'string'
          ? record.created_at
          : new Date().toISOString(),
    chart: normalizeChart(record.chart),
    sources: normalizeSources(record.sources),
    dataView: normalizeDataView(record.dataView),
    suggestedPrompts: normalizeSuggestedPrompts(record.suggestedPrompts),
    action: normalizeAction(record.action),
    scope: normalizeScope(record.scope),
  };
}

function normalizeSession(payload: unknown): AdminAnalyticsSessionDetail {
  const envelope = normalizeEnvelope<unknown>(payload);
  const record =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : {};

  const sessionId =
    typeof record.sessionId === 'string'
      ? record.sessionId
      : typeof record.session_id === 'string'
        ? record.session_id
        : '';

  return {
    sessionId,
    title:
      typeof record.title === 'string' && record.title.trim()
        ? record.title
        : 'Admin analytics chat',
    updatedAt:
      typeof record.updatedAt === 'string'
        ? record.updatedAt
        : typeof record.updated_at === 'string'
          ? record.updated_at
          : new Date().toISOString(),
    messages: Array.isArray(record.messages)
      ? record.messages.reduce<AdminAnalyticsSessionMessage[]>((acc, message) => {
          const normalizedMessage = normalizeSessionMessage(message);
          if (normalizedMessage) {
            acc.push(normalizedMessage);
          }
          return acc;
        }, [])
      : [],
  };
}

function normalizeChatResponse(payload: unknown): AdminAnalyticsChatResponse {
  const envelope = normalizeEnvelope<unknown>(payload);
  const record =
    envelope.data && typeof envelope.data === 'object'
      ? (envelope.data as Record<string, unknown>)
      : {};

  return {
    reply:
      typeof record.reply === 'string'
        ? record.reply
        : 'No response returned from the AI service.',
    sessionId:
      typeof record.sessionId === 'string'
        ? record.sessionId
        : typeof record.session_id === 'string'
          ? record.session_id
          : null,
    chart: normalizeChart(record.chart),
    sources: normalizeSources(record.sources),
    dataView: normalizeDataView(record.dataView),
    suggestedPrompts: normalizeSuggestedPrompts(record.suggestedPrompts),
    action: normalizeAction(record.action),
    scope: normalizeScope(record.scope),
  };
}

function isRetryableAdminChatError(error: unknown) {
  if (!axios.isAxiosError(error)) return false;
  if (!error.response) return true;

  const status = error.response.status;
  return status === 401 || status >= 500;
}

async function resolveAdminChatAccessToken() {
  const existingToken = getAccessToken();
  if (existingToken) return existingToken;

  const refreshedToken = await refreshSessionAccessToken();
  if (refreshedToken) {
    setAccessToken(refreshedToken);
  }
  return refreshedToken;
}

async function sendAdminChatDirect(
  payload: AdminAnalyticsChatRequest,
): Promise<AdminAnalyticsChatResponse> {
  const attemptDirectPost = async (token: string) => {
    const response = await axios.post(
      '/api/ai/admin/chat',
      payload,
      {
        withCredentials: true,
        timeout: DIRECT_ADMIN_CHAT_TIMEOUT_MS,
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return normalizeChatResponse(response.data);
  };

  let accessToken = await resolveAdminChatAccessToken();
  if (!accessToken) {
    throw new Error('Unable to refresh the admin analytics session.');
  }

  try {
    return await attemptDirectPost(accessToken);
  } catch (error) {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      throw error;
    }

    const refreshedToken = await refreshSessionAccessToken();
    if (!refreshedToken) {
      throw error;
    }

    setAccessToken(refreshedToken);
    accessToken = refreshedToken;
    return attemptDirectPost(accessToken);
  }
}

export const adminChatbotService = {
  async getHealth(): Promise<AdminAnalyticsHealthStatus> {
    const { data } = await api.get('/ai/health');
    const envelope = normalizeEnvelope<Record<string, unknown>>(data);
    return normalizeHealth(envelope.data);
  },

  async getHistory(): Promise<AdminAnalyticsHistorySummary[]> {
    const { data } = await api.get('/ai/admin/history');
    const envelope = normalizeEnvelope<unknown>(data);
    return normalizeHistorySummary(envelope.data);
  },

  async getSession(sessionId: string): Promise<AdminAnalyticsSessionDetail> {
    const { data } = await api.get(`/ai/admin/sessions/${sessionId}`);
    return normalizeSession(data);
  },

  async renameSession(
    sessionId: string,
    title: string,
  ): Promise<{ sessionId: string; title: string }> {
    const { data } = await api.patch(`/ai/admin/sessions/${sessionId}`, {
      title,
    });
    const envelope = normalizeEnvelope<Record<string, unknown>>(data);
    return {
      sessionId:
        typeof envelope.data?.sessionId === 'string'
          ? envelope.data.sessionId
          : sessionId,
      title:
        typeof envelope.data?.title === 'string' && envelope.data.title.trim()
          ? envelope.data.title.trim()
          : title.trim(),
    };
  },

  async deleteSession(
    sessionId: string,
  ): Promise<{ sessionId: string; deleted: boolean }> {
    const { data } = await api.delete(`/ai/admin/sessions/${sessionId}`);
    const envelope = normalizeEnvelope<Record<string, unknown>>(data);
    return {
      sessionId:
        typeof envelope.data?.sessionId === 'string'
          ? envelope.data.sessionId
          : sessionId,
      deleted: envelope.data?.deleted === true,
    };
  },

  async sendMessage(payload: AdminAnalyticsChatRequest): Promise<AdminAnalyticsChatResponse> {
    try {
      const { data } = await api.post('/ai/admin/chat', payload);
      return normalizeChatResponse(data);
    } catch (error) {
      if (!isRetryableAdminChatError(error)) {
        throw error;
      }

      return sendAdminChatDirect(payload);
    }
  },
};
