'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
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
  ClassTemplateQuestionOption,
  ClassTemplateModule,
  ClassTemplateQuestion,
} from '@/types/class-template';
import { QUESTION_TYPES, type QuestionType } from '@/utils/constants';

function createDefaultQuestion(order: number): ClassTemplateQuestion {
  return {
    type: 'multiple_choice',
    content: 'New question',
    points: 1,
    order,
    options: [
      { text: 'Option A', order: 1 },
      { text: 'Option B', order: 2 },
    ],
  };
}

function supportsOptions(type: string) {
  return type === 'multiple_choice' || type === 'multiple_select' || type === 'true_false' || type === 'dropdown';
}

function createDefaultOptions(type: string): ClassTemplateQuestionOption[] {
  if (type === 'true_false') {
    return [
      { text: 'True', isCorrect: true, order: 1 },
      { text: 'False', isCorrect: false, order: 2 },
    ];
  }

  return [
    { text: 'Option A', isCorrect: true, order: 1 },
    { text: 'Option B', isCorrect: false, order: 2 },
  ];
}

function normalizeOptionsForQuestionType(
  type: string,
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
    return createDefaultOptions(type);
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

  const [title, setTitle] = useState('New Assessment');
  const [description, setDescription] = useState('');
  const [assessmentType, setAssessmentType] = useState('quiz');
  const [totalPoints, setTotalPoints] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(1);
  const [passingScore, setPassingScore] = useState(60);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [closeWhenDue, setCloseWhenDue] = useState(false);
  const [questions, setQuestions] = useState<ClassTemplateQuestion[]>([]);

  const assessmentIndex = useMemo(
    () => (assessmentKey === 'new' ? -1 : resolveIndexKey(assessmentKey)),
    [assessmentKey],
  );

  const isNew = assessmentKey === 'new' || assessmentIndex < 0;

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        const cached = readTemplateEditorDraft(templateId);

        if (!mounted) return;

        const nextModules = cached?.modules ?? workspace.state.modules;
        const nextAssessments = cached?.assessments ?? workspace.state.assessments;
        const nextAnnouncements = cached?.announcements ?? workspace.state.announcements;

        setTemplate(workspace.template);
        setModules(nextModules);
        setAssessments(nextAssessments);
        setAnnouncements(nextAnnouncements);
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
      setTitle(existing.title || 'Untitled Assessment');
      setDescription(existing.description ?? '');
      setAssessmentType(existing.type ?? 'quiz');
      setTotalPoints(existing.totalPoints ?? 10);
      setMaxAttempts(existing.settings?.maxAttempts ?? 1);
      setPassingScore(existing.settings?.passingScore ?? 60);
      setRandomizeQuestions(Boolean(existing.settings?.randomizeQuestions));
      setCloseWhenDue(Boolean(existing.settings?.closeWhenDue));
      setQuestions(existing.questions ?? []);
      return;
    }

    setTitle('New Assessment');
    setDescription('');
    setAssessmentType('quiz');
    setTotalPoints(10);
    setMaxAttempts(1);
    setPassingScore(60);
    setRandomizeQuestions(false);
    setCloseWhenDue(false);
    setQuestions([createDefaultQuestion(1)]);
  }, [loading, assessmentIndex, assessments]);

  useEffect(() => {
    if (!templateId || loading) return;
    const handle = window.setTimeout(() => {
      writeTemplateEditorDraft(templateId, { modules, assessments, announcements });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [templateId, loading, modules, assessments, announcements]);

  const addQuestion = () => {
    setQuestions((current) => [...current, createDefaultQuestion(current.length + 1)]);
  };

  const updateQuestion = (questionIndex: number, patch: Partial<ClassTemplateQuestion>) => {
    setQuestions((current) => {
      const next = current.slice();
      next[questionIndex] = { ...next[questionIndex], ...patch };
      return next;
    });
  };

  const addQuestionOption = (questionIndex: number) => {
    setQuestions((current) => {
      const next = current.slice();
      const question = next[questionIndex];
      if (!question || !supportsOptions(question.type)) return current;

      const options = question.options ?? [];
      next[questionIndex] = {
        ...question,
        options: [
          ...options,
          {
            text: `Option ${String.fromCharCode(65 + options.length)}`,
            isCorrect: false,
            order: options.length + 1,
          },
        ],
      };

      return next;
    });
  };

  const updateQuestionOption = (
    questionIndex: number,
    optionIndex: number,
    patch: Partial<ClassTemplateQuestionOption>,
  ) => {
    setQuestions((current) => {
      const next = current.slice();
      const question = next[questionIndex];
      if (!question) return current;

      const options = (question.options ?? []).slice();
      if (!options[optionIndex]) return current;
      options[optionIndex] = { ...options[optionIndex], ...patch };

      next[questionIndex] = {
        ...question,
        options,
      };

      return next;
    });
  };

  const removeQuestionOption = (questionIndex: number, optionIndex: number) => {
    setQuestions((current) => {
      const next = current.slice();
      const question = next[questionIndex];
      if (!question) return current;

      const options = (question.options ?? [])
        .filter((_, index) => index !== optionIndex)
        .map((option, index) => ({
          ...option,
          order: index + 1,
        }));

      next[questionIndex] = {
        ...question,
        options,
      };

      return next;
    });
  };

  const removeQuestion = (questionIndex: number) => {
    setQuestions((current) => current.filter((_, index) => index !== questionIndex));
  };

  const moveQuestion = (questionIndex: number, direction: -1 | 1) => {
    setQuestions((current) => {
      const targetIndex = questionIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = current.slice();
      const [moved] = next.splice(questionIndex, 1);
      next.splice(targetIndex, 0, moved);

      return next.map((question, index) => ({
        ...question,
        order: index + 1,
      }));
    });
  };

  const handleSave = async () => {
    const safeTitle = title.trim() || 'Untitled Assessment';
    const normalizedQuestions = questions.map((question, index) => ({
      ...question,
      order: index + 1,
      content: question.content || `Question ${index + 1}`,
      options: supportsOptions(question.type)
        ? normalizeOptionsForQuestionType(question.type, question.options)
        : [],
    }));

    const payload: ClassTemplateAssessment = {
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
      order: assessmentIndex >= 0 ? assessments[assessmentIndex]?.order ?? assessmentIndex + 1 : assessments.length + 1,
      questions: normalizedQuestions,
    };

    const nextAssessments = assessments.slice();
    if (assessmentIndex >= 0 && assessments[assessmentIndex]) {
      nextAssessments[assessmentIndex] = {
        ...assessments[assessmentIndex],
        ...payload,
      };
    } else {
      nextAssessments.push(payload);
    }

    try {
      setSaving(true);
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules,
        assessments: nextAssessments,
        announcements,
      });

      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      toast.success('Assessment saved');
      router.push(`/dashboard/admin/class-templates/${templateId}`);
    } catch {
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
    <TeacherPageShell
      className="theme-admin-bridge mx-auto max-w-6xl"
      badge="Template Assessment Studio"
      title={isNew ? 'Create Assessment' : 'Edit Assessment'}
      description="Mirror teacher assessment authoring while saving as reusable template content."
      actions={(
        <>
          <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Button>
          <Button className="teacher-button-solid rounded-xl font-black" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Assessment'}
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard label="Template" value={template?.name ?? 'Class Template'} accent="sky" />
          <TeacherStatCard label="Mode" value={isNew ? 'New' : 'Edit'} accent="teal" />
          <TeacherStatCard label="Questions" value={`${questions.length}`} accent="amber" />
          <TeacherStatCard label="Total Points" value={`${totalPoints}`} accent="rose" />
        </>
      )}
    >
      <TeacherSectionCard title="Assessment Settings" description="Keep settings clean and predictable so linked module blocks are easy to configure.">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Title</p>
            <Input data-testid="assessment-title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Type</p>
            <select
              className="admin-select h-10 w-full rounded-xl px-3"
              value={assessmentType}
              onChange={(event) => setAssessmentType(event.target.value)}
            >
              <option value="quiz">Quiz</option>
              <option value="exam">Exam</option>
              <option value="activity">Activity</option>
              <option value="file_upload">File Upload</option>
            </select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Description</p>
            <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24" />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Total Points</p>
            <Input
              type="number"
              value={totalPoints}
              onChange={(event) => setTotalPoints(Number(event.target.value || 0))}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Max Attempts</p>
            <Input
              type="number"
              min={1}
              value={maxAttempts}
              onChange={(event) => setMaxAttempts(Number(event.target.value || 1))}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Passing Score</p>
            <Input
              type="number"
              min={0}
              max={100}
              value={passingScore}
              onChange={(event) => setPassingScore(Number(event.target.value || 0))}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
              <input
                type="checkbox"
                checked={randomizeQuestions}
                onChange={(event) => setRandomizeQuestions(event.target.checked)}
              />
              Randomize questions
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-[var(--admin-text-strong)]">
              <input
                type="checkbox"
                checked={closeWhenDue}
                onChange={(event) => setCloseWhenDue(event.target.checked)}
              />
              Close assessment when due
            </label>
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Questions"
        description="Use the same question-centric structure teachers expect when building assessments."
        action={(
          <Button variant="outline" className="admin-button-outline rounded-xl" onClick={addQuestion}>
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        )}
      >
        <div className="space-y-3">
          {questions.length > 0 ? (
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">
              Tip: use arrows to reorder questions before saving.
            </p>
          ) : null}

          {questions.map((question, questionIndex) => (
            <div key={`question-${questionIndex}`} className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-black text-[var(--admin-text-strong)]">Question {questionIndex + 1}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveQuestion(questionIndex, -1)}
                    disabled={questionIndex === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveQuestion(questionIndex, 1)}
                    disabled={questionIndex === questions.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" onClick={() => removeQuestion(questionIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Content</p>
                  <Input
                    value={question.content}
                    onChange={(event) => updateQuestion(questionIndex, { content: event.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Type</p>
                  <select
                    className="admin-select h-10 w-full rounded-xl px-3"
                    value={question.type}
                    onChange={(event) => {
                      const nextType = event.target.value as QuestionType;
                      updateQuestion(questionIndex, {
                        type: nextType,
                        options: supportsOptions(nextType)
                          ? (question.options && question.options.length > 0
                            ? question.options
                            : createDefaultOptions(nextType))
                          : [],
                      });
                    }}
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Points</p>
                  <Input
                    type="number"
                    value={question.points ?? 1}
                    onChange={(event) => updateQuestion(questionIndex, { points: Number(event.target.value || 1) })}
                  />
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Required</p>
                  <label className="flex h-10 items-center gap-2 rounded-xl border border-[var(--admin-outline)] px-3 text-sm text-[var(--admin-text-strong)]">
                    <input
                      type="checkbox"
                      checked={question.isRequired ?? true}
                      onChange={(event) => updateQuestion(questionIndex, { isRequired: event.target.checked })}
                    />
                    Required for submission
                  </label>
                </div>

                <div className="space-y-2 md:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Explanation (optional)</p>
                  <Textarea
                    value={question.explanation ?? ''}
                    onChange={(event) => updateQuestion(questionIndex, { explanation: event.target.value })}
                    className="min-h-20"
                    placeholder="Feedback shown after answering (optional)"
                  />
                </div>

                <div className="space-y-2 md:col-span-3">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">Image URL (optional)</p>
                  <Input
                    value={question.imageUrl ?? ''}
                    onChange={(event) => updateQuestion(questionIndex, { imageUrl: event.target.value })}
                    placeholder="https://..."
                  />
                </div>

                {supportsOptions(question.type) ? (
                  <div className="md:col-span-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                        Options
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addQuestionOption(questionIndex)}
                        disabled={question.type === 'true_false'}
                      >
                        <Plus className="h-4 w-4" />
                        Add Option
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {(question.options ?? []).map((option, optionIndex) => (
                        <div key={`${questionIndex}-option-${optionIndex}`} className="flex items-center gap-2">
                          <Input
                            value={option.text}
                            onChange={(event) =>
                              updateQuestionOption(questionIndex, optionIndex, { text: event.target.value })
                            }
                            placeholder={`Option ${optionIndex + 1}`}
                            disabled={question.type === 'true_false'}
                          />
                          <label className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--admin-text-muted)]">
                            <input
                              type="checkbox"
                              checked={Boolean(option.isCorrect)}
                                onChange={(event) => {
                                  const checked = event.target.checked;
                                  if (question.type === 'multiple_select') {
                                    updateQuestionOption(questionIndex, optionIndex, {
                                      isCorrect: checked,
                                    });
                                    return;
                                  }

                                  const existing = question.options ?? [];
                                  const next = existing.map((entry, index) => ({
                                    ...entry,
                                    isCorrect: index === optionIndex ? checked : false,
                                  }));

                                  updateQuestion(questionIndex, {
                                    options: normalizeOptionsForQuestionType(question.type, next),
                                  });
                                }}
                            />
                            Correct
                          </label>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeQuestionOption(questionIndex, optionIndex)}
                            disabled={question.type === 'true_false' || (question.options ?? []).length <= 2}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
