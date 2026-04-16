'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronRight, Loader2, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { aiService } from '@/services/ai-service';
import { classService } from '@/services/class-service';
import { extractionService } from '@/services/extraction-service';
import { lessonService } from '@/services/lesson-service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  isAiDraftTerminalStatus,
  mergeTrackedAiDraftJobFromStatus,
  readTrackedAiDraftJobs,
  type TrackedAiDraftJobEntry,
  writeTrackedAiDraftJobs,
} from '@/lib/ai-draft-job-tracker';
import type { AiGenerationJob, QuizDraftStructuredOutput } from '@/types/ai';
import type { ClassItem } from '@/types/class';
import type { Extraction } from '@/types/extraction';
import type { Lesson } from '@/types/lesson';
import type { QuestionType } from '@/utils/constants';
import '../workspace.css';
import './workspace.css';

const QUESTION_TYPES: Array<{ value: QuestionType; label: string }> = [
  { value: 'multiple_choice', label: 'Multiple Choice' },
  { value: 'true_false', label: 'True / False' },
  { value: 'short_answer', label: 'Short Answer' },
  { value: 'multiple_select', label: 'Multiple Select' },
];

function getQuizJobErrorMessage(errorMessage?: string | null): string | null {
  if (!errorMessage) return null;
  const normalized = errorMessage.toLowerCase();
  if (normalized.includes('blueprint')) {
    return 'Blueprint planning failed. Try a narrower source set or add a shorter teacher note, then run again.';
  }
  if (normalized.includes('generated questions were duplicates')) {
    return 'Generated questions duplicated existing items. Narrow sources or adjust your note, then retry.';
  }
  if (normalized.includes('no indexed source content')) {
    return 'No indexed source content found. Reindex class sources before generating.';
  }
  return errorMessage;
}

function toRelativeTime(value?: string | null) {
  if (!value) return 'Unknown';
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return 'Unknown';
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}h ago`;
  return `${Math.floor(diffHour / 24)}d ago`;
}

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
  const [useAllSourcesWhenNoneSelected, setUseAllSourcesWhenNoneSelected] = useState(true);

  const [job, setJob] = useState<AiGenerationJob | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [result, setResult] = useState<QuizDraftStructuredOutput | null>(null);
  const [trackedJobs, setTrackedJobs] = useState<TrackedAiDraftJobEntry[]>([]);

  const [lessonSearch, setLessonSearch] = useState('');
  const [extractionSearch, setExtractionSearch] = useState('');
  const [showLessons, setShowLessons] = useState(true);
  const [showExtractions, setShowExtractions] = useState(true);

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

  const refreshTrackedJobs = useCallback(async () => {
    const seed = readTrackedAiDraftJobs(classId);
    if (seed.length === 0) {
      setTrackedJobs([]);
      return;
    }

    const createdAtById = new Map(seed.map((entry) => [entry.jobId, entry.createdAt]));
    await Promise.all(seed.map(async (entry) => {
      try {
        const statusRes = await aiService.getTeacherJobStatus(entry.jobId);
        mergeTrackedAiDraftJobFromStatus(classId, statusRes.data, createdAtById.get(entry.jobId));
      } catch {
        // Keep local cache entry when status endpoint fails; prune policy handles stale terminal jobs.
      }
    }));

    const refreshed = readTrackedAiDraftJobs(classId);
    setTrackedJobs(refreshed);
    if (!currentJobId && refreshed.length > 0) setCurrentJobId(refreshed[0].jobId);
  }, [classId, currentJobId]);

  useEffect(() => {
    void fetchWorkspace();
  }, [fetchWorkspace]);

  useEffect(() => {
    const cached = readTrackedAiDraftJobs(classId);
    setTrackedJobs(cached);
    if (cached.length > 0) setCurrentJobId((current) => current || cached[0].jobId);
    void refreshTrackedJobs();
  }, [classId, refreshTrackedJobs]);

  useEffect(() => {
    if (!currentJobId) return;
    const tracked = trackedJobs.find((entry) => entry.jobId === currentJobId);
    if (!tracked) return;
    setJob((current) => {
      if (current?.jobId === tracked.jobId) {
        return {
          ...current,
          status: tracked.lastKnownStatus,
          progressPercent: tracked.lastKnownProgress,
          assessmentId: tracked.assessmentId ?? current.assessmentId ?? null,
          updatedAt: tracked.updatedAt ?? current.updatedAt ?? null,
        };
      }
      return {
        jobId: tracked.jobId,
        jobType: tracked.jobType,
        status: tracked.lastKnownStatus,
        progressPercent: tracked.lastKnownProgress,
        statusMessage: null,
        errorMessage: null,
        outputId: null,
        assessmentId: tracked.assessmentId ?? null,
        updatedAt: tracked.updatedAt ?? null,
      };
    });
  }, [currentJobId, trackedJobs]);

  useEffect(() => {
    if (!job?.jobId || !job?.status || !['completed', 'approved'].includes(job.status)) return;
    let cancelled = false;
    void (async () => {
      try {
        const resultRes = await aiService.getQuizDraftJobResult(job.jobId);
        if (cancelled) return;
        setResult(resultRes.data.result.structuredOutput);
      } catch (error) {
        if (!cancelled) toast.error(getApiErrorMessage(error, 'Failed to load AI draft result'));
      }
    })();
    return () => { cancelled = true; };
  }, [job?.jobId, job?.status]);

  useEffect(() => {
    const hasActiveTracked = trackedJobs.some((entry) => !isAiDraftTerminalStatus(entry.lastKnownStatus));
    const hasActiveCurrent = Boolean(job && !isAiDraftTerminalStatus(job.status));
    if (!hasActiveTracked && !hasActiveCurrent) return;

    const interval = window.setInterval(() => {
      void refreshTrackedJobs();
    }, 2500);
    return () => window.clearInterval(interval);
  }, [job, refreshTrackedJobs, trackedJobs]);

  const visibleLessons = useMemo(() => {
    const needle = lessonSearch.trim().toLowerCase();
    if (!needle) return lessons;
    return lessons.filter((lesson) => `${lesson.title} ${lesson.description || ''}`.toLowerCase().includes(needle));
  }, [lessonSearch, lessons]);

  const visibleExtractions = useMemo(() => {
    const needle = extractionSearch.trim().toLowerCase();
    if (!needle) return extractions;
    return extractions.filter((extraction) => {
      const titleText = extraction.structuredContent?.title || extraction.originalName || extraction.id;
      return `${titleText} ${extraction.extractionStatus}`.toLowerCase().includes(needle);
    });
  }, [extractionSearch, extractions]);

  const selectedLessons = useMemo(
    () => lessons.filter((lesson) => selectedLessonIds.includes(lesson.id)),
    [lessons, selectedLessonIds],
  );
  const selectedExtractions = useMemo(
    () => extractions.filter((extraction) => selectedExtractionIds.includes(extraction.id)),
    [extractions, selectedExtractionIds],
  );

  const parsedQuestionCount = Number(questionCount);
  const isQuestionCountValid = Number.isFinite(parsedQuestionCount) && parsedQuestionCount >= 1;
  const hasAnySource = lessons.length + extractions.length > 0;
  const hasManualSelection = selectedLessonIds.length + selectedExtractionIds.length > 0;
  const canGenerate = !submitting && hasAnySource && isQuestionCountValid && (useAllSourcesWhenNoneSelected || hasManualSelection);

  const assessmentId = result?.assessmentId || result?.runtime?.assessmentId || job?.assessmentId || null;
  const activeTrackedJobs = trackedJobs.filter((entry) => !isAiDraftTerminalStatus(entry.lastKnownStatus));
  const recentTrackedJobs = trackedJobs.slice(0, 8);

  const toggleSelection = (id: string, currentIds: string[], setIds: (value: string[]) => void) => {
    setIds(currentIds.includes(id) ? currentIds.filter((value) => value !== id) : [...currentIds, id]);
  };

  const setAllVisibleLessonSelection = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedLessonIds);
      visibleLessons.forEach((lesson) => next.add(lesson.id));
      setSelectedLessonIds(Array.from(next));
      return;
    }
    const visibleSet = new Set(visibleLessons.map((lesson) => lesson.id));
    setSelectedLessonIds(selectedLessonIds.filter((id) => !visibleSet.has(id)));
  };

  const setAllVisibleExtractionSelection = (checked: boolean) => {
    if (checked) {
      const next = new Set(selectedExtractionIds);
      visibleExtractions.forEach((extraction) => next.add(extraction.id));
      setSelectedExtractionIds(Array.from(next));
      return;
    }
    const visibleSet = new Set(visibleExtractions.map((extraction) => extraction.id));
    setSelectedExtractionIds(selectedExtractionIds.filter((id) => !visibleSet.has(id)));
  };

  const resumeTrackedJob = async (jobId: string) => {
    setCurrentJobId(jobId);
    try {
      const statusRes = await aiService.getTeacherJobStatus(jobId);
      setJob(statusRes.data);
      mergeTrackedAiDraftJobFromStatus(classId, statusRes.data);
      const refreshed = readTrackedAiDraftJobs(classId);
      writeTrackedAiDraftJobs(classId, refreshed);
      setTrackedJobs(refreshed);
      if (['completed', 'approved'].includes(statusRes.data.status)) {
        const resultRes = await aiService.getQuizDraftJobResult(jobId);
        setResult(resultRes.data.result.structuredOutput);
      } else {
        setResult(null);
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to resume selected AI draft job'));
    }
  };

  const handleGenerate = async () => {
    if (!isQuestionCountValid) {
      toast.error('Question count must be at least 1.');
      return;
    }
    if (!hasAnySource) {
      toast.error('No source lessons or extractions are available for this class.');
      return;
    }
    if (!useAllSourcesWhenNoneSelected && !hasManualSelection) {
      toast.error('Select at least one lesson or extraction, or enable the fallback option.');
      return;
    }

    try {
      setSubmitting(true);
      setResult(null);
      const lessonIds = selectedLessonIds.length > 0 ? selectedLessonIds : (useAllSourcesWhenNoneSelected ? undefined : []);
      const extractionIds = selectedExtractionIds.length > 0 ? selectedExtractionIds : (useAllSourcesWhenNoneSelected ? undefined : []);
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
        lessonIds,
        extractionIds,
      });
      setJob(res.data);
      setCurrentJobId(res.data.jobId);
      mergeTrackedAiDraftJobFromStatus(classId, res.data, new Date().toISOString());
      const refreshed = readTrackedAiDraftJobs(classId);
      setTrackedJobs(refreshed);
      toast.success('Quiz draft generation started.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start AI draft generation'));
    } finally {
      setSubmitting(false);
    }
  };

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
    <div className="teacher-ai-draft">
      <section className="teacher-ai-draft__hero">
        <button
          type="button"
          className="teacher-ai-draft__back"
          onClick={() => router.push(`/dashboard/teacher/classes/${classId}?view=assignments`)}
        >
          <ArrowLeft size={16} />
          Back to assignments
        </button>

        <div className="teacher-ai-draft__hero-main">
          <div className="teacher-ai-draft__hero-icon">
            <Sparkles size={22} />
          </div>
          <div className="teacher-ai-draft__hero-copy">
            <h1>AI Draft Quiz Workspace</h1>
            <p>Build, track, and resume draft generation without losing your review context.</p>
            <div className="teacher-ai-draft__hero-meta">
              <span>{classItem?.subjectName || 'Class'}</span>
              <span>{classItem?.subjectCode || 'No code'}</span>
              <span>{activeTrackedJobs.length} active job(s)</span>
            </div>
          </div>
        </div>
      </section>

      <section className="teacher-ai-draft__controls">
        <div className="teacher-ai-draft__controls-head">
          <h2>Generation controls</h2>
          <p>Set targets, choose sources, and run with clear guardrails.</p>
        </div>
        <div className="teacher-ai-draft__form-grid">
          <label className="teacher-ai-draft__field teacher-ai-draft__field--wide">
            <span>Draft title</span>
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Optional title for this draft run" />
          </label>

          <label className="teacher-ai-draft__field">
            <span>Question count</span>
            <Input value={questionCount} onChange={(event) => setQuestionCount(event.target.value)} inputMode="numeric" />
          </label>

          <label className="teacher-ai-draft__field">
            <span>Question type</span>
            <select
              value={questionType}
              onChange={(event) => setQuestionType(event.target.value as QuestionType)}
              className="teacher-ai-draft__select"
            >
              {QUESTION_TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="teacher-ai-draft__field teacher-ai-draft__field--full">
            <span>Teacher note</span>
            <Textarea
              value={teacherNote}
              onChange={(event) => setTeacherNote(event.target.value)}
              placeholder="Focus area, difficulty target, grading notes, or scope constraints"
              rows={3}
            />
          </label>
        </div>

        <label className="teacher-ai-draft__check">
          <input
            type="checkbox"
            checked={useAllSourcesWhenNoneSelected}
            onChange={(event) => setUseAllSourcesWhenNoneSelected(event.target.checked)}
          />
          <span>Use all available sources when no lesson/extraction is selected</span>
        </label>

        <div className="teacher-ai-draft__actions">
          <Button type="button" className="teacher-class-workspace__solid" onClick={handleGenerate} disabled={!canGenerate}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {job ? 'Regenerate Draft' : 'Start Draft Generation'}
          </Button>
          {assessmentId ? (
            <Button
              type="button"
              className="teacher-class-workspace__outline"
              onClick={() => router.push(`/dashboard/teacher/assessments/${assessmentId}/edit`)}
            >
              Open Assessment Editor
            </Button>
          ) : null}
          <Button
            type="button"
            className="teacher-class-workspace__outline"
            onClick={() => router.push(`/dashboard/teacher/classes/${classId}?view=assignments`)}
          >
            Open Assignments Tracker
          </Button>
        </div>

        {!canGenerate ? (
          <p className="teacher-ai-draft__hint">
            {hasAnySource
              ? 'Select at least one source or keep fallback-to-all enabled. Question count must be valid.'
              : 'No source lessons or extractions are available for this class yet.'}
          </p>
        ) : null}
      </section>

      <section className="teacher-ai-draft__body">
        <article className="teacher-ai-draft__panel">
          <div className="teacher-ai-draft__panel-head">
            <h3>Source selection</h3>
            <div className="teacher-ai-draft__chips">
              <Badge variant="secondary">{selectedLessonIds.length} lesson(s)</Badge>
              <Badge variant="outline">{selectedExtractionIds.length} extraction(s)</Badge>
            </div>
          </div>

          <div className="teacher-ai-draft__source-group">
            <button type="button" className="teacher-ai-draft__source-toggle" onClick={() => setShowLessons((current) => !current)}>
              <span>Lessons ({visibleLessons.length})</span>
              {showLessons ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showLessons ? (
              <div className="teacher-ai-draft__source-body">
                <div className="teacher-ai-draft__search">
                  <Search size={14} />
                  <Input value={lessonSearch} onChange={(event) => setLessonSearch(event.target.value)} placeholder="Search lesson title or description" />
                </div>
                <div className="teacher-ai-draft__mini-actions">
                  <Button type="button" className="teacher-class-workspace__outline" onClick={() => setAllVisibleLessonSelection(true)}>
                    Select visible
                  </Button>
                  <Button type="button" className="teacher-class-workspace__outline" onClick={() => setAllVisibleLessonSelection(false)}>
                    Clear visible
                  </Button>
                </div>
                <div className="teacher-ai-draft__list">
                  {visibleLessons.length === 0 ? (
                    <p className="teacher-ai-draft__empty">No lessons match your filter.</p>
                  ) : visibleLessons.map((lesson) => (
                    <label key={lesson.id} className="teacher-ai-draft__item">
                      <input
                        type="checkbox"
                        checked={selectedLessonIds.includes(lesson.id)}
                        onChange={() => toggleSelection(lesson.id, selectedLessonIds, setSelectedLessonIds)}
                      />
                      <div>
                        <strong>{lesson.title}</strong>
                        <p>{lesson.isDraft ? 'Draft lesson' : 'Published lesson'}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="teacher-ai-draft__source-group">
            <button type="button" className="teacher-ai-draft__source-toggle" onClick={() => setShowExtractions((current) => !current)}>
              <span>Extractions ({visibleExtractions.length})</span>
              {showExtractions ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>

            {showExtractions ? (
              <div className="teacher-ai-draft__source-body">
                <div className="teacher-ai-draft__search">
                  <Search size={14} />
                  <Input value={extractionSearch} onChange={(event) => setExtractionSearch(event.target.value)} placeholder="Search extraction title or status" />
                </div>
                <div className="teacher-ai-draft__mini-actions">
                  <Button type="button" className="teacher-class-workspace__outline" onClick={() => setAllVisibleExtractionSelection(true)}>
                    Select visible
                  </Button>
                  <Button type="button" className="teacher-class-workspace__outline" onClick={() => setAllVisibleExtractionSelection(false)}>
                    Clear visible
                  </Button>
                </div>
                <div className="teacher-ai-draft__list">
                  {visibleExtractions.length === 0 ? (
                    <p className="teacher-ai-draft__empty">No extractions match your filter.</p>
                  ) : visibleExtractions.map((extraction) => (
                    <label key={extraction.id} className="teacher-ai-draft__item">
                      <input
                        type="checkbox"
                        checked={selectedExtractionIds.includes(extraction.id)}
                        onChange={() => toggleSelection(extraction.id, selectedExtractionIds, setSelectedExtractionIds)}
                      />
                      <div>
                        <strong>{extraction.structuredContent?.title || extraction.originalName || 'Extraction'}</strong>
                        <p>{extraction.extractionStatus} - {extraction.originalName || extraction.id}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </article>

        <article className="teacher-ai-draft__panel">
          <div className="teacher-ai-draft__panel-head">
            <h3>Live jobs</h3>
            <p>{activeTrackedJobs.length > 0 ? `${activeTrackedJobs.length} active` : 'No active jobs'}</p>
          </div>

          <div className="teacher-ai-draft__live">
            <div className="teacher-ai-draft__status">
              <div>
                <strong>{job?.statusMessage || 'Configure and run generation'}</strong>
                <p>Last update: {toRelativeTime(job?.updatedAt)}</p>
              </div>
              <Badge variant={job?.status === 'failed' ? 'destructive' : 'secondary'}>{job?.status || 'idle'}</Badge>
            </div>
            <Progress value={job?.progressPercent ?? 0} />
            {job?.errorMessage ? <p className="teacher-ai-draft__error">{getQuizJobErrorMessage(job.errorMessage)}</p> : null}
          </div>

          <div className="teacher-ai-draft__tracked">
            <h4>Recent jobs</h4>
            {recentTrackedJobs.length === 0 ? (
              <p className="teacher-ai-draft__empty">No recent AI draft jobs yet.</p>
            ) : (
              <div className="teacher-ai-draft__tracked-list">
                {recentTrackedJobs.map((entry) => (
                  <div key={entry.jobId} className="teacher-ai-draft__tracked-item">
                    <div className="teacher-ai-draft__tracked-head">
                      <span>{entry.jobId}</span>
                      <Badge variant={entry.lastKnownStatus === 'failed' ? 'destructive' : 'outline'}>{entry.lastKnownStatus}</Badge>
                    </div>
                    <p>Progress {Math.round(entry.lastKnownProgress)}% - Updated {toRelativeTime(entry.updatedAt || entry.createdAt)}</p>
                    <div className="teacher-ai-draft__mini-actions">
                      <Button type="button" className="teacher-class-workspace__outline" onClick={() => void resumeTrackedJob(entry.jobId)}>
                        Resume
                      </Button>
                      {entry.assessmentId ? (
                        <Button
                          type="button"
                          className="teacher-class-workspace__outline"
                          onClick={() => router.push(`/dashboard/teacher/assessments/${entry.assessmentId}/edit`)}
                        >
                          Open assessment
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="teacher-ai-draft__preview">
        <div className="teacher-ai-draft__panel-head">
          <h3>Draft preview</h3>
          <p>{result?.questions?.length || 0} question(s)</p>
        </div>

        {result ? (
          <div className="teacher-ai-draft__preview-body">
            <div className="teacher-ai-draft__preview-copy">
              <h4>{result.title}</h4>
              <p>{result.description || 'No description provided.'}</p>
            </div>
            <div className="teacher-ai-draft__chips">
              {selectedLessons.map((lesson) => (
                <Badge key={lesson.id} variant="secondary">{lesson.title}</Badge>
              ))}
              {selectedExtractions.map((extraction) => (
                <Badge key={extraction.id} variant="outline">{extraction.originalName || extraction.id}</Badge>
              ))}
            </div>
            <div className="teacher-ai-draft__question-list">
              {result.questions.map((question, index) => (
                <article key={`${question.content}-${index}`} className="teacher-ai-draft__question">
                  <div className="teacher-ai-draft__question-head">
                    <strong>Q{index + 1}. {question.content}</strong>
                    <Badge variant="outline">{question.type}</Badge>
                  </div>
                  {question.options && question.options.length > 0 ? (
                    <ul>
                      {question.options.map((option, optionIndex) => (
                        <li key={`${option.text}-${optionIndex}`}>
                          {option.isCorrect ? 'Correct' : 'Option'}: {option.text}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : (
          <p className="teacher-ai-draft__empty">
            Start generation to preview a draft. You can leave this page and resume tracked jobs from assignments.
          </p>
        )}
      </section>
    </div>
  );
}
