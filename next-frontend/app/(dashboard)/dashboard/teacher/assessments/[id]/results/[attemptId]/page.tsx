'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { AttemptResult } from '@/types/assessment';

export default function TeacherAttemptResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAttemptResults(attemptId);
      setResult(res.data);
    } catch {
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  }, [attemptId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!result) {
    return <p className="text-muted-foreground p-6">Results not found.</p>;
  }

  const { attempt, responses, score, passed } = result;
  const pct = score ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 py-6">
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Student Attempt Results</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Attempt #{attempt.attemptNumber ?? '?'}
          {attempt.isReturned && <Badge variant="outline" className="ml-2">Returned</Badge>}
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-4xl font-bold">{pct}%</p>
              <p className="text-sm text-muted-foreground mt-1">Score</p>
            </div>
            <div className="flex items-center justify-center">
              <Badge
                variant={passed ? 'default' : 'destructive'}
                className="text-lg px-4 py-2"
              >
                {passed ? 'PASSED' : 'FAILED'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {attempt.isReturned ? 'Returned' : 'Not returned'}
              </p>
              {attempt.teacherFeedback && (
                <p className="text-sm mt-1 italic">&ldquo;{attempt.teacherFeedback}&rdquo;</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-lg font-semibold mb-3">Question Review</h2>
        <div className="space-y-3">
          {responses.map((response, i) => (
            <Card
              key={response.questionId}
              className={`border-l-4 ${
                response.isCorrect === null || response.isCorrect === undefined
                  ? 'border-l-yellow-400'
                  : response.isCorrect
                    ? 'border-l-green-500'
                    : 'border-l-red-500'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Q{i + 1}</span>
                    <Badge
                      variant={
                        response.isCorrect === null || response.isCorrect === undefined
                          ? 'secondary'
                          : response.isCorrect
                            ? 'default'
                            : 'destructive'
                      }
                    >
                      {response.isCorrect === null || response.isCorrect === undefined
                        ? 'Pending Review'
                        : response.isCorrect
                          ? 'Correct'
                          : 'Incorrect'}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {response.pointsEarned ?? 0}/{response.question?.points ?? 0} pts
                  </span>
                </div>
                <p className="font-medium">{response.question?.content}</p>
                {response.studentAnswer && (
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">Answer: </span>
                    {response.studentAnswer}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
