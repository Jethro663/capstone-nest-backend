'use client';

import { useState } from 'react';
import type { DragEvent } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  FileText,
  Link2,
  Plus,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LibraryFilePickerDialog } from '@/components/library/LibraryFilePickerDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { fileService } from '@/services/file-service';
import { normalizeRichText } from '@/lib/rich-text';
import type { ClassItem } from '@/types/class';
import type { LibraryFileKind, LibraryGradeLevel, LibrarySubjectKey, UploadedFile } from '@/types/file';
import type { ContentBlock } from '@/types/lesson';
import {
  evaluateCheckpointAnswer,
  getBlockUrlValue,
  getLessonFileBlockModel,
  getLessonMediaBlockModel,
  getStructuredLessonBlockHeading,
  getStructuredLessonBlockHtml,
  getStructuredLessonQuestionModel,
  getStructuredLessonTextContent,
  getStructuredLessonTextVariant,
  getYouTubeEmbedUrl,
  normalizeStructuredLessonBlock,
  type LessonFileBlockModel,
  type LessonMediaBlockModel,
  type StructuredLessonExampleStep,
  type StructuredLessonQuestionChoice,
  type StructuredLessonTextItem,
} from './structured-content';
import { useLibraryFileObjectUrl } from './use-library-file-object-url';

type LessonBlockPatch = {
  content: ContentBlock['content'];
  metadata?: ContentBlock['metadata'];
};

const IMAGE_KINDS: LibraryFileKind[] = ['image'];
const SUPPORTING_FILE_KINDS: LibraryFileKind[] = ['pdf', 'txt', 'pptx'];

function makeClientId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeRichValue(value?: string | null) {
  return normalizeRichText(value || '').trim();
}

function formatFileSize(size?: number) {
  if (!size) return 'File size unavailable';
  if (size >= 1_048_576) return `${(size / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function isImageFile(file: UploadedFile | File) {
  const mimeType = file instanceof File ? file.type : file.mimeType;
  const fileKind = file instanceof File ? undefined : file.fileKind;
  return fileKind === 'image' || mimeType.startsWith('image/');
}

function isSupportingFile(file: UploadedFile | File) {
  const mimeType = file instanceof File ? file.type : file.mimeType;
  const fileKind = file instanceof File ? undefined : file.fileKind;
  return (
    SUPPORTING_FILE_KINDS.includes(fileKind as LibraryFileKind) ||
    mimeType === 'application/pdf' ||
    mimeType === 'text/plain' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  );
}

function normalizeLibrarySubjectKey(
  subjectCode?: string | null,
  subjectName?: string | null,
): LibrarySubjectKey | undefined {
  const raw = `${subjectCode ?? ''} ${subjectName ?? ''}`.toLowerCase();
  if (raw.includes('science') || raw.includes('sci')) return 'science';
  if (raw.includes('math')) return 'math';
  if (raw.includes('english') || raw.includes('eng')) return 'english';
  if (raw.includes('filipino') || raw.includes('fil')) return 'filipino';
  if (raw.includes('araling') || raw.includes('panlipunan') || /\bap\b/.test(raw)) return 'ap';
  if (raw.includes('tle')) return 'tle';
  if (raw.includes('mapeh')) return 'mapeh';
  if (raw.includes('esp') || raw.includes('values') || raw.includes('pagpapakatao')) return 'esp';
  return undefined;
}

function normalizeLibraryGradeLevel(value?: string | null): LibraryGradeLevel | undefined {
  const match = String(value ?? '').match(/\b(7|8|9|10)\b/);
  return match?.[1] as LibraryGradeLevel | undefined;
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number) {
  const next = items.slice();
  const [item] = next.splice(fromIndex, 1);
  if (!item) return items;
  next.splice(toIndex, 0, item);
  return next;
}

function fileToImageModel(file: UploadedFile, previous: LessonMediaBlockModel): LessonMediaBlockModel {
  return {
    fileId: file.id,
    fileName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
    caption: previous.caption ?? '',
    displayScale: previous.displayScale ?? 100,
  };
}

function fileToAttachmentModel(file: UploadedFile): LessonFileBlockModel {
  return {
    fileId: file.id,
    fileName: file.originalName,
    mimeType: file.mimeType,
    sizeBytes: file.sizeBytes,
  };
}

function TextListEditor({
  label,
  items,
  onChange,
  placeholder,
}: {
  label: string;
  items: StructuredLessonTextItem[];
  onChange: (items: StructuredLessonTextItem[]) => void;
  placeholder: string;
}) {
  const updateItem = (id: string, html: string) => {
    onChange(items.map((item) => (item.id === id ? { ...item, html } : item)));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-black text-[var(--teacher-text-strong)]">{label}</Label>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="teacher-button-outline rounded-xl font-black"
          onClick={() => onChange([...items, { id: makeClientId('item'), html: '<p></p>' }])}
        >
          <Plus className="h-3.5 w-3.5" />
          Add bullet
        </Button>
      </div>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id} className="rounded-2xl border border-[var(--teacher-outline)] bg-white/85 p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700">
                {index + 1}
              </span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl"
                  disabled={index === 0}
                  onClick={() => onChange(moveItem(items, index, index - 1))}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl"
                  disabled={index === items.length - 1}
                  onClick={() => onChange(moveItem(items, index, index + 1))}
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </Button>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 rounded-xl text-rose-600"
                  disabled={items.length === 1}
                  onClick={() => onChange(items.filter((entry) => entry.id !== item.id))}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <RichTextEditor
              value={item.html}
              onChange={(html) => updateItem(item.id, html)}
              minHeight={86}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function FileObjectPreview({ fileId, alt, className }: { fileId: string; alt: string; className?: string }) {
  const { objectUrl, loading, failed } = useLibraryFileObjectUrl(fileId);

  if (loading) {
    return <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs font-semibold text-slate-500">Loading secure preview...</div>;
  }

  if (failed || !objectUrl) {
    return <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50 px-4 py-8 text-center text-xs font-semibold text-amber-700">Preview unavailable. The saved file reference will still use authenticated download.</div>;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={objectUrl} alt={alt} className={className ?? 'max-h-[360px] w-full rounded-2xl object-contain'} />
  );
}

export function LessonBlockTeacherEditor({
  block,
  classId,
  classItem,
  onSave,
  onCancel,
}: {
  block: ContentBlock;
  classId: string;
  classItem?: ClassItem | null;
  onSave: (patch: LessonBlockPatch) => void;
  onCancel: () => void;
}) {
  const normalizedBlock = normalizeStructuredLessonBlock(block);
  const variant = getStructuredLessonTextVariant(normalizedBlock);
  const textContent = getStructuredLessonTextContent(normalizedBlock);
  const questionModel = getStructuredLessonQuestionModel(normalizedBlock);
  const mediaModel = getLessonMediaBlockModel(normalizedBlock);
  const fileModel = getLessonFileBlockModel(normalizedBlock);

  const [heading, setHeading] = useState(textContent.heading ?? '');
  const [bodyHtml, setBodyHtml] = useState(textContent.html ?? '');
  const [items, setItems] = useState<StructuredLessonTextItem[]>(
    textContent.items?.length ? textContent.items : [{ id: makeClientId('item'), html: '<p></p>' }],
  );
  const [scenarioHtml, setScenarioHtml] = useState(textContent.scenarioHtml ?? '');
  const [steps, setSteps] = useState<StructuredLessonExampleStep[]>(
    textContent.steps?.length
      ? textContent.steps
      : [{ id: makeClientId('step'), title: 'Step 1', html: '<p></p>' }],
  );
  const [answerHtml, setAnswerHtml] = useState(textContent.answerHtml ?? '');
  const [takeawayHtml, setTakeawayHtml] = useState(textContent.takeawayHtml ?? '');
  const [promptHtml, setPromptHtml] = useState(textContent.promptHtml ?? '');

  const [checkpointPrompt, setCheckpointPrompt] = useState(questionModel.prompt || '<p></p>');
  const [answerType, setAnswerType] = useState(questionModel.answerType);
  const [choices, setChoices] = useState<StructuredLessonQuestionChoice[]>(
    questionModel.choices.length
      ? questionModel.choices
      : [
          { id: 'choice-1', html: '<p>Option 1</p>' },
          { id: 'choice-2', html: '<p>Option 2</p>' },
        ],
  );
  const [correctAnswers, setCorrectAnswers] = useState<string[]>(questionModel.correctAnswers);
  const [explanation, setExplanation] = useState(questionModel.explanation);
  const [points, setPoints] = useState(questionModel.points ? String(questionModel.points) : '0');

  const [imageValue, setImageValue] = useState<LessonMediaBlockModel>(mediaModel);
  const [fileValue, setFileValue] = useState<LessonFileBlockModel>(fileModel);
  const [videoUrl, setVideoUrl] = useState(getBlockUrlValue(normalizedBlock.content));
  const [uploading, setUploading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const subjectKey = normalizeLibrarySubjectKey(classItem?.subjectCode, classItem?.subjectName);
  const gradeLevel = normalizeLibraryGradeLevel(classItem?.subjectGradeLevel ?? classItem?.section?.gradeLevel);

  const ensureClassLinked = async (file: UploadedFile) => {
    if (classId && file.scope === 'private' && file.classId !== classId) {
      const response = await fileService.update(file.id, { classId });
      return response.data;
    }
    return file;
  };

  const applySelectedLibraryFile = async (file: UploadedFile) => {
    if (normalizedBlock.type === 'image' && !isImageFile(file)) {
      toast.error('Choose an image file for this block.');
      return;
    }
    if (normalizedBlock.type === 'file' && !isSupportingFile(file)) {
      toast.error('Choose a PDF, TXT, or PPTX file for this block.');
      return;
    }

    try {
      const linked = await ensureClassLinked(file);
      if (normalizedBlock.type === 'image') {
        setImageValue(fileToImageModel(linked, imageValue));
      } else {
        setFileValue(fileToAttachmentModel(linked));
      }
      toast.success('Library file attached to this lesson block');
    } catch {
      toast.error('Unable to attach the selected library file.');
    }
  };

  const uploadManualFile = async (file: File) => {
    if (!classId) {
      toast.error('Class context is required before uploading a lesson file.');
      return;
    }
    if (normalizedBlock.type === 'image' && !isImageFile(file)) {
      toast.error('Upload a JPG, PNG, or WEBP image.');
      return;
    }
    if (normalizedBlock.type === 'file' && !isSupportingFile(file)) {
      toast.error('Upload a PDF, TXT, or PPTX file.');
      return;
    }

    try {
      setUploading(true);
      const response = await fileService.upload(file, {
        classId,
        scope: 'private',
        aiEnabled: false,
      });
      if (normalizedBlock.type === 'image') {
        setImageValue(fileToImageModel(response.data, imageValue));
      } else {
        setFileValue(fileToAttachmentModel(response.data));
      }
      toast.success('File uploaded and attached');
    } catch {
      toast.error('Upload failed. Check the file type and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) void uploadManualFile(file);
  };

  const toggleCorrectAnswer = (choiceId: string) => {
    if (answerType === 'single_select') {
      setCorrectAnswers([choiceId]);
      return;
    }
    setCorrectAnswers((current) =>
      current.includes(choiceId)
        ? current.filter((id) => id !== choiceId)
        : [...current, choiceId],
    );
  };

  const updateChoice = (id: string, html: string) => {
    setChoices((current) => current.map((choice) => (choice.id === id ? { ...choice, html } : choice)));
  };

  const removeChoice = (id: string) => {
    setChoices((current) => current.filter((choice) => choice.id !== id));
    setCorrectAnswers((current) => current.filter((choiceId) => choiceId !== id));
  };

  const saveTextBlock = () => {
    const metadata = { ...(normalizedBlock.metadata ?? {}), variant };
    if (variant === 'objectives' || variant === 'key_points') {
      onSave({
        content: {
          heading,
          items: items.filter((item) => stripHtml(item.html).length > 0),
        },
        metadata,
      });
      return;
    }

    if (variant === 'example') {
      onSave({
        content: {
          heading,
          scenarioHtml,
          steps: steps.filter((step) => stripHtml(step.html).length > 0),
          answerHtml,
        },
        metadata,
      });
      return;
    }

    if (variant === 'recap') {
      onSave({ content: { heading, takeawayHtml }, metadata });
      return;
    }

    if (variant === 'reflection') {
      onSave({ content: { heading, promptHtml }, metadata });
      return;
    }

    onSave({ content: { heading, html: bodyHtml }, metadata });
  };

  const handleSave = () => {
    if (normalizedBlock.type === 'text') {
      saveTextBlock();
      return;
    }

    if (normalizedBlock.type === 'question') {
      const cleanChoices = choices.filter((choice) => stripHtml(choice.html).length > 0);
      if (cleanChoices.length < 2) {
        toast.error('Checkpoint needs at least two choices.');
        return;
      }
      const validCorrectAnswers = correctAnswers.filter((id) =>
        cleanChoices.some((choice) => choice.id === id),
      );
      if (validCorrectAnswers.length === 0) {
        toast.error('Mark at least one correct answer so students can complete the checkpoint.');
        return;
      }

      onSave({
        content: {
          prompt: checkpointPrompt,
          answerType,
          choices: cleanChoices,
        },
        metadata: {
          ...(normalizedBlock.metadata ?? {}),
          correctAnswers: validCorrectAnswers,
          explanation,
          points: Number.isFinite(Number(points)) ? Number(points) : 0,
        },
      });
      return;
    }

    if (normalizedBlock.type === 'image') {
      if (!imageValue.fileId && !imageValue.legacyUrl) {
        toast.error('Attach or upload an image before saving.');
        return;
      }
      onSave({
        content: {
          fileId: imageValue.fileId,
          fileName: imageValue.fileName,
          mimeType: imageValue.mimeType,
          sizeBytes: imageValue.sizeBytes,
          caption: imageValue.caption ?? '',
          displayScale: imageValue.displayScale ?? 100,
          legacyUrl: imageValue.fileId ? undefined : imageValue.legacyUrl,
        },
        metadata: normalizedBlock.metadata,
      });
      return;
    }

    if (normalizedBlock.type === 'file') {
      if (!fileValue.fileId && !fileValue.legacyUrl) {
        toast.error('Attach or upload a file before saving.');
        return;
      }
      onSave({
        content: {
          fileId: fileValue.fileId,
          fileName: fileValue.fileName,
          mimeType: fileValue.mimeType,
          sizeBytes: fileValue.sizeBytes,
          legacyUrl: fileValue.fileId ? undefined : fileValue.legacyUrl,
        },
        metadata: normalizedBlock.metadata,
      });
      return;
    }

    if (normalizedBlock.type === 'video') {
      if (videoUrl.trim() && !getYouTubeEmbedUrl(videoUrl)) {
        toast.error('Use a valid YouTube or youtu.be URL for this video block.');
        return;
      }
      onSave({ content: { url: videoUrl.trim() }, metadata: normalizedBlock.metadata });
      return;
    }

    onSave({ content: normalizedBlock.content, metadata: normalizedBlock.metadata });
  };

  const pickerDescription = normalizedBlock.type === 'image'
    ? 'Choose a class-ready image from General Modules or My Library. Private images are linked to this class before students see them.'
    : 'Choose a worksheet, document, or deck from General Modules or My Library. Private files are linked to this class before students download them.';

  return (
    <div className="space-y-4">
      {normalizedBlock.type === 'text' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor={`heading-${block.id}`}>Section heading</Label>
              <Input
                id={`heading-${block.id}`}
                value={heading}
                onChange={(event) => setHeading(event.target.value)}
                placeholder="Optional short heading"
                className="teacher-input h-12 rounded-2xl"
              />
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs leading-5 text-emerald-800">
              {variant === 'objectives'
                ? 'Use one focused objective per bullet so students can check progress as they read.'
                : variant === 'key_points'
                  ? 'Keep each key point short. The reader turns these into emphasized cards.'
                  : variant === 'example'
                    ? 'Split the example into a setup, steps, and answer instead of a plain paragraph.'
                    : variant === 'reflection'
                      ? 'Ask one private thinking prompt. Student responses stay local in their browser.'
                      : variant === 'recap'
                        ? 'Close with one memorable takeaway before the next activity.'
                        : 'Use body paragraphs for normal explanation and teaching notes.'}
            </div>
          </div>

          {variant === 'objectives' || variant === 'key_points' ? (
            <TextListEditor
              label={variant === 'objectives' ? 'Objective bullets' : 'Key point bullets'}
              items={items}
              onChange={setItems}
              placeholder={variant === 'objectives' ? 'Learners will be able to...' : 'Important idea to remember...'}
            />
          ) : null}

          {variant === 'example' ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Scenario or problem</Label>
                <RichTextEditor
                  value={scenarioHtml}
                  onChange={setScenarioHtml}
                  minHeight={120}
                  placeholder="Set up the worked example..."
                />
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Label>Solution steps</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="teacher-button-outline rounded-xl font-black"
                    onClick={() => setSteps([...steps, { id: makeClientId('step'), title: `Step ${steps.length + 1}`, html: '<p></p>' }])}
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add step
                  </Button>
                </div>
                {steps.map((step, index) => (
                  <div key={step.id} className="rounded-2xl border border-[var(--teacher-outline)] bg-white/85 p-3">
                    <div className="mb-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto]">
                      <Input
                        value={step.title}
                        onChange={(event) =>
                          setSteps(steps.map((entry) => (entry.id === step.id ? { ...entry, title: event.target.value } : entry)))
                        }
                        placeholder={`Step ${index + 1}`}
                        className="teacher-input h-10 rounded-xl"
                      />
                      <div className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" disabled={index === 0} onClick={() => setSteps(moveItem(steps, index, index - 1))}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl" disabled={index === steps.length - 1} onClick={() => setSteps(moveItem(steps, index, index + 1))}>
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-xl text-rose-600" disabled={steps.length === 1} onClick={() => setSteps(steps.filter((entry) => entry.id !== step.id))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                    <RichTextEditor
                      value={step.html}
                      onChange={(html) => setSteps(steps.map((entry) => (entry.id === step.id ? { ...entry, html } : entry)))}
                      minHeight={96}
                      placeholder="Explain this step..."
                    />
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                <Label>Answer or reasoning</Label>
                <RichTextEditor
                  value={answerHtml}
                  onChange={setAnswerHtml}
                  minHeight={120}
                  placeholder="Explain the answer and why it works..."
                />
              </div>
            </div>
          ) : null}

          {variant === 'recap' ? (
            <div className="space-y-2">
              <Label>Core takeaway</Label>
              <RichTextEditor
                value={takeawayHtml}
                onChange={setTakeawayHtml}
                minHeight={150}
                placeholder="What should students remember after this lesson?"
              />
            </div>
          ) : null}

          {variant === 'reflection' ? (
            <div className="space-y-2">
              <Label>Reflection prompt</Label>
              <RichTextEditor
                value={promptHtml}
                onChange={setPromptHtml}
                minHeight={150}
                placeholder="Ask students to connect this idea to what they already know..."
              />
            </div>
          ) : null}

          {variant === 'body' ? (
            <div className="space-y-2">
              <Label>Body content</Label>
              <RichTextEditor
                value={bodyHtml}
                onChange={setBodyHtml}
                minHeight={220}
                placeholder="Write lesson content..."
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {normalizedBlock.type === 'question' ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-800">
            Checkpoints are local completion guards only. Student answers are not persisted and are not sent to AI.
          </div>
          <div className="space-y-2">
            <Label>Checkpoint prompt</Label>
            <RichTextEditor
              value={checkpointPrompt}
              onChange={setCheckpointPrompt}
              minHeight={120}
              placeholder="Ask a quick concept check..."
            />
          </div>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_170px]">
            <div className="space-y-2">
              <Label>Answer mode</Label>
              <div className="grid grid-cols-2 gap-2">
                {(['single_select', 'multi_select'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => {
                      setAnswerType(mode);
                      if (mode === 'single_select' && correctAnswers.length > 1) {
                        setCorrectAnswers(correctAnswers.slice(0, 1));
                      }
                    }}
                    className={`rounded-2xl border px-4 py-3 text-left text-sm font-black transition ${
                      answerType === mode
                        ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                        : 'border-[var(--teacher-outline)] bg-white text-[var(--teacher-text-strong)] hover:bg-slate-50'
                    }`}
                  >
                    {mode === 'single_select' ? 'Single select' : 'Multi-select'}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`points-${block.id}`}>Points label</Label>
              <Input
                id={`points-${block.id}`}
                type="number"
                min="0"
                step="1"
                value={points}
                onChange={(event) => setPoints(event.target.value)}
                className="teacher-input h-12 rounded-2xl"
              />
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Label>Choices</Label>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="teacher-button-outline rounded-xl font-black"
                onClick={() => setChoices([...choices, { id: makeClientId('choice'), html: '<p>New option</p>' }])}
              >
                <Plus className="h-3.5 w-3.5" />
                Add choice
              </Button>
            </div>
            {choices.map((choice, index) => {
              const isCorrect = correctAnswers.includes(choice.id);
              return (
                <div key={choice.id} className="rounded-2xl border border-[var(--teacher-outline)] bg-white/85 p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => toggleCorrectAnswer(choice.id)}
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-black ${
                        isCorrect
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-slate-50 text-slate-500'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {isCorrect ? 'Correct answer' : 'Mark correct'}
                    </button>
                    <div className="flex gap-1">
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl" disabled={index === 0} onClick={() => setChoices(moveItem(choices, index, index - 1))}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl" disabled={index === choices.length - 1} onClick={() => setChoices(moveItem(choices, index, index + 1))}>
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                      <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-xl text-rose-600" disabled={choices.length <= 2} onClick={() => removeChoice(choice.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <RichTextEditor
                    value={choice.html}
                    onChange={(html) => updateChoice(choice.id, html)}
                    minHeight={82}
                    placeholder={`Option ${index + 1}`}
                  />
                </div>
              );
            })}
          </div>
          <div className="space-y-2">
            <Label>Feedback after attempt</Label>
            <RichTextEditor
              value={explanation}
              onChange={setExplanation}
              minHeight={130}
              placeholder="Give a hint or explain why the correct answer works..."
            />
          </div>
        </div>
      ) : null}

      {normalizedBlock.type === 'image' || normalizedBlock.type === 'file' ? (
        <div
          className="space-y-4 rounded-[1.4rem] border border-dashed border-[var(--teacher-outline)] bg-white/80 p-4"
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleFileDrop}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-black text-[var(--teacher-text-strong)]">
                {normalizedBlock.type === 'image' ? 'Secure lesson image' : 'Secure supporting file'}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--teacher-text-muted)]">
                Drag a file here, upload manually, or select from Nexora Library.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="teacher-button-outline rounded-xl font-black"
              onClick={() => setPickerOpen(true)}
            >
              <Link2 className="h-4 w-4" />
              Nexora Library
            </Button>
          </div>

          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-center transition hover:border-emerald-300 hover:bg-emerald-50/50">
            <UploadCloud className="mb-2 h-7 w-7 text-emerald-700" />
            <span className="text-sm font-black text-slate-800">
              {uploading ? 'Uploading...' : 'Drop file or browse'}
            </span>
            <span className="mt-1 text-xs text-slate-500">
              {normalizedBlock.type === 'image' ? 'JPG, PNG, or WEBP' : 'PDF, TXT, or PPTX'}
            </span>
            <input
              type="file"
              className="sr-only"
              disabled={uploading}
              accept={normalizedBlock.type === 'image' ? '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp' : '.pdf,.txt,.pptx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.presentationml.presentation'}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (file) void uploadManualFile(file);
              }}
            />
          </label>

          {normalizedBlock.type === 'image' ? (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                {imageValue.fileId ? (
                  <FileObjectPreview
                    fileId={imageValue.fileId}
                    alt={imageValue.caption || imageValue.fileName || 'Lesson image'}
                    className="max-h-[360px] w-full rounded-2xl object-contain"
                  />
                ) : imageValue.legacyUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageValue.legacyUrl} alt={imageValue.caption || 'Legacy lesson image'} className="max-h-[360px] w-full rounded-2xl object-contain" />
                ) : (
                  <div className="flex min-h-40 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm font-semibold text-slate-500">
                    No image selected
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Caption</Label>
                  <Input
                    value={imageValue.caption ?? ''}
                    onChange={(event) => setImageValue({ ...imageValue, caption: event.target.value })}
                    placeholder="Short caption or alt context"
                    className="teacher-input h-11 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Display width</Label>
                  <input
                    type="range"
                    min={50}
                    max={100}
                    value={imageValue.displayScale ?? 100}
                    onChange={(event) => setImageValue({ ...imageValue, displayScale: Number(event.target.value) })}
                    className="w-full accent-emerald-700"
                  />
                  <p className="text-xs font-semibold text-[var(--teacher-text-muted)]">
                    {imageValue.displayScale ?? 100}% of reader width
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                  <p className="font-black text-slate-800">{imageValue.fileName || 'No image file'}</p>
                  <p>{imageValue.mimeType || 'Image type unavailable'}</p>
                  <p>{formatFileSize(imageValue.sizeBytes)}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">{fileValue.fileName || 'No file selected'}</p>
                  <p className="text-xs text-slate-500">
                    {[fileValue.mimeType || 'File type unavailable', formatFileSize(fileValue.sizeBytes)].join(' - ')}
                  </p>
                </div>
              </div>
            </div>
          )}

          <LibraryFilePickerDialog
            open={pickerOpen}
            onOpenChange={setPickerOpen}
            onSelect={(file) => {
              void applySelectedLibraryFile(file);
            }}
            subjectKey={subjectKey}
            gradeLevel={gradeLevel}
            allowedKinds={normalizedBlock.type === 'image' ? IMAGE_KINDS : SUPPORTING_FILE_KINDS}
            title={normalizedBlock.type === 'image' ? 'Choose Lesson Image' : 'Choose Lesson File'}
            description={pickerDescription}
          />
        </div>
      ) : null}

      {normalizedBlock.type === 'video' ? (
        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor={`video-${block.id}`}>YouTube URL</Label>
            <Input
              id={`video-${block.id}`}
              value={videoUrl}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="teacher-input h-12 rounded-2xl"
            />
          </div>
          {getYouTubeEmbedUrl(videoUrl) ? (
            <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
              <iframe
                src={getYouTubeEmbedUrl(videoUrl)}
                className="h-full w-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                title="Video preview"
              />
            </div>
          ) : (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-800">
              Paste a YouTube or youtu.be link to preview the embed before saving.
            </div>
          )}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={handleSave} className="teacher-button-solid rounded-xl font-black">
          Save
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="teacher-button-outline rounded-xl font-black">
          Cancel
        </Button>
      </div>
    </div>
  );
}

export function LessonBlockTeacherPreview({ block }: { block: ContentBlock }) {
  const normalizedBlock = normalizeStructuredLessonBlock(block);
  const heading = getStructuredLessonBlockHeading(normalizedBlock);
  const baseClass = 'rounded-2xl border border-white/60 bg-white/70 px-4 py-4 text-sm text-slate-700';

  if (normalizedBlock.type === 'text') {
    const variant = getStructuredLessonTextVariant(normalizedBlock);
    const content = getStructuredLessonTextContent(normalizedBlock);
    if (variant === 'objectives' || variant === 'key_points') {
      return (
        <div className={`${baseClass} space-y-3`}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{heading || (variant === 'objectives' ? 'Learning objectives' : 'Key points')}</p>
          <div className="grid gap-2">
            {(content.items ?? []).map((item, index) => (
              <div key={item.id} className="flex gap-2 rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-black text-emerald-700">{index + 1}</span>
                <RichTextRenderer html={normalizeRichValue(item.html)} />
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (variant === 'example') {
      return (
        <div className={`${baseClass} space-y-3`}>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">{heading || 'Worked example'}</p>
          {content.scenarioHtml ? <RichTextRenderer html={normalizeRichValue(content.scenarioHtml)} /> : null}
          <div className="grid gap-2">
            {(content.steps ?? []).map((step, index) => (
              <div key={step.id} className="rounded-xl border border-slate-200/70 bg-white/80 px-3 py-2">
                <p className="mb-1 text-xs font-black text-slate-800">{step.title || `Step ${index + 1}`}</p>
                <RichTextRenderer html={normalizeRichValue(step.html)} />
              </div>
            ))}
          </div>
          {content.answerHtml ? <RichTextRenderer html={normalizeRichValue(content.answerHtml)} /> : null}
        </div>
      );
    }

    const html = getStructuredLessonBlockHtml(normalizedBlock);
    return (
      <div className={baseClass}>
        {heading ? <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{heading}</p> : null}
        {html.trim() ? <RichTextRenderer html={normalizeRichValue(html)} /> : 'Empty text block'}
      </div>
    );
  }

  if (normalizedBlock.type === 'question') {
    const question = getStructuredLessonQuestionModel(normalizedBlock);
    return (
      <div className={`${baseClass} space-y-3`}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Checkpoint</p>
          <RichTextRenderer className="mt-2 text-sm font-semibold text-slate-900" html={normalizeRichValue(question.prompt || '<p>Empty checkpoint prompt</p>')} />
        </div>
        <div className="space-y-2">
          {question.choices.map((choice) => {
            const selectedCorrect = evaluateCheckpointAnswer(question, [choice.id]);
            const isMarkedCorrect = question.correctAnswers.includes(choice.id);
            return (
              <div
                key={choice.id}
                className={`rounded-xl border px-3 py-2 ${
                  isMarkedCorrect || selectedCorrect
                    ? 'border-emerald-200 bg-emerald-50/80'
                    : 'border-slate-200/70 bg-white/75'
                }`}
              >
                <RichTextRenderer html={normalizeRichValue(choice.html)} />
              </div>
            );
          })}
        </div>
        {question.explanation ? (
          <div className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-3">
            <RichTextRenderer html={normalizeRichValue(question.explanation)} />
          </div>
        ) : null}
        <p className="text-xs font-semibold text-slate-500">{question.points} point{question.points === 1 ? '' : 's'} - {question.answerType === 'multi_select' ? 'Multi-select' : 'Single select'}</p>
      </div>
    );
  }

  if (normalizedBlock.type === 'image') {
    const image = getLessonMediaBlockModel(normalizedBlock);
    return (
      <figure className={`${baseClass} space-y-3`}>
        {image.fileId ? (
          <div style={{ maxWidth: `${image.displayScale ?? 100}%` }} className="mx-auto">
            <FileObjectPreview fileId={image.fileId} alt={image.caption || image.fileName || 'Lesson image'} />
          </div>
        ) : image.legacyUrl ? (
          <p className="font-semibold text-slate-600">Legacy image URL: {image.legacyUrl}</p>
        ) : (
          <p>No image selected</p>
        )}
        {image.caption ? <figcaption className="text-center text-xs font-semibold text-slate-500">{image.caption}</figcaption> : null}
      </figure>
    );
  }

  if (normalizedBlock.type === 'video') {
    const embedUrl = getYouTubeEmbedUrl(getBlockUrlValue(normalizedBlock.content));
    return embedUrl ? (
      <div className="aspect-video overflow-hidden rounded-2xl border border-slate-200 bg-slate-950">
        <iframe
          src={embedUrl}
          className="h-full w-full"
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          title="Video preview"
        />
      </div>
    ) : (
      <p className={baseClass}>No valid YouTube URL yet</p>
    );
  }

  if (normalizedBlock.type === 'file') {
    const file = getLessonFileBlockModel(normalizedBlock);
    return (
      <div className={`${baseClass} flex items-center gap-3`}>
        <span className="rounded-2xl bg-white p-3 text-slate-700 shadow-sm">
          <FileText className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-black text-slate-900">{file.fileName || 'No file selected'}</p>
          <p className="text-xs text-slate-500">{file.mimeType || 'File'} - {formatFileSize(file.sizeBytes)}</p>
        </div>
      </div>
    );
  }

  if (normalizedBlock.type === 'divider') {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--teacher-outline)] bg-white/60 px-4 py-4">
        <hr className="border-[var(--teacher-outline)]" />
      </div>
    );
  }

  return <p className={baseClass}>Unknown block type</p>;
}
