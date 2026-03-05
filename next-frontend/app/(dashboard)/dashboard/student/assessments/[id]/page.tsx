'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getDescription, formatDate } from '@/utils/helpers';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';

export default function StudentAssessmentPage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params.id as string;

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [attempts, setAttempts] = useState<AssessmentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [assessmentRes, attemptsRes] = await Promise.all([
        assessmentService.getById(assessmentId),
        assessmentService.getStudentAttempts(assessmentId),
      ]);
      setAssessment(assessmentRes.data);
      setAttempts(attemptsRes.data || []);
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const submittedAttempts = attempts.filter((a) => a.isSubmitted !== false);
  const maxAttempts = assessment?.maxAttempts ?? 1;
  const attemptsRemaining = maxAttempts - submittedAttempts.length;
  const canStart = attemptsRemaining > 0;

  const handleStart = async () => {
    try {
      setStarting(true);
      const res = await assessmentService.startAttempt(assessmentId);
      const { attempt, timeLimitMinutes } = res.data;
      let url = `/dashboard/student/assessments/${assessmentId}/take?attemptId=${attempt.id}`;
      if (timeLimitMinutes) url += `&timeLimit=${timeLimitMinutes}`;
      router.push(url);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to start assessment');
    } finally {
      setStarting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    );
  }

  if (!assessment) {
    return <p className="text-muted-foreground">Assessment not found.</p>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">{assessment.title}</h1>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant="outline">{assessment.type}</Badge>
          <span className="text-sm text-muted-foreground">{assessment.questions?.length ?? 0} questions</span>
        </div>
      </div>

      {/* Assessment Info */}
      <Card>
        <CardContent className="p-6 space-y-4">
          {assessment.description && (
            <p className="text-muted-foreground">{getDescription(assessment.description)}</p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{assessment.totalPoints ?? 0}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{assessment.passingScore ?? 60}%</p>
              <p className="text-xs text-muted-foreground">Passing Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{maxAttempts}</p>
              <p className="text-xs text-muted-foreground">Max Attempts</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{assessment.timeLimitMinutes ?? '∞'}</p>
              <p className="text-xs text-muted-foreground">{assessment.timeLimitMinutes ? 'Minutes' : 'No Limit'}</p>
            </div>
          </div>

          {assessment.dueDate && (
            <p className="text-sm text-muted-foreground text-center">Due: {formatDate(assessment.dueDate)}</p>
          )}

          {canStart ? (
            <Button onClick={handleStart} disabled={starting} className="w-full">
              {starting
                ? 'Starting...'
                : submittedAttempts.length > 0
                  ? `▶ Retake Assessment (${attemptsRemaining} attempt${attemptsRemaining > 1 ? 's' : ''} left)`
                  : '▶ Start Assessment'}
            </Button>
          ) : (
            <Button disabled className="w-full">
              No attempts remaining
            </Button>
          )}
        </CardContent>
      </Card>

      {/* My Attempts */}
      {submittedAttempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">My Attempts</h2>
          <div className="space-y-3">
            {submittedAttempts.map((attempt) => (
              <Card key={attempt.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">Attempt #{attempt.attemptNumber ?? '?'}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(attempt.submittedAt || attempt.createdAt || '')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={attempt.passed ? 'default' : 'destructive'}>
                      {attempt.passed ? 'PASSED' : 'FAILED'} — {attempt.score}%
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}/results/${attempt.id}`)}
                    >
                      View Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
  

