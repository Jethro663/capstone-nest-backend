'use client';

import { useState, type DragEvent as ReactDragEvent, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  GripVertical,
  Loader2,
  MoreHorizontal,
  RotateCcw,
  Save,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent } from '@/components/ui/card';
import {
  ASSESSMENT_COMPOSER_LABELS,
  ASSESSMENT_COMPOSER_QUESTION_TYPES,
} from './question-config';
import { getAssessmentComposerQuestionPreview } from './reducer';
import type { AssessmentComposerQuestionDraft } from './types';

export type AssessmentComposerSaveState = 'saved' | 'saving' | 'dirty' | 'error';

interface AssessmentComposerShellProps {
  backHref: string;
  backLabel: string;
  title: string;
  description: string;
  onTitleChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  saveState: AssessmentComposerSaveState;
  onSave: () => void;
  saveDisabled?: boolean;
  previewEnabled: boolean;
  onTogglePreview: () => void;
  primaryAction?: ReactNode;
  questions: AssessmentComposerQuestionDraft[];
  selectedQuestionId: string | null;
  onSelectQuestion: (questionId: string) => void;
  onDuplicateQuestion: (questionId: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onAddQuestion: (type: AssessmentComposerQuestionDraft['type']) => void;
  onReorderQuestions: (fromIndex: number, toIndex: number) => void;
  center: ReactNode;
  settingsPanel: ReactNode;
  leftFooterNote?: ReactNode;
}

function renderSaveState(state: AssessmentComposerSaveState) {
  switch (state) {
    case 'saving':
      return {
        label: 'Saving changes',
        icon: <Loader2 className="h-4 w-4 animate-spin" />,
        className: 'border-amber-200 bg-amber-50 text-amber-700',
      };
    case 'dirty':
      return {
        label: 'Unsaved edits',
        icon: <RotateCcw className="h-4 w-4" />,
        className: 'border-slate-200 bg-slate-100 text-slate-700',
      };
    case 'error':
      return {
        label: 'Autosave retry needed',
        icon: <RotateCcw className="h-4 w-4" />,
        className: 'border-rose-200 bg-rose-50 text-rose-700',
      };
    case 'saved':
    default:
      return {
        label: 'Saved',
        icon: <CheckCircle2 className="h-4 w-4" />,
        className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      };
  }
}

export function AssessmentComposerShell({
  backHref,
  backLabel,
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  saveState,
  onSave,
  saveDisabled = false,
  previewEnabled,
  onTogglePreview,
  primaryAction,
  questions,
  selectedQuestionId,
  onSelectQuestion,
  onDuplicateQuestion,
  onDeleteQuestion,
  onAddQuestion,
  onReorderQuestions,
  center,
  settingsPanel,
  leftFooterNote,
}: AssessmentComposerShellProps) {
  const [draggingQuestionId, setDraggingQuestionId] = useState<string | null>(null);
  const [dropTargetQuestionId, setDropTargetQuestionId] = useState<string | null>(null);
  const saveMeta = renderSaveState(saveState);

  const handleDrop = (
    event: ReactDragEvent<HTMLElement>,
    targetQuestionId: string,
  ) => {
    event.preventDefault();
    const sourceQuestionId = draggingQuestionId || event.dataTransfer.getData('text/plain');
    setDraggingQuestionId(null);
    setDropTargetQuestionId(null);
    if (!sourceQuestionId || sourceQuestionId === targetQuestionId) return;

    const fromIndex = questions.findIndex((question) => question.id === sourceQuestionId);
    const toIndex = questions.findIndex((question) => question.id === targetQuestionId);
    if (fromIndex < 0 || toIndex < 0) return;
    onReorderQuestions(fromIndex, toIndex);
  };

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-4 pb-8 pt-5 lg:px-6">
      <header className="rounded-[2rem] border border-slate-200/80 bg-white/95 px-5 py-5 shadow-[0_24px_48px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={backHref}
                className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Link>
              <Badge className={`rounded-full border px-3 py-1 text-sm font-semibold ${saveMeta.className}`}>
                <span className="mr-2">{saveMeta.icon}</span>
                {saveMeta.label}
              </Badge>
            </div>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
              <Input
                value={title}
                onChange={(event) => onTitleChange(event.target.value)}
                className="h-14 rounded-[1.5rem] border-slate-200 bg-slate-50 px-5 text-xl font-black"
                placeholder="Untitled assessment"
              />
              <Textarea
                value={description}
                onChange={(event) => onDescriptionChange(event.target.value)}
                className="min-h-[56px] rounded-[1.5rem] border-slate-200 bg-slate-50 px-5 py-4 text-sm leading-6"
                placeholder="Add a short description or instructions for this assessment."
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={onTogglePreview}
            >
              <Eye className="mr-2 h-4 w-4" />
              {previewEnabled ? 'Back to edit' : 'Preview'}
            </Button>
            {primaryAction}
            <Button
              type="button"
              className="rounded-2xl bg-slate-900 text-white hover:bg-slate-800"
              onClick={onSave}
              disabled={saveDisabled}
            >
              <Save className="mr-2 h-4 w-4" />
              Save now
            </Button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
        <aside className="rounded-[1.8rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.3)]">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Questions</p>
              <p className="text-sm text-slate-500">{questions.length} items in this assessment</p>
            </div>
          </div>

          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-slate-200 bg-slate-50/70 px-4 py-6 text-sm text-slate-500">
                No questions yet. Start with a choice, text, or checkpoint-friendly prompt from the strip below.
              </div>
            ) : (
              questions.map((question, index) => (
                <article
                  key={question.id}
                  draggable
                  onDragStart={(event) => {
                    setDraggingQuestionId(question.id);
                    event.dataTransfer.effectAllowed = 'move';
                    event.dataTransfer.setData('text/plain', question.id);
                  }}
                  onDragOver={(event) => {
                    if (!draggingQuestionId || draggingQuestionId === question.id) return;
                    event.preventDefault();
                    setDropTargetQuestionId(question.id);
                  }}
                  onDrop={(event) => handleDrop(event, question.id)}
                  onDragEnd={() => {
                    setDraggingQuestionId(null);
                    setDropTargetQuestionId(null);
                  }}
                  className={`rounded-[1.4rem] border px-4 py-4 transition ${
                    selectedQuestionId === question.id
                      ? 'border-sky-300 bg-sky-50/80 shadow-sm'
                      : dropTargetQuestionId === question.id
                        ? 'border-emerald-300 bg-emerald-50/80'
                        : 'border-slate-200 bg-slate-50/60 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      className="flex flex-1 items-start gap-3 text-left"
                      onClick={() => onSelectQuestion(question.id)}
                    >
                      <span className="mt-1 rounded-xl border border-slate-200 bg-white p-2 text-slate-400">
                        <GripVertical className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                            Q{index + 1}
                          </span>
                          <span className="rounded-full bg-white px-2 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                            {ASSESSMENT_COMPOSER_LABELS[question.type]}
                          </span>
                        </span>
                        <span className="mt-2 block truncate text-sm font-semibold text-slate-900">
                          {getAssessmentComposerQuestionPreview(question)}
                        </span>
                        <span className="mt-2 block text-xs text-slate-500">
                          {question.points} pts {question.isRequired ? '• Required' : '• Optional'}
                        </span>
                      </span>
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500"
                          aria-label={`Actions for question ${index + 1}`}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onSelect={() => onDuplicateQuestion(question.id)}>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-rose-600 focus:text-rose-700"
                          onSelect={() => onDeleteQuestion(question.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </article>
              ))
            )}
          </div>

          {leftFooterNote ? <div className="mt-4 text-xs text-slate-500">{leftFooterNote}</div> : null}
        </aside>

        <div className="space-y-5">
          <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)]">
            <CardContent className="p-5">{center}</CardContent>
          </Card>

          <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)]">
            <CardContent className="p-5">
              <div className="mb-4">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Add question</p>
                <p className="text-sm text-slate-500">Keep the assessment flow moving with the same block picker across editors.</p>
              </div>
              <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
                {ASSESSMENT_COMPOSER_QUESTION_TYPES.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <button
                      key={entry.type}
                      type="button"
                      onClick={() => onAddQuestion(entry.type)}
                      className="flex min-h-[92px] flex-col items-start justify-between rounded-[1.3rem] border border-slate-200 bg-slate-50/70 px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-sky-300 hover:bg-sky-50/70"
                    >
                      <Icon className="h-5 w-5 text-sky-700" />
                      <span className="text-sm font-semibold text-slate-900">{entry.label}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-[1.8rem] border-slate-200/80 bg-white/95 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.28)]">
          <CardContent className="p-5">{settingsPanel}</CardContent>
        </Card>
      </section>
    </div>
  );
}
