'use client';

import Link from 'next/link';
import { Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import type { AiGenerationStatus, TeacherAiJobSummary } from '@/types/ai';
import {
  ConfirmationDialog,
  type ConfirmationDialogConfig,
} from '@/components/shared/ConfirmationDialog';
import { cn } from '@/utils/cn';

const ACTIVE_STATUSES = new Set<AiGenerationStatus>(['pending', 'processing']);

const STATUS_PRESENTATION: Record<
  AiGenerationStatus,
  { label: string; className: string }
> = {
  pending: {
    label: 'Queued',
    className: 'border-amber-200 bg-amber-50 text-amber-800',
  },
  processing: {
    label: 'Processing',
    className: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  completed: {
    label: 'Ready for review',
    className: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  approved: {
    label: 'Approved',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  failed: {
    label: 'Failed',
    className: 'border-red-200 bg-red-50 text-red-800',
  },
  rejected: {
    label: 'Rejected',
    className: 'border-rose-200 bg-rose-50 text-rose-800',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'border-slate-200 bg-slate-100 text-slate-700',
  },
};

function formatRelativeTime(value: string | null): string {
  if (!value) return 'Recently updated';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Recently updated';
  const elapsedMinutes = Math.max(0, Math.round((Date.now() - timestamp) / 60_000));
  if (elapsedMinutes < 1) return 'Updated just now';
  if (elapsedMinutes < 60) return `Updated ${elapsedMinutes}m ago`;
  const elapsedHours = Math.round(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Updated ${elapsedHours}h ago`;
  return `Updated ${Math.round(elapsedHours / 24)}d ago`;
}

interface AiDraftJobsPanelProps {
  classId: string;
}

export function AiDraftJobsPanel({ classId }: AiDraftJobsPanelProps) {
  const [jobs, setJobs] = useState<TeacherAiJobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const [confirmation, setConfirmation] =
    useState<ConfirmationDialogConfig | null>(null);

  const refresh = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const response = await aiService.listTeacherJobs({ classId, limit: 6 });
      setJobs(response.data);
      setLoadError(false);
    } catch {
      setLoadError(true);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    aiService
      .listTeacherJobs({ classId, limit: 6 })
      .then((response) => {
        if (!active) return;
        setJobs(response.data);
        setLoadError(false);
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [classId]);

  const activeCount = useMemo(
    () => jobs.filter((job) => ACTIVE_STATUSES.has(job.status)).length,
    [jobs],
  );

  useEffect(() => {
    if (activeCount === 0) return;
    const interval = window.setInterval(() => {
      void refresh();
    }, 10_000);
    return () => window.clearInterval(interval);
  }, [activeCount, refresh]);

  const requestDelete = (job: TeacherAiJobSummary) => {
    setConfirmation({
      title: 'Delete AI draft job?',
      description:
        'This removes the generation job and its draft output. An approved assessment already created from it will remain available.',
      confirmLabel: 'Delete job',
      tone: 'danger',
      details: <strong>{job.title}</strong>,
      onConfirm: async () => {
        setDeletingJobId(job.jobId);
        try {
          await aiService.deleteTeacherJob(job.jobId);
          toast.success('AI draft job deleted');
          await refresh();
        } catch {
          toast.error('Failed to delete AI draft job');
        } finally {
          setDeletingJobId(null);
        }
      },
    });
  };

  return (
    <>
      <article className="teacher-class-workspace__assignment-card">
        <div className="teacher-class-workspace__assignment-main">
          <div className="teacher-class-workspace__assignment-icon">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1 teacher-class-workspace__assignment-copy">
            <div className="teacher-class-workspace__assignment-tags">
              <span>AI Draft Jobs</span>
              <span data-status={activeCount > 0 ? 'published' : 'draft'}>
                {activeCount > 0 ? `${activeCount} active` : 'No active jobs'}
              </span>
            </div>
            <p>
              {loading
                ? 'Loading AI draft jobs...'
                : `${jobs.length} recent job(s) for this class`}
            </p>

            {loadError ? (
              <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-red-700">
                <span>AI draft jobs could not be loaded.</span>
                <button
                  type="button"
                  className="font-semibold underline underline-offset-4"
                  onClick={() => void refresh(true)}
                >
                  Try again
                </button>
              </div>
            ) : null}

            {!loading && !loadError && jobs.length === 0 ? (
              <div className="teacher-class-workspace__assignment-actions">
                <Link
                  href={`/dashboard/teacher/classes/${classId}/ai-draft`}
                  className="teacher-class-workspace__outline"
                >
                  Start AI Draft
                </Link>
              </div>
            ) : null}

            {jobs.length > 0 ? (
              <div className="teacher-class-workspace__stack">
                {jobs.map((job) => {
                  const status = STATUS_PRESENTATION[job.status];
                  const detail = job.errorMessage || job.statusMessage;
                  return (
                    <div
                      key={job.jobId}
                      className="teacher-class-workspace__selection-bar gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <strong className="block truncate">{job.title}</strong>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span
                            data-status={job.status}
                            className={cn(
                              'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 font-semibold',
                              status.className,
                            )}
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
                            {status.label}
                          </span>
                          <span>{Math.round(job.progressPercent)}%</span>
                          <span>{formatRelativeTime(job.updatedAt || job.createdAt)}</span>
                        </div>
                        {detail ? (
                          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                            {detail}
                          </p>
                        ) : null}
                      </div>
                      <div className="teacher-class-workspace__selection-actions">
                        <Link
                          href={`/dashboard/teacher/classes/${classId}/ai-draft?jobId=${encodeURIComponent(job.jobId)}`}
                          className="teacher-class-workspace__outline"
                          aria-label={`Resume ${job.title}`}
                        >
                          Resume
                        </Link>
                        {job.assessmentId ? (
                          <Link
                            href={`/dashboard/teacher/assessments/${job.assessmentId}/edit`}
                            className="teacher-class-workspace__outline"
                            aria-label={`Open ${job.title} assessment`}
                          >
                            Open Assessment
                          </Link>
                        ) : null}
                        <button
                          type="button"
                          className="teacher-class-workspace__outline text-red-700"
                          aria-label={`Delete ${job.title} job`}
                          disabled={deletingJobId === job.jobId}
                          onClick={() => requestDelete(job)}
                        >
                          {deletingJobId === job.jobId ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </article>

      <ConfirmationDialog
        config={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </>
  );
}
