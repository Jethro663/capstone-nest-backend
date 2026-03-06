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

export default function StudentAssessmentResultsPage() {
  const params = useParams();
  const router = useRouter();
  const attemptId = params.attemptId as string;
  const assessmentId = params.id as string;

  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getAttemptResults(attemptId);
      console.log('Attempt results:', res.data);
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
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    );
  }

  if (!result) {
    return <p className="text-muted-foreground">Results not found.</p>;
  }

  const { attempt, responses, score, passed } = result;

  // If grade is not returned yet, show a pending message
  if (attempt.isReturned === false) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}`)} className="mb-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Assessment Results</h1>
        </div>
        <Card>
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-5xl">⏳</div>
            <h2 className="text-xl font-semibold">Awaiting Review</h2>
            <p className="text-muted-foreground">
              Your teacher hasn&apos;t returned your grade yet. Check back later.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
 
  // score is already a percentage (0-100)
  const pct = score ?? 0;

  return (
    <motion.div
      className="max-w-3xl mx-auto space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div>
        <Button variant="ghost" size="sm" onClick={() => router.push(`/dashboard/student/assessments/${assessmentId}`)} className="mb-2">
          ← Back
        </Button>
        <h1 className="text-2xl font-bold">Assessment Results</h1>
      </div>

      {/* Score Card */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.3 }}>
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <p className="text-5xl font-bold">{pct}%</p>
              <p className="text-sm text-muted-foreground mt-1">Score</p>
            </div>
            <div className="flex items-center justify-center">
              <Badge
                variant={passed ? 'default' : 'destructive'}
                className="text-lg px-4 py-2"
              >
                {passed ? '✓ PASSED' : '✗ FAILED'}
              </Badge>
            </div>
          </div>
          {attempt.teacherFeedback && (
            <div className="mt-4 border-l-4 border-primary bg-primary/5 p-3 rounded-r">
              <p className="text-sm font-medium mb-1">Teacher Feedback</p>
              <p className="text-sm text-muted-foreground">{attempt.teacherFeedback}</p>
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>

      {/* Question Review */}
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
                    <Badge variant={
                      response.isCorrect === null || response.isCorrect === undefined
                        ? 'secondary'
                        : response.isCorrect
                          ? 'default'
                          : 'destructive'
                    }>
                      {response.isCorrect === null || response.isCorrect === undefined
                        ? '⏳ Pending Review'
                        : response.isCorrect
                          ? '✓ Correct'
                          : '✗ Incorrect'}
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
                  // Choice-based answer
                  if (response.selectedOptionId) {
                    const selected = options.find((o) => o.id === response.selectedOptionId);
                    return (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Your answer: </span>
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
                        <span className="text-muted-foreground">Your answers: </span>
                        <span className={response.isCorrect ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                          {selectedTexts.join(', ')}
                        </span>
                      </p>
                    );
                  }
                  if (response.studentAnswer) {
                    return (
                      <p className="mt-2 text-sm">
                        <span className="text-muted-foreground">Your answer: </span>
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
                {/* Show correct answer if incorrect */}
                {response.isCorrect === false && response.question?.options && (
                  <p className="mt-1 text-sm">
                    <span className="text-muted-foreground">Correct answer: </span>
                    <span className="text-green-600 font-medium">
                      {response.question.options.filter((o) => o.isCorrect).map((o) => o.text).join(', ')}
                    </span>
                  </p>
                )}
                {response.question?.explanation && (
                  <div className="mt-3 border-l-4 border-blue-400 bg-blue-50 p-3 rounded-r">
                    <p className="text-sm">💡 {response.question.explanation}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Study Tips */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-3">
            {passed ? 'Great Work!' : 'Study Resources'}
          </h3>
          {passed ? (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Keep up the excellent work! Review the feedback for any areas to improve.</li>
              <li>• Continue to the next lesson or assessment.</li>
            </ul>
          ) : (
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• Review the lesson content related to missed questions.</li>
              <li>• Practice with similar questions to strengthen understanding.</li>
              <li>• Ask your teacher for additional help on difficult topics.</li>
              <li>• Consider retaking the assessment when you feel ready.</li>
            </ul>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
