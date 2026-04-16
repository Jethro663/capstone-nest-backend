export type AdminAnalyticsChartType = 'bar' | 'line' | 'pie' | 'donut';

export interface AdminAnalyticsChartSeries {
  name: string;
  data: number[];
}

export interface AdminAnalyticsChart {
  type: AdminAnalyticsChartType;
  title: string;
  labels: string[];
  series: AdminAnalyticsChartSeries[];
  yAxisLabel?: string | null;
  xAxisLabel?: string | null;
}

export interface AdminAnalyticsSource {
  source: string;
  filters: Record<string, unknown>;
  window?: string | null;
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
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  chart?: AdminAnalyticsChart | null;
  sources?: AdminAnalyticsSource[];
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
}

export interface AdminAnalyticsChatResponse {
  reply: string;
  sessionId: string | null;
  chart?: AdminAnalyticsChart | null;
  sources: AdminAnalyticsSource[];
}

export interface AdminAnalyticsHealthStatus {
  online: boolean;
  model: string;
}
