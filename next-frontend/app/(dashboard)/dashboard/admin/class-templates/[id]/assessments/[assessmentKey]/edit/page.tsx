'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssessmentComposerShell, type AssessmentComposerSaveState } from '@/features/assessment-composer/AssessmentComposerShell';
import { AssessmentQuestionEditor } from '@/features/assessment-composer/AssessmentQuestionEditor';
import {
  createAssessmentComposerQuestion,
  deleteAssessmentComposerQuestion,
  duplicateAssessmentComposerQuestion,
  reorderAssessmentComposerQuestions,
  supportsAssessmentComposerOptions,
} from '@/features/assessment-composer/reducer';
import type { AssessmentComposerQuestionDraft } from '@/features/assessment-composer/types';
import {
  clearTemplateEditorDraft,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  resolveIndexKey,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
  ClassTemplateQuestion,
  ClassTemplateQuestionOption,
} from '@/types/class-template';
import { type QuestionType } from '@/utils/constants';

function normalizeTemplateQuestion(
  question: ClassTemplateQuestion,
  index: number,
): AssessmentComposerQuestionDraft {
  const type = (question.type || 'multiple_choice') as QuestionType;
  const fallbackQuestion = createAssessmentComposerQuestion(type, question.points ?? 1);
  const normalizedOptions =
    supportsAssessmentComposerOptions(type) && (question.options?.length ?? 0) > 0
      ? (question.options ?? []).map((option, optionIndex) => ({
          id: option.id ?? `template-option-${index + 1}-${optionIndex + 1}`,
          text: option.text ?? '',
          isCorrect: Boolean(option.isCorrect),
          order: option.order ?? optionIndex + 1,
        }))
      : fallbackQuestion.options;

  return {
    id: question.id ?? `template-question-${index + 1}`,
    type,
    content: question.content ?? '',
    points: question.points ?? 1,
    isRequired: question.isRequired ?? true,
    explanation: question.explanation ?? '',
    imageUrl: question.imageUrl ?? '',
    options: normalizedOptions,
  };
}

function normalizeOptionsForQuestionType(
  type: QuestionType,
  options: ClassTemplateQuestionOption[] | undefined,
): ClassTemplateQuestionOption[] {
  const base = (options ?? []).map((option, index) => ({
    ...option,
    order: index + 1,
  }));

  if (type === 'multiple_select') {
    return base;
  }

  if (base.length === 0) {
    return createAssessmentComposerQuestion(type).options.map((option) => ({
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
    }));
  }

  const firstCorrectIndex = base.findIndex((option) => Boolean(option.isCorrect));
  if (firstCorrectIndex < 0) {
    return base.map((option, index) => ({
      ...option,
      isCorrect: index === 0,
    }));
  }

  return base.map((option, index) => ({
    ...option,
    isCorrect: index === firstCorrectIndex,
  }));
}

export default function AdminTemplateAssessmentEditorPage() {
  const params = useParams<{ id: string; assessmentKey: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');
  const assessmentKey = String(params?.assessmentKey ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<AssessmentComposerSaveState>('saved');
  const [previewEnabled, setPreviewEnabled] = useState(false);

  const [title, setTitle] = useState('New Assessment');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState('quiz');
  const [totalPoints, setTotalPoints] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [questions, setQuestions] = useState<AssessmentComposerQuestionDraft[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const assessmentIndex = useMemo(
    () => (assessmentKey === 'new' ? -1 : resolveIndexKey(assessmentKey)),
    [assessmentKey],
  );

  const initializedDraftRef = useRef(false);
  const lastSavedFingerprintRef = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        const cached = readTemplateEditorDraft(templateId);

        if (!mounted) return;

        setTemplate(workspace.template);
        setModules(cached?.modules ?? workspace.state.modules);
        setAssessments(cached?.assessments ?? workspace.state.assessments);
        setAnnouncements(cached?.announcements ?? workspace.state.announcements);
      } catch {
        toast.error('Failed to load assessment studio');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (loading) return;

    const existing = assessmentIndex >= 0 ? assessments[assessmentIndex] : undefined;
    if (existing) {
      const normalizedQuestions = (existing.questions ?? []).map(normalizeTemplateQuestion);
      setTitle(existing.title || 'Untitled Assessment');
      setDescription(existing.description ?? '');
      setAssessmentType(existing.type ?? 'quiz');
      setTotalPoints(existing.totalPoints ?? 10);
      setMaxAttempts(existing.settings?.maxAttempts ?? 1);
      setPassingScore(existing.settings?.passingScore ?? 60);
      setRandomizeQuestions(Boolean(existing.settings?.randomizeQuestions));
      setCloseWhenDue(Boolean(existing.settings?.closeWhenDue));
      setQuestions(normalizedQuestions);
      setSelectedQuestionId(normalizedQuestions[0]?.id ?? null);
      initializedDraftRef.current = false;
      return;
    }

    const starterQuestion = createAssessmentComposerQuestion('multiple_choice', 1);
    setTitle('New Assessment');
    setDescription('');
    setAssessmentType('quiz');
    setTotalPoints(10);
    setMaxAttempts(1);
    setPassingScore(60);
    setRandomizeQuestions(false);
    setCloseWhenDue(false);
    setQuestions([starterQuestion]);
    setSelectedQuestionId(starterQuestion.id);
    initializedDraftRef.current = false;
  }, [loading, assessmentIndex, assessments]);

  const serializedDraft = useMemo(
    () =>
      JSON.stringify({
        title,
        description,
        assessmentType,
        totalPoints,
        maxAttempts,
        passingScore,
        randomizeQuestions,
        closeWhenDue,
        questions,
      }),
    [
      assessmentType,
      closeWhenDue,
      description,
      maxAttempts,
      passingScore,
      questions,
      randomizeQuestions,
      title,
      totalPoints,
    ],
  );

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) ?? null,
    [questions, selectedQuestionId],
  );

  const questionPointsTotal = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );

  const draftPayload = useMemo<ClassTemplateAssessment>(() => {
    const safeTitle = title.trim() || 'Untitled Assessment';
    const normalizedQuestions: ClassTemplateQuestion[] = questions.map((question, index) => ({
      id: question.id.startsWith('temp-') ? undefined : question.id,
      type: question.type,
      content: question.content || `Question ${index + 1}`,
      points: question.points ?? 1,
      order: index + 1,
      isRequired: question.isRequired,
      explanation: question.explanation || undefined,
      imageUrl: question.imageUrl || undefined,
      options: supportsAssessmentComposerOptions(question.type)
        ? normalizeOptionsForQuestionType(question.type, question.options)
        : [],
    }));

    return {
      title: safeTitle,
      description,
      type: assessmentType,
      totalPoints,
      settings: {
        maxAttempts,
        passingScore,
        randomizeQuestions,
        closeWhenDue,
      },
      order:
        assessmentIndex >= 0
          ? assessments[assessmentIndex]?.order ?? assessmentIndex + 1
          : assessments.length + 1,
      questions: normalizedQuestions,
    };
  }, [
    assessmentIndex,
    assessmentType,
    assessments,
    closeWhenDue,
    description,
    maxAttempts,
    passingScore,
    questions,
    randomizeQuestions,
    title,
    totalPoints,
  ]);

  useEffect(() => {
    if (loading || !templateId) return;

    if (!initializedDraftRef.current) {
      initializedDraftRef.current = true;
      lastSavedFingerprintRef.current = serializedDraft;
      setSaveState('saved');
      return;
    }

    if (serializedDraft === lastSavedFingerprintRef.current) {
      return;
    }

    setSaveState('dirty');
    const handle = window.setTimeout(() => {
      try {
        setSaveState('saving');
        const nextAssessments = assessments.slice();
        if (assessmentIndex >= 0 && assessments[assessmentIndex]) {
          nextAssessments[assessmentIndex] = {
            ...assessments[assessmentIndex],
            ...draftPayload,
          };
        } else {
          nextAssessments.push(draftPayload);
        }

        writeTemplateEditorDraft(templateId, {
          modules,
          assessments: nextAssessments,
          announcements,
        });
        lastSavedFingerprintRef.current = serializedDraft;
        setSaveState('saved');
      } catch {
        setSaveState('error');
      }
    }, 700);

    return () => window.clearTimeout(handle);
  }, [
    announcements,
    assessmentIndex,
    assessments,
    draftPayload,
    loading,
    modules,
    serializedDraft,
    templateId,
  ]);

  const handleAddQuestion = (type: QuestionType) => {
    const nextQuestion = createAssessmentComposerQuestion(type, 1);
    setQuestions((current) => [...current, nextQuestion]);
    setSelectedQuestionId(nextQuestion.id);
  };

  const handleDuplicateQuestion = (questionId: string) => {
    setQuestions((current) => {
      const sourceIndex = current.findIndex((question) => question.id === questionId);
      if (sourceIndex < 0) return current;
      const next = current.slice();
      const duplicate = duplicateAssessmentComposerQuestion(next[sourceIndex]);
      next.splice(sourceIndex + 1, 0, duplicate);
      setSelectedQuestionId(duplicate.id);
      return next;
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    const nextState = deleteAssessmentComposerQuestion(questions, questionId, selectedQuestionId);
    setQuestions(nextState.questions);
    setSelectedQuestionId(nextState.nextSelectedQuestionId);
  };

  const handleSave = async () => {
    const nextAssessments = assessments.slice();
    if (assessmentIndex >= 0 && assessments[assessmentIndex]) {
      nextAssessments[assessmentIndex] = {
        ...assessments[assessmentIndex],
        ...draftPayload,
      };
    } else {
      nextAssessments.push(draftPayload);
    }

    try {
      setSaving(true);
      setSaveState('saving');
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules,
        assessments: nextAssessments,
        announcements,
      });

      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      lastSavedFingerprintRef.current = serializedDraft;
      setSaveState('saved');
      toast.success('Assessment saved');
      router.push(`/dashboard/admin/class-templates/${templateId}`);
    } catch {
      setSaveState('error');
      toast.error('Failed to save assessment');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <AssessmentComposerShell
      backHref={`/dashboard/admin/class-templates/${templateId}`}
      backLabel="Back to workspace"
      title={title}
      description={description}
      onTitleChange={setTitle}
      onDescriptionChange={setDescription}
      saveState={saveState}
      onSave={handleSave}
      saveDisabled={saving}
      previewEnabled={previewEnabled}
      onTogglePreview={() => setPreviewEnabled((current) => !current)}
      primaryAction={(
        <Button
          type="button"
          variant="outline"
          className="rounded-2xl"
          onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Exit
        </Button>
      )}
      questions={questions}
      selectedQuestionId={selectedQuestionId}
      onSelectQuestion={setSelectedQuestionId}
      onDuplicateQuestion={handleDuplicateQuestion}
      onDeleteQuestion={handleDeleteQuestion}
      onAddQuestion={handleAddQuestion}
      onReorderQuestions={(fromIndex, toIndex) => {
        setQuestions((current) => reorderAssessmentComposerQuestions(current, fromIndex, toIndex));
      }}
      leftFooterNote="Draft edits autosave locally before you publish the template."
      center={
        previewEnabled ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-slate-900 text-white">{assessmentType}</Badge>
              <Badge variant="outline" className="rounded-full">
                {questions.length} questions
              </Badge>
              <Badge variant="outline" className="rounded-full">
                {questionPointsTotal} points from questions
              </Badge>
            </div>
            <div className="space-y-3">
              {questions.map((question, index) => (
                <div key={question.id} className="rounded-[1.5rem] border border-slate-200 bg-slate-50/70 px-5 py-5">
                  <div className="mb-3 flex items-center gap-3">
                    <span className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      Question {index + 1}
                    </span>
                    <Badge variant="outline" className="rounded-full">
                      {question.points} pts
                    </Badge>
                  </div>
                  <p className="text-base font-semibold text-slate-900">{question.content || 'Untitled question'}</p>
                  {question.imageUrl ? (
                    <p className="mt-3 text-sm text-slate-500">{question.imageUrl}</p>
                  ) : null}
                  {supportsAssessmentComposerOptions(question.type) ? (
                    <div className="mt-4 space-y-2">
                      {question.options.map((option) => (
                        <div key={option.id} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                          {option.text || 'Untitled option'}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-sm text-slate-500">
                      Students answer in free text.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : selectedQuestion ? (
          <AssessmentQuestionEditor
            question={selectedQuestion}
            questions={questions}
            onQuestionsChange={setQuestions}
          />
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50/70 px-6 py-12 text-center text-sm text-slate-500">
            Select a question from the left rail or add a new one to start editing.
          </div>
        )
      }
      settingsPanel={
        <div className="space-y-6">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Template Assessment Studio</p>
            <h2 className="mt-2 text-xl font-black text-slate-900">
              {template?.name ?? 'Class Template'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Keep template assessments predictable so every generated class starts from the same evaluation flow.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Assessment type</label>
              <select
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800"
                value={assessmentType}
                onChange={(event) => setAssessmentType(event.target.value)}
              >
                <option value="quiz">Quiz</option>
                <option value="exam">Exam</option>
                <option value="activity">Activity</option>
                <option value="file_upload">File Upload</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Total points</label>
              <Input
                type="number"
                value={totalPoints}
                onChange={(event) => setTotalPoints(Number(event.target.value || 0))}
                className="h-11 rounded-2xl border-slate-200 bg-slate-50"
              />
              <p className="text-xs text-slate-500">
                Current question total: {questionPointsTotal} points
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Max attempts</label>
                <Input
                  type="number"
                  min={1}
                  value={maxAttempts}
                  onChange={(event) => setMaxAttempts(Number(event.target.value || 1))}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Passing score</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={passingScore}
                  onChange={(event) => setPassingScore(Number(event.target.value || 0))}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                />
              </div>
            </div>

            <div className="space-y-3 rounded-[1.4rem] border border-slate-200 bg-slate-50/60 px-4 py-4">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={(event) => setRandomizeQuestions(event.target.checked)}
                />
                Randomize questions
              </label>
              <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={closeWhenDue}
                  onChange={(event) => setCloseWhenDue(event.target.checked)}
                />
                Close assessment when due
              </label>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Notes</label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                className="min-h-[120px] rounded-[1.4rem] border-slate-200 bg-slate-50/70 px-4 py-4"
                placeholder="Add setup notes for the template or explain when teachers should use this assessment."
              />
            </div>
          </div>
        </div>
      }
    />
  );
}
