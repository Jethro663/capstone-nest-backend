'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ClipboardCheck, MessageSquareQuote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  StudentActionCard,
  StudentEmptyState,
  StudentSectionHeader,
  StudentStatusChip,
} from '@/components/student/student-primitives';
import { lxpService } from '@/services/lxp-service';
import type {
  StudentTeacherEvaluationCompletedItem,
  StudentTeacherEvaluationDashboardResponse,
  StudentTeacherEvaluationItem,
} from '@/types/lxp';
import { toast } from 'sonner';

function classLabel(item: StudentTeacherEvaluationItem | StudentTeacherEvaluationCompletedItem) {
  if (!item.class) return 'Class not available';
  const section = item.class.section
    ? `Grade ${item.class.section.gradeLevel} - ${item.class.section.name}`
    : 'Section unavailable';
  return `${item.class.subjectCode} | ${item.class.subjectName} | ${section}`;
}

export function StudentTeacherEvaluationsPage() {
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<StudentTeacherEvaluationDashboardResponse | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await lxpService.getStudentTeacherEvaluationDashboard();
      setDashboard(response.data);
    } catch {
      toast.error('Failed to load evaluation dashboard');
      setDashboard(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboard();
  }, []);

  const activeItem = useMemo(() => {
    if (!dashboard || !activeKey) return null;
    return (
      dashboard.pending.find(
        (item) =>
          `${item.classId}:${item.gradingPeriod}:${item.evaluationType}` ===
          activeKey,
      ) ?? null
    );
  }, [activeKey, dashboard]);

  useEffect(() => {
    if (!activeItem) {
      setRatings({});
      setComment('');
      return;
    }
    setRatings(
      Object.fromEntries(activeItem.questions.map((question) => [question.key, 0])),
    );
    setComment('');
  }, [activeItem]);

  const handleSubmit = async () => {
    if (!activeItem) return;
    const hasMissing = activeItem.questions.some((question) => !ratings[question.key]);
    if (hasMissing) {
      toast.error('Complete every rating before submitting.');
      return;
    }

    try {
      setSubmitting(true);
      await lxpService.submitTeacherEvaluation({
        classId: activeItem.classId,
        gradingPeriod: activeItem.gradingPeriod,
        evaluationType: activeItem.evaluationType,
        ratings,
        comment: comment.trim() || undefined,
      });
      toast.success('Evaluation submitted.');
      setActiveKey(null);
      await fetchDashboard();
    } catch {
      toast.error('Failed to submit evaluation.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="student-results-neutral-theme mx-auto max-w-6xl space-y-6 px-4 pb-10 pt-3">
      <StudentActionCard>
        <StudentSectionHeader
          title="Evaluations"
          subtitle="Submit anonymous feedback only when a class, JA Hub, or Learners Path window is available for you."
          action={
            dashboard ? (
              <StudentStatusChip tone="info">
                Current quarter {dashboard.currentAcademicState.quarter}
              </StudentStatusChip>
            ) : null
          }
        />
      </StudentActionCard>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <div className="space-y-4">
          <StudentActionCard>
            <StudentSectionHeader
              title="Pending Evaluations"
              subtitle="Each evaluation can be submitted once per class and grading period."
            />
            <div className="mt-4 space-y-3">
              {loading ? (
                <p className="text-sm text-slate-500">Loading pending evaluations...</p>
              ) : !dashboard || dashboard.pending.length === 0 ? (
                <StudentEmptyState
                  title="No pending evaluations"
                  description="You do not have any open teacher evaluation windows right now."
                  icon={<ClipboardCheck className="h-5 w-5" />}
                />
              ) : (
                dashboard.pending.map((item) => {
                  const itemKey = `${item.classId}:${item.gradingPeriod}:${item.evaluationType}`;
                  const selected = itemKey === activeKey;
                  return (
                    <button
                      key={itemKey}
                      type="button"
                      onClick={() => setActiveKey(itemKey)}
                      className={
                        selected
                          ? 'w-full rounded-2xl border border-slate-900 bg-slate-900 px-4 py-4 text-left text-white'
                          : 'w-full rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left'
                      }
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <StudentStatusChip tone={selected ? 'warning' : 'info'}>
                          {item.gradingPeriod}
                        </StudentStatusChip>
                        <StudentStatusChip tone={selected ? 'warning' : 'neutral'}>
                          {item.title}
                        </StudentStatusChip>
                      </div>
                      <p className="mt-3 text-sm font-semibold">{classLabel(item)}</p>
                      <p className="mt-2 text-sm opacity-90">{item.description}</p>
                    </button>
                  );
                })
              )}
            </div>
          </StudentActionCard>

          <StudentActionCard>
            <StudentSectionHeader
              title="Completed Evaluations"
              subtitle="This is your evaluation history for current eligible teacher-facing modules."
            />
            <div className="mt-4 space-y-3">
              {!dashboard || dashboard.completed.length === 0 ? (
                <p className="text-sm text-slate-500">No completed evaluations yet.</p>
              ) : (
                dashboard.completed.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <StudentStatusChip tone="success">
                        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                        Submitted
                      </StudentStatusChip>
                      <StudentStatusChip tone="info">{item.gradingPeriod}</StudentStatusChip>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-900">{item.title}</p>
                    <p className="mt-1 text-sm text-slate-600">{classLabel(item)}</p>
                  </div>
                ))
              )}
            </div>
          </StudentActionCard>
        </div>

        <StudentActionCard>
          <StudentSectionHeader
            title={activeItem ? activeItem.title : 'Choose an Evaluation'}
            subtitle={
              activeItem
                ? `${classLabel(activeItem)} | ${activeItem.gradingPeriod}`
                : 'Select a pending evaluation from the list to open the form.'
            }
          />
          {!activeItem ? (
            <div className="mt-6">
              <StudentEmptyState
                title="No evaluation selected"
                description="Select one pending evaluation on the left to start rating the class experience."
                icon={<MessageSquareQuote className="h-5 w-5" />}
              />
            </div>
          ) : (
            <div className="mt-5 space-y-5">
              {activeItem.questions.map((question) => (
                <div key={question.key} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-sm font-semibold text-slate-900">{question.label}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          setRatings((current) => ({ ...current, [question.key]: value }))
                        }
                        className={
                          ratings[question.key] === value
                            ? 'rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white'
                            : 'rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700'
                        }
                      >
                        {value}
                      </button>
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <p className="text-sm font-semibold text-slate-900">Optional comment</p>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  className="mt-3"
                  placeholder="Share a short anonymous comment about this class experience."
                />
              </div>

              <Button onClick={() => void handleSubmit()} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Evaluation'}
              </Button>
            </div>
          )}
        </StudentActionCard>
      </div>
    </main>
  );
}
