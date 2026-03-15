'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Clock3, Flag, ListChecks, Download, UploadCloud, FileText } from 'lucide-react';
import { assessmentService } from '@/services/assessment-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentStatusChip } from '@/components/student/student-primitives';
import { toast } from 'sonner';
import type { Assessment, AssessmentQuestion } from '@/types/assessment';

export default function StudentAssessmentTakePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const assessmentId = params.id as string;
  const reduceMotion = useReducedMotion();

  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [responses, setResponses] = useState<Record<string, string | string[]>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showMissingFilePrompt, setShowMissingFilePrompt] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadedSubmission, setUploadedSubmission] = useState<{
    attemptId: string;
    file: {
      id: string;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
      uploadedAt: string;
    };
  } | null>(null);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [timeLimit, setTimeLimit] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const didAutoSubmitRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await assessmentService.getById(assessmentId);
      setAssessment(res.data);
      const questionList = res.data.randomizeQuestions
        ? (res.data.questions || [])
        : [...(res.data.questions || [])].sort((a, b) => a.order - b.order);
      setQuestions(questionList);
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

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setTimeElapsed((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

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

  const answeredCount = useMemo(
    () => questions.filter((q) => {
      const a = responses[q.id];
      return a !== undefined && a !== '' && (!Array.isArray(a) || a.length > 0);
    }).length,
    [questions, responses],
  );

  const handleSubmit = useCallback(async () => {
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
        router.replace(`/dashboard/student/assessments/${assessmentId}`);
      }, 900);
    } catch {
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  }, [assessment, questions, responses, assessmentId, timeElapsed, router]);

  const handleUploadSubmissionFile = useCallback(async (file: File) => {
    if (!assessment) return;

    const allowedExtensions =
      assessment.allowedUploadExtensions && assessment.allowedUploadExtensions.length > 0
        ? assessment.allowedUploadExtensions.map((ext) => ext.toLowerCase())
        : [];
    const maxUploadSize = assessment.maxUploadSizeBytes ?? 100 * 1024 * 1024;
    const extension = file.name.includes('.')
      ? file.name.split('.').pop()?.toLowerCase() || ''
      : '';

    if (!extension || (allowedExtensions.length > 0 && !allowedExtensions.includes(extension))) {
      toast.error(`.${extension || 'unknown'} is not allowed for this assessment`);
      return;
    }

    if (file.size > maxUploadSize) {
      toast.error('File is too large. Maximum allowed size is 100 MB.');
      return;
    }

    try {
      setUploadingFile(true);
      const res = await assessmentService.uploadSubmissionFile(assessmentId, file);
      setUploadedSubmission(res.data);
      toast.success('File uploaded. You can submit when ready.');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploadingFile(false);
    }
  }, [assessment, assessmentId]);

  const handleSubmitFileUpload = useCallback(async () => {
    if (!uploadedSubmission?.file?.id) {
      setShowMissingFilePrompt(true);
      return;
    }

    try {
      setSubmitting(true);
      await assessmentService.submit({
        assessmentId,
        responses: [],
        timeSpentSeconds: timeElapsed,
      });
      toast.success('File upload assessment submitted!');
      setTimeout(() => {
        router.replace(`/dashboard/student/assessments/${assessmentId}?view=submitted`);
      }, 900);
    } catch {
      toast.error('Failed to submit assessment');
    } finally {
      setSubmitting(false);
    }
  }, [uploadedSubmission, assessmentId, timeElapsed, router]);

  useEffect(() => {
    if (!timeLimit || remainingSeconds === null || didAutoSubmitRef.current) return;
    if (remainingSeconds <= 0) {
      didAutoSubmitRef.current = true;
      toast.warning('Time is up. Submitting now.');
      handleSubmit();
    }
  }, [timeLimit, remainingSeconds, handleSubmit]);

  if (loading) {
    return (
      <div className="max-w-5xl space-y-6">
        <Skeleton className="h-16 rounded-xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  const isFileUploadAssessment = assessment?.type === 'file_upload';

  if (!assessment || (!isFileUploadAssessment && questions.length === 0)) {
    return <p className="text-muted-foreground">No questions available.</p>;
  }

  if (isFileUploadAssessment && assessment) {
    const allowedExtensions = assessment.allowedUploadExtensions || [];
    const maxUploadSize = assessment.maxUploadSizeBytes ?? 100 * 1024 * 1024;

    return (
      <div className="student-page rounded-3xl p-1">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="max-w-4xl mx-auto space-y-4"
        >
          <Card className="student-card overflow-hidden border-red-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-slate-900">{assessment.title}</p>
                  <p className="text-sm student-muted-text">File Upload Assessment</p>
                </div>
                <StudentStatusChip tone="warning">
                  <Clock3 className="mr-1 h-3.5 w-3.5" />
                  {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timeElapsed)}
                </StudentStatusChip>
              </div>

              <div className="rounded-xl border bg-muted/30 p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Instruction</p>
                <p className="text-sm leading-relaxed text-slate-900 whitespace-pre-wrap">
                  {assessment.fileUploadInstructions || 'No additional instruction provided.'}
                </p>
              </div>

              <div className="rounded-xl border p-4 space-y-2">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Allowed Formats</p>
                <div className="flex flex-wrap gap-2">
                  {allowedExtensions.length > 0 ? allowedExtensions.map((ext) => (
                    <Badge key={ext} variant="secondary" className="text-xs uppercase">.{ext}</Badge>
                  )) : <span className="text-xs text-muted-foreground">No format restrictions configured</span>}
                </div>
                <p className="text-xs text-muted-foreground">
                  Maximum upload size: {(maxUploadSize / (1024 * 1024)).toFixed(0)} MB
                </p>
              </div>

              {assessment.teacherAttachmentFile && (
                <div className="rounded-xl border p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{assessment.teacherAttachmentFile.originalName}</p>
                    <p className="text-xs text-muted-foreground">
                      {(assessment.teacherAttachmentFile.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {assessment.teacherAttachmentFile.mimeType}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => window.open(assessmentService.getTeacherAttachmentDownloadUrl(assessmentId), '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" /> Download
                  </Button>
                </div>
              )}

              <div className="rounded-xl border p-4 space-y-3">
                <p className="text-sm font-medium text-slate-900">Your Submission</p>
                <label className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors">
                  <UploadCloud className="h-4 w-4" />
                  {uploadingFile ? 'Uploading...' : 'Upload file'}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleUploadSubmissionFile(file);
                      e.target.value = '';
                    }}
                    disabled={uploadingFile}
                  />
                </label>

                {uploadedSubmission?.file && (
                  <div className="rounded-md border bg-muted/30 p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{uploadedSubmission.file.originalName}</p>
                      <p className="text-xs text-muted-foreground">
                        {(uploadedSubmission.file.sizeBytes / (1024 * 1024)).toFixed(2)} MB • {uploadedSubmission.file.mimeType}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(assessmentService.getAttemptSubmissionDownloadUrl(uploadedSubmission.attemptId), '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-1" /> View
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex justify-end">
                <Button className="bg-red-600 hover:bg-red-700" onClick={handleSubmitFileUpload} disabled={submitting || uploadingFile}>
                  {submitting ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <Dialog open={showMissingFilePrompt} onOpenChange={setShowMissingFilePrompt}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload required</DialogTitle>
              <DialogDescription>
                Please upload your file before submitting this assessment.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button onClick={() => setShowMissingFilePrompt(false)}>Okay</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  const current = questions[currentIdx];
  const progressValue = Math.round((answeredCount / questions.length) * 100);

  return (
    <div className="student-page rounded-3xl p-1">
      <div className="sticky top-0 z-30 rounded-2xl border border-red-200 bg-white/90 p-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-semibold text-slate-900">{assessment.title}</p>
            <p className="text-xs student-muted-text">Question {currentIdx + 1} of {questions.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <StudentStatusChip tone="info">
              <ListChecks className="mr-1 h-3.5 w-3.5" />
              {answeredCount}/{questions.length} answered
            </StudentStatusChip>
            <StudentStatusChip tone={isTimeLow ? 'danger' : 'warning'}>
              <Clock3 className="mr-1 h-3.5 w-3.5" />
              {remainingSeconds !== null ? formatTime(remainingSeconds) : formatTime(timeElapsed)}
            </StudentStatusChip>
          </div>
        </div>
        <Progress value={progressValue} className="mt-2 h-2" />
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_250px]">
        <Card className="student-card overflow-hidden">
          <CardContent className="space-y-5 p-6">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="capitalize">{current.type.replace('_', ' ')}</Badge>
              <Badge variant="secondary">{current.points} pts</Badge>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={reduceMotion ? {} : { opacity: 1, y: 0 }}
                exit={reduceMotion ? {} : { opacity: 0, y: -6 }}
                transition={{ duration: 0.2 }}
              >
                <h2 className="text-lg font-semibold leading-relaxed text-slate-900">{current.content}</h2>
                <div className="mt-4">
                  <AnswerInput question={current} value={responses[current.id]} onChange={(val) => setResponse(current.id, val)} />
                </div>
              </motion.div>
            </AnimatePresence>

            <div className="flex items-center justify-between border-t pt-4">
              <Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx((i) => i - 1)}>
                Previous
              </Button>
              {currentIdx < questions.length - 1 ? (
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => setCurrentIdx((i) => i + 1)}>
                  Next
                </Button>
              ) : (
                <Button className="bg-red-600 hover:bg-red-700" onClick={() => setShowConfirm(true)}>
                  Submit Assessment
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="student-card h-fit">
          <CardContent className="p-4">
            <p className="mb-3 text-sm font-semibold text-slate-900">Question Navigator</p>
            <div className="grid grid-cols-4 gap-2">
              {questions.map((q, i) => {
                const answered = responses[q.id] !== undefined && responses[q.id] !== '' && (!Array.isArray(responses[q.id]) || (responses[q.id] as string[]).length > 0);
                return (
                  <Button
                    key={q.id}
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentIdx(i)}
                    className={
                      i === currentIdx
                        ? 'border-red-600 bg-red-600 text-white hover:bg-red-700'
                        : answered
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : ''
                    }
                  >
                    {i + 1}
                  </Button>
                );
              })}
            </div>
            <div className="mt-3 space-y-1 text-xs student-muted-text">
              <p className="flex items-center gap-1"><Flag className="h-3.5 w-3.5 text-red-600" /> Current</p>
              <p className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Answered</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment?</DialogTitle>
            <DialogDescription>
              You answered {answeredCount} of {questions.length} questions. You can still go back to review answers before submitting.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Keep Working</Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleSubmit} disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit'}
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
  const options = question.options || [];

  switch (question.type) {
    case 'multiple_choice':
      return (
        <div className="space-y-2">
          {options.map((opt) => (
            <label
              key={opt.id}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                value === opt.id ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name={question.id}
                checked={value === opt.id}
                onChange={() => onChange(opt.id)}
                className="accent-red-600"
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
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition ${
                  selected ? 'border-red-300 bg-red-50' : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => {
                    const current = Array.isArray(value) ? value : [];
                    onChange(selected ? current.filter((id) => id !== opt.id) : [...current, opt.id]);
                  }}
                  className="accent-red-600"
                />
                <span>{opt.text}</span>
              </label>
            );
          })}
        </div>
      );

    case 'true_false':
      return (
        <div className="grid grid-cols-2 gap-3">
          {['True', 'False'].map((label) => {
            const opt = options.find((o) => o.text.toLowerCase() === label.toLowerCase());
            const optId = opt?.id || label.toLowerCase();
            return (
              <Button
                key={label}
                variant={value === optId ? 'default' : 'outline'}
                className={value === optId ? 'bg-red-600 hover:bg-red-700' : ''}
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
          className="min-h-[120px] w-full resize-y rounded-xl border p-3 focus:border-red-300 focus:outline-none"
        />
      );

    case 'dropdown':
      return (
        <select
          value={(value as string) || ''}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl border p-3 focus:border-red-300 focus:outline-none"
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
