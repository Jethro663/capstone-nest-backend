'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  KeyRound,
  Lightbulb,
  MessageSquareText,
  RefreshCcw,
  Target,
  Video,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { fileService } from '@/services/file-service';
import { normalizeRichText } from '@/lib/rich-text';
import type { ContentBlock } from '@/types/lesson';
import {
  evaluateCheckpointAnswer,
  getBlockUrlValue,
  getLessonFileBlockModel,
  getLessonMediaBlockModel,
  getStructuredLessonBlockHeading,
  getStructuredLessonQuestionModel,
  getStructuredLessonTextContent,
  getStructuredLessonTextVariant,
  getYouTubeEmbedUrl,
  isGradableCheckpoint,
  normalizeStructuredLessonBlock,
} from './structured-content';
import { useLibraryFileObjectUrl } from './use-library-file-object-url';

export type LessonCheckpointSelections = Record<string, string[]>;
export type LessonCheckpointResults = Record<string, boolean>;

function normalizeRichValue(value?: string | null) {
  return normalizeRichText(value || '').trim();
}

function formatFileSize(size?: number) {
  if (!size) return 'Size unavailable';
  if (size >= 1_048_576) return `${(size / 1_048_576).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
}

function stripHtml(value: string) {
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function SecureLessonImage({
  fileId,
  fallbackUrl,
  alt,
  displayScale = 100,
}: {
  fileId?: string;
  fallbackUrl?: string;
  alt: string;
  displayScale?: number;
}) {
  const { objectUrl, loading, failed } = useLibraryFileObjectUrl(fileId);

  if (fileId && loading) {
    return (
      <div className="flex min-h-56 items-center justify-center rounded-[1.35rem] border border-dashed border-[#dfd4ca] bg-[#fff8f1] text-sm font-semibold text-[#75645d]">
        Loading secure image...
      </div>
    );
  }

  if (fileId && failed) {
    return (
      <div className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-6 text-sm font-semibold text-amber-800">
        This image could not be loaded. Ask your teacher to reattach it from Nexora Library.
      </div>
    );
  }

  const src = objectUrl || fallbackUrl;
  if (!src) {
    return (
      <div className="rounded-[1.35rem] border border-dashed border-[#dfd4ca] bg-[#fff8f1] px-4 py-6 text-sm font-semibold text-[#75645d]">
        Image not attached yet.
      </div>
    );
  }

  return (
    <div className="mx-auto" style={{ maxWidth: `${displayScale}%` }}>
      {/* Authenticated files render through blob URLs, not raw backend file URLs. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-h-[520px] w-full rounded-[1.35rem] border border-[#e1d7ce] bg-[#fbf5ee] object-contain"
        loading="lazy"
      />
    </div>
  );
}

function ObjectiveList({ blockId, items }: { blockId: string; items: Array<{ id: string; html: string }> }) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  return (
    <div className="grid gap-2">
      {items.map((item, index) => {
        const itemId = `${blockId}-${item.id}`;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => setChecked((current) => ({ ...current, [itemId]: !current[itemId] }))}
            className={`flex gap-3 rounded-[1rem] border px-3 py-3 text-left transition ${
              checked[itemId]
                ? 'border-emerald-200 bg-emerald-50/80'
                : 'border-[#e3d8cf] bg-white/85 hover:border-[#d3c3b8]'
            }`}
          >
            <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-black ${
              checked[itemId] ? 'bg-emerald-600 text-white' : 'bg-[#f5eee7] text-[#8a655e]'
            }`}>
              {checked[itemId] ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
            </span>
            <span className="min-w-0 text-sm leading-6 text-[#2a2322]">
              <RichTextRenderer html={normalizeRichValue(item.html)} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ReflectionPrompt({ promptHtml }: { promptHtml: string }) {
  const [response, setResponse] = useState('');
  const [showGuide, setShowGuide] = useState(false);

  return (
    <div className="space-y-3">
      <RichTextRenderer html={normalizeRichValue(promptHtml)} />
      <textarea
        value={response}
        onChange={(event) => setResponse(event.target.value)}
        placeholder="Write a private reflection here. It stays on this device."
        className="min-h-28 w-full rounded-[1rem] border border-[#dfd4ca] bg-white/85 px-3 py-3 text-sm text-[#2a2322] outline-none transition focus:border-[#cf2027]"
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-semibold text-[#7b6d69]">Local only. This is not submitted or sent to AI.</p>
        <button
          type="button"
          onClick={() => setShowGuide((current) => !current)}
          className="rounded-full border border-[#d8cec4] bg-white px-3 py-1.5 text-xs font-bold text-[#5f4f4b]"
        >
          {showGuide ? 'Hide guide' : 'Need a guide?'}
        </button>
      </div>
      {showGuide ? (
        <div className="rounded-[1rem] border border-[#e7d4bd] bg-[#fff7ed] px-3 py-3 text-xs leading-5 text-[#875016]">
          Try starting with: “I noticed...”, “This reminds me of...”, or “One question I still have is...”.
        </div>
      ) : null}
    </div>
  );
}

function LessonCheckpoint({
  block,
  selections,
  results,
  onAnswer,
}: {
  block: ContentBlock;
  selections: LessonCheckpointSelections;
  results: LessonCheckpointResults;
  onAnswer?: (blockId: string, selectedChoiceIds: string[], isCorrect: boolean) => void;
}) {
  const model = getStructuredLessonQuestionModel(block);
  const selectedIds = selections[block.id] ?? [];
  const hasAttempted = Object.prototype.hasOwnProperty.call(results, block.id);
  const isCorrect = results[block.id] === true;
  const isConfigured = isGradableCheckpoint(block);

  const selectChoice = (choiceId: string) => {
    if (!isConfigured) return;
    const nextSelection = model.answerType === 'single_select'
      ? [choiceId]
      : selectedIds.includes(choiceId)
        ? selectedIds.filter((id) => id !== choiceId)
        : [...selectedIds, choiceId];
    onAnswer?.(block.id, nextSelection, evaluateCheckpointAnswer(model, nextSelection));
  };

  return (
    <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#f0b7a7] bg-[#fff0ea] p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#b13b26]">
          <KeyRound className="h-3.5 w-3.5" />
          Checkpoint
        </span>
        {model.points > 0 ? <span className="text-xs font-black text-[#9b4a38]">{model.points} pts</span> : null}
      </div>

      <RichTextRenderer
        className="text-base font-bold leading-7 text-[#211b1b]"
        html={normalizeRichValue(model.prompt || '<p>Answer the checkpoint.</p>')}
      />

      {!isConfigured ? (
        <div className="mt-3 flex gap-2 rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-3 text-xs font-semibold leading-5 text-amber-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          This checkpoint has no correct answer configured yet, so it will not block lesson completion.
        </div>
      ) : null}

      <div className="mt-3 grid gap-2">
        {model.choices.map((choice) => {
          const selected = selectedIds.includes(choice.id);
          const showCorrect = hasAttempted && isCorrect && selected;
          const showWrong = hasAttempted && !isCorrect && selected;
          return (
            <button
              key={choice.id}
              type="button"
              disabled={!isConfigured}
              onClick={() => selectChoice(choice.id)}
              className={`flex items-start gap-3 rounded-[1rem] border px-3 py-3 text-left transition ${
                showCorrect
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                  : showWrong
                    ? 'border-rose-300 bg-rose-50 text-rose-950'
                    : selected
                      ? 'border-[#cf2027] bg-white text-[#211b1b]'
                      : 'border-[#f0c7bd] bg-white/75 text-[#211b1b] hover:border-[#e09886]'
              } disabled:cursor-not-allowed disabled:opacity-80`}
            >
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-black ${
                showCorrect
                  ? 'border-emerald-500 bg-emerald-600 text-white'
                  : showWrong
                    ? 'border-rose-500 bg-rose-600 text-white'
                    : selected
                      ? 'border-[#cf2027] bg-[#cf2027] text-white'
                      : 'border-[#e4c4bb] bg-white text-[#9b4a38]'
              }`}>
                {showCorrect ? <CheckCircle2 className="h-4 w-4" /> : showWrong ? <XCircle className="h-4 w-4" /> : null}
              </span>
              <span className="min-w-0 text-sm leading-6">
                <RichTextRenderer html={normalizeRichValue(choice.html)} />
              </span>
            </button>
          );
        })}
      </div>

      {hasAttempted && isConfigured ? (
        <div className={`mt-3 rounded-[1rem] border px-3 py-3 text-sm font-semibold ${
          isCorrect
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-rose-200 bg-rose-50 text-rose-800'
        }`}>
          {isCorrect ? 'Correct. The completion timer can count this checkpoint.' : 'Not yet. Try another answer before the lesson timer can start.'}
          {model.explanation ? (
            <div className="mt-2 text-sm font-normal leading-6">
              <RichTextRenderer html={normalizeRichValue(model.explanation)} />
            </div>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function LessonBlockStudentRenderer({
  block,
  checkpointSelections = {},
  checkpointResults = {},
  onCheckpointAnswer,
}: {
  block: ContentBlock;
  checkpointSelections?: LessonCheckpointSelections;
  checkpointResults?: LessonCheckpointResults;
  onCheckpointAnswer?: (blockId: string, selectedChoiceIds: string[], isCorrect: boolean) => void;
}) {
  const normalizedBlock = normalizeStructuredLessonBlock(block);
  const heading = getStructuredLessonBlockHeading(normalizedBlock);

  if (normalizedBlock.type === 'text') {
    const variant = getStructuredLessonTextVariant(normalizedBlock);
    const content = getStructuredLessonTextContent(normalizedBlock);

    if (variant === 'objectives') {
      return (
        <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#d9e5d5] bg-[#f3fbf1] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#30783e]">
            <Target className="h-4 w-4" />
            {heading || 'Learning objectives'}
          </div>
          <ObjectiveList blockId={block.id} items={content.items ?? []} />
        </article>
      );
    }

    if (variant === 'key_points') {
      return (
        <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#e1d4c1] bg-[#fff8ee] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#9b5d12]">
            <Lightbulb className="h-4 w-4" />
            {heading || 'Key points'}
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {(content.items ?? []).map((item, index) => (
              <div key={item.id} className="rounded-[1rem] border border-[#ead9bf] bg-white/80 px-3 py-3">
                <p className="mb-2 text-[11px] font-black uppercase tracking-[0.1em] text-[#9b5d12]">Point {index + 1}</p>
                <RichTextRenderer className="text-sm leading-6 text-[#2a2322]" html={normalizeRichValue(item.html)} />
              </div>
            ))}
          </div>
        </article>
      );
    }

    if (variant === 'example') {
      return (
        <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#d7dce6] bg-[#f6f8fb] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#475569]">
            <Lightbulb className="h-4 w-4" />
            {heading || 'Worked example'}
          </div>
          {content.scenarioHtml ? (
            <div className="rounded-[1rem] border border-[#dfe5ed] bg-white/85 px-3 py-3 text-sm leading-6 text-[#2a2322]">
              <RichTextRenderer html={normalizeRichValue(content.scenarioHtml)} />
            </div>
          ) : null}
          <div className="mt-3 grid gap-2">
            {(content.steps ?? []).map((step, index) => (
              <div key={step.id} className="grid gap-3 rounded-[1rem] border border-[#dfe5ed] bg-white/85 px-3 py-3 md:grid-cols-[110px_minmax(0,1fr)]">
                <div className="text-xs font-black uppercase tracking-[0.1em] text-[#5f6d7e]">
                  {step.title || `Step ${index + 1}`}
                </div>
                <RichTextRenderer className="text-sm leading-6 text-[#2a2322]" html={normalizeRichValue(step.html)} />
              </div>
            ))}
          </div>
          {content.answerHtml ? (
            <div className="mt-3 rounded-[1rem] border border-[#c8ddce] bg-[#f1fbf3] px-3 py-3 text-sm leading-6 text-[#254b2e]">
              <p className="mb-1 text-xs font-black uppercase tracking-[0.1em] text-[#30783e]">Why it works</p>
              <RichTextRenderer html={normalizeRichValue(content.answerHtml)} />
            </div>
          ) : null}
        </article>
      );
    }

    if (variant === 'recap') {
      return (
        <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dfd4ca] bg-[#fffdfa] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#7b4d46]">
            <RefreshCcw className="h-4 w-4" />
            {heading || 'Recap'}
          </div>
          <div className="rounded-[1rem] border border-[#e5d9ce] bg-[#fbf4ed] px-4 py-4 text-base font-semibold leading-7 text-[#2a2322]">
            <RichTextRenderer html={normalizeRichValue(content.takeawayHtml)} />
          </div>
        </article>
      );
    }

    if (variant === 'reflection') {
      return (
        <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dad4ea] bg-[#f8f6fd] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#64527f]">
            <MessageSquareText className="h-4 w-4" />
            {heading || 'Reflection'}
          </div>
          <ReflectionPrompt promptHtml={content.promptHtml ?? ''} />
        </article>
      );
    }

    return (
      <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dfd4ca] bg-white/85 p-4">
        {heading ? (
          <p className="mb-2 text-xs font-black uppercase tracking-[0.12em] text-[#7b6d69]">{heading}</p>
        ) : null}
        <RichTextRenderer
          className="prose max-w-none leading-relaxed text-[#2a2322] [&_a]:text-[#cf2027]"
          html={normalizeRichValue(content.html)}
        />
      </article>
    );
  }

  if (normalizedBlock.type === 'question') {
    return (
      <LessonCheckpoint
        block={normalizedBlock}
        selections={checkpointSelections}
        results={checkpointResults}
        onAnswer={onCheckpointAnswer}
      />
    );
  }

  if (normalizedBlock.type === 'image') {
    const image = getLessonMediaBlockModel(normalizedBlock);
    return (
      <figure id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dfd4ca] bg-white/85 p-4">
        <SecureLessonImage
          fileId={image.fileId}
          fallbackUrl={image.legacyUrl}
          alt={image.caption || image.fileName || 'Lesson image'}
          displayScale={image.displayScale}
        />
        {image.caption ? (
          <figcaption className="mt-3 text-center text-sm font-semibold text-[#75645d]">{image.caption}</figcaption>
        ) : null}
      </figure>
    );
  }

  if (normalizedBlock.type === 'video') {
    const embedUrl = getYouTubeEmbedUrl(getBlockUrlValue(normalizedBlock.content));
    if (!embedUrl) {
      return (
        <div id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-amber-200 bg-amber-50 px-4 py-4 text-sm font-semibold text-amber-800">
          Video is unavailable. Ask your teacher to check the YouTube link.
        </div>
      );
    }
    return (
      <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dfd4ca] bg-white/85 p-4">
        <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-[#7b4d46]">
          <Video className="h-4 w-4" />
          Watch
        </div>
        <div className="aspect-video overflow-hidden rounded-[1.25rem] border border-[#e1d7ce] bg-slate-950">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            title="Lesson video"
          />
        </div>
      </article>
    );
  }

  if (normalizedBlock.type === 'file') {
    const file = getLessonFileBlockModel(normalizedBlock);
    const downloadFile = async (mode: 'preview' | 'download') => {
      if (!file.fileId) {
        if (file.legacyUrl) {
          window.open(file.legacyUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      }
      try {
        const blob = await fileService.download(file.fileId);
        const url = URL.createObjectURL(blob);
        if (mode === 'preview') {
          window.open(url, '_blank', 'noopener,noreferrer');
          window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          return;
        }
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = file.fileName || 'lesson-file';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        URL.revokeObjectURL(url);
      } catch {
        toast.error('Unable to open this lesson file.');
      }
    };

    return (
      <article id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dfd4ca] bg-white/85 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[#f7eee7] text-[#8a5148]">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-black text-[#211b1b]">{file.fileName || stripHtml(file.legacyUrl || '') || 'Lesson file'}</p>
              <p className="text-xs font-semibold text-[#7b6d69]">{file.mimeType || 'File'} - {formatFileSize(file.sizeBytes)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => void downloadFile('preview')}>
              <Eye className="h-3.5 w-3.5" />
              Preview
            </Button>
            <Button type="button" size="sm" className="student-button-solid rounded-full" onClick={() => void downloadFile('download')}>
              <Download className="h-3.5 w-3.5" />
              Download
            </Button>
          </div>
        </div>
      </article>
    );
  }

  if (normalizedBlock.type === 'divider') {
    return <hr id={`lesson-block-${block.id}`} className="my-6 border-[#ded2c8]" />;
  }

  return (
    <div id={`lesson-block-${block.id}`} className="rounded-[1.35rem] border border-[#dfd4ca] bg-white/85 p-4 text-sm font-semibold text-[#7b6d69]">
      Unsupported content type: {normalizedBlock.type}
    </div>
  );
}
