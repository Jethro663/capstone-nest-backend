'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, BarChart3, CheckCircle2, Clock3, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import type { Assessment, AssessmentStats, QuestionAnalyticsResponse, StudentSubmission, SubmissionStatus, SubmissionsResponse } from '@/types/assessment';

type OverviewStage = 'draft' | 'unavailable' | 'waiting' | 'review' | 'released';

export interface AssessmentOverviewProps {
  assessment: Assessment;
  submissions: SubmissionsResponse | null;
  stats: AssessmentStats | null;
  analytics: QuestionAnalyticsResponse | null;
  onOpenReview: () => void;
  onOpenScores: () => void;
}

const STATUS_COPY: Record<SubmissionStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  turned_in: 'Awaiting review',
  returned: 'Released',
};

const STATUS_PRIORITY: Record<SubmissionStatus, number> = {
  turned_in: 0,
  in_progress: 1,
  not_started: 2,
  returned: 3,
};

export function getAssessmentOverviewState(assessment: Assessment, submissions: SubmissionsResponse | null) {
  const summary = submissions?.summary;
  const submitted = (summary?.turnedIn ?? 0) + (summary?.returned ?? 0);
  let stage: OverviewStage;

  if (!assessment.isPublished) {
    stage = 'draft';
  } else if (!submissions) {
    stage = 'unavailable';
  } else if (submitted === 0) {
    stage = 'waiting';
  } else if ((summary?.turnedIn ?? 0) > 0) {
    stage = 'review';
  } else {
    stage = 'released';
  }

  return {
    stage,
    total: summary?.total ?? 0,
    submitted,
    notStarted: summary?.notStarted ?? 0,
    inProgress: summary?.inProgress ?? 0,
    awaitingReview: summary?.turnedIn ?? 0,
    released: summary?.returned ?? 0,
  };
}

function formatDuration(seconds?: number) {
  if (!seconds) return '—';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function getLatestScore(student: StudentSubmission) {
  const score = student.attempt?.score;
  return score === null || score === undefined ? '—' : `${score}%`;
}

export function AssessmentOverview({ assessment, submissions, stats, analytics, onOpenReview, onOpenScores }: AssessmentOverviewProps) {
  const [rosterQuery, setRosterQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
  const overview = getAssessmentOverviewState(assessment, submissions);
  const hasPerformanceData = overview.submitted > 0 && Boolean(stats);
  const hasQuestionResponseData = overview.submitted > 0 && (analytics?.totalResponses ?? 0) > 0;
  const students = useMemo(
    () =>
      [...(submissions?.submissions ?? [])].sort((left, right) => {
        const priority = STATUS_PRIORITY[left.status] - STATUS_PRIORITY[right.status];
        if (priority !== 0) return priority;
        return left.lastName.localeCompare(right.lastName);
      }),
    [submissions?.submissions],
  );
  const visibleStudents = useMemo(() => {
    const query = rosterQuery.trim().toLocaleLowerCase();
    return students.filter((student) => {
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
      const matchesQuery =
        !query || [`${student.firstName} ${student.lastName}`, student.email ?? ''].some((value) => value.toLocaleLowerCase().includes(query));
      return matchesStatus && matchesQuery;
    });
  }, [rosterQuery, statusFilter, students]);
  const questionInsights = (analytics?.questions ?? [])
    .map((question, originalIndex) => ({ question, originalIndex }))
    .filter(({ question }) => question.totalResponses > 0)
    .sort((left, right) => left.question.correctPercent - right.question.correctPercent);

  const callout = {
    draft: {
      eyebrow: 'What needs attention',
      title: 'Draft — students cannot see this assessment',
      body: `Review the setup and publish when it is ready for ${overview.total} student${overview.total === 1 ? '' : 's'}.`,
    },
    unavailable: {
      eyebrow: 'Class activity',
      title: 'Student activity is temporarily unavailable',
      body: 'Retry the activity data before reviewing submissions or releasing scores.',
    },
    waiting: {
      eyebrow: 'Class activity',
      title: 'Waiting for student responses',
      body: `${overview.total} student${overview.total === 1 ? '' : 's'} can access this assessment. Performance appears after the first submission.`,
    },
    review: {
      eyebrow: 'What needs attention',
      title: `${overview.awaitingReview} submission${overview.awaitingReview === 1 ? '' : 's'} need review`,
      body: 'Review the latest attempts before releasing scores to students.',
    },
    released: {
      eyebrow: 'Assessment status',
      title: 'All received scores are released',
      body: `${overview.released} released score${overview.released === 1 ? '' : 's'} can now be viewed by students.`,
    },
  }[overview.stage];

  return (
    <div className="teacher-assessment-overview">
      <section className="teacher-assessment-overview__callout" data-stage={overview.stage}>
        <div>
          <p className="teacher-assessment-overview__eyebrow">{callout.eyebrow}</p>
          <h2>{callout.title}</h2>
          <p>{callout.body}</p>
        </div>
        {overview.stage === 'draft' ? (
          <Link href={`/dashboard/teacher/assessments/${assessment.id}/edit`} className="teacher-assessment-detail__btn teacher-assessment-detail__btn--solid">
            Continue setup
            <ArrowRight aria-hidden="true" />
          </Link>
        ) : null}
        {overview.stage === 'review' ? (
          <Button type="button" onClick={onOpenReview} className="teacher-assessment-detail__btn teacher-assessment-detail__btn--solid">
            Review submissions
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
        {overview.stage === 'released' ? (
          <Button type="button" onClick={onOpenScores} className="teacher-assessment-detail__btn teacher-assessment-detail__btn--outline">
            View scores
            <ArrowRight aria-hidden="true" />
          </Button>
        ) : null}
      </section>

      <section aria-labelledby="assessment-activity-summary">
        <div className="teacher-assessment-overview__section-heading">
          <div>
            <p className="teacher-assessment-overview__eyebrow">At a glance</p>
            <h2 id="assessment-activity-summary">Student activity</h2>
          </div>
          <p>Current status across the assigned class</p>
        </div>
        {submissions && students.length > 0 ? (
          <div className="grid gap-3 border-y border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1fr)_14rem]">
            <input
              type="search"
              aria-label="Search assessment roster"
              placeholder="Search learner or email"
              value={rosterQuery}
              onChange={(event) => setRosterQuery(event.target.value)}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            />
            <select
              aria-label="Filter assessment roster"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as 'all' | SubmissionStatus)}
              className="min-h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-slate-500"
            >
              <option value="all">All statuses</option>
              {Object.entries(STATUS_COPY).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <p className="text-sm text-slate-500 md:col-span-2" aria-live="polite">
              Showing {visibleStudents.length} of {students.length} learners
            </p>
          </div>
        ) : null}
        {submissions ? (
          <div className="teacher-assessment-overview__counts">
            <article>
              <UsersRound aria-hidden="true" />
              <div>
                <strong>
                  {overview.submitted} of {overview.total}
                </strong>
                <span>Submitted</span>
              </div>
            </article>
            <article>
              <Clock3 aria-hidden="true" />
              <div>
                <strong>{overview.inProgress}</strong>
                <span>In progress</span>
              </div>
            </article>
            <article data-tone={overview.awaitingReview > 0 ? 'attention' : undefined}>
              <BarChart3 aria-hidden="true" />
              <div>
                <strong>{overview.awaitingReview}</strong>
                <span>Awaiting review</span>
              </div>
            </article>
            <article data-tone="complete">
              <CheckCircle2 aria-hidden="true" />
              <div>
                <strong>{overview.released}</strong>
                <span>Released</span>
              </div>
            </article>
          </div>
        ) : (
          <p className="teacher-assessment-overview__empty">Activity counts could not be loaded.</p>
        )}
      </section>

      <section className="teacher-assessment-overview__worklist" aria-labelledby="student-worklist-heading">
        <div className="teacher-assessment-overview__section-heading">
          <div>
            <p className="teacher-assessment-overview__eyebrow">Roster</p>
            <h2 id="student-worklist-heading">Who needs attention</h2>
          </div>
          {overview.awaitingReview > 0 ? (
            <Button type="button" variant="outline" onClick={onOpenReview}>
              Review &amp; grade
            </Button>
          ) : null}
        </div>
        {!submissions ? (
          <p className="teacher-assessment-overview__empty">The student roster could not be loaded.</p>
        ) : students.length > 0 && visibleStudents.length > 0 ? (
          <div className="teacher-assessment-overview__table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Status</th>
                  <th>Attempts</th>
                  <th>Latest score</th>
                  <th>
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleStudents.map((student) => (
                  <tr key={student.studentId} data-status={student.status}>
                    <th scope="row">
                      <span>
                        {student.lastName}, {student.firstName}
                      </span>
                      <small>{student.email ?? 'No email available'}</small>
                    </th>
                    <td>
                      <span className="teacher-assessment-overview__status" data-status={student.status}>
                        {STATUS_COPY[student.status]}
                      </span>
                    </td>
                    <td>{student.totalAttempts ?? student.attempts?.length ?? (student.attempt ? 1 : 0)}</td>
                    <td>{getLatestScore(student)}</td>
                    <td>
                      {student.status === 'turned_in' || student.status === 'returned' ? (
                        <Button type="button" variant="ghost" onClick={onOpenReview} aria-label={`Review ${student.firstName} ${student.lastName}`}>
                          Review
                          <ArrowRight aria-hidden="true" />
                        </Button>
                      ) : (
                        <span aria-hidden="true">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : students.length > 0 ? (
          <p className="teacher-assessment-overview__empty">No learners match the current search and status filter.</p>
        ) : (
          <p className="teacher-assessment-overview__empty">No students are assigned to this assessment yet.</p>
        )}
      </section>

      <section className="teacher-assessment-overview__performance" aria-labelledby="class-performance-heading">
        <div className="teacher-assessment-overview__section-heading">
          <div>
            <p className="teacher-assessment-overview__eyebrow">Results</p>
            <h2 id="class-performance-heading">Class performance</h2>
          </div>
        </div>
        {hasPerformanceData ? (
          <div className="teacher-assessment-overview__performance-grid">
            <article>
              <strong>{stats?.averageScore}%</strong>
              <span>Average score</span>
            </article>
            <article>
              <strong>{stats?.passRate}%</strong>
              <span>Pass rate</span>
            </article>
            <article>
              <strong>{formatDuration(stats?.averageTimeSeconds)}</strong>
              <span>Average time</span>
            </article>
          </div>
        ) : (
          <div className="teacher-assessment-overview__empty">
            <strong>{!submissions || (overview.submitted > 0 && !stats) ? 'Performance data is temporarily unavailable' : 'No performance data yet'}</strong>
            <span>
              {!submissions || (overview.submitted > 0 && !stats)
                ? 'Retry the assessment data to load class results.'
                : 'Results will appear after a student submits the assessment.'}
            </span>
          </div>
        )}
      </section>

      {hasQuestionResponseData ? (
        <details className="teacher-assessment-overview__questions">
          <summary>
            <span>
              <strong>Question insights</strong>
              <small>Review the questions students found most difficult</small>
            </span>
            <span>
              {questionInsights.length} question
              {questionInsights.length === 1 ? '' : 's'}
            </span>
          </summary>
          {questionInsights.length > 0 ? (
            <div className="teacher-assessment-overview__question-list">
              {questionInsights.map(({ question, originalIndex }) => (
                <article key={question.questionId}>
                  <div>
                    <span>Q{originalIndex + 1}</span>
                    <RichTextRenderer html={question.content ?? '<p>No question content.</p>'} />
                  </div>
                  <strong>{question.correctPercent}% correct</strong>
                </article>
              ))}
            </div>
          ) : (
            <p className="teacher-assessment-overview__empty">Question-level insights are not available yet.</p>
          )}
        </details>
      ) : null}
    </div>
  );
}
