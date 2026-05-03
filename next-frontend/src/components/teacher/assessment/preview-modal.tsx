'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import { motion } from 'framer-motion';
import type { AttemptResult, RubricCriterion, RubricScore } from '@/types/assessment';

interface PreviewModalProps {
  attemptId: string | null;
  open: boolean;
  onClose: () => void;
}

interface PreviewOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface PreviewQuestion {
  type?: string;
  content?: string;
  points?: number;
  options?: PreviewOption[];
}

interface PreviewResponse {
  id?: string;
  selectedOptionId?: string;
  selectedOptionIds?: string[];
  isCorrect?: boolean;
  pointsEarned?: number;
  question?: PreviewQuestion;
  studentAnswer?: string;
}

interface PreviewStudent {
  firstName: string;
  lastName: string;
}

type PreviewResult = AttemptResult & {
  student?: PreviewStudent;
  responses?: PreviewResponse[];
};

function canPreviewSubmissionFile(mimeType?: string | null) {
  if (!mimeType) return false;
  return mimeType.startsWith('image/') || mimeType === 'application/pdf' || mimeType.startsWith('text/');
}

export function PreviewModal({ attemptId, open, onClose }: PreviewModalProps) {
  const [data, setData] = useState<PreviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

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

  useEffect(() => {
    return () => {
      if (previewUrl) {
        window.URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const submittedFiles = useMemo(
    () => data?.submittedFiles?.length
      ? data.submittedFiles
      : (data?.submittedFile ? [data.submittedFile] : []),
    [data?.submittedFile, data?.submittedFiles],
  );
  const rubricCriteria = data?.assessment?.rubricCriteria ?? [];
  const rubricScores = data?.rubricScores ?? [];

  const student = data?.student;
  const responses = data?.responses ?? [];
  const score = data?.score;

  useEffect(() => {
    if (!open || data?.assessment?.type !== 'file_upload' || !attemptId) return;
    const firstPreviewableFile = submittedFiles.find((file) => canPreviewSubmissionFile(file.mimeType));
    if (!firstPreviewableFile) return;
    if (previewFileId === firstPreviewableFile.id && previewUrl) return;

    let cancelled = false;
    const loadPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);
      try {
        const { blob } = await assessmentService.getAttemptSubmissionFileBlob(
          attemptId,
          firstPreviewableFile.originalName,
          firstPreviewableFile.id,
        );
        if (cancelled) return;
        setPreviewFileId(firstPreviewableFile.id);
        setPreviewUrl((currentUrl) => {
          if (currentUrl) {
            window.URL.revokeObjectURL(currentUrl);
          }
          return window.URL.createObjectURL(blob);
        });
      } catch {
        if (!cancelled) {
          setPreviewError('Failed to load the submitted file preview.');
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    void loadPreview();
    return () => {
      cancelled = true;
    };
  }, [attemptId, data?.assessment?.type, open, previewFileId, previewUrl, submittedFiles]);

  const selectedPreviewFile = submittedFiles.find((file) => file.id === previewFileId) ?? null;

  const handleSelectPreviewFile = async (file: NonNullable<typeof submittedFiles>[number]) => {
    if (!attemptId) return;

    if (!canPreviewSubmissionFile(file.mimeType)) {
      await assessmentService.openAttemptSubmissionFile(
        attemptId,
        file.originalName,
        file.id,
      );
      return;
    }

    setPreviewLoading(true);
    setPreviewError(null);
    try {
      const { blob } = await assessmentService.getAttemptSubmissionFileBlob(
        attemptId,
        file.originalName,
        file.id,
      );
      setPreviewFileId(file.id);
      setPreviewUrl((currentUrl) => {
        if (currentUrl) {
          window.URL.revokeObjectURL(currentUrl);
        }
        return window.URL.createObjectURL(blob);
      });
    } catch {
      setPreviewError('Failed to load the submitted file preview.');
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {student ? `${student.firstName} ${student.lastName}'s Submission` : 'Student Submission'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Preview the student&apos;s submitted work and scoring details.
          </DialogDescription>
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

            {data.assessment?.type === 'file_upload' ? (
              <div className="space-y-4">
                {submittedFiles.length > 0 ? (
                  <Card className="border-slate-200">
                    <CardContent className="space-y-4 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            Submitted Files
                          </p>
                          <p className="mt-1 text-sm text-slate-600">
                            {submittedFiles.length} attachment{submittedFiles.length === 1 ? '' : 's'} included in this submission.
                          </p>
                        </div>
                        <Badge variant="outline" className="border-slate-200 bg-white text-[11px] text-slate-600">
                          {submittedFiles.length} file{submittedFiles.length === 1 ? '' : 's'}
                        </Badge>
                      </div>

                      <div className="space-y-3">
                        {submittedFiles.map((file, index) => (
                          <div
                            key={file.id}
                            className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 md:flex-row md:items-center md:justify-between"
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                                Attachment {index + 1}
                              </p>
                              <p className="truncate text-sm font-semibold text-slate-900">{file.originalName}</p>
                              <p className="text-xs text-slate-500">
                                {(file.sizeBytes / (1024 * 1024)).toFixed(2)} MB | {file.mimeType}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleSelectPreviewFile(file)}
                                disabled={previewLoading && previewFileId === file.id}
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                {canPreviewSubmissionFile(file.mimeType) ? 'Preview' : 'Open File'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void assessmentService.downloadAttemptSubmissionAttachmentFile(
                                  attemptId as string,
                                  file.id,
                                  file.originalName,
                                )}
                                className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                              >
                                Download
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      {previewError ? (
                        <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                          {previewError}
                        </div>
                      ) : null}

                      {previewLoading ? (
                        <Skeleton className="h-[20rem] rounded-xl" />
                      ) : selectedPreviewFile && previewUrl && canPreviewSubmissionFile(selectedPreviewFile.mimeType) ? (
                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                          {selectedPreviewFile.mimeType.startsWith('image/') ? (
                            <Image
                              src={previewUrl}
                              alt={selectedPreviewFile.originalName}
                              width={1400}
                              height={1000}
                              unoptimized
                              className="max-h-[28rem] h-auto w-full object-contain bg-white"
                            />
                          ) : (
                            <iframe
                              title={`Preview of ${selectedPreviewFile.originalName}`}
                              src={previewUrl}
                              className="h-[28rem] w-full bg-white"
                            />
                          )}
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                {rubricCriteria.length > 0 ? (
                  <Card className="border-slate-200">
                    <CardContent className="space-y-3 p-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                          Rubric Scoring
                        </p>
                        <p className="mt-1 text-sm text-slate-600">
                          Read-only rubric breakdown for this submission.
                        </p>
                      </div>

                      <div className="space-y-3">
                        {rubricCriteria.map((criterion: RubricCriterion) => {
                          const currentScore = rubricScores.find(
                            (rubricScore: RubricScore) => rubricScore.criterionId === criterion.id,
                          );
                          return (
                            <div
                              key={criterion.id}
                              className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-slate-900">{criterion.title}</p>
                                {criterion.description ? (
                                  <p className="mt-1 text-xs text-slate-500">{criterion.description}</p>
                                ) : null}
                              </div>
                              <div className="shrink-0 text-right">
                                <p className="text-sm font-semibold text-slate-900">
                                  {currentScore?.pointsEarned ?? 0} / {criterion.points}
                                </p>
                                {currentScore?.feedback ? (
                                  <p className="mt-1 max-w-[12rem] text-xs text-slate-500">{currentScore.feedback}</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            ) : (
            /* Responses */
            responses.map((r, i: number) => {
              const q = r.question;
              if (!q) return null;
              const options = q.options ?? [];
              const isCorrect = r.isCorrect === true;
              const isWrong = r.isCorrect === false;

              return (
                <motion.div
                  key={r.questionId || i}
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
                        <RichTextRenderer html={q.content ?? '<p>No question content.</p>'} className="text-sm font-medium" />
                        </div>
                        <Badge variant={isCorrect ? 'default' : isWrong ? 'destructive' : 'secondary'} className="text-[10px] shrink-0 ml-2">
                          {r.pointsEarned ?? 0}/{q.points}
                        </Badge>
                      </div>

                      {options.length > 0 && (
                        <div className="space-y-0.5 ml-4">
                          {options.map((opt) => {
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
            }))}

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
