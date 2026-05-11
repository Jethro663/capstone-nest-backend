'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Layers3,
  NotebookPen,
  PencilLine,
  Shield,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { extractionService } from '@/services/extraction-service';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
} from '@/components/teacher/TeacherPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { LessonBlockTeacherEditor, LessonBlockTeacherPreview } from '@/features/lesson-blocks/LessonBlockTeacherEditor';
import type { ContentBlock } from '@/types/lesson';
import type {
  Extraction,
  ExtractionBlock,
  ExtractionMediaAsset,
  ExtractionSection,
  ExtractionStatus,
} from '@/types/extraction';
import { cn } from '@/utils/cn';
import '../../lessons/[id]/edit/lesson-editor.css';

const STATUS_VARIANT: Record<ExtractionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'secondary',
  completed: 'default',
  applied: 'default',
  failed: 'destructive',
};

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null) {
    const responseMessage = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) return responseMessage;
    const directMessage = (error as { message?: unknown }).message;
    if (typeof directMessage === 'string' && directMessage.trim().length > 0) return directMessage;
  }
  return fallback;
}

function toLessonBlock(
  block: ExtractionBlock,
  sectionIndex: number,
  blockIndex: number,
): ContentBlock {
  return {
    id: `section-${sectionIndex}-block-${blockIndex}`,
    lessonId: `extraction-section-${sectionIndex}`,
    type: block.type,
    order: block.order,
    content: block.content,
    metadata: block.metadata,
  };
}

function isNestedInteractiveTarget(
  event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
) {
  const target = event.target;
  return target instanceof HTMLElement && Boolean(target.closest('button, input, textarea, select, a, [role="button"]'));
}

export default function ExtractionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const extractionId = params.id as string;

  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pollingWarning, setPollingWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSections, setEditSections] = useState<ExtractionSection[]>([]);
  const [hiddenMediaAssets, setHiddenMediaAssets] = useState<ExtractionMediaAsset[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [editingBlockKey, setEditingBlockKey] = useState<string | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingFailuresRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollingFailuresRef.current = 0;
  }, []);

  const hydrate = useCallback((value: Extraction | null) => {
    const structured = value?.structuredContent;
    const sections = structured?.sections ? JSON.parse(JSON.stringify(structured.sections)) as ExtractionSection[] : [];
    const mediaAssets = structured?.mediaAssets ? JSON.parse(JSON.stringify(structured.mediaAssets)) as ExtractionMediaAsset[] : [];
    setEditTitle(structured?.title || '');
    setEditDescription(structured?.description || '');
    setEditSections(sections);
    setHiddenMediaAssets(mediaAssets);
    setSelectedSections(new Set(sections.map((_, index) => index)));
    setEditingBlockKey(null);
    setDirty(false);
  }, []);

  const fetchExtraction = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await extractionService.getById(extractionId);
      setExtraction(response.data);
      hydrate(response.data);
      setPollingWarning(null);
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to load extraction');
      setLoadError(message);
      stopPolling();
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [extractionId, hydrate, stopPolling]);

  useEffect(() => {
    fetchExtraction();
    return () => stopPolling();
  }, [fetchExtraction, stopPolling]);

  useEffect(() => {
    if (!extraction || !['pending', 'processing'].includes(extraction.extractionStatus) || pollRef.current) return;
    pollRef.current = setInterval(async () => {
      try {
        const statusRes = await extractionService.getStatus(extractionId);
        pollingFailuresRef.current = 0;
        setExtraction((prev) =>
          prev
            ? {
                ...prev,
                extractionStatus: statusRes.data.status as ExtractionStatus,
                progressPercent: statusRes.data.progressPercent,
                totalChunks: statusRes.data.totalChunks,
                processedChunks: statusRes.data.processedChunks,
                modelUsed: statusRes.data.modelUsed,
              }
            : prev,
        );
        if (!['pending', 'processing'].includes(statusRes.data.status)) {
          stopPolling();
          const full = await extractionService.getById(extractionId);
          setExtraction(full.data);
          hydrate(full.data);
          if (statusRes.data.status === 'completed') toast.success('Extraction completed');
          if (statusRes.data.status === 'failed') toast.error('Extraction failed');
        }
      } catch (error: unknown) {
        pollingFailuresRef.current += 1;
        if (pollingFailuresRef.current >= 3) {
          stopPolling();
          const warning = getErrorMessage(error, 'Live extraction updates are temporarily unavailable.');
          setPollingWarning(warning);
          toast.error(warning);
        }
      }
    }, 3000);
  }, [extraction, extractionId, hydrate, stopPolling]);

  const isEditable = extraction?.extractionStatus === 'completed';
  const isApplied = extraction?.extractionStatus === 'applied' || Boolean(extraction?.isApplied);
  const canMutate = Boolean(isEditable && !isApplied);

  const visibleSections = useMemo(
    () =>
      editSections.map((section) => ({
        ...section,
        visibleBlocks: section.lessonBlocks
          .map((block, originalIndex) => ({ block, originalIndex }))
          .filter((entry) => entry.block.type !== 'image'),
      })),
    [editSections],
  );

  const sectionCount = visibleSections.length;
  const questionCount = useMemo(
    () =>
      visibleSections.reduce(
        (total, section) => total + (section.assessmentDraft?.questions?.length || 0),
        0,
      ),
    [visibleSections],
  );
  const hiddenMediaCount = hiddenMediaAssets.length;
  const reviewNotes = extraction?.repairNotes || [];
  const coherenceWarnings = extraction?.structuredContent?.audit?.coherenceWarnings || [];
  const requestedSectionCount = extraction?.structuredContent?.audit?.requestedSectionCount;
  const finalSectionCount = extraction?.structuredContent?.audit?.finalSectionCount;
  const sectionCountAdjustmentReason =
    extraction?.structuredContent?.audit?.sectionCountAdjustmentReason || null;
  const hiddenLegacyMediaNotice = hiddenMediaCount > 0
    ? `${hiddenMediaCount} legacy media item${hiddenMediaCount === 1 ? '' : 's'} remain stored but hidden in text-first mode.`
    : null;

  const applyBlockedReason = useMemo(() => {
    if (dirty) return 'Save extraction changes before applying.';
    if (selectedSections.size === 0) return 'Select at least one section to apply.';
    if (extraction?.qualityGate === 'fail') return 'Extraction quality is too low to apply.';
    if (extraction?.reviewRequired) return 'Teacher review is still required before apply.';
    return null;
  }, [dirty, extraction?.qualityGate, extraction?.reviewRequired, selectedSections.size]);

  const summaryItems: Array<{
    key: string;
    label: string;
    value: string;
    caption: string;
    Icon: typeof Shield;
  }> = [
    {
      key: 'status',
      label: 'Status',
      value: extraction?.extractionStatus || 'loading',
      caption: extraction?.modelUsed ? `Model ${extraction.modelUsed}` : 'Model pending',
      Icon: Shield,
    },
    {
      key: 'sections',
      label: 'Sections',
      value: String(sectionCount),
      caption: `${selectedSections.size} selected`,
      Icon: Layers3,
    },
    {
      key: 'questions',
      label: 'Questions',
      value: String(questionCount),
      caption: extraction?.reviewRequired ? 'Review before apply' : 'Ready to apply',
      Icon: NotebookPen,
    },
  ];

  const headerSummary = (
    <div className="flex w-full flex-col gap-3">
      <div
        className="grid min-w-[min(42rem,80vw)] gap-2 sm:grid-cols-3"
        data-testid="extraction-header-summary"
      >
        {summaryItems.map(({ key, label, value, caption, Icon }) => (
          <div
            key={key}
            className="rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-white shadow-[0_12px_24px_-22px_rgba(0,0,0,0.45)]"
          >
            <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
              <Icon className="h-3.5 w-3.5" />
              {label}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[extraction?.extractionStatus || 'pending']}>{value}</Badge>
              <span className="text-xs text-white/70">{caption}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          className="teacher-button-outline rounded-xl border-white/20 bg-white/10 text-[#12284a] hover:bg-white/20 hover:text-white"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canMutate || !dirty || saving}
          className="teacher-button-solid rounded-xl font-black"
        >
          <PencilLine className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
        <Button
          type="button"
          onClick={() => setShowApplyDialog(true)}
          disabled={!canMutate || Boolean(applyBlockedReason)}
          className="teacher-button-solid rounded-xl font-black"
          aria-label="Apply Extraction"
        >
          Apply Extraction
        </Button>
      </div>
    </div>
  );

  async function handleSave() {
    if (!extraction) return;
    try {
      setSaving(true);
      const response = await extractionService.update(extraction.id, {
        title: editTitle,
        description: editDescription,
        sections: editSections,
        mediaAssets: hiddenMediaAssets,
      });
      setExtraction(response.data);
      hydrate(response.data);
      toast.success('Extraction changes saved');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to save extraction changes'));
    } finally {
      setSaving(false);
    }
  }

  async function handleApply() {
    if (!extraction || applyBlockedReason) return;
    try {
      setApplying(true);
      await extractionService.apply(extraction.id, {
        sectionIndices: Array.from(selectedSections).sort((left, right) => left - right),
      });
      toast.success('Extraction applied successfully');
      setShowApplyDialog(false);
      await fetchExtraction();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to apply extraction'));
    } finally {
      setApplying(false);
    }
  }

  function updateSection(sectionIndex: number, patch: Partial<ExtractionSection>) {
    setEditSections((current) =>
      current.map((section, index) =>
        index === sectionIndex ? { ...section, ...patch } : section,
      ),
    );
    setDirty(true);
  }

  function updateBlock(sectionIndex: number, blockIndex: number, patch: Partial<ExtractionBlock>) {
    setEditSections((current) =>
      current.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return {
          ...section,
          lessonBlocks: section.lessonBlocks.map((block, currentBlockIndex) =>
            currentBlockIndex === blockIndex ? { ...block, ...patch } : block,
          ),
        };
      }),
    );
    setDirty(true);
  }

  function moveBlock(sectionIndex: number, blockIndex: number, direction: 'up' | 'down') {
    setEditSections((current) =>
      current.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        const lessonBlocks = section.lessonBlocks.slice();
        const nextIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
        if (nextIndex < 0 || nextIndex >= lessonBlocks.length) return section;
        const [moved] = lessonBlocks.splice(blockIndex, 1);
        lessonBlocks.splice(nextIndex, 0, moved);
        return {
          ...section,
          lessonBlocks: lessonBlocks.map((block, index) => ({ ...block, order: index })),
        };
      }),
    );
    setDirty(true);
  }

  function removeBlock(sectionIndex: number, blockIndex: number) {
    setEditSections((current) =>
      current.map((section, currentSectionIndex) => {
        if (currentSectionIndex !== sectionIndex) return section;
        return {
          ...section,
          lessonBlocks: section.lessonBlocks
            .filter((_, currentBlockIndex) => currentBlockIndex !== blockIndex)
            .map((block, index) => ({ ...block, order: index })),
        };
      }),
    );
    setDirty(true);
    setEditingBlockKey(null);
  }

  if (loading) {
    return (
      <TeacherPageShell
        badge="AI Extraction Review"
        title="Loading Extraction"
        description="Text-first extraction review that follows the teacher lesson editor flow."
      >
        <TeacherSectionCard title="Loading extraction" description="Preparing the extraction workspace.">
          <div className="space-y-3">
            <Skeleton className="h-12 w-full rounded-2xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        </TeacherSectionCard>
      </TeacherPageShell>
    );
  }

  if (loadError || !extraction) {
    return (
      <TeacherPageShell
        badge="AI Extraction Review"
        title="Extraction Workspace"
        description="Text-first extraction review that follows the teacher lesson editor flow."
        actions={(
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="teacher-button-outline rounded-xl text-[#12284a]"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}
      >
        <TeacherEmptyState
          title="Extraction unavailable"
          description={loadError || 'The extraction could not be loaded.'}
          action={(
            <Button type="button" onClick={() => void fetchExtraction()} className="teacher-button-solid rounded-xl font-black">
              Retry
            </Button>
          )}
        />
      </TeacherPageShell>
    );
  }

  return (
    <TeacherPageShell
      badge="AI Extraction Review"
      title="Extraction Workspace"
      description="Text-first extraction review that follows the teacher lesson editor flow."
      actions={headerSummary}
    >
      {pollingWarning ? (
        <TeacherSectionCard title="Live updates paused" description={pollingWarning}>
          <p className="text-sm text-[var(--teacher-text-muted)]">
            The extraction record is still available. Use Refresh or return later to check the latest status.
          </p>
        </TeacherSectionCard>
      ) : null}

      {['pending', 'processing'].includes(extraction.extractionStatus) ? (
        <TeacherSectionCard
          title="Extraction in progress"
          description="This text-first extraction is still building sections and cleanup notes."
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={STATUS_VARIANT[extraction.extractionStatus]}>{extraction.extractionStatus}</Badge>
              <span className="text-sm text-[var(--teacher-text-muted)]">
                {extraction.processedChunks} / {extraction.totalChunks ?? '?'} chunk(s) processed
              </span>
            </div>
            <Progress value={extraction.progressPercent} />
          </div>
        </TeacherSectionCard>
      ) : (
        <div className="space-y-5">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
            <TabsList className="grid h-auto w-fit grid-cols-2 rounded-[1.1rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-1">
              <TabsTrigger
                value="overview"
                className="flex min-h-[50px] min-w-[154px] items-center justify-start gap-2 rounded-[0.9rem] px-4 py-3 text-left text-sm font-black data-[state=active]:bg-white data-[state=active]:text-[var(--teacher-text-strong)] data-[state=active]:shadow-none"
              >
                <Layers3 className="h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="content"
                className="flex min-h-[50px] min-w-[154px] items-center justify-start gap-2 rounded-[0.9rem] px-4 py-3 text-left text-sm font-black data-[state=active]:bg-white data-[state=active]:text-[var(--teacher-text-strong)] data-[state=active]:shadow-none"
              >
                <NotebookPen className="h-4 w-4" />
                Content
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <TeacherSectionCard
                title="Extraction Details"
                description="Review the module title, context, and cleanup notes before moving into the content blocks."
                className="rounded-[1.55rem]"
                contentClassName="p-5 md:p-6"
              >
                <div className="grid gap-5">
                  {extraction.reviewRequired ? (
                    <div className="rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                      Teacher review is still required before apply.
                    </div>
                  ) : null}
                  {extraction.qualityGate === 'fail' ? (
                    <div className="rounded-[1.2rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      Extraction quality is too low to apply. Rerun or revise the text before continuing.
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Title</Label>
                    <Input
                      value={editTitle}
                      onChange={(event) => {
                        setEditTitle(event.target.value);
                        setDirty(true);
                      }}
                      className="teacher-input h-12 rounded-2xl"
                      disabled={!canMutate}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Description</Label>
                    <RichTextEditor
                      value={editDescription}
                      onChange={(value) => {
                        setEditDescription(value);
                        setDirty(true);
                      }}
                      minHeight={240}
                      placeholder="Write the module overview, goals, and the learning context teachers should keep."
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">Quality gate</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--teacher-text-strong)]">{extraction.qualityGate || 'pending'}</p>
                    </div>
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">Coherence</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--teacher-text-strong)]">
                        {typeof extraction.structuredContent?.audit?.coherenceScore === 'number'
                          ? `${Math.round((extraction.structuredContent.audit.coherenceScore || 0) * 100)}%`
                          : '--'}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">Requested sections</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--teacher-text-strong)]">
                        {typeof requestedSectionCount === 'number' ? requestedSectionCount : '--'}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-3">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[var(--teacher-text-muted)]">Final sections</p>
                      <p className="mt-2 text-lg font-semibold text-[var(--teacher-text-strong)]">
                        {typeof finalSectionCount === 'number' ? finalSectionCount : visibleSections.length}
                      </p>
                      {sectionCountAdjustmentReason ? (
                        <p className="mt-2 text-xs text-[var(--teacher-text-muted)]">{sectionCountAdjustmentReason}</p>
                      ) : null}
                    </div>
                  </div>

                  {reviewNotes.length > 0 ? (
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-4">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-[var(--teacher-accent)]" />
                        <p className="text-sm font-black text-[var(--teacher-text-strong)]">Repair notes</p>
                      </div>
                      <div className="mt-3 space-y-2">
                        {reviewNotes.map((note) => (
                          <div
                            key={note}
                            className="rounded-xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 py-2 text-sm text-[var(--teacher-text-strong)]"
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {coherenceWarnings.length > 0 ? (
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-4">
                      <p className="text-sm font-black text-[var(--teacher-text-strong)]">Coherence warnings</p>
                      <div className="mt-3 space-y-2">
                        {coherenceWarnings.map((warning) => (
                          <div
                            key={warning}
                            className="rounded-xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 py-2 text-sm text-[var(--teacher-text-strong)]"
                          >
                            {warning}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {hiddenLegacyMediaNotice ? (
                    <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-4 py-3 text-sm text-[var(--teacher-text-muted)]">
                      {hiddenLegacyMediaNotice}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-4 py-3">
                    <p className="text-xs font-semibold text-[var(--teacher-text-muted)]">
                      {saving ? 'Saving extraction changes...' : dirty ? 'Unsaved changes. Save before apply.' : 'All extraction changes saved.'}
                    </p>
                  </div>
                </div>
              </TeacherSectionCard>
            </TabsContent>

            <TabsContent value="content" className="mt-0">
              <TeacherSectionCard
                title={`Content Blocks (${visibleSections.reduce((total, section) => total + section.visibleBlocks.length, 0)})`}
                description="Review one section at a time. Click a block card to edit it in place and keep the page focused."
                className="rounded-[1.55rem]"
              >
                <div
                  data-testid="extraction-content-scroll-region"
                  className="max-h-[calc(100vh-18rem)] space-y-4 overflow-y-auto pr-2"
                >
                  {visibleSections.map((section, sectionIndex) => (
                    <div
                      key={`section-${sectionIndex}`}
                      className="rounded-[1.45rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-4"
                    >
                      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          {canMutate ? (
                            <input
                              type="checkbox"
                              checked={selectedSections.has(sectionIndex)}
                              onChange={() => {
                                setSelectedSections((current) => {
                                  const next = new Set(current);
                                  if (next.has(sectionIndex)) next.delete(sectionIndex);
                                  else next.add(sectionIndex);
                                  return next;
                                });
                              }}
                              className="h-4 w-4"
                            />
                          ) : null}
                          <Badge variant="outline">Section {sectionIndex + 1}</Badge>
                          {section.confidence !== null && section.confidence !== undefined ? (
                            <Badge variant="secondary">{Math.round(section.confidence * 100)}% confidence</Badge>
                          ) : null}
                        </div>
                        <span className="text-xs font-semibold text-[var(--teacher-text-muted)]">
                          {section.visibleBlocks.length} visible block{section.visibleBlocks.length === 1 ? '' : 's'}
                        </span>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Section title</Label>
                          <Input
                            value={section.title}
                            onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                            className="teacher-input h-12 rounded-2xl"
                            disabled={!canMutate}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Section description</Label>
                          <Textarea
                            value={section.description || ''}
                            onChange={(event) => updateSection(sectionIndex, { description: event.target.value })}
                            className="teacher-input min-h-[88px] rounded-2xl"
                            disabled={!canMutate}
                          />
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {section.visibleBlocks.length === 0 ? (
                          <div className="rounded-[1.2rem] border border-dashed border-[var(--teacher-outline)] bg-white/60 px-4 py-5 text-sm text-[var(--teacher-text-muted)]">
                            No visible text blocks remain in this section.
                          </div>
                        ) : null}

                        {section.visibleBlocks.map(({ block, originalIndex }, blockIndex) => {
                          const blockKey = `section-${sectionIndex}-block-${originalIndex}`;
                          const lessonBlock = toLessonBlock(block, sectionIndex, originalIndex);
                          const isEditing = editingBlockKey === blockKey;
                          const canClickToEdit = canMutate && block.type !== 'divider' && !isEditing;
                          const canMoveUp = originalIndex > 0;
                          const canMoveDown = originalIndex < editSections[sectionIndex].lessonBlocks.length - 1;

                          return (
                            <div key={blockKey} className="group space-y-2">
                              <Card
                                role={canClickToEdit ? 'button' : undefined}
                                tabIndex={canClickToEdit ? 0 : undefined}
                                aria-label={canClickToEdit ? `Edit ${block.type} block ${blockIndex + 1}` : undefined}
                                onClick={(event) => {
                                  if (!canClickToEdit || isNestedInteractiveTarget(event)) return;
                                  setEditingBlockKey(blockKey);
                                }}
                                onKeyDown={(event) => {
                                  if (!canClickToEdit || isNestedInteractiveTarget(event)) return;
                                  if (event.key !== 'Enter' && event.key !== ' ') return;
                                  event.preventDefault();
                                  setEditingBlockKey(blockKey);
                                }}
                                className={cn(
                                  'overflow-hidden rounded-[1.45rem] border bg-white shadow-[0_18px_44px_-36px_rgba(15,23,42,0.24)]',
                                  'border-[var(--teacher-outline)]',
                                  canClickToEdit
                                    ? 'cursor-pointer transition hover:border-[var(--teacher-accent)]/28 hover:shadow-[0_24px_48px_-36px_rgba(15,23,42,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--teacher-accent)]/30 focus-visible:ring-offset-2'
                                    : '',
                                )}
                              >
                                <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                                  <div className="flex flex-1 items-start gap-4">
                                    <div className="flex min-w-[62px] flex-col items-center gap-2 rounded-2xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-3 py-3 text-xs font-black text-[var(--teacher-text-muted)]">
                                      <span>#{blockIndex + 1}</span>
                                    </div>
                                    <div className="flex-1 space-y-3">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <Badge variant="outline" className="rounded-full border-rose-200 bg-rose-50 text-rose-700">
                                          {block.type}
                                        </Badge>
                                        <span className="text-xs font-semibold text-[var(--teacher-text-muted)]">
                                          {isEditing ? 'Editing in place' : block.type === 'divider' ? 'Section divider' : 'Click block to edit'}
                                        </span>
                                      </div>
                                      {isEditing ? (
                                        <LessonBlockTeacherEditor
                                          block={lessonBlock}
                                          classId={extraction.classId}
                                          onSave={(patch) => {
                                            updateBlock(sectionIndex, originalIndex, {
                                              content: patch.content,
                                              metadata: patch.metadata,
                                            });
                                            setEditingBlockKey(null);
                                          }}
                                          onCancel={() => setEditingBlockKey(null)}
                                        />
                                      ) : (
                                        <LessonBlockTeacherPreview block={lessonBlock} />
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    {!isEditing ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="rounded-xl border-[var(--teacher-outline)] bg-white font-black text-[var(--teacher-text-strong)] hover:bg-[var(--teacher-surface-soft)]"
                                        onClick={() => setEditingBlockKey(blockKey)}
                                        disabled={!canMutate || block.type === 'divider'}
                                      >
                                        <PencilLine className="mr-1 h-3.5 w-3.5" />
                                        Edit
                                      </Button>
                                    ) : null}
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="rounded-xl border-[var(--teacher-outline)] bg-white text-[var(--teacher-text-muted)] hover:bg-[var(--teacher-surface-soft)]"
                                      aria-label={`Move block ${blockIndex + 1} up`}
                                      disabled={!canMutate || !canMoveUp}
                                      onClick={() => moveBlock(sectionIndex, originalIndex, 'up')}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="rounded-xl border-[var(--teacher-outline)] bg-white text-[var(--teacher-text-muted)] hover:bg-[var(--teacher-surface-soft)]"
                                      aria-label={`Move block ${blockIndex + 1} down`}
                                      disabled={!canMutate || !canMoveDown}
                                      onClick={() => moveBlock(sectionIndex, originalIndex, 'down')}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-xl border-rose-200 bg-white font-black text-rose-600 hover:bg-rose-50"
                                      onClick={() => removeBlock(sectionIndex, originalIndex)}
                                      disabled={!canMutate}
                                    >
                                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                                      Delete
                                    </Button>
                                  </div>
                                </CardContent>
                              </Card>
                            </div>
                          );
                        })}
                      </div>

                      {section.assessmentDraft ? (
                        <div className="mt-4 rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-black text-[var(--teacher-text-strong)]">Assessment Draft</p>
                            <Badge variant="secondary">
                              {section.assessmentDraft.questions?.length || 0} question{(section.assessmentDraft.questions?.length || 0) === 1 ? '' : 's'}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm text-[var(--teacher-text-muted)]">
                            {section.assessmentDraft.title || `${section.title} Checkpoint`}
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </TeacherSectionCard>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Extraction</DialogTitle>
            <DialogDescription>
              This will apply {selectedSections.size} selected section{selectedSections.size === 1 ? '' : 's'} as draft lesson content.
            </DialogDescription>
          </DialogHeader>
          {applyBlockedReason ? (
            <p className="text-sm text-amber-700">{applyBlockedReason}</p>
          ) : (
            <p className="text-sm text-[var(--teacher-text-muted)]">
              Continue only after you are satisfied with the extracted structure and cleanup notes.
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={() => void handleApply()} disabled={Boolean(applyBlockedReason) || applying}>
              {applying ? 'Applying...' : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </TeacherPageShell>
  );
}
