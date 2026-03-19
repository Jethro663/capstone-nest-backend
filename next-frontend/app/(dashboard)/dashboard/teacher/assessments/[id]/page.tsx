'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, ClipboardCheck, PenSquare, Users } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  Assessment,
  SubmissionsResponse,
  AssessmentStats,
  QuestionAnalyticsResponse,
} from '@/types/assessment';
import { ResponsesTab } from '@/components/teacher/assessment/responses-tab';
import { ReviewTab } from '@/components/teacher/assessment/review-tab';
import { PostScoresTab } from '@/components/teacher/assessment/post-scores-tab';
import { TeacherPageShell, TeacherSectionCard, TeacherStatCard } from '@/components/teacher/TeacherPageShell';

const CATEGORY_LABELS: Record<string, string> = {
  written_work: 'Written Work',
  performance_task: 'Performance Task',
  quarterly_assessment: 'Quarterly Assessment',
};

const tabVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

export default function TeacherAssessmentDetailPage() {
  const params = useParams();
  const router = useRouter();
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
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 py-6 px-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-12 w-96" />
        <Skeleton className="h-[400px] rounded-lg" />
      </div>
    );
  }

  if (!assessment) {
    return <p className="text-muted-foreground p-6">Assessment not found.</p>;
  }

  const summary = submissions?.summary;

  return (
    <TeacherPageShell
      badge="Assessment Review"
      title={assessment.title}
      description="Track submissions, review answers, and post outcomes from a cleaner teacher assessment workspace."
      actions={(
        <>
          <Button variant="outline" size="sm" className="teacher-button-outline rounded-xl font-black" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="teacher-button-solid rounded-xl font-black"
            onClick={() => router.push(`/dashboard/teacher/assessments/${assessmentId}/edit`)}
          >
            <PenSquare className="h-4 w-4" />
            Edit Assessment
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard label="Students" value={summary?.total ?? 0} caption="Learners included in this assessment" icon={Users} accent="sky" />
          <TeacherStatCard label="Completion" value={`${stats?.completionRate ?? 0}%`} caption="Attempts completed or submitted" icon={ClipboardCheck} accent="teal" />
          <TeacherStatCard label="Average Score" value={`${stats?.averageScore ?? 0}%`} caption="Current performance snapshot" icon={BarChart3} accent="amber" />
          <TeacherStatCard label="Pending Review" value={summary?.turnedIn ?? 0} caption={assessment.isPublished ? 'Published assessment' : 'Draft assessment'} icon={PenSquare} accent="rose" />
        </>
      )}
    >
      <TeacherSectionCard
        title="Assessment Snapshot"
        description="Key assessment metadata stays visible here while you move between response review and posting scores."
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="capitalize border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-[var(--teacher-text-strong)]">{assessment.type}</Badge>
            {assessment.classRecordCategory && (
              <Badge variant="secondary" className="border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-[var(--teacher-text-strong)]">
                {CATEGORY_LABELS[assessment.classRecordCategory] ?? assessment.classRecordCategory}
              </Badge>
            )}
            {assessment.quarter && <Badge variant="secondary" className="border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] text-[var(--teacher-text-strong)]">{assessment.quarter}</Badge>}
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'} className={assessment.isPublished ? 'border border-emerald-400/30 bg-emerald-400/12 text-emerald-100' : 'border border-amber-400/30 bg-amber-400/12 text-amber-100'}>
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </motion.div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Assessment Insights"
        description="A calmer overview of engagement and performance before you drill down into tabs."
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="grid grid-cols-2 gap-4 text-center sm:grid-cols-4 xl:grid-cols-5">
            {[
              { value: summary?.total ?? 0, label: 'Students', color: 'text-[var(--teacher-text-strong)]' },
              { value: `${stats?.completionRate ?? 0}%`, label: 'Completion', color: 'text-sky-200' },
              { value: `${stats?.averageScore ?? 0}%`, label: 'Avg Score', color: 'text-emerald-200' },
              { value: `${stats?.passRate ?? 0}%`, label: 'Pass Rate', color: 'text-violet-200' },
              { value: summary?.turnedIn ?? 0, label: 'Pending Review', color: 'text-amber-200' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.05 }}
                className="teacher-dashboard-mini-panel"
              >
                <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-[var(--teacher-text-muted)]">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </TeacherSectionCard>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="teacher-tab-list grid w-full max-w-md grid-cols-3">
          <TabsTrigger className="teacher-tab rounded-xl font-black" value="responses">Responses</TabsTrigger>
          <TabsTrigger className="teacher-tab rounded-xl font-black" value="review">Review Answers</TabsTrigger>
          <TabsTrigger className="teacher-tab rounded-xl font-black" value="scores">Post Scores</TabsTrigger>
        </TabsList>

        <AnimatePresence mode="wait">
          {activeTab === 'responses' && (
            <TabsContent value="responses" forceMount>
              <motion.div key="responses" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <ResponsesTab
                  assessment={assessment}
                  stats={stats}
                  analytics={analytics}
                  submissions={submissions}
                />
              </motion.div>
            </TabsContent>
          )}

          {activeTab === 'review' && (
            <TabsContent value="review" forceMount>
              <motion.div key="review" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <ReviewTab
                  assessmentId={assessmentId}
                  submissions={submissions}
                  onGradeReturned={fetchData}
                />
              </motion.div>
            </TabsContent>
          )}

          {activeTab === 'scores' && (
            <TabsContent value="scores" forceMount>
              <motion.div key="scores" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                <PostScoresTab
                  assessmentId={assessmentId}
                  assessment={assessment}
                  submissions={submissions}
                  onDataChanged={fetchData}
                />
              </motion.div>
            </TabsContent>
          )}
        </AnimatePresence>
      </Tabs>
    </TeacherPageShell>
  );
}
