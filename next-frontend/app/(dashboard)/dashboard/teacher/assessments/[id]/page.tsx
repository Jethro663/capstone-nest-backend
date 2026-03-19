'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
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
import { ReviewTab } from './_components/review-tab';
import { PostScoresTab } from '@/components/teacher/assessment/post-scores-tab';

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
    <div className="max-w-6xl mx-auto space-y-6 py-6 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between gap-4 flex-wrap"
      >
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge variant="outline" className="capitalize">{assessment.type}</Badge>
            {assessment.classRecordCategory && (
              <Badge variant="secondary">
                {CATEGORY_LABELS[assessment.classRecordCategory] ?? assessment.classRecordCategory}
              </Badge>
            )}
            {assessment.quarter && <Badge variant="secondary">{assessment.quarter}</Badge>}
            <Badge variant={assessment.isPublished ? 'default' : 'secondary'}>
              {assessment.isPublished ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/teacher/assessments/${assessmentId}/edit`)}
        >
          Edit Assessment
        </Button>
      </motion.div>

      {/* Quick Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardContent className="py-4 px-6">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 text-center">
              {[
                { value: summary?.total ?? 0, label: 'Students', color: '' },
                { value: `${stats?.completionRate ?? 0}%`, label: 'Completion', color: 'text-blue-600' },
                { value: `${stats?.averageScore ?? 0}%`, label: 'Avg Score', color: 'text-emerald-600' },
                { value: `${stats?.passRate ?? 0}%`, label: 'Pass Rate', color: 'text-violet-600' },
                { value: summary?.turnedIn ?? 0, label: 'Pending Review', color: 'text-amber-600' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15 + i * 0.05 }}
                >
                  <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 3-Tab Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="responses">Responses</TabsTrigger>
          <TabsTrigger value="review">Review Answers</TabsTrigger>
          <TabsTrigger value="scores">Post Scores</TabsTrigger>
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
    </div>
  );
}
