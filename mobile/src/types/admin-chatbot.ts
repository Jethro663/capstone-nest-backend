export type AdminAssistantActionTarget =
  | "reports"
  | "evaluations"
  | "audit"
  | "diagnostics"
  | "announcements"
  | "users"
  | "sections"
  | "classes"
  | "system_settings"
  | "roster_import";
export type AdminAssistantTimeRange =
  | "current_period"
  | "last_7_days"
  | "last_30_days"
  | "all_available";
export interface AdminAnalyticsSource {
  source: string;
  label?: string | null;
  filters: Record<string, unknown>;
  window?: string | null;
  recordCount?: number | null;
  total?: number | null;
  truncated?: boolean;
  href?: string | null;
}
export interface AdminAnalyticsChart {
  type: "bar" | "line" | "pie" | "donut";
  title: string;
  labels: string[];
  series: Array<{ name: string; data: number[] }>;
  yAxisLabel?: string | null;
  xAxisLabel?: string | null;
}
export interface AdminAssistantDataView {
  title: string;
  columns: string[];
  rows: string[][];
  total: number | null;
  truncated: boolean;
}
export interface AdminAssistantScope {
  timeRange: AdminAssistantTimeRange;
  schoolYear?: string | null;
  gradingPeriod?: "Q1" | "Q2" | "Q3" | "Q4" | null;
  periodLabel?: string | null;
  classId?: string;
  sectionId?: string;
  studentId?: string;
  teacherId?: string;
}
export interface AdminAssistantAction {
  kind: "navigate" | "draft";
  target: AdminAssistantActionTarget;
  label: string;
  description: string;
  href: string;
  draft?: {
    title: string;
    body: string;
    audience: "all" | "students" | "teachers" | "admins";
  } | null;
}
export interface AdminAnalyticsHistorySummary {
  sessionId: string;
  sessionType?: string | null;
  title: string;
  preview: string;
  updatedAt: string;
  messageCount?: number;
}
export interface AdminAnalyticsSessionMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  chart?: AdminAnalyticsChart | null;
  sources?: AdminAnalyticsSource[];
  dataView?: AdminAssistantDataView | null;
  suggestedPrompts?: string[];
  action?: AdminAssistantAction | null;
  scope?: AdminAssistantScope | null;
}
export interface AdminAnalyticsSessionDetail {
  sessionId: string;
  title: string;
  updatedAt: string;
  messages: AdminAnalyticsSessionMessage[];
}
export interface AdminAnalyticsChatRequest {
  message: string;
  sessionId?: string | null;
  scope?: Pick<
    AdminAssistantScope,
    "timeRange" | "classId" | "sectionId" | "studentId" | "teacherId"
  >;
}
export interface AdminAnalyticsChatResponse {
  reply: string;
  sessionId: string | null;
  chart?: AdminAnalyticsChart | null;
  sources: AdminAnalyticsSource[];
  dataView: AdminAssistantDataView | null;
  suggestedPrompts: string[];
  action: AdminAssistantAction | null;
  scope: AdminAssistantScope | null;
}
export interface AdminAnalyticsHealthStatus {
  online: boolean;
  model: string;
}
