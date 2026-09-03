'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CalendarDays, PenSquare, RefreshCw } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type {
  Assessment,
  AssessmentStats,
  QuestionAnalyticsResponse,
  SubmissionsResponse,
} from '@/types/assessment';
import { AssessmentOverview } from '@/components/teacher/assessment/assessment-overview';
import { PostScoresTab } from '@/components/teacher/assessment/post-scores-tab';
import { ReviewTab } from './_components/review-tab';
import './assessment-detail.css';

const CATEGORY_LABELS: Record<string, string> = {
  written_work: 'Written Work',
  performance_task: 'Performance Task',
  quarterly_assessment: 'Quarterly Assessment',
};

function formatDate(value?: string) {
  if (!value) return 'No due date';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'No due date';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAssessmentTypeLabel(value?: string) {
  if (!value) return 'Assessment';
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export default function TeacherAssessmentDetailPage() {
  const params = useParams();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionsResponse | null>(null);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [analytics, setAnalytics] = useState<QuestionAnalyticsResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partialFailures, setPartialFailures] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async (mode: 'initial' | 'background' = 'initial') => {
    const isBackground = mode === 'background';
    try {
      if (isBackground) {
        setRefreshing(true);
      } else {
        setInitialLoading(true);
        setLoadError(null);
      }

      const [assessmentResult, submissionsResult, statsResult, analyticsResult] = await Promise.allSettled([
        assessmentService.getById(assessmentId),
        assessmentService.getSubmissions(assessmentId),
        assessmentService.getStats(assessmentId),
        assessmentService.getQuestionAnalytics(assessmentId),
      ]);

      if (assessmentResult.status === 'rejected') {
        if (isBackground) {
          toast.error('Could not refresh the assessment. Your current view is unchanged.');
        } else {
          setAssessment(null);
          setLoadError('We could not load this assessment.');
        }
        return;
      }

      setAssessment(assessmentResult.value.data);
      setLoadError(null);

      const failures: string[] = [];
      if (submissionsResult.status === 'fulfilled') {
        setSubmissions(submissionsResult.value.data);
      } else {
        failures.push('student activity');
        if (!isBackground) setSubmissions(null);
      }
      if (statsResult.status === 'fulfilled') {
        setStats(statsResult.value.data);
      } else {
        failures.push('class performance');
        if (!isBackground) setStats(null);
      }
      if (analyticsResult.status === 'fulfilled') {
        setAnalytics(analyticsResult.value.data);
      } else {
        failures.push('question insights');
        if (!isBackground) setAnalytics(null);
      }
      setPartialFailures(failures);
    } finally {
      if (isBackground) {
        setRefreshing(false);
      } else {
        setInitialLoading(false);
      }
    }
  }, [assessmentId]);

  useEffect(() => {
    void fetchData('initial');
  }, [fetchData]);

  const backHref = assessment?.classId
    ? `/dashboard/teacher/classes/${assessment.classId}?view=assignments`
    : '/dashboard/teacher/assessments';

  if (initialLoading) {
    return (
      <div className="teacher-assessment-detail" data-testid="assessment-detail-loading">
        <div className="teacher-assessment-detail__header teacher-assessment-detail__header--loading">
          <Skeleton className="h-5 w-40 rounded-md" />
          <Skeleton className="h-9 w-80 rounded-md" />
          <Skeleton className="h-5 w-64 rounded-md" />
        </div>
        <Skeleton className="h-11 w-96 rounded-md" />
        <Skeleton className="h-[420px] rounded-lg" />
      </div>
    );
  }

  if (loadError || !assessment) {
    return (
      <div className="teacher-assessment-detail teacher-assessment-detail--empty">
        <Link href="/dashboard/teacher/assessments" className="teacher-assessment-detail__back">
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Link>
        <section className="teacher-assessment-detail__load-error">
          <AlertTriangle aria-hidden="true" />
          <div>
            <h1>Assessment unavailable</h1>
            <p>{loadError ?? 'We could not load this assessment.'}</p>
          </div>
          <Button type="button" variant="outline" onClick={() => void fetchData('initial')}>
            <RefreshCw aria-hidden="true" />
            Try again
          </Button>
        </section>
      </div>
    );
  }

  return (
    <div className="teacher-assessment-detail">
      <header className="teacher-assessment-detail__header">
        <Link href={backHref} className="teacher-assessment-detail__back">
          <ArrowLeft aria-hidden="true" />
          Back to assignments
        </Link>
        <div className="teacher-assessment-detail__header-row">
          <div className="teacher-assessment-detail__title-block">
            <h1>{assessment.title}</h1>
            <div className="teacher-assessment-detail__metadata">
              <span>{formatAssessmentTypeLabel(assessment.type)}</span>
              {typeof assessment.totalPoints === 'number' ? (
                <span>{assessment.totalPoints} point{assessment.totalPoints === 1 ? '' : 's'}</span>
              ) : null}
              {assessment.classRecordCategory ? (
                <span>{CATEGORY_LABELS[assessment.classRecordCategory] ?? assessment.classRecordCategory}</span>
              ) : null}
              {assessment.quarter ? <span>{assessment.quarter}</span> : null}
              <span
                className="teacher-assessment-detail__status"
                data-status={assessment.isPublished ? 'published' : 'draft'}
              >
                {assessment.isPublished ? 'Published' : 'Draft'}
              </span>
              <span className="teacher-assessment-detail__due-date">
                <CalendarDays aria-hidden="true" />
                {formatDate(assessment.dueDate)}
              </span>
              {refreshing ? <span className="teacher-assessment-detail__refreshing">Refreshing…</span> : null}
            </div>
          </div>
          <Link
            href={`/dashboard/teacher/assessments/${assessmentId}/edit`}
            className="teacher-assessment-detail__btn teacher-assessment-detail__btn--outline"
          >
            <PenSquare aria-hidden="true" />
            Edit assessment
          </Link>
        </div>
      </header>

      {partialFailures.length > 0 ? (
        <div className="teacher-assessment-detail__warning" role="status">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>Some assessment information is unavailable</strong>
            <span>Could not load {partialFailures.join(', ')}. The rest of the assessment is still usable.</span>
          </div>
          <Button type="button" variant="outline" onClick={() => void fetchData('background')} disabled={refreshing}>
            <RefreshCw aria-hidden="true" />
            Retry
          </Button>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="teacher-assessment-detail__tabs">
        <TabsList className="teacher-assessment-detail__tabs-list" aria-label="Assessment workbench">
          <TabsTrigger value="overview" className="teacher-assessment-detail__tab-trigger">
            Overview
          </TabsTrigger>
          <TabsTrigger value="review" className="teacher-assessment-detail__tab-trigger">
            Review &amp; grade
          </TabsTrigger>
          <TabsTrigger value="scores" className="teacher-assessment-detail__tab-trigger">
            Scores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="teacher-assessment-detail__tab-panel">
          <AssessmentOverview
            assessment={assessment}
            stats={stats}
            analytics={analytics}
            submissions={submissions}
            onOpenReview={() => setActiveTab('review')}
            onOpenScores={() => setActiveTab('scores')}
          />
        </TabsContent>

        <TabsContent value="review" className="teacher-assessment-detail__tab-panel">
          <ReviewTab
            assessmentId={assessmentId}
            submissions={submissions}
            onGradeReturned={() => void fetchData('background')}
          />
        </TabsContent>

        <TabsContent value="scores" className="teacher-assessment-detail__tab-panel">
          <PostScoresTab
            assessmentId={assessmentId}
            assessment={assessment}
            submissions={submissions}
            onDataChanged={() => void fetchData('background')}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
