'use client';

import { useState } from 'react';
import { Check, ImageIcon, Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
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
  const [showAdvanced, setShowAdvanced] = useState(false);

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
      options:
        nextType === 'fill_blank'
          ? currentQuestion.options.length > 0
            ? currentQuestion.options.map((option, index) => ({
                ...option,
                isCorrect: true,
                order: index + 1,
              }))
            : [{ id: createTempId(), text: '', isCorrect: true, order: 1 }]
          : supportsAssessmentComposerOptions(nextType)
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
            : currentQuestion.options,
    }));
  };

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.24)]">
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
            <RichTextEditor
              value={question.content}
              onChange={(value) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  content: value,
                }))
              }
              placeholder="Question"
              minHeight={110}
              className="rounded-2xl"
            />

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

        {supportsAssessmentComposerOptions(question.type) ? (
          <div className="space-y-2">
            {question.options.map((option, optionIndex) => (
              <div
                key={option.id}
                className="grid gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                <button
                  type="button"
                  className={`flex h-10 w-10 items-center justify-center rounded-full border transition ${
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
                  aria-label={`Mark option ${optionIndex + 1} as correct`}
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
                  className="h-10 rounded-xl border-slate-200 bg-slate-50"
                  placeholder={`Option ${optionIndex + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="h-10 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                  disabled={question.options.length <= 2}
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
                  aria-label={`Delete option ${optionIndex + 1}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl px-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
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
              <Plus className="mr-1 h-4 w-4" />
              Add option
            </Button>
          </div>
        ) : question.type === 'fill_blank' ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Correct answers</p>
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={option.text}
                    onChange={(event) =>
                      updateQuestion(question.id, (currentQuestion) => ({
                        ...currentQuestion,
                        options: currentQuestion.options.map((entry, entryIndex) =>
                          entryIndex === optionIndex
                            ? { ...entry, text: event.target.value, isCorrect: true }
                            : { ...entry, isCorrect: true },
                        ),
                      }))
                    }
                    className="h-10 rounded-xl border-slate-200 bg-white"
                    placeholder={`Answer key ${optionIndex + 1}`}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
                    disabled={question.options.length <= 1}
                    onClick={() =>
                      updateQuestion(question.id, (currentQuestion) => ({
                        ...currentQuestion,
                        options:
                          currentQuestion.options.length <= 1
                            ? currentQuestion.options
                            : currentQuestion.options
                                .filter((_, entryIndex) => entryIndex !== optionIndex)
                                .map((entry, entryIndex) => ({
                                  ...entry,
                                  isCorrect: true,
                                  order: entryIndex + 1,
                                })),
                      }))
                    }
                    aria-label={`Delete answer key ${optionIndex + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-xl px-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
              onClick={() =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  options: [
                    ...currentQuestion.options,
                    {
                      id: createTempId(),
                      text: '',
                      isCorrect: true,
                      order: currentQuestion.options.length + 1,
                    },
                  ],
                }))
              }
            >
              <Plus className="mr-1 h-4 w-4" />
              Add correct answer
            </Button>

            <div className="space-y-2 rounded-xl border border-slate-200 bg-white px-3 py-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={question.fillBlankSmartCaseInsensitive}
                  onChange={(event) =>
                    updateQuestion(question.id, (currentQuestion) => ({
                      ...currentQuestion,
                      fillBlankSmartCaseInsensitive: event.target.checked,
                    }))
                  }
                />
                Smart correct answers (ignore letter case)
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={question.fillBlankExperimentalSmartMatch}
                  onChange={(event) =>
                    updateQuestion(question.id, (currentQuestion) => ({
                      ...currentQuestion,
                      fillBlankExperimentalSmartMatch: event.target.checked,
                    }))
                  }
                />
                Experimental smart answers (clean symbols before matching)
              </label>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
            This question accepts written answers, so options are not required.
          </div>
        )}

        {showAdvanced ? (
          <div className="grid items-start gap-3 md:grid-cols-2">
            <div className="relative self-start">
              <ImageIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={question.imageUrl}
                onChange={(event) =>
                  updateQuestion(question.id, (currentQuestion) => ({
                    ...currentQuestion,
                    imageUrl: event.target.value,
                  }))
                }
                className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-10"
                placeholder="Image URL (optional)"
              />
            </div>
            <RichTextEditor
              value={question.explanation}
              onChange={(value) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  explanation: value,
                }))
              }
              className="rounded-xl"
              minHeight={88}
              placeholder="Explanation (optional)"
            />
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <span>Points:</span>
          <Input
            type="number"
            min={1}
            className="h-9 w-20 rounded-xl border-slate-200 bg-white"
            value={question.points}
            onChange={(event) =>
              updateQuestion(question.id, (currentQuestion) => ({
                ...currentQuestion,
                points: Number(event.target.value) || 1,
              }))
            }
          />
          <span className="text-slate-500">{pointsLabel}</span>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
          <Button
            type="button"
            variant="ghost"
            className="h-9 rounded-xl px-2 text-sm text-slate-600 hover:bg-slate-200/70"
            onClick={() => setShowAdvanced((current) => !current)}
          >
            {showAdvanced ? 'Hide extras' : 'More options'}
          </Button>
        </div>
      </div>
    </div>
  );
}
