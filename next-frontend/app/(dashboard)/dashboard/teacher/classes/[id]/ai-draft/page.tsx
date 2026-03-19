'use client';

import { type Dispatch, type SetStateAction, useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import { classService } from '@/services/class-service';
import { extractionService } from '@/services/extraction-service';
import { lessonService } from '@/services/lesson-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
import type { AiGenerationJob, QuizDraftStructuredOutput } from '@/types/ai';
import type { ClassItem } from '@/types/class';
import type { Extraction } from '@/types/extraction';
import type { Lesson } from '@/types/lesson';
import type { QuestionType } from '@/utils/constants';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'multiple_select', label: 'Multiple Select' },
];

export default function TeacherAiDraftQuizPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [extractions, setExtractions] = useState<Extraction[]>([]);
  const [title, setTitle] = useState('');
  const [teacherNote, setTeacherNote] = useState('');
  const [questionCount, setQuestionCount] = useState('5');
  const [questionType, setQuestionType] = useState<QuestionType>('multiple_choice');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>([]);
  const [selectedExtractionIds, setSelectedExtractionIds] = useState<string[]>([]);
  const [job, setJob] = useState<AiGenerationJob | null>(null);
  const [result, setResult] = useState<QuizDraftStructuredOutput | null>(null);

  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const [classRes, lessonRes, extractionRes] = await Promise.all([
        classService.getById(classId),
        lessonService.getByClass(classId, { status: 'all', pageSize: 100 }),
        extractionService.listByClass(classId),
      ]);
      setClassItem(classRes.data);
      setLessons(lessonRes.data ?? []);
      setExtractions(extractionRes.data ?? []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load AI draft workspace'));
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    if (!job || ['completed', 'approved', 'failed', 'rejected'].includes(job.status)) {
      return;
    }

    const interval = window.setInterval(async () => {
      try {
        const statusRes = await aiService.getTeacherJobStatus(job.jobId);
        setJob(statusRes.data);
        if (['completed', 'approved'].includes(statusRes.data.status)) {
          const resultRes = await aiService.getQuizDraftJobResult(job.jobId);
          setResult(resultRes.data.result.structuredOutput);
        }
      } catch (error) {
        toast.error(getApiErrorMessage(error, 'Failed to refresh AI draft status'));
        window.clearInterval(interval);
      }
    }, 2500);

    return () => window.clearInterval(interval);
  }, [job]);

  const selectedLessons = useMemo(
    () => lessons.filter((lesson) => selectedLessonIds.includes(lesson.id)),
    [lessons, selectedLessonIds],
  );
  const selectedExtractions = useMemo(
    () => extractions.filter((extraction) => selectedExtractionIds.includes(extraction.id)),
    [extractions, selectedExtractionIds],
  );

  const toggleSelection = (
    id: string,
    setSelectedIds: Dispatch<SetStateAction<string[]>>,
  ) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  };

  const handleGenerate = async () => {
    const parsedQuestionCount = Number(questionCount);
    if (!Number.isFinite(parsedQuestionCount) || parsedQuestionCount < 1) {
      toast.error('Question count must be at least 1.');
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      const res = await aiService.createQuizDraftJob({
        classId,
        title: title.trim() || undefined,
        teacherNote: teacherNote.trim() || undefined,
        questionCount: parsedQuestionCount,
        questionType,
        assessmentType: 'quiz',
        passingScore: 60,
        feedbackLevel: 'standard',
        classRecordCategory: 'written_work',
        lessonIds: selectedLessonIds.length > 0 ? selectedLessonIds : undefined,
        extractionIds: selectedExtractionIds.length > 0 ? selectedExtractionIds : undefined,
      });
      setJob(res.data);
      toast.success('Quiz draft generation started.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start AI draft generation'));
    } finally {
      setSubmitting(false);
    }
  };

  const assessmentId = result?.assessmentId || result?.runtime?.assessmentId || job?.assessmentId || null;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={() => router.push(`/dashboard/teacher/classes/${classId}`)}>
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to class
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Draft Quiz Workspace
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {classItem?.subjectName} ({classItem?.subjectCode})
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Draft title</label>
              <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional AI draft title" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teacher note</label>
              <Textarea
                value={teacherNote}
                onChange={(event) => setTeacherNote(event.target.value)}
                placeholder="Add focus areas, difficulty targets, or lesson constraints"
                rows={5}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Question count</label>
                <Input value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} inputMode="numeric" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Question type</label>
                <select
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value as QuestionType)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {QUESTION_TYPES.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleGenerate} disabled={submitting}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {job ? 'Regenerate draft' : 'Start generation'}
              </Button>
              {assessmentId && (
                <Button variant="outline" onClick={() => router.push(`/dashboard/teacher/assessments/${assessmentId}/edit`)}>
                  Open assessment editor
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Generation progress</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Progress value={job?.progressPercent ?? 0} />
                <div className="flex items-center justify-between text-sm">
                  <span>{job?.statusMessage || 'Configure the draft and start generation.'}</span>
                  <Badge variant={job?.status === 'failed' ? 'destructive' : 'secondary'}>
                    {job?.status || 'idle'}
                  </Badge>
                </div>
                {job?.errorMessage && (
                  <p className="text-sm text-destructive">{job.errorMessage}</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source lessons</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lessons.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No lessons found for this class.</p>
                ) : lessons.map((lesson) => (
                  <label key={lesson.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedLessonIds.includes(lesson.id)}
                      onChange={() => toggleSelection(lesson.id, setSelectedLessonIds)}
                    />
                    <div>
                      <p className="font-medium">{lesson.title}</p>
                      <p className="text-xs text-muted-foreground">{lesson.isDraft ? 'Draft lesson' : 'Published lesson'}</p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Source extractions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {extractions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No module extractions found yet.</p>
                ) : extractions.map((extraction) => (
                  <label key={extraction.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={selectedExtractionIds.includes(extraction.id)}
                      onChange={() => toggleSelection(extraction.id, setSelectedExtractionIds)}
                    />
                    <div>
                      <p className="font-medium">{extraction.structuredContent?.title || extraction.originalName || 'Extraction'}</p>
                      <p className="text-xs text-muted-foreground">
                        {extraction.extractionStatus} • {extraction.originalName || extraction.id}
                      </p>
                    </div>
                  </label>
                ))}
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Draft preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result ? (
            <>
              <div className="space-y-1">
                <p className="text-lg font-semibold">{result.title}</p>
                <p className="text-sm text-muted-foreground">{result.description || 'No description provided.'}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedLessons.map((lesson) => (
                  <Badge key={lesson.id} variant="secondary">{lesson.title}</Badge>
                ))}
                {selectedExtractions.map((extraction) => (
                  <Badge key={extraction.id} variant="outline">{extraction.originalName || extraction.id}</Badge>
                ))}
              </div>
              <div className="space-y-3">
                {result.questions.map((question, index) => (
                  <div key={`${question.content}-${index}`} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium">Q{index + 1}. {question.content}</p>
                      <Badge variant="outline">{question.type}</Badge>
                    </div>
                    {question.options && question.options.length > 0 && (
                      <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {question.options.map((option, optionIndex) => (
                          <li key={`${option.text}-${optionIndex}`}>
                            {option.isCorrect ? 'Correct:' : 'Option:'} {option.text}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Start generation to get a draft preview here. Once the job completes, you can open the assessment editor for detailed edits.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
