'use client';

import { useEffect, useState } from 'react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';

interface PreviewModalProps {
  attemptId: string | null;
  open: boolean;
  onClose: () => void;
}

export function PreviewModal({ attemptId, open, onClose }: PreviewModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!attemptId || !open) {
      setData(null);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await assessmentService.getAttemptResults(attemptId);
        if (!cancelled) setData(res.data);
      } catch { /* handled silently */ }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [attemptId, open]);

  const student = data?.student;
  const responses = data?.responses ?? [];
  const score = data?.score;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student ? `${student.firstName} ${student.lastName}'s Submission` : 'Student Submission'}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-16 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
            <Skeleton className="h-32 rounded-lg" />
          </div>
        ) : data ? (
          <div className="space-y-4 pb-2">
            {/* Score Header */}
            {score != null && (
              <div className="text-center py-3 border-b">
                <p className={cn('text-4xl font-bold', score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500')}>
                  {score}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {data.passed ? 'Passed' : 'Did not pass'}
                </p>
              </div>
            )}

            {/* Responses */}
            {responses.map((r: any, i: number) => {
              const q = r.question;
              if (!q) return null;
              const isCorrect = r.isCorrect === true;
              const isWrong = r.isCorrect === false;

              return (
                <motion.div
                  key={r.id || i}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Card className={cn(
                    'border-l-4',
                    isCorrect ? 'border-l-emerald-500' : isWrong ? 'border-l-red-400' : 'border-l-gray-300',
                  )}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-semibold text-muted-foreground mr-2">Q{i + 1}</span>
                          <span className="text-sm font-medium">{q.content}</span>
                        </div>
                        <Badge variant={isCorrect ? 'default' : isWrong ? 'destructive' : 'secondary'} className="text-[10px] shrink-0 ml-2">
                          {r.pointsEarned ?? 0}/{q.points}
                        </Badge>
                      </div>

                      {q.options?.length > 0 && (
                        <div className="space-y-0.5 ml-4">
                          {q.options.map((opt: any) => {
                            const isSelected = opt.id === r.selectedOptionId || (r.selectedOptionIds ?? []).includes(opt.id);
                            return (
                              <div
                                key={opt.id}
                                className={cn(
                                  'text-xs rounded px-2 py-1',
                                  isSelected && opt.isCorrect && 'bg-emerald-50 text-emerald-800',
                                  isSelected && !opt.isCorrect && 'bg-red-50 text-red-800',
                                  !isSelected && opt.isCorrect && 'text-emerald-600',
                                )}
                              >
                                {isSelected ? (opt.isCorrect ? '✓' : '✗') : opt.isCorrect ? '✓' : '○'} {opt.text}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {r.studentAnswer && (
                        <p className="text-xs bg-muted/50 rounded px-2 py-1 ml-4">{r.studentAnswer}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {data.teacherFeedback && (
              <div className="text-sm bg-muted/50 rounded-lg p-3">
                <p className="font-medium text-xs text-muted-foreground mb-1">Teacher Feedback</p>
                <p>{data.teacherFeedback}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
