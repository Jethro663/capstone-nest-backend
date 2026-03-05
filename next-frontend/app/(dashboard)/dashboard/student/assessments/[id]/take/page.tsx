'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion } from '@/types/assessment';

export default function StudentAssessmentTakePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const attemptId = searchParams.get('attemptId');

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getById(assessmentId);
      setAssessment(res.data);
      const sorted = (res.data.questions || []).sort((a, b) => a.order - b.order);
      setQuestions(sorted);
      // Get time limit from query param or assessment
      const limitParam = searchParams.get('timeLimit');
      if (limitParam) {
        setTimeLimit(Number(limitParam));
      } else if (res.data.timeLimitMinutes) {
        setTimeLimit(res.data.timeLimitMinutes);
      }
    } catch {
      toast.error('Failed to load assessment');
    } finally {
      setLoading(false);
    }
  }, [assessmentId, searchParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Auto-submit when time limit is reached
  useEffect(() => {
    if (timeLimit && timeElapsed >= timeLimit * 60) {
      toast.warning('Time is up! Auto-submitting your assessment.');
      handleSubmit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeElapsed, timeLimit]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const remainingSeconds = timeLimit ? Math.max(0, timeLimit * 60 - timeElapsed) : null;
  const isTimeLow = remainingSeconds !== null && remainingSeconds <= 60;

  const setResponse = (questionId: string, value: string | string[]) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async () => {
    if (!assessment) return;
    try {
      setSubmitting(true);
      const submissionResponses = questions.map((q) => {
        const answer = responses[q.id];
        const r: { questionId: string; studentAnswer?: string; selectedOptionId?: string; selectedOptionIds?: string[] } = { questionId: q.id };
        if (q.type === 'multiple_choice' || q.type === 'true_false' || q.type === 'dropdown') {
          r.selectedOptionId = answer as string;
        } else if (q.type === 'multiple_select') {
          r.selectedOptionIds = (answer as string[]) || [];
        } else {
          r.studentAnswer = answer as string;
        }
        return r;
      });

      await assessmentService.submit({
        assessmentId,
        responses: submissionResponses,
        timeSpentSeconds: timeElapsed,
      });

      toast.success('Assessment submitted!');
      setTimeout(() => {
        router.push(`/dashboard/student/assessments/${assessmentId}`);
      }, 1500);
    } catch {
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  if (!assessment || questions.length === 0) {
    return <p className="text-muted-foreground">No questions available.</p>;
  }

  const current = questions[currentIdx];
  const answeredCount = questions.filter((q) => {
    const a = responses[q.id];
    return a !== undefined && a !== '' && (!Array.isArray(a) || a.length > 0);
  }).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{assessment.title}</h1>
          <p className="text-sm text-muted-foreground">
            Question {currentIdx + 1} of {questions.length}
          </p>
        </div>
        <div className="text-right">
          {remainingSeconds !== null ? (
            <span className={`font-mono text-lg ${isTimeLow ? 'text-red-600 animate-pulse font-bold' : ''}`}>
              ⏱ {formatTime(remainingSeconds)}
            </span>
          ) : (
            <span className="font-mono text-lg">{formatTime(timeElapsed)}</span>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_250px]">
        {/* Question pane */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{current.type.replace('_', ' ')}</Badge>
              <Badge variant="secondary">{current.points} pts</Badge>
            </div>
            <h2 className="text-lg font-semibold">{current.content}</h2>

            {/* Answer input */}
            <AnswerInput question={current} value={responses[current.id]} onChange={(val) => setResponse(current.id, val)} />

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4 border-t">
              <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>
                Previous
              </Button>
              {currentIdx < questions.length - 1 ? (
                <Button onClick={() => setCurrentIdx((i) => i + 1)}>Next</Button>
              ) : (
                <Button onClick={() => setShowConfirm(true)}>Submit Assessment</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Question navigator sidebar */}
        <Card className="h-fit">
          <CardContent className="p-4">
            <p className="text-sm font-medium mb-3">Questions</p>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => {
                const answered = responses[q.id] !== undefined && responses[q.id] !== '' && (!Array.isArray(responses[q.id]) || (responses[q.id] as string[]).length > 0);
                return (
                  <Button
                    key={q.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIdx(i)}
                    className={`w-full ${
                      i === currentIdx
                        ? 'bg-red-500 text-white border-red-500'
                        : answered
                        ? 'bg-green-100 border-green-400 text-green-700'
                        : ''
                    }`}
                  >
                    {i + 1}
                  </Button>
                );
              })}
            </div>
            <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Current</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-100 border border-green-400" /> Answered</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {answeredCount}/{questions.length} answered
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Confirm dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              You&apos;ve answered {answeredCount} of {questions.length} questions. Are you sure you want to submit?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Keep Working</Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Assessment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
}: {
  question: AssessmentQuestion;
  value: string | string[] | undefined;
  onChange: (val: string | string[]) => void;
}) {
  const options = question.options?.sort((a, b) => a.order - b.order) || [];

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.id}
              className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${
                value === opt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="accent-blue-600"
              />
              <span>{opt.text}</span>
            </label>
          ))}
        </div>
      );

    case 'multiple_select':
      return (
        <div className="space-y-2">
          {options.map((opt) => {
            const selected = Array.isArray(value) ? value.includes(opt.id) : false;
            return (
              <label
                key={opt.id}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition ${
                  selected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(selected ? current.filter((id) => id !== opt.id) : [...current, opt.id]);
                  }}
                  className="accent-blue-600"
                />
                <span>{opt.text}</span>
              </label>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="flex gap-3">
          {['True', 'False'].map((label) => {
            const opt = options.find((o) => o.text.toLowerCase() === label.toLowerCase());
            const optId = opt?.id || label.toLowerCase();
            return (
              <Button
                key={label}
                variant={value === optId ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => onChange(optId)}
              >
                {label}
              </Button>
            );
          })}
        </div>
      );

    case 'short_answer':
    case 'fill_blank':
      return (
        <textarea
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type your answer..."
          className="w-full rounded-lg border p-3 min-h-[100px] resize-y"
        />
      );

    case 'dropdown':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border p-3"
        >
          <option value="">Select an answer...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.text}</option>
          ))}
        </select>
      );

    default:
      return <p className="text-muted-foreground">Unsupported question type</p>;
  }
}
