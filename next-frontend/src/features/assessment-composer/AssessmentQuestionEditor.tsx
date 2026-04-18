'use client';

import { Check, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { QuestionType } from '@/utils/constants';
import {
  supportsAssessmentComposerOptions,
  updateAssessmentComposerQuestion,
} from './reducer';
import type { AssessmentComposerQuestionDraft } from './types';
import { ASSESSMENT_COMPOSER_LABELS } from './question-config';

function createTempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

interface AssessmentQuestionEditorProps {
  question: AssessmentComposerQuestionDraft;
  questions: AssessmentComposerQuestionDraft[];
  onQuestionsChange: (questions: AssessmentComposerQuestionDraft[]) => void;
  pointsLabel?: string;
}

export function AssessmentQuestionEditor({
  question,
  questions,
  onQuestionsChange,
  pointsLabel = 'pts',
}: AssessmentQuestionEditorProps) {
  const updateQuestion = (
    questionId: string,
    updater: (currentQuestion: AssessmentComposerQuestionDraft) => AssessmentComposerQuestionDraft,
  ) => {
    onQuestionsChange(updateAssessmentComposerQuestion(questions, questionId, updater));
  };

  const handleTypeChange = (nextType: QuestionType) => {
    updateQuestion(question.id, (currentQuestion) => ({
      ...currentQuestion,
      type: nextType,
      options: supportsAssessmentComposerOptions(nextType)
        ? currentQuestion.options.length > 0
          ? currentQuestion.options.map((option, index) => ({
              ...option,
              isCorrect:
                nextType === 'multiple_select'
                  ? option.isCorrect
                  : index === currentQuestion.options.findIndex((entry) => entry.isCorrect),
              order: index + 1,
            }))
          : [
              { id: createTempId(), text: '', isCorrect: nextType !== 'multiple_select', order: 1 },
              { id: createTempId(), text: '', isCorrect: false, order: 2 },
            ]
        : [],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[1.8rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="rounded-full border-sky-200 bg-sky-50 text-sky-700">
              {ASSESSMENT_COMPOSER_LABELS[question.type]}
            </Badge>
            <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={question.isRequired}
                onChange={(event) =>
                  updateQuestion(question.id, (currentQuestion) => ({
                    ...currentQuestion,
                    isRequired: event.target.checked,
                  }))
                }
              />
              Required
            </label>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={1}
              className="h-11 w-24 rounded-2xl border-slate-200 bg-slate-50"
              value={question.points}
              onChange={(event) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  points: Number(event.target.value) || 1,
                }))
              }
            />
            <span className="text-sm font-semibold text-slate-500">{pointsLabel}</span>
          </div>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Question</label>
            <Textarea
              value={question.content}
              onChange={(event) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  content: event.target.value,
                }))
              }
              className="min-h-[180px] rounded-[1.4rem] border-slate-200 bg-slate-50/70 px-4 py-4 text-base leading-7"
              placeholder="Type the prompt students should answer."
            />
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Question type</label>
              <select
                value={question.type}
                onChange={(event) => handleTypeChange(event.target.value as QuestionType)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-medium text-slate-800"
              >
                {Object.entries(ASSESSMENT_COMPOSER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Image URL</label>
              <div className="relative">
                <ImageIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={question.imageUrl}
                  onChange={(event) =>
                    updateQuestion(question.id, (currentQuestion) => ({
                      ...currentQuestion,
                      imageUrl: event.target.value,
                    }))
                  }
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-11"
                  placeholder="https://..."
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[1.8rem] border border-slate-200/80 bg-white px-5 py-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <p className="text-sm font-black text-slate-900">Response setup</p>
            <p className="text-sm text-slate-500">Set answer choices, correctness, and learner feedback.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {supportsAssessmentComposerOptions(question.type) ? (
            <>
              {question.options.map((option, optionIndex) => (
                <div
                  key={option.id}
                  className="grid gap-3 rounded-[1.4rem] border border-slate-200/80 bg-slate-50/70 px-4 py-4 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
                >
                  <button
                    type="button"
                    className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${
                      option.isCorrect
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-300 bg-white text-slate-400'
                    }`}
                    onClick={() =>
                      updateQuestion(question.id, (currentQuestion) => ({
                        ...currentQuestion,
                        options: currentQuestion.options.map((entry, entryIndex) => ({
                          ...entry,
                          isCorrect:
                            currentQuestion.type === 'multiple_select'
                              ? entryIndex === optionIndex
                                ? !entry.isCorrect
                                : entry.isCorrect
                              : entryIndex === optionIndex,
                        })),
                      }))
                    }
                  >
                    {option.isCorrect ? <Check className="h-4 w-4" /> : null}
                  </button>
                  <Input
                    value={option.text}
                    onChange={(event) =>
                      updateQuestion(question.id, (currentQuestion) => ({
                        ...currentQuestion,
                        options: currentQuestion.options.map((entry, entryIndex) =>
                          entryIndex === optionIndex ? { ...entry, text: event.target.value } : entry,
                        ),
                      }))
                    }
                    className="h-11 rounded-2xl border-slate-200 bg-white"
                    placeholder={`Choice ${optionIndex + 1}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-2xl border-rose-200 text-rose-600 hover:bg-rose-50"
                    onClick={() =>
                      updateQuestion(question.id, (currentQuestion) => ({
                        ...currentQuestion,
                        options:
                          currentQuestion.options.length <= 2
                            ? currentQuestion.options
                            : currentQuestion.options
                                .filter((_, entryIndex) => entryIndex !== optionIndex)
                                .map((entry, entryIndex) => ({ ...entry, order: entryIndex + 1 })),
                      }))
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-slate-500">
                  {question.type === 'multiple_select'
                    ? 'Mark one or more correct answers.'
                    : 'Mark the single correct answer.'}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-2xl"
                  onClick={() =>
                    updateQuestion(question.id, (currentQuestion) => ({
                      ...currentQuestion,
                      options: [
                        ...currentQuestion.options,
                        {
                          id: createTempId(),
                          text: '',
                          isCorrect: false,
                          order: currentQuestion.options.length + 1,
                        },
                      ],
                    }))
                  }
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add choice
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-sm text-slate-500">
              This question type accepts a written response, so no answer choices are required.
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">Explanation</label>
            <Textarea
              value={question.explanation}
              onChange={(event) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  explanation: event.target.value,
                }))
              }
              className="min-h-[120px] rounded-[1.4rem] border-slate-200 bg-slate-50/70 px-4 py-4"
              placeholder="Explain why the answer is correct or what students should review."
            />
          </div>
        </div>
      </div>
    </div>
  );
}
