'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  Eye,
  GripVertical,
  List,
  Plus,
  Save,
  Trash2,
  Type,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { assessmentService } from '@/services/assessment-service';
import type {
  Assessment,
  AssessmentQuestion,
  ClassRecordCategory,
  CreateQuestionDto,
  QuestionAnalyticsResponse,
  RubricCriterion,
} from '@/types/assessment';
import type { QuestionType } from '@/utils/constants';
import './assessment-editor.css';

type RightTab = 'settings' | 'rubric' | 'analytics';
type Availability = 'given' | 'draft';
type ShowResultMode = 'immediate' | 'scheduled';

type QuestionDraft = {
  id: string;
  type: QuestionType;
  content: string;
  points: number;
  isRequired: boolean;
  options: Array<{
    id: string;
    text: string;
    isCorrect: boolean;
    order: number;
  }>;
  isNew?: boolean;
};

const QUESTION_TILES: Array<{ label: string; value: QuestionType; icon: typeof List }> = [
  { label: 'Multiple', value: 'multiple_choice', icon: List },
  { label: 'Identification', value: 'short_answer', icon: Type },
  { label: 'Essay', value: 'fill_blank', icon: Type },
  { label: 'File', value: 'dropdown', icon: List },
  { label: 'Matching', value: 'multiple_select', icon: List },
];

const QUESTION_LABELS: Record<QuestionType, string> = {
  multiple_choice: 'Multiple Choice',
  multiple_select: 'Multiple Select',
  true_false: 'True / False',
  short_answer: 'Identification',
  fill_blank: 'Essay',
  dropdown: 'Dropdown',
};

const QUESTION_TYPE_ICONS: Record<QuestionType, typeof List> = {
  multiple_choice: List,
  multiple_select: List,
  true_false: List,
  short_answer: Type,
  fill_blank: Type,
  dropdown: List,
};

function toParamValue(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] || '';
  return input || '';
}

function createTempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

function supportsOptions(type: QuestionType) {
  return (
    type === 'multiple_choice' ||
    type === 'multiple_select' ||
    type === 'true_false' ||
    type === 'dropdown'
  );
}

function defaultOptionsForType(type: QuestionType) {
  if (type === 'true_false') {
    return [
      { id: createTempId(), text: 'True', isCorrect: true, order: 1 },
      { id: createTempId(), text: 'False', isCorrect: false, order: 2 },
    ];
  }
  return [
    { id: createTempId(), text: '', isCorrect: false, order: 1 },
    { id: createTempId(), text: '', isCorrect: false, order: 2 },
  ];
}

function normalizeQuestion(question: AssessmentQuestion): QuestionDraft {
  return {
    id: question.id,
    type: question.type,
    content: question.content || '',
    points: question.points || 1,
    isRequired: question.isRequired ?? true,
    options: (question.options || []).map((option) => ({
      id: option.id,
      text: option.text,
      isCorrect: option.isCorrect,
      order: option.order,
    })),
  };
}

function getQuestionPreview(question: QuestionDraft) {
  const trimmed = question.content.trim();
  if (!trimmed) return 'Untitled question';
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}...` : trimmed;
}

export default function AssessmentEditorPage() {
  const params = useParams();
  const assessmentId = toParamValue(params.id);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<QuestionDraft[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [deletedQuestionIds, setDeletedQuestionIds] = useState<string[]>([]);
  const [rightTab, setRightTab] = useState<RightTab>('settings');
  const [availability, setAvailability] = useState<Availability>('draft');
  const [category, setCategory] = useState<ClassRecordCategory>('written_work');
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<string>('30');
  const [showResultMode, setShowResultMode] = useState<ShowResultMode>('immediate');
  const [rubricCriteria, setRubricCriteria] = useState<RubricCriterion[]>([]);
  const [analytics, setAnalytics] = useState<QuestionAnalyticsResponse | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchAssessment = useCallback(async () => {
    if (!assessmentId) return;
    try {
      setLoading(true);
      const response = await assessmentService.getById(assessmentId);
      const data = response.data;
      const normalizedQuestions = (data.questions || [])
        .sort((a, b) => a.order - b.order)
        .map(normalizeQuestion);
      setAssessment(data);
      setTitle(data.title || '');
      setQuestions(normalizedQuestions);
      setSelectedQuestionId(normalizedQuestions[0]?.id || null);
      setDeletedQuestionIds([]);
      setAvailability(data.isPublished ? 'given' : 'draft');
      setCategory(data.classRecordCategory || 'written_work');
      setTimeLimitMinutes(
        data.timeLimitMinutes === null || data.timeLimitMinutes === undefined
          ? '30'
          : String(data.timeLimitMinutes),
      );
      setShowResultMode(data.feedbackLevel === 'immediate' ? 'immediate' : 'scheduled');
      setRubricCriteria(data.rubricCriteria || []);
      setAnalytics(null);
    } catch {
      toast.error('Unable to load assessment');
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  }, [assessmentId]);

  useEffect(() => {
    void fetchAssessment();
  }, [fetchAssessment]);

  useEffect(() => {
    if (rightTab !== 'analytics' || !assessmentId) return;
    let cancelled = false;
    const loadAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const response = await assessmentService.getQuestionAnalytics(assessmentId);
        if (!cancelled) {
          setAnalytics(response.data);
        }
      } catch {
        if (!cancelled) {
          setAnalytics(null);
          toast.error('Unable to load analytics');
        }
      } finally {
        if (!cancelled) {
          setAnalyticsLoading(false);
        }
      }
    };
    void loadAnalytics();
    return () => {
      cancelled = true;
    };
  }, [assessmentId, rightTab]);

  const selectedQuestion = useMemo(
    () => questions.find((question) => question.id === selectedQuestionId) || null,
    [questions, selectedQuestionId],
  );

  const totalPoints = useMemo(
    () => questions.reduce((sum, question) => sum + (Number(question.points) || 0), 0),
    [questions],
  );

  const updateQuestion = (questionId: string, updater: (question: QuestionDraft) => QuestionDraft) => {
    setQuestions((current) =>
      current.map((question) => (question.id === questionId ? updater(question) : question)),
    );
  };

  const handleAddQuestion = (type: QuestionType) => {
    const question: QuestionDraft = {
      id: createTempId(),
      type,
      content: '',
      points: 5,
      isRequired: true,
      options: supportsOptions(type) ? defaultOptionsForType(type) : [],
      isNew: true,
    };
    setQuestions((current) => [...current, question]);
    setSelectedQuestionId(question.id);
  };

  const handleDeleteQuestion = (questionId: string) => {
    setConfirmation({
      title: 'Delete question?',
      description: 'This question will be removed from the assessment.',
      confirmLabel: 'Delete',
      tone: 'danger',
      onConfirm: async () => {
        setQuestions((current) => current.filter((question) => question.id !== questionId));
        if (!questionId.startsWith('temp-')) {
          setDeletedQuestionIds((current) => [...current, questionId]);
        }
        setSelectedQuestionId((current) => {
          if (current !== questionId) return current;
          const remaining = questions.filter((question) => question.id !== questionId);
          return remaining[0]?.id || null;
        });
      },
    });
  };

  const syncQuestions = async () => {
    if (!assessment) return;

    for (const questionId of deletedQuestionIds) {
      await assessmentService.deleteQuestion(questionId);
    }

    for (let index = 0; index < questions.length; index += 1) {
      const question = questions[index];
      const payload: Omit<CreateQuestionDto, 'assessmentId'> = {
        type: question.type,
        content: question.content.trim(),
        points: Number(question.points) || 1,
        order: index + 1,
        isRequired: question.isRequired,
        options: supportsOptions(question.type)
          ? question.options.map((option, optionIndex) => ({
              text: option.text.trim(),
              isCorrect: option.isCorrect,
              order: optionIndex + 1,
            }))
          : [],
      };

      if (!payload.content) {
        throw new Error(`Question ${index + 1} is empty`);
      }

      if (supportsOptions(question.type)) {
        const trimmedOptions = payload.options?.filter((option) => option.text) || [];
        if (trimmedOptions.length < 2) {
          throw new Error(`Question ${index + 1} needs at least two answer choices`);
        }
        if (!trimmedOptions.some((option) => option.isCorrect)) {
          throw new Error(`Question ${index + 1} needs at least one correct answer`);
        }
        payload.options = trimmedOptions.map((option, optionIndex) => ({
          ...option,
          order: optionIndex + 1,
        }));
      }

      if (question.isNew || question.id.startsWith('temp-')) {
        await assessmentService.createQuestion({
          assessmentId: assessment.id,
          ...payload,
        });
      } else {
        await assessmentService.updateQuestion(question.id, payload);
      }
    }
  };

  const handleSave = async () => {
    if (!assessment || saving) return;
    if (!title.trim()) {
      toast.error('Assessment title is required');
      return;
    }
    if (questions.length === 0) {
      toast.error('Add at least one question');
      return;
    }

    try {
      setSaving(true);
      await assessmentService.update(assessment.id, {
        title: title.trim(),
        classRecordCategory: category,
        timeLimitMinutes: Number(timeLimitMinutes) || null,
        feedbackLevel: showResultMode === 'immediate' ? 'immediate' : 'standard',
        isPublished: availability === 'given',
      });

      await syncQuestions();
      toast.success('Assessment saved');
      await fetchAssessment();
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'message' in error &&
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Unable to save assessment';
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRubric = async () => {
    if (!assessment) return;
    try {
      const normalized = rubricCriteria
        .map((criterion, index) => ({
          id: criterion.id?.trim() || `criterion-${index + 1}`,
          title: criterion.title.trim(),
          description: criterion.description?.trim() || undefined,
          points: Number(criterion.points) || 0,
        }))
        .filter((criterion) => criterion.title);

      if (normalized.length === 0) {
        toast.error('Add at least one rubric criterion');
        return;
      }

      const response = await assessmentService.reviewRubric(assessment.id, normalized);
      setRubricCriteria(response.data.rubricCriteria || []);
      toast.success('Rubric saved');
    } catch {
      toast.error('Unable to save rubric');
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-[42rem] rounded-xl" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
        Assessment not found.
      </div>
    );
  }

  return (
    <div className="assessment-editor">
      <header className="assessment-editor__header">
        <div className="assessment-editor__title">
          <Link href="/dashboard/teacher/assessments" className="assessment-editor__back">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <Input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            className="assessment-editor__title-input"
          />
        </div>
        <div className="assessment-editor__header-actions">
          <Button
            type="button"
            variant="outline"
            className="assessment-editor__draft-btn"
            onClick={() => setAvailability((current) => (current === 'given' ? 'draft' : 'given'))}
          >
            <Eye className="h-4 w-4" />
            {availability === 'given' ? 'Given' : 'Draft'}
          </Button>
          <Button type="button" className="assessment-editor__save-btn" onClick={() => void handleSave()} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </header>

      <section className="assessment-editor__workspace">
        <aside className="assessment-editor__left">
          <div className="assessment-editor__left-head">QUESTIONS ({questions.length})</div>
          <div className="assessment-editor__question-list">
            {questions.map((question, index) => (
              <button
                key={question.id}
                type="button"
                className="assessment-editor__question-item"
                data-active={selectedQuestionId === question.id}
                onClick={() => setSelectedQuestionId(question.id)}
              >
                <div className="assessment-editor__question-rail">
                  <GripVertical className="h-3.5 w-3.5" />
                  <div className="assessment-editor__question-index-wrap">
                    <span className="assessment-editor__question-index">Q{index + 1}</span>
                    {(() => {
                      const Icon = QUESTION_TYPE_ICONS[question.type];
                      return <Icon className="h-3.5 w-3.5" />;
                    })()}
                  </div>
                </div>
                <div className="assessment-editor__question-preview">
                  <p>{getQuestionPreview(question)}</p>
                </div>
                <span className="assessment-editor__question-points">{question.points}pt</span>
              </button>
            ))}
          </div>
          <div className="assessment-editor__left-foot">
            <p>ADD QUESTION</p>
            <div className="assessment-editor__tile-grid">
              {QUESTION_TILES.map((tile) => {
                const Icon = tile.icon;
                return (
                  <button
                    key={tile.label}
                    type="button"
                    className="assessment-editor__tile-btn"
                    onClick={() => handleAddQuestion(tile.value)}
                  >
                    <Icon className="h-4 w-4" />
                    {tile.label}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="assessment-editor__center">
          {!selectedQuestion ? (
            <div className="assessment-editor__empty">Select a question or add a new one.</div>
          ) : (
            <>
              <article className="assessment-editor__card">
                <div className="assessment-editor__card-top">
                  <span className="assessment-editor__type-chip">
                    <List className="h-3.5 w-3.5" />
                    {QUESTION_LABELS[selectedQuestion.type]}
                  </span>
                  <div className="assessment-editor__card-meta">
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedQuestion.isRequired}
                        onChange={(event) =>
                          updateQuestion(selectedQuestion.id, (question) => ({
                            ...question,
                            isRequired: event.target.checked,
                          }))
                        }
                      />
                      Required
                    </label>
                    <Input
                      type="number"
                      min={1}
                      className="assessment-editor__point-input"
                      value={selectedQuestion.points}
                      onChange={(event) =>
                        updateQuestion(selectedQuestion.id, (question) => ({
                          ...question,
                          points: Number(event.target.value) || 1,
                        }))
                      }
                    />
                    <span>pts</span>
                  </div>
                </div>

                <Textarea
                  value={selectedQuestion.content}
                  onChange={(event) =>
                    updateQuestion(selectedQuestion.id, (question) => ({
                      ...question,
                      content: event.target.value,
                    }))
                  }
                  className="assessment-editor__question-text"
                  placeholder="Type question..."
                />
              </article>

              <article className="assessment-editor__card">
                <div className="assessment-editor__answer-head">
                  <h3>Answer Choices</h3>
                  <button
                    type="button"
                    className="assessment-editor__delete-question"
                    onClick={() => handleDeleteQuestion(selectedQuestion.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {supportsOptions(selectedQuestion.type) ? (
                  <div className="assessment-editor__choices">
                    {selectedQuestion.options.map((option, optionIndex) => (
                      <div
                        key={option.id}
                        className="assessment-editor__choice-row"
                        data-correct={option.isCorrect}
                      >
                        <button
                          type="button"
                          className="assessment-editor__choice-check"
                          onClick={() =>
                            updateQuestion(selectedQuestion.id, (question) => ({
                              ...question,
                              options: question.options.map((entry, entryIndex) => ({
                                ...entry,
                                isCorrect:
                                  question.type === 'multiple_select'
                                    ? entryIndex === optionIndex
                                      ? !entry.isCorrect
                                      : entry.isCorrect
                                    : entryIndex === optionIndex,
                              })),
                            }))
                          }
                        >
                          {option.isCorrect ? <Check className="h-3.5 w-3.5" /> : null}
                        </button>
                        <Input
                          value={option.text}
                          onChange={(event) =>
                            updateQuestion(selectedQuestion.id, (question) => ({
                              ...question,
                              options: question.options.map((entry, entryIndex) =>
                                entryIndex === optionIndex
                                  ? { ...entry, text: event.target.value }
                                  : entry,
                              ),
                            }))
                          }
                          className="assessment-editor__choice-input"
                        />
                        <button
                          type="button"
                          className="assessment-editor__choice-delete"
                          onClick={() =>
                            updateQuestion(selectedQuestion.id, (question) => ({
                              ...question,
                              options:
                                question.options.length <= 2
                                  ? question.options
                                  : question.options.filter((_, entryIndex) => entryIndex !== optionIndex),
                            }))
                          }
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="assessment-editor__add-choice"
                      onClick={() =>
                        updateQuestion(selectedQuestion.id, (question) => ({
                          ...question,
                          options: [
                            ...question.options,
                            {
                              id: createTempId(),
                              text: '',
                              isCorrect: false,
                              order: question.options.length + 1,
                            },
                          ],
                        }))
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Choice
                    </button>
                    <p className="assessment-editor__choice-note">Click the circle to mark the correct answer.</p>
                  </div>
                ) : (
                  <div className="assessment-editor__short-answer-note">
                    This question type uses text response and has no choice list.
                  </div>
                )}
              </article>
            </>
          )}
        </main>

        <aside className="assessment-editor__right">
          <nav className="assessment-editor__right-tabs">
            {(['settings', 'rubric', 'analytics'] as RightTab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                data-active={rightTab === tab}
                onClick={() => setRightTab(tab)}
              >
                {tab[0].toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>

          {rightTab === 'settings' ? (
            <div className="assessment-editor__right-body">
              <div className="assessment-editor__field">
                <label>Assessment Category</label>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value as ClassRecordCategory)}
                >
                  <option value="written_work">Written Work</option>
                  <option value="performance_task">Performance Task</option>
                  <option value="quarterly_assessment">Quarterly Assessment</option>
                </select>
              </div>

              <div className="assessment-editor__field">
                <label>Time Limit (minutes)</label>
                <Input
                  type="number"
                  min={1}
                  value={timeLimitMinutes}
                  onChange={(event) => setTimeLimitMinutes(event.target.value)}
                />
              </div>

              <div className="assessment-editor__field">
                <label>Show Results</label>
                <label className="assessment-editor__radio">
                  <input
                    type="radio"
                    checked={showResultMode === 'immediate'}
                    onChange={() => setShowResultMode('immediate')}
                  />
                  Immediately After Submit
                </label>
                <label className="assessment-editor__radio">
                  <input
                    type="radio"
                    checked={showResultMode === 'scheduled'}
                    onChange={() => setShowResultMode('scheduled')}
                  />
                  Scheduled Release
                </label>
              </div>

              <div className="assessment-editor__field">
                <label>Availability</label>
                <div className="assessment-editor__availability">
                  <button
                    type="button"
                    data-active={availability === 'given'}
                    onClick={() => setAvailability('given')}
                  >
                    Given
                  </button>
                  <button
                    type="button"
                    data-active={availability === 'draft'}
                    onClick={() => setAvailability('draft')}
                  >
                    Draft
                  </button>
                </div>
              </div>

              <div className="assessment-editor__summary">
                Total: <strong>{totalPoints} points</strong> - {questions.length} questions
              </div>
            </div>
          ) : null}

          {rightTab === 'rubric' ? (
            <div className="assessment-editor__right-body">
              <div className="assessment-editor__rubric-list">
                {rubricCriteria.length === 0 ? (
                  <p className="assessment-editor__empty-small">No rubric criteria yet.</p>
                ) : (
                  rubricCriteria.map((criterion, index) => (
                    <div key={criterion.id || index} className="assessment-editor__rubric-row">
                      <Input
                        value={criterion.title}
                        onChange={(event) =>
                          setRubricCriteria((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index ? { ...entry, title: event.target.value } : entry,
                            ),
                          )
                        }
                        placeholder="Criterion title"
                      />
                      <Input
                        type="number"
                        min={0}
                        value={criterion.points}
                        onChange={(event) =>
                          setRubricCriteria((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index
                                ? { ...entry, points: Number(event.target.value) || 0 }
                                : entry,
                            ),
                          )
                        }
                        placeholder="Points"
                      />
                      <button
                        type="button"
                        className="assessment-editor__choice-delete"
                        onClick={() =>
                          setRubricCriteria((current) =>
                            current.filter((_, entryIndex) => entryIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="assessment-editor__rubric-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setRubricCriteria((current) => [
                      ...current,
                      { id: createTempId(), title: '', points: 1, description: '' },
                    ])
                  }
                >
                  <Plus className="h-4 w-4" />
                  Add Row
                </Button>
                <Button type="button" onClick={() => void handleSaveRubric()}>
                  <Save className="h-4 w-4" />
                  Save Rubric
                </Button>
              </div>
            </div>
          ) : null}

          {rightTab === 'analytics' ? (
            <div className="assessment-editor__right-body">
              {analyticsLoading ? (
                <Skeleton className="h-24 rounded-xl" />
              ) : analytics ? (
                <div className="assessment-editor__analytics">
                  <p>Total Responses: <strong>{analytics.totalResponses || 0}</strong></p>
                  <p>Total Attempts: <strong>{analytics.totalAttempts || 0}</strong></p>
                  <div className="assessment-editor__analytics-list">
                    {analytics.questions.map((entry) => (
                      <article key={entry.questionId}>
                        <h4>{entry.content || 'Untitled question'}</h4>
                        <p>
                          Correct: {Math.round(entry.correctPercent || 0)}% - Avg:
                          {' '}
                          {entry.averagePoints.toFixed(1)}
                          {' '}
                          pts
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="assessment-editor__empty-small">No analytics data yet.</p>
              )}
            </div>
          ) : null}
        </aside>
      </section>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
