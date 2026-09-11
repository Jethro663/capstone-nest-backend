import { apiClient } from "../client";
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
} from "../../types/admin-chatbot";

const actionRouteByTarget = {
  reports: "AdminReports",
  evaluations: "AdminEvaluations",
  audit: "AdminAudit",
  diagnostics: "AdminDiagnostics",
  announcements: "AdminAnnouncements",
  users: "AdminUsers",
  sections: "AdminSections",
  classes: "AdminClasses",
  system_settings: "AdminSettings",
  roster_import: "AdminRoster",
} as const;

const actionHrefByTarget: Record<AdminAssistantActionTarget, string> = {
  reports: "/dashboard/admin/reports",
  evaluations: "/dashboard/admin/evaluations",
  audit: "/dashboard/admin/audit",
  diagnostics: "/dashboard/admin/diagnostics",
  announcements: "/dashboard/admin/announcements",
  users: "/dashboard/admin/users",
  sections: "/dashboard/admin/sections",
  classes: "/dashboard/admin/classes",
  system_settings: "/dashboard/admin/system-settings",
  roster_import: "/dashboard/admin/roster-import",
};

export function resolveAdminActionRoute(target: string) {
  return target in actionRouteByTarget
    ? actionRouteByTarget[target as AdminAssistantActionTarget]
    : null;
}

function unwrapUnknown(payload: unknown): unknown {
  return payload && typeof payload === "object" && "data" in payload
    ? (payload as { data: unknown }).data
    : payload;
}

function recordOf(payload: unknown): Record<string, unknown> {
  const value = unwrapUnknown(payload);
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function textValue(
  record: Record<string, unknown>,
  camel: string,
  snake?: string,
) {
  const value = record[camel] ?? (snake ? record[snake] : undefined);
  return typeof value === "string" ? value : undefined;
}

function normalizeSources(payload: unknown): AdminAnalyticsSource[] {
  if (!Array.isArray(payload)) return [];
  return payload.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const item = value as Record<string, unknown>;
    if (typeof item.source !== "string" || !item.source.trim()) return [];
    return [
      {
        source: item.source.trim(),
        label: typeof item.label === "string" ? item.label : item.source.trim(),
        filters:
          item.filters && typeof item.filters === "object"
            ? (item.filters as Record<string, unknown>)
            : {},
        window: typeof item.window === "string" ? item.window : null,
        recordCount:
          typeof item.recordCount === "number" ? item.recordCount : null,
        total: typeof item.total === "number" ? item.total : null,
        truncated: item.truncated === true,
        href:
          typeof item.href === "string" &&
          item.href.startsWith("/dashboard/admin")
            ? item.href
            : null,
      },
    ];
  });
}

function normalizeChart(payload: unknown): AdminAnalyticsChart | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const type = item.type;
  if (
    (type !== "bar" && type !== "line" && type !== "pie" && type !== "donut") ||
    typeof item.title !== "string" ||
    !Array.isArray(item.labels) ||
    !Array.isArray(item.series)
  )
    return null;
  const labels = item.labels.filter(
    (label): label is string => typeof label === "string",
  );
  const series = item.series.flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const row = value as Record<string, unknown>;
    if (typeof row.name !== "string" || !Array.isArray(row.data)) return [];
    const data = row.data.map(Number).filter(Number.isFinite);
    return data.length ? [{ name: row.name, data }] : [];
  });
  return labels.length && series.length
    ? { type, title: item.title, labels, series }
    : null;
}

function normalizeDataView(payload: unknown): AdminAssistantDataView | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  if (
    typeof item.title !== "string" ||
    !Array.isArray(item.columns) ||
    !Array.isArray(item.rows)
  )
    return null;
  const columns = item.columns
    .filter((column): column is string => typeof column === "string")
    .slice(0, 6);
  const rows = item.rows
    .filter(
      (row): row is string[] =>
        Array.isArray(row) && row.every((cell) => typeof cell === "string"),
    )
    .slice(0, 20);
  if (!columns.length) return null;
  return {
    title: item.title,
    columns,
    rows,
    total: typeof item.total === "number" ? item.total : null,
    truncated: item.truncated === true,
  };
}

function normalizeScope(payload: unknown): AdminAssistantScope | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  const allowed = new Set<AdminAssistantTimeRange>([
    "current_period",
    "last_7_days",
    "last_30_days",
    "all_available",
  ]);
  if (
    typeof item.timeRange !== "string" ||
    !allowed.has(item.timeRange as AdminAssistantTimeRange)
  )
    return null;
  return {
    timeRange: item.timeRange as AdminAssistantTimeRange,
    schoolYear: typeof item.schoolYear === "string" ? item.schoolYear : null,
    gradingPeriod:
      item.gradingPeriod === "Q1" ||
      item.gradingPeriod === "Q2" ||
      item.gradingPeriod === "Q3" ||
      item.gradingPeriod === "Q4"
        ? item.gradingPeriod
        : null,
    periodLabel: typeof item.periodLabel === "string" ? item.periodLabel : null,
  };
}

function normalizeAction(payload: unknown): AdminAssistantAction | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  if (
    typeof item.target !== "string" ||
    !resolveAdminActionRoute(item.target) ||
    (item.kind !== "navigate" && item.kind !== "draft") ||
    typeof item.label !== "string" ||
    typeof item.description !== "string"
  )
    return null;
  const target = item.target as AdminAssistantActionTarget;
  if (item.href !== actionHrefByTarget[target]) return null;
  let draft: AdminAssistantAction["draft"] = null;
  if (item.kind === "draft") {
    if (
      target !== "announcements" ||
      !item.draft ||
      typeof item.draft !== "object"
    )
      return null;
    const value = item.draft as Record<string, unknown>;
    if (typeof value.title !== "string" || typeof value.body !== "string")
      return null;
    draft = {
      title: value.title.slice(0, 120),
      body: value.body.slice(0, 2000),
      audience:
        value.audience === "students" ||
        value.audience === "teachers" ||
        value.audience === "admins"
          ? value.audience
          : "all",
    };
  }
  return {
    kind: item.kind,
    target,
    label: item.label.slice(0, 100),
    description: item.description.slice(0, 280),
    href: actionHrefByTarget[target],
    draft,
  };
}

function normalizeMessage(
  payload: unknown,
  index: number,
): AdminAnalyticsSessionMessage | null {
  if (!payload || typeof payload !== "object") return null;
  const item = payload as Record<string, unknown>;
  if (
    (item.role !== "user" && item.role !== "assistant") ||
    typeof item.content !== "string"
  )
    return null;
  return {
    id: typeof item.id === "string" ? item.id : `message-${index}`,
    role: item.role,
    content: item.content,
    createdAt:
      textValue(item, "createdAt", "created_at") ?? new Date().toISOString(),
    chart: normalizeChart(item.chart),
    sources: normalizeSources(item.sources),
    dataView: normalizeDataView(item.dataView),
    suggestedPrompts: Array.isArray(item.suggestedPrompts)
      ? item.suggestedPrompts
          .filter((value): value is string => typeof value === "string")
          .slice(0, 3)
      : [],
    action: normalizeAction(item.action),
    scope: normalizeScope(item.scope),
  };
}

function normalizeChat(payload: unknown): AdminAnalyticsChatResponse {
  const item = recordOf(payload);
  return {
    reply:
      typeof item.reply === "string"
        ? item.reply
        : "No response returned from the AI service.",
    sessionId: textValue(item, "sessionId", "session_id") ?? null,
    chart: normalizeChart(item.chart),
    sources: normalizeSources(item.sources),
    dataView: normalizeDataView(item.dataView),
    suggestedPrompts: Array.isArray(item.suggestedPrompts)
      ? item.suggestedPrompts
          .filter((value): value is string => typeof value === "string")
          .slice(0, 3)
      : [],
    action: normalizeAction(item.action),
    scope: normalizeScope(item.scope),
  };
}

export const adminChatbotApi = {
  async getHealth(): Promise<AdminAnalyticsHealthStatus> {
    const item = recordOf((await apiClient.get("/ai/health")).data);
    return {
      online:
        item.runtimeAvailable === true ||
        item.cloudAvailable === true ||
        item.ollamaOnline === true ||
        item.ollamaAvailable === true,
      model:
        textValue(item, "model") ??
        textValue(item, "configuredModel") ??
        textValue(item, "configuredTextModel") ??
        "unknown",
    };
  },
  async getHistory(): Promise<AdminAnalyticsHistorySummary[]> {
    const value = unwrapUnknown(
      (await apiClient.get("/ai/admin/history")).data,
    );
    if (!Array.isArray(value)) return [];
    return value.flatMap((entry, index) => {
      if (!entry || typeof entry !== "object") return [];
      const item = entry as Record<string, unknown>;
      const sessionId = textValue(item, "sessionId", "session_id");
      if (!sessionId) return [];
      return [
        {
          sessionId,
          sessionType: textValue(item, "sessionType", "session_type") ?? null,
          title: textValue(item, "title") ?? "Admin analytics chat",
          preview: textValue(item, "preview") ?? "No preview available",
          updatedAt:
            textValue(item, "updatedAt", "updated_at") ??
            new Date().toISOString(),
          messageCount:
            typeof item.messageCount === "number"
              ? item.messageCount
              : typeof item.message_count === "number"
                ? item.message_count
                : index + 1,
        },
      ];
    });
  },
  async getSession(sessionId: string): Promise<AdminAnalyticsSessionDetail> {
    const item = recordOf(
      (await apiClient.get(`/ai/admin/sessions/${sessionId}`)).data,
    );
    return {
      sessionId: textValue(item, "sessionId", "session_id") ?? sessionId,
      title: textValue(item, "title") ?? "Admin analytics chat",
      updatedAt:
        textValue(item, "updatedAt", "updated_at") ?? new Date().toISOString(),
      messages: Array.isArray(item.messages)
        ? item.messages
            .map(normalizeMessage)
            .filter(
              (value): value is AdminAnalyticsSessionMessage => value !== null,
            )
        : [],
    };
  },
  async renameSession(sessionId: string, title: string) {
    const item = recordOf(
      (await apiClient.patch(`/ai/admin/sessions/${sessionId}`, { title }))
        .data,
    );
    return {
      sessionId: textValue(item, "sessionId") ?? sessionId,
      title: textValue(item, "title") ?? title.trim(),
    };
  },
  async deleteSession(sessionId: string) {
    const item = recordOf(
      (await apiClient.delete(`/ai/admin/sessions/${sessionId}`)).data,
    );
    return {
      sessionId: textValue(item, "sessionId") ?? sessionId,
      deleted: item.deleted === true,
    };
  },
  async sendMessage(payload: AdminAnalyticsChatRequest) {
    return normalizeChat(
      (await apiClient.post("/ai/admin/chat", payload)).data,
    );
  },
};
