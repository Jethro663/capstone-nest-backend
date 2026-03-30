'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3, ClipboardCheck, PenSquare, Users } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type {
  Assessment,
  AssessmentStats,
  QuestionAnalyticsResponse,
  SubmissionsResponse,
} from '@/types/assessment';
import { ResponsesTab } from '@/components/teacher/assessment/responses-tab';
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

export default function TeacherAssessmentDetailPage() {
  const params = useParams();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionsResponse | null>(null);
  const [stats, setStats] = useState<AssessmentStats | null>(null);
  const [analytics, setAnalytics] = useState<QuestionAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('responses');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentRes, submissionsRes, statsRes, analyticsRes] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getSubmissions(assessmentId),
        assessmentService.getStats(assessmentId),
        assessmentService.getQuestionAnalytics(assessmentId),
      ]);
      setAssessment(assessmentRes.data);
      setSubmissions(submissionsRes.data);
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    } catch {
      toast.error('Failed to load assessment data');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const summary = submissions?.summary;

  const backHref = assessment?.classId
    ? `/dashboard/teacher/classes/${assessment.classId}?view=assignments`
    : '/dashboard/teacher/assessments';

  const statItems = useMemo(
    () => [
      {
        label: 'Students',
        value: String(summary?.total ?? 0),
        caption: 'Assigned learners',
        icon: Users,
      },
      {
        label: 'Completion',
        value: `${stats?.completionRate ?? 0}%`,
        caption: 'Finished attempts',
        icon: ClipboardCheck,
      },
      {
        label: 'Average Score',
        value: `${stats?.averageScore ?? 0}%`,
        caption: 'Current average',
        icon: BarChart3,
      },
      {
        label: 'Pending Review',
        value: String(summary?.turnedIn ?? 0),
        caption: 'Waiting for scoring',
        icon: PenSquare,
      },
    ],
    [stats?.averageScore, stats?.completionRate, summary?.total, summary?.turnedIn],
  );

  if (loading) {
    return (
      <div className="teacher-assessment-detail">
        <div className="teacher-assessment-detail__hero">
          <Skeleton className="h-7 w-44 rounded-full" />
          <Skeleton className="h-11 w-80 rounded-xl" />
          <Skeleton className="h-5 w-64 rounded-lg" />
        </div>
        <div className="teacher-assessment-detail__stats">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-96 rounded-xl" />
        <Skeleton className="h-[460px] rounded-2xl" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="teacher-assessment-detail teacher-assessment-detail--empty">
        <Link href="/dashboard/teacher/assessments" className="teacher-assessment-detail__btn teacher-assessment-detail__btn--outline">
          <ArrowLeft className="h-4 w-4" />
          Back to Assessments
        </Link>
        <div className="teacher-assessment-detail__empty">Assessment not found.</div>
      </div>
    );
  }

  return (
    <div className="teacher-assessment-detail">
      <header className="teacher-assessment-detail__hero">
        <div className="teacher-assessment-detail__hero-main">
          <Link href={backHref} className="teacher-assessment-detail__back">
            <ArrowLeft className="h-4 w-4" />
            Back to Assignments
          </Link>
          <h1>{assessment.title}</h1>
          <div className="teacher-assessment-detail__badges">
            <Badge variant="outline" className="teacher-assessment-detail__badge">
              {assessment.type}
            </Badge>
            {assessment.classRecordCategory ? (
              <Badge variant="outline" className="teacher-assessment-detail__badge">
                {CATEGORY_LABELS[assessment.classRecordCategory] ?? assessment.classRecordCategory}
              </Badge>
            ) : null}
            {assessment.quarter ? (
              <Badge variant="outline" className="teacher-assessment-detail__badge">
                {assessment.quarter}
              </Badge>
            ) : null}
            <Badge
              className={
                assessment.isPublished
                  ? 'teacher-assessment-detail__badge teacher-assessment-detail__badge--published'
                  : 'teacher-assessment-detail__badge teacher-assessment-detail__badge--draft'
              }
            >
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
            <Badge variant="outline" className="teacher-assessment-detail__badge">
              Due: {formatDate(assessment.dueDate)}
            </Badge>
          </div>
        </div>
        <div className="teacher-assessment-detail__actions">
          <Link href={backHref} className="teacher-assessment-detail__btn teacher-assessment-detail__btn--outline">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
          <Link
            href={`/dashboard/teacher/assessments/${assessmentId}/edit`}
            className="teacher-assessment-detail__btn teacher-assessment-detail__btn--solid"
          >
            <PenSquare className="h-4 w-4" />
            Edit Assessment
          </Link>
        </div>
      </header>

      <section className="teacher-assessment-detail__stats">
        {statItems.map((item) => (
          <article key={item.label} className="teacher-assessment-detail__stat">
            <div>
              <p>{item.label}</p>
              <strong>{item.value}</strong>
              <span>{item.caption}</span>
            </div>
            <item.icon className="h-5 w-5" />
          </article>
        ))}
      </section>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="teacher-assessment-detail__tabs">
        <TabsList className="teacher-assessment-detail__tabs-list">
          <TabsTrigger value="responses" className="teacher-assessment-detail__tab-trigger">
            Responses
          </TabsTrigger>
          <TabsTrigger value="review" className="teacher-assessment-detail__tab-trigger">
            Review Answers
          </TabsTrigger>
          <TabsTrigger value="scores" className="teacher-assessment-detail__tab-trigger">
            Post Scores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="responses" className="teacher-assessment-detail__tab-panel">
          <ResponsesTab
            assessment={assessment}
            stats={stats}
            analytics={analytics}
            submissions={submissions}
          />
        </TabsContent>

        <TabsContent value="review" className="teacher-assessment-detail__tab-panel">
          <ReviewTab
            assessmentId={assessmentId}
            submissions={submissions}
            onGradeReturned={fetchData}
          />
        </TabsContent>

        <TabsContent value="scores" className="teacher-assessment-detail__tab-panel">
          <PostScoresTab
            assessmentId={assessmentId}
            assessment={assessment}
            submissions={submissions}
            onDataChanged={fetchData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
