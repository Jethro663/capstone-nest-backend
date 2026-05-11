'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  Plus,
  Trash2,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import type { QuestionType } from '@/utils/constants';
import {
  createAssessmentComposerQuestion,
  supportsAssessmentComposerOptions,
  updateAssessmentComposerQuestion,
} from './reducer';
import type {
  AssessmentComposerOptionDraft,
  AssessmentComposerQuestionDraft,
} from './types';
import { ASSESSMENT_COMPOSER_LABELS } from './question-config';

function createTempId() {
  return `temp-${Math.random().toString(36).slice(2, 10)}`;
}

const MAX_QUESTION_POINTS = 99;
const QUESTION_CONTENT_MAX_LENGTH = 1500;
const OPTION_CONTENT_MAX_LENGTH = 400;
const MIN_IMAGE_ZOOM = 100;
const MAX_IMAGE_ZOOM = 200;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);
const ALLOWED_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp']);

function normalizeQuestionPoints(value: string | number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), MAX_QUESTION_POINTS);
}

function sanitizeQuestionPointsInput(value: string) {
  const digitsOnly = value.replace(/\D/g, '');
  if (!digitsOnly) return '';
  const normalized = Number.parseInt(digitsOnly, 10);
  if (!Number.isFinite(normalized) || normalized < 1) return '';
  return String(Math.min(normalized, MAX_QUESTION_POINTS));
}

function normalizeImageZoom(value?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 100;
  return Math.min(Math.max(parsed, MIN_IMAGE_ZOOM), MAX_IMAGE_ZOOM);
}

function normalizeImagePosition(value?: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(parsed, 0), 100);
}

function createDefaultOption(order: number, isCorrect: boolean) {
  return {
    id: createTempId(),
    text: '',
    isCorrect,
    order,
    imageUrl: '',
    imageDisplayMode: 'default' as const,
    imageZoom: 100,
    imagePositionX: 50,
    imagePositionY: 50,
  };
}

function normalizeTrueFalseOptions(options: AssessmentComposerOptionDraft[]) {
  const trueOption = options[0] ?? createDefaultOption(1, false);
  const falseOption = options[1] ?? createDefaultOption(2, false);

  return [
    {
      ...trueOption,
      text: 'True',
      order: 1,
      isCorrect: Boolean(trueOption.isCorrect),
      imagePositionX: normalizeImagePosition(trueOption.imagePositionX),
      imagePositionY: normalizeImagePosition(trueOption.imagePositionY),
    },
    {
      ...falseOption,
      text: 'False',
      order: 2,
      isCorrect: Boolean(falseOption.isCorrect),
      imagePositionX: normalizeImagePosition(falseOption.imagePositionX),
      imagePositionY: normalizeImagePosition(falseOption.imagePositionY),
    },
  ];
}

function buildOptionsForQuestionType(
  nextType: QuestionType,
  currentQuestion: AssessmentComposerQuestionDraft,
): AssessmentComposerOptionDraft[] {
  const switchingAwayFromTrueFalse =
    currentQuestion.type === 'true_false' && nextType !== 'true_false';

  if (nextType === 'true_false') {
    return normalizeTrueFalseOptions(currentQuestion.options);
  }

  if (switchingAwayFromTrueFalse) {
    return createAssessmentComposerQuestion(nextType, currentQuestion.points).options;
  }

  if (nextType === 'fill_blank') {
    return currentQuestion.options.length > 0
      ? currentQuestion.options.map((option, index) => ({
          ...option,
          isCorrect: true,
          order: index + 1,
        }))
      : [{
          id: createTempId(),
          text: '',
          isCorrect: true,
          order: 1,
          imageUrl: '',
          imageDisplayMode: 'default',
          imageZoom: 100,
          imagePositionX: 50,
          imagePositionY: 50,
        }];
  }

  if (supportsAssessmentComposerOptions(nextType)) {
    return currentQuestion.options.length > 0
      ? currentQuestion.options.map((option, index) => ({
          ...option,
          isCorrect:
            nextType === 'multiple_select'
              ? option.isCorrect
              : index === currentQuestion.options.findIndex((entry) => entry.isCorrect),
          order: index + 1,
        }))
      : [
          {
            id: createTempId(),
            text: '',
            isCorrect: nextType !== 'multiple_select',
            order: 1,
            imageUrl: '',
            imageDisplayMode: 'default',
            imageZoom: 100,
            imagePositionX: 50,
            imagePositionY: 50,
          },
          {
            id: createTempId(),
            text: '',
            isCorrect: false,
            order: 2,
            imageUrl: '',
            imageDisplayMode: 'default',
            imageZoom: 100,
            imagePositionX: 50,
            imagePositionY: 50,
          },
        ];
  }

  return currentQuestion.options;
}

function isAllowedImageFile(file: File) {
  const fileName = typeof file.name === 'string' ? file.name.toLowerCase() : '';
  const extension = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')) : '';
  return (
    ALLOWED_IMAGE_MIME_TYPES.has(file.type) &&
    ALLOWED_IMAGE_EXTENSIONS.has(extension)
  );
}

interface AssessmentQuestionEditorProps {
  question: AssessmentComposerQuestionDraft;
  questions: AssessmentComposerQuestionDraft[];
  onQuestionsChange: (questions: AssessmentComposerQuestionDraft[]) => void;
  pointsLabel?: string;
  onUploadQuestionImage?: (questionId: string, file: File) => void | Promise<void>;
  onUploadOptionImage?: (questionId: string, optionId: string, file: File) => void | Promise<void>;
  onOpenQuestionDetails?: (questionId: string) => void;
}

type ImagePreviewProps = {
  alt: string;
  imageUrl: string;
  imageDisplayMode?: 'default' | 'expanded';
  imageZoom?: number;
  imagePositionX?: number;
  imagePositionY?: number;
  onSetDisplayMode: (mode: 'default' | 'expanded') => void;
  onSetZoom: (zoom: number) => void;
  onSetPosition: (positionX: number, positionY: number) => void;
  onDelete: () => void;
  compact?: boolean;
};

function ComposerImagePreview({
  alt,
  imageUrl,
  imageDisplayMode = 'default',
  imageZoom = 100,
  imagePositionX = 50,
  imagePositionY = 50,
  onSetDisplayMode,
  onSetZoom,
  onSetPosition,
  onDelete,
  compact = false,
}: ImagePreviewProps) {
  const zoom = normalizeImageZoom(imageZoom);
  const expanded = imageDisplayMode === 'expanded';
  const positionX = normalizeImagePosition(imagePositionX);
  const positionY = normalizeImagePosition(imagePositionY);
  const dragStateRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startPositionX: number;
    startPositionY: number;
  } | null>(null);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!dragStateRef.current || dragStateRef.current.pointerId !== event.pointerId) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const deltaX = event.clientX - dragStateRef.current.startClientX;
      const deltaY = event.clientY - dragStateRef.current.startClientY;
      const nextX = normalizeImagePosition(
        dragStateRef.current.startPositionX - (deltaX / Math.max(rect.width, 1)) * 100,
      );
      const nextY = normalizeImagePosition(
        dragStateRef.current.startPositionY - (deltaY / Math.max(rect.height, 1)) * 100,
      );
      onSetPosition(nextX, nextY);
    },
    [onSetPosition],
  );

  const stopDragging = useCallback((pointerId: number) => {
    if (dragStateRef.current?.pointerId === pointerId) {
      dragStateRef.current = null;
    }
  }, []);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
      <div
        className="mx-auto overflow-hidden rounded-xl bg-white"
        style={{
          maxWidth: expanded ? '100%' : compact ? '320px' : '720px',
          height: expanded ? (compact ? '260px' : '360px') : compact ? '180px' : '260px',
          touchAction: 'none',
          cursor: 'grab',
        }}
        onPointerDown={(event) => {
          dragStateRef.current = {
            pointerId: event.pointerId,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startPositionX: positionX,
            startPositionY: positionY,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => {
          stopDragging(event.pointerId);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
        onPointerCancel={(event) => {
          stopDragging(event.pointerId);
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
        }}
      >
        <Image
          src={imageUrl}
          alt={alt}
          width={1200}
          height={675}
          unoptimized
          className="h-full w-full object-cover"
          style={{
            objectPosition: `${positionX}% ${positionY}%`,
            transform: `scale(${zoom / 100})`,
            transformOrigin: 'center',
          }}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-3 top-3 flex items-start justify-between gap-3 opacity-0 transition group-hover:opacity-100">
        <span className="pointer-events-auto rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-600 shadow-sm">
          {expanded ? 'Expanded' : 'Default'} • {zoom}%
        </span>
        <div className="pointer-events-auto flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-white/80 bg-white/95 px-3 text-xs font-semibold shadow-sm"
            aria-label="Default image size"
            onClick={() => {
              onSetDisplayMode('default');
              onSetZoom(100);
              onSetPosition(50, 50);
            }}
          >
            <Minimize2 className="mr-1 h-3.5 w-3.5" />
            Default
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 rounded-full border-white/80 bg-white/95 px-3 text-xs font-semibold shadow-sm"
            aria-label="Expand image"
            onClick={() => onSetDisplayMode('expanded')}
          >
            <Maximize2 className="mr-1 h-3.5 w-3.5" />
            Expand
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-white/80 bg-white/95 shadow-sm"
            aria-label="Zoom out image"
            onClick={() => onSetZoom(Math.max(MIN_IMAGE_ZOOM, zoom - 10))}
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-white/80 bg-white/95 shadow-sm"
            aria-label="Zoom in image"
            onClick={() => onSetZoom(Math.min(MAX_IMAGE_ZOOM, zoom + 10))}
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8 rounded-full border-rose-200 bg-white/95 text-rose-600 shadow-sm hover:bg-rose-50"
            aria-label="Delete image"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <div className="mt-2 text-xs font-medium text-slate-500">
        {expanded ? 'Expanded' : 'Default'} • {zoom}%
      </div>
    </div>
  );
}

export function AssessmentQuestionEditor({
  question,
  questions,
  onQuestionsChange,
  pointsLabel = 'pts',
  onUploadQuestionImage,
  onUploadOptionImage,
  onOpenQuestionDetails,
}: AssessmentQuestionEditorProps) {
  const [pointsInput, setPointsInput] = useState(String(question.points));
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingOptionId, setUploadingOptionId] = useState<string | null>(null);
  const questionUploadInputRef = useRef<HTMLInputElement | null>(null);
  const optionUploadInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const questionIndex = Math.max(
    questions.findIndex((entry) => entry.id === question.id),
    0,
  );
  const supportsOptions = supportsAssessmentComposerOptions(question.type);
  const isTrueFalse = question.type === 'true_false';

  useEffect(() => {
    setPointsInput(String(question.points));
  }, [question.id, question.points]);

  const uploadButtonLabel = useMemo(
    () => (question.imageUrl ? 'Change question image' : 'Add image to question'),
    [question.imageUrl],
  );

  const updateQuestion = useCallback((
    questionId: string,
    updater: (currentQuestion: AssessmentComposerQuestionDraft) => AssessmentComposerQuestionDraft,
  ) => {
    onQuestionsChange(updateAssessmentComposerQuestion(questions, questionId, updater));
  }, [onQuestionsChange, questions]);

  useEffect(() => {
    if (!isTrueFalse) return;

    const needsNormalization =
      question.options.length !== 2 ||
      question.options[0]?.text !== 'True' ||
      question.options[1]?.text !== 'False' ||
      question.options[0]?.order !== 1 ||
      question.options[1]?.order !== 2;

    if (!needsNormalization) return;

    updateQuestion(question.id, (currentQuestion) => ({
      ...currentQuestion,
      options: normalizeTrueFalseOptions(currentQuestion.options),
    }));
  }, [isTrueFalse, question.id, question.options, updateQuestion]);

  const handleTypeChange = (nextType: QuestionType) => {
    updateQuestion(question.id, (currentQuestion) => ({
      ...currentQuestion,
      type: nextType,
      options: buildOptionsForQuestionType(nextType, currentQuestion),
    }));
  };

  const handleQuestionFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadQuestionImage) return;
    if (!isAllowedImageFile(file)) {
      toast.error('Upload a JPG, PNG, GIF, or WEBP image.');
      return;
    }

    try {
      setUploadingQuestionImage(true);
      await onUploadQuestionImage(question.id, file);
    } finally {
      setUploadingQuestionImage(false);
    }
  };

  const handleOptionFileChange = async (
    option: AssessmentComposerOptionDraft,
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !onUploadOptionImage) return;
    if (!isAllowedImageFile(file)) {
      toast.error('Upload a JPG, PNG, GIF, or WEBP image.');
      return;
    }

    try {
      setUploadingOptionId(option.id);
      await onUploadOptionImage(question.id, option.id, file);
    } finally {
      setUploadingOptionId((current) => (current === option.id ? null : current));
    }
  };

  const questionToolbarActions = (
    <>
      <input
        ref={questionUploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp"
        className="sr-only"
        aria-label="Upload question image"
        onChange={handleQuestionFileChange}
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-9 w-9 rounded-full border-dashed border-sky-200 bg-sky-50/80 text-sky-700 hover:bg-sky-100"
        aria-label={uploadButtonLabel}
        title={uploadButtonLabel}
        onClick={() => questionUploadInputRef.current?.click()}
        disabled={uploadingQuestionImage}
      >
        {uploadingQuestionImage ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ImageIcon className="h-3.5 w-3.5" />
        )}
      </Button>
    </>
  );

  return (
    <div className="overflow-hidden rounded-[1.4rem] border border-slate-200/80 bg-white shadow-[0_18px_40px_-34px_rgba(15,23,42,0.24)]">
      <div className="grid gap-4 px-4 py-4">
        <div
          className={
            supportsOptions
              ? 'grid grid-cols-[auto_minmax(0,1fr)] items-start gap-3'
              : 'grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]'
          }
        >
          {supportsOptions ? (
            <>
              <span className="pt-3 text-[1.05rem] font-extrabold leading-none text-[#0f2747]">
                {questionIndex + 1}.
              </span>
              <RichTextEditor
                value={question.content}
                onChange={(value) =>
                  updateQuestion(question.id, (currentQuestion) => ({
                    ...currentQuestion,
                    content: value,
                  }))
                }
                placeholder="Question"
                minHeight={56}
                maxLength={QUESTION_CONTENT_MAX_LENGTH}
                className="assessment-question-editor__compact-prompt"
                toolbarActions={questionToolbarActions}
              />
            </>
          ) : (
            <>
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
                maxLength={QUESTION_CONTENT_MAX_LENGTH}
                className="rounded-2xl"
                toolbarActions={questionToolbarActions}
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
            </>
          )}
        </div>

        {question.imageUrl ? (
          <div className={supportsOptions ? 'pl-8' : ''}>
            <ComposerImagePreview
              alt="Question image"
              imageUrl={question.imageUrl}
              imageDisplayMode={question.imageDisplayMode}
              imageZoom={question.imageZoom}
              imagePositionX={question.imagePositionX}
              imagePositionY={question.imagePositionY}
              onSetDisplayMode={(mode) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  imageDisplayMode: mode,
                }))
              }
              onSetZoom={(zoom) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  imageZoom: zoom,
                }))
              }
              onSetPosition={(positionX, positionY) =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  imagePositionX: positionX,
                  imagePositionY: positionY,
                }))
              }
              onDelete={() =>
                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  imageUrl: '',
                  imageDisplayMode: 'default',
                  imageZoom: 100,
                  imagePositionX: 50,
                  imagePositionY: 50,
                }))
              }
            />
          </div>
        ) : null}

        {supportsOptions ? (
          <div className="grid gap-3 pl-8">
            {question.options.map((option, optionIndex) => (
              <div key={option.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 px-3 py-3">
                <div className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-3">
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full border transition ${
                      option.isCorrect
                        ? 'border-[#2f6db2] bg-[#edf4ff] text-[#2f6db2]'
                        : 'border-slate-300 bg-white text-slate-400 hover:border-slate-400 hover:bg-slate-50'
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
                    maxLength={OPTION_CONTENT_MAX_LENGTH}
                    readOnly={isTrueFalse}
                    onChange={(event) =>
                      updateQuestion(question.id, (currentQuestion) => ({
                        ...currentQuestion,
                        options: currentQuestion.options.map((entry, entryIndex) =>
                          entryIndex === optionIndex ? { ...entry, text: event.target.value } : entry,
                        ),
                      }))
                    }
                    className="h-11 rounded-xl border-slate-200 bg-white read-only:bg-slate-100 read-only:text-slate-700"
                    placeholder={`Option ${optionIndex + 1}`}
                  />
                  {!isTrueFalse ? (
                    <>
                      <input
                        ref={(node) => {
                          optionUploadInputRefs.current[option.id] = node;
                        }}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        className="sr-only"
                        aria-label={`Upload image for option ${optionIndex + 1}`}
                        onChange={(event) => void handleOptionFileChange(option, event)}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 rounded-xl border-dashed border-sky-200 bg-white text-sky-700 hover:bg-sky-50"
                        aria-label={option.imageUrl ? `Change image for option ${optionIndex + 1}` : `Add image to option ${optionIndex + 1}`}
                        title={option.imageUrl ? `Change image for option ${optionIndex + 1}` : `Add image to option ${optionIndex + 1}`}
                        onClick={() => optionUploadInputRefs.current[option.id]?.click()}
                        disabled={uploadingOptionId === option.id}
                      >
                        {uploadingOptionId === option.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ImageIcon className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </>
                  ) : null}
                  {!isTrueFalse ? (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-10 w-10 rounded-xl text-slate-500 hover:bg-rose-50 hover:text-rose-600"
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
                  ) : null}
                </div>
                {option.imageUrl ? (
                  <div className="mt-3 ml-11">
                    <ComposerImagePreview
                      alt={`Option ${optionIndex + 1} image`}
                      imageUrl={option.imageUrl}
                      imageDisplayMode={option.imageDisplayMode}
                      imageZoom={option.imageZoom}
                      imagePositionX={option.imagePositionX}
                      imagePositionY={option.imagePositionY}
                      compact
                      onSetDisplayMode={(mode) =>
                        updateQuestion(question.id, (currentQuestion) => ({
                          ...currentQuestion,
                          options: currentQuestion.options.map((entry, entryIndex) =>
                            entryIndex === optionIndex ? { ...entry, imageDisplayMode: mode } : entry,
                          ),
                        }))
                      }
                      onSetZoom={(zoom) =>
                        updateQuestion(question.id, (currentQuestion) => ({
                          ...currentQuestion,
                          options: currentQuestion.options.map((entry, entryIndex) =>
                            entryIndex === optionIndex ? { ...entry, imageZoom: zoom } : entry,
                          ),
                        }))
                      }
                      onSetPosition={(positionX, positionY) =>
                        updateQuestion(question.id, (currentQuestion) => ({
                          ...currentQuestion,
                          options: currentQuestion.options.map((entry, entryIndex) =>
                            entryIndex === optionIndex
                              ? { ...entry, imagePositionX: positionX, imagePositionY: positionY }
                              : entry,
                          ),
                        }))
                      }
                      onDelete={() =>
                        updateQuestion(question.id, (currentQuestion) => ({
                          ...currentQuestion,
                          options: currentQuestion.options.map((entry, entryIndex) =>
                            entryIndex === optionIndex
                              ? {
                                  ...entry,
                                  imageUrl: '',
                                  imageDisplayMode: 'default',
                                  imageZoom: 100,
                                  imagePositionX: 50,
                                  imagePositionY: 50,
                                }
                              : entry,
                          ),
                        }))
                      }
                    />
                  </div>
                ) : null}
              </div>
            ))}

            {!isTrueFalse ? (
              <Button
                type="button"
                variant="ghost"
                className="ml-11 h-9 justify-start rounded-xl px-2 text-sm font-semibold text-sky-700 hover:bg-sky-50"
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
                        imageUrl: '',
                        imageDisplayMode: 'default',
                        imageZoom: 100,
                        imagePositionX: 50,
                        imagePositionY: 50,
                      },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 h-4 w-4" />
                Add option
              </Button>
            ) : null}
          </div>
        ) : question.type === 'fill_blank' ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-900">Correct answers</p>
              {question.options.map((option, optionIndex) => (
                <div key={option.id} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                  <Input
                    value={option.text}
                    maxLength={OPTION_CONTENT_MAX_LENGTH}
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
                      imageUrl: '',
                      imageDisplayMode: 'default',
                      imageZoom: 100,
                      imagePositionX: 50,
                      imagePositionY: 50,
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
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
            <span>Points:</span>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              className="h-9 w-[4.75rem] rounded-xl border-slate-200 bg-white"
              value={pointsInput}
              onChange={(event) => {
                const nextValue = sanitizeQuestionPointsInput(event.target.value);
                setPointsInput(nextValue);
                if (!nextValue) return;

                updateQuestion(question.id, (currentQuestion) => ({
                  ...currentQuestion,
                  points: normalizeQuestionPoints(nextValue),
                }));
              }}
              onBlur={() => setPointsInput(String(question.points))}
            />
            <span className="text-slate-500">{pointsLabel}</span>
          </div>

          {supportsOptions ? (
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <span>Type</span>
              <select
                value={question.type}
                onChange={(event) => handleTypeChange(event.target.value as QuestionType)}
                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
              >
                {Object.entries(ASSESSMENT_COMPOSER_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>

        {onOpenQuestionDetails ? (
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl px-3 text-sm font-semibold text-slate-700"
            onClick={() => onOpenQuestionDetails(question.id)}
          >
            Question details
          </Button>
        ) : null}
      </div>
    </div>
  );
}
