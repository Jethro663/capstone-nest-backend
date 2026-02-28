'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

  const handleStart = async () => {
    try {
      setStarting(true);
      const res = await assessmentService.startAttempt(assessmentId);
      router.push(`/dashboard/student/assessments/${assessmentId}/take?attemptId=${res.data.id}`);
    } catch {
      toast.error('Failed to start assessment');
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
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{assessment.totalPoints ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Total Points</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{assessment.passingScore ?? '—'}</p>
              <p className="text-xs text-muted-foreground">Passing Score</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{assessment.questions?.length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Questions</p>
            </div>
          </div>
          <Button onClick={handleStart} disabled={starting} className="w-full">
            {starting ? 'Starting...' : '▶ Start Assessment'}
          </Button>
        </CardContent>
      </Card>

      {/* My Attempts */}
      {attempts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">My Attempts</h2>
          <div className="space-y-3">
            {attempts.map((attempt, i) => (
              <Card key={attempt.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">Attempt #{attempts.length - i}</p>
                    <p className="text-sm text-muted-foreground">{formatDate(attempt.submittedAt || attempt.createdAt || '')}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={attempt.passed ? 'default' : 'destructive'}>
                      {attempt.passed ? 'PASSED' : 'FAILED'} — {attempt.score}/{attempt.totalPoints}
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
