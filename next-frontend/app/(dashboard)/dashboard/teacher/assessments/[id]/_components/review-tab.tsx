'use client';

import { useState, useEffect } from 'react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils/cn';
import type { SubmissionsResponse, StudentSubmission, SubmissionStatus } from '@/types/assessment';

interface ReviewTabProps {
  assessmentId: string;
  submissions: SubmissionsResponse | null;
  onGradeReturned: () => void;
}

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  not_started: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  turned_in: 'bg-amber-100 text-amber-700',
  returned: 'bg-emerald-100 text-emerald-700',
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  turned_in: 'Graded',
  returned: 'Posted',
};

export function ReviewTab({ assessmentId, submissions, onGradeReturned }: ReviewTabProps) {
  const studentsWithAttempts = (submissions?.submissions ?? []).filter(
    (s) => s.attempt?.isSubmitted,
  );

  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(
    studentsWithAttempts[0]?.studentId ?? null,
  );
  const [attemptData, setAttemptData] = useState<any>(null);
  const [loadingAttempt, setLoadingAttempt] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [returning, setReturning] = useState(false);
  const [search, setSearch] = useState('');

  const selectedStudent = studentsWithAttempts.find((s) => s.studentId === selectedStudentId);

  useEffect(() => {
    if (!selectedStudent?.attempt?.id) {
      setAttemptData(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoadingAttempt(true);
      try {
        const res = await assessmentService.getAttemptResults(selectedStudent.attempt!.id);
        if (!cancelled) {
          setAttemptData(res.data);
          setFeedback((res.data as any)?.teacherFeedback ?? '');
        }
      } catch {
        if (!cancelled) toast.error('Failed to load student attempt');
      } finally {
        if (!cancelled) setLoadingAttempt(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [selectedStudent?.attempt?.id]);

  const handleReturnGrade = async () => {
    if (!selectedStudent?.attempt?.id) return;
    try {
      setReturning(true);
      await assessmentService.returnGrade(selectedStudent.attempt.id, feedback || undefined);
      toast.success(`Grade returned to ${selectedStudent.firstName} ${selectedStudent.lastName}`);
      onGradeReturned();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to return grade');
    } finally {
      setReturning(false);
    }
  };

  const filteredStudents = studentsWithAttempts.filter((s) => {
    if (!search) return true;
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return name.includes(search.toLowerCase());
  });

  if (studentsWithAttempts.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center text-muted-foreground">
          <p className="text-lg font-medium mb-1">No submissions to review</p>
          <p className="text-sm">Student answers will appear here once they submit the assessment.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex gap-4 min-h-[500px]">
      {/* Left Sidebar — Student List */}
      <div className="w-72 shrink-0 space-y-2">
        <input
          type="text"
          placeholder="Search students…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <div className="space-y-1 max-h-[460px] overflow-y-auto pr-1">
          {filteredStudents.map((student, i) => (
            <motion.button
              key={student.studentId}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setSelectedStudentId(student.studentId)}
              className={cn(
                'w-full text-left rounded-lg px-3 py-2.5 transition-colors text-sm',
                selectedStudentId === student.studentId
                  ? 'bg-primary/10 border border-primary/20'
                  : 'hover:bg-muted',
              )}
            >
              <p className="font-medium truncate">
                {student.lastName}, {student.firstName}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium', STATUS_COLORS[student.status])}>
                  {STATUS_LABELS[student.status]}
                </span>
                {student.attempt?.score != null && (
                  <span className="text-xs font-semibold">{student.attempt.score}%</span>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Right Panel — Student Attempt Detail */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {loadingAttempt ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <Skeleton className="h-20 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
              <Skeleton className="h-40 rounded-lg" />
            </motion.div>
          ) : attemptData && selectedStudent ? (
            <motion.div key={selectedStudent.studentId} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
              <AttemptDetailPanel
                student={selectedStudent}
                data={attemptData}
                feedback={feedback}
                setFeedback={setFeedback}
                onReturn={handleReturnGrade}
                returning={returning}
              />
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  Select a student to review their answers.
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function AttemptDetailPanel({
  student,
  data,
  feedback,
  setFeedback,
  onReturn,
  returning,
}: {
  student: StudentSubmission;
  data: any;
  feedback: string;
  setFeedback: (v: string) => void;
  onReturn: () => void;
  returning: boolean;
}) {
  const score = data.score ?? student.attempt?.score ?? 0;
  const totalPoints = data.assessment?.totalPoints ?? 0;
  const responses = data.responses ?? [];
  const timeSpent = student.attempt?.timeSpentSeconds;
  const isReturned = student.status === 'returned';

  return (
    <div className="space-y-4">
      {/* Student Info Header */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg">
                {student.firstName} {student.lastName}
              </h3>
              <p className="text-sm text-muted-foreground">
                {student.email ?? ''}
                {timeSpent ? ` · ${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-3xl font-bold', score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500')}>
                {score}%
              </p>
              {totalPoints > 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.round((score / 100) * totalPoints)} / {totalPoints} pts
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Responses */}
      <div className="space-y-3">
        {responses.map((r: any, i: number) => (
          <ResponseCard key={r.id || r.questionId || i} response={r} index={i} />
        ))}
      </div>

      {/* Feedback + Return */}
      {!isReturned && (
        <Card>
          <CardContent className="p-4 space-y-3">
            <Textarea
              placeholder="Add feedback for this student (optional)"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={3}
            />
            <Button onClick={onReturn} disabled={returning} className="w-full">
              {returning ? 'Returning…' : 'Return Grade'}
            </Button>
          </CardContent>
        </Card>
      )}

      {isReturned && (
        <div className="text-center text-sm text-emerald-600 font-medium py-2">
          ✓ Grade has been returned to this student
        </div>
      )}
    </div>
  );
}

function ResponseCard({ response: r, index }: { response: any; index: number }) {
  const question = r.question;
  if (!question) return null;

  const isCorrect = r.isCorrect === true;
  const isWrong = r.isCorrect === false;
  const isUngraded = r.isCorrect == null;

  // Find what the student selected
  const selectedOption = question.options?.find((o: any) => o.id === r.selectedOptionId);
  const correctOption = question.options?.find((o: any) => o.isCorrect);

  return (
    <Card className={cn(
      'border-l-4',
      isCorrect ? 'border-l-emerald-500' : isWrong ? 'border-l-red-400' : 'border-l-gray-300',
    )}>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-muted-foreground">Q{index + 1}</span>
              <Badge variant="outline" className="text-[10px] capitalize">
                {question.type?.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-sm font-medium">{question.content}</p>
          </div>
          <div className="text-right shrink-0">
            <span className={cn(
              'text-sm font-bold',
              isCorrect ? 'text-emerald-600' : isWrong ? 'text-red-500' : 'text-muted-foreground',
            )}>
              {r.pointsEarned ?? 0} / {question.points}
            </span>
          </div>
        </div>

        {/* Show options with student's selection */}
        {question.options && question.options.length > 0 && (
          <div className="space-y-1 ml-1">
            {question.options.map((opt: any) => {
              const isSelected = opt.id === r.selectedOptionId || (r.selectedOptionIds ?? []).includes(opt.id);
              return (
                <div
                  key={opt.id}
                  className={cn(
                    'flex items-center gap-2 rounded px-2.5 py-1 text-sm',
                    isSelected && opt.isCorrect && 'bg-emerald-50 text-emerald-800',
                    isSelected && !opt.isCorrect && 'bg-red-50 text-red-800',
                    !isSelected && opt.isCorrect && 'bg-emerald-50/50 text-emerald-700',
                    !isSelected && !opt.isCorrect && '',
                  )}
                >
                  <span className="w-4 text-center">
                    {isSelected && opt.isCorrect && '✓'}
                    {isSelected && !opt.isCorrect && '✗'}
                    {!isSelected && opt.isCorrect && '✓'}
                    {!isSelected && !opt.isCorrect && '○'}
                  </span>
                  <span>{opt.text}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Text answer */}
        {r.studentAnswer && (
          <div className="mt-1">
            <p className="text-xs text-muted-foreground mb-0.5">Student answer:</p>
            <p className="text-sm bg-muted/50 rounded px-3 py-1.5">{r.studentAnswer}</p>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <p className="text-xs text-muted-foreground italic mt-1">
            💡 {question.explanation}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
