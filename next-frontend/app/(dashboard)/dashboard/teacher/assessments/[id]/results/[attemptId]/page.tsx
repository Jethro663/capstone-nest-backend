'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
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
    <motion.div
      className="max-w-3xl mx-auto space-y-6 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
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

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
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
      </motion.div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Question Review</h2>
        <div className="space-y-3">
          {responses.map((response, i) => (
            <motion.div
              key={response.questionId}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.06, duration: 0.3 }}
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
                {/* Question image */}
                {response.question?.imageUrl && (
                  <div className="mt-2">
                    <img src={response.question.imageUrl} alt="Question image" className="max-h-40 rounded-md border object-contain" />
                  </div>
                )}
                {/* Student answer resolution */}
                {(() => {
                  const options = response.question?.options || [];
                  if (response.selectedOptionId) {
                    const selected = options.find((o) => o.id === response.selectedOptionId);
                    return (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Answer: </span>
                        <span className={response.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {selected?.text || response.selectedOptionId}
                        </span>
                      </p>
                    );
                  }
                  if (response.selectedOptionIds && response.selectedOptionIds.length > 0) {
                    const selectedTexts = response.selectedOptionIds.map(
                      (id) => options.find((o) => o.id === id)?.text || id,
                    );
                    return (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Answers: </span>
                        <span className={response.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {selectedTexts.join(', ')}
                        </span>
                      </p>
                    );
                  }
                  if (response.studentAnswer) {
                    return (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Answer: </span>
                        <span className={response.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {response.studentAnswer}
                        </span>
                      </p>
                    );
                  }
                  return (
                    <p className="mt-2 text-sm text-muted-foreground italic">No answer provided</p>
                  );
                })()}
                {/* Show correct answer */}
                {response.question?.options && response.question.options.some((o) => o.isCorrect) && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Correct: </span>
                    <span className="text-green-600 font-medium">
                      {response.question.options.filter((o) => o.isCorrect).map((o) => o.text).join(', ')}
                    </span>
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
