'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!result) {
    return <p className="p-6 text-muted-foreground">Results not found.</p>;
  }

  const attemptSummary = result.attempt ?? {
    attemptNumber: result.attemptNumber,
    isReturned: result.isReturned,
    teacherFeedback: result.teacherFeedback,
  };
  const pct = result.score ?? 0;

  return (
    <motion.div
      className="mx-auto max-w-3xl space-y-6 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
          Back
        </Button>
        <h1 className="text-2xl font-bold">Student Attempt Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attempt #{attemptSummary.attemptNumber ?? '?'}
          {attemptSummary.isReturned && <Badge variant="outline" className="ml-2">Returned</Badge>}
        </p>
      </div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-3 gap-6 text-center">
              <div>
                <p className="text-4xl font-bold">{pct}%</p>
                <p className="mt-1 text-sm text-muted-foreground">Score</p>
              </div>
              <div className="flex items-center justify-center">
                <Badge
                  variant={result.passed ? 'default' : 'destructive'}
                  className="px-4 py-2 text-lg"
                >
                  {result.passed ? 'PASSED' : 'FAILED'}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  {attemptSummary.isReturned ? 'Returned' : 'Not returned'}
                </p>
                {attemptSummary.teacherFeedback && (
                  <p className="mt-1 text-sm italic">&ldquo;{attemptSummary.teacherFeedback}&rdquo;</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Question Review</h2>
        <div className="space-y-3">
          {result.responses.map((response, index) => (
            <motion.div
              key={response.questionId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.06, duration: 0.3 }}
            >
              <Card
                className={`border-l-4 ${
                  response.isCorrect === null || response.isCorrect === undefined
                    ? 'border-l-yellow-400'
                    : response.isCorrect
                      ? 'border-l-green-500'
                      : 'border-l-red-500'
                }`}
              >
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Q{index + 1}</span>
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
                  {response.question?.imageUrl && (
                    <div className="mt-2">
                      <Image
                        src={response.question.imageUrl}
                        alt="Question"
                        width={960}
                        height={540}
                        unoptimized
                        className="max-h-40 h-auto w-auto rounded-md border object-contain"
                      />
                    </div>
                  )}

                  {response.studentAnswer && (
                    <p className="mt-2 text-sm">
                      <span className="text-muted-foreground">Answer: </span>
                      <span>{response.studentAnswer}</span>
                    </p>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
