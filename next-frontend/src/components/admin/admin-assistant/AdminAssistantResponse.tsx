'use client';

import Link from 'next/link';
import {
  ArrowUpRight,
  Clipboard,
  Database,
  FileText,
  ShieldCheck,
} from 'lucide-react';
import { AdminAnalyticsChatChart } from '@/components/admin/AdminAnalyticsChatChart';
import type {
  AdminAnalyticsChart,
  AdminAnalyticsSource,
  AdminAssistantAction,
  AdminAssistantDataView,
  AdminAssistantScope,
} from '@/types/admin-chatbot';

type AdminAssistantResponseProps = {
  content: string;
  chart?: AdminAnalyticsChart | null;
  sources?: AdminAnalyticsSource[];
  dataView?: AdminAssistantDataView | null;
  suggestedPrompts?: string[];
  action?: AdminAssistantAction | null;
  scope?: AdminAssistantScope | null;
  onSuggestedPrompt: (prompt: string) => void;
  onCopyDraft?: (draft: NonNullable<AdminAssistantAction['draft']>) => void;
};

const TIME_RANGE_LABELS: Record<AdminAssistantScope['timeRange'], string> = {
  current_period: 'Current grading period',
  last_7_days: 'Last 7 days',
  last_30_days: 'Last 30 days',
  all_available: 'All available records',
};

function formatFilterLabel(key: string) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/^./, (letter) => letter.toUpperCase());
}

function formatFilterValue(value: unknown) {
  if (value instanceof Date) return value.toLocaleString();
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return JSON.stringify(value);
}

function scopeSummary(scope: AdminAssistantScope | null | undefined) {
  if (!scope) return null;
  return [
    TIME_RANGE_LABELS[scope.timeRange],
    scope.schoolYear,
    scope.periodLabel ?? scope.gradingPeriod,
  ]
    .filter(Boolean)
    .join(' · ');
}

export function AdminAssistantResponse({
  content,
  chart,
  sources = [],
  dataView,
  suggestedPrompts = [],
  action,
  scope,
  onSuggestedPrompt,
  onCopyDraft,
}: AdminAssistantResponseProps) {
  const hasEvidence = sources.length > 0 || Boolean(scope);
  const shownRows = dataView?.rows.length ?? 0;
  const totalRows = dataView?.total ?? shownRows;

  return (
    <div className="admin-assistant-response">
      <div className="admin-assistant-answer-copy">{content}</div>

      {dataView ? (
        <section className="admin-assistant-data-view">
          <div className="admin-assistant-data-heading">
            <div>
              <p className="admin-assistant-label">Results</p>
              <h3>{dataView.title}</h3>
            </div>
            {dataView.truncated ? (
              <span className="admin-assistant-sample-note">
                Showing {shownRows} of {totalRows} records
              </span>
            ) : null}
          </div>
          <div className="admin-assistant-table-wrap">
            <table aria-label={dataView.title}>
              <thead>
                <tr>
                  {dataView.columns.map((column) => (
                    <th key={column} scope="col">
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {dataView.rows.map((row, rowIndex) => (
                  <tr key={`${row.join('-')}-${rowIndex}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cell}-${cellIndex}`}>{cell || '—'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {chart ? <AdminAnalyticsChatChart chart={chart} /> : null}

      {action ? (
        <section className="admin-assistant-action">
          <div className="admin-assistant-action-icon">
            {action.kind === 'draft' ? (
              <FileText className="h-4 w-4" />
            ) : (
              <ArrowUpRight className="h-4 w-4" />
            )}
          </div>
          <div className="admin-assistant-action-copy">
            <strong>{action.label}</strong>
            <p>{action.description}</p>
            {action.draft ? (
              <div className="admin-assistant-draft">
                <span>Draft only · {action.draft.audience}</span>
                <strong>{action.draft.title}</strong>
                <p>{action.draft.body}</p>
              </div>
            ) : null}
          </div>
          <div className="admin-assistant-action-buttons">
            {action.draft && onCopyDraft ? (
              <button type="button" onClick={() => onCopyDraft(action.draft!)}>
                <Clipboard className="h-3.5 w-3.5" />
                Copy draft
              </button>
            ) : null}
            <Link href={action.href}>
              {action.kind === 'draft' ? 'Open destination' : action.label}
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      ) : null}

      {hasEvidence ? (
        <details className="admin-assistant-evidence">
          <summary>
            <Database className="h-3.5 w-3.5" />
            <span>Evidence and scope</span>
            <span className="admin-assistant-evidence-count">
              {sources.length} {sources.length === 1 ? 'source' : 'sources'}
            </span>
          </summary>
          <div className="admin-assistant-evidence-body">
            {scopeSummary(scope) ? (
              <div className="admin-assistant-scope-line">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>{scopeSummary(scope)}</span>
              </div>
            ) : null}
            {sources.map((source, index) => {
              const sourceContent = (
                <>
                  <div className="admin-assistant-source-title">
                    <strong>{source.label || source.source}</strong>
                    {source.truncated ? <span>Sampled</span> : null}
                  </div>
                  <p>
                    {source.recordCount !== null && source.recordCount !== undefined
                      ? `${source.recordCount} records inspected`
                      : 'Approved Nexora data source'}
                    {source.total !== null && source.total !== undefined
                      ? ` · ${source.total} available`
                      : ''}
                  </p>
                  {Object.keys(source.filters).length > 0 ? (
                    <dl>
                      {Object.entries(source.filters).map(([key, value]) => (
                        <div key={`${source.source}-${key}`}>
                          <dt>{formatFilterLabel(key)}</dt>
                          <dd>{formatFilterValue(value)}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                </>
              );
              return source.href ? (
                <Link
                  href={source.href}
                  className="admin-assistant-source"
                  key={`${source.source}-${index}`}
                >
                  {sourceContent}
                </Link>
              ) : (
                <div
                  className="admin-assistant-source"
                  key={`${source.source}-${index}`}
                >
                  {sourceContent}
                </div>
              );
            })}
          </div>
        </details>
      ) : null}

      {suggestedPrompts.length > 0 ? (
        <div className="admin-assistant-follow-ups" aria-label="Suggested follow-ups">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSuggestedPrompt(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
