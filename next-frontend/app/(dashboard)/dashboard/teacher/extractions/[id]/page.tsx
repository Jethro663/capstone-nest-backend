'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers3, Shield, FileQuestion, Search, Undo2, RotateCcw, Trash2, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { extractionService } from '@/services/extraction-service';
import {
  TeacherEmptyState,
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import type { Extraction, ExtractionBlock, ExtractionSection, ExtractionStatus } from '@/types/extraction';

const STATUS_VARIANT: Record<ExtractionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'secondary',
  completed: 'default',
  applied: 'default',
  failed: 'destructive',
};

const BLOCK_LABEL: Record<string, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  question: 'Question',
  file: 'File',
  divider: 'Divider',
};

const POLLING_FAILURE_THRESHOLD = 3;
const LOW_CONFIDENCE_THRESHOLD = 0.6;
const VERY_SHORT_THRESHOLD = 30;

type ReviewCue = 'no-content' | 'very-short' | 'duplicate' | 'low-confidence';
type SectionFilter = 'all' | number;

type BlockReviewMeta = {
  key: string;
  sectionIndex: number;
  blockIndex: number;
  block: ExtractionBlock;
  text: string;
  normalizedText: string;
  confidence: number | null;
  hasContent: boolean;
  cues: ReviewCue[];
  matchesSearch: boolean;
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

function blockText(block: ExtractionBlock): string {
  if (typeof block.content === 'string') return block.content;
  if (block.content && typeof block.content === 'object') {
    const text = (block.content as Record<string, unknown>).text;
    return typeof text === 'string' ? text : '';
  }
  return '';
}

function blockImageUrl(block: ExtractionBlock): string | null {
  if (block.type !== 'image' || typeof block.content !== 'object' || !block.content) return null;
  const url = (block.content as Record<string, unknown>).url;
  return typeof url === 'string' && url.length > 0 ? url : null;
}

function blockImageCaption(block: ExtractionBlock): string | null {
  if (block.type !== 'image' || typeof block.content !== 'object' || !block.content) return null;
  const caption = (block.content as Record<string, unknown>).caption;
  if (typeof caption === 'string' && caption.trim().length > 0) return caption;
  const alt = (block.content as Record<string, unknown>).alt;
  return typeof alt === 'string' && alt.trim().length > 0 ? alt : null;
}

function blockImageMeta(block: ExtractionBlock): { page: number | null; confidence: number | null } {
  if (typeof block.metadata !== 'object' || !block.metadata) return { page: null, confidence: null };
  const page = (block.metadata as Record<string, unknown>).pageNumber;
  const confidence = (block.metadata as Record<string, unknown>).assignmentConfidence;
  return {
    page: typeof page === 'number' && Number.isFinite(page) ? page : null,
    confidence: typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : null,
  };
}

function getBlockKey(sectionIndex: number, blockIndex: number): string {
  return `s${sectionIndex}-b${blockIndex}`;
}

function normalizeForDuplicate(text: string): string {
  return text.replace(/\s+/g, ' ').trim().toLowerCase();
}

function isTextInputTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || target.isContentEditable) return true;
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
}

function getBlockConfidence(block: ExtractionBlock): number | null {
  if (!block.metadata || typeof block.metadata !== 'object') return null;
  const candidate = (block.metadata as Record<string, unknown>).assignmentConfidence
    ?? (block.metadata as Record<string, unknown>).confidence;
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : null;
}

function toSerializableBlockContent(content: ExtractionBlock['content']): Record<string, unknown> | string {
  if (typeof content === 'string') return { text: content };
  if (content && typeof content === 'object') return content;
  return { text: '' };
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

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editSections, setEditSections] = useState<ExtractionSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<number>>(new Set());
  const [dirty, setDirty] = useState(false);
  const [sectionFilter, setSectionFilter] = useState<SectionFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [focusedBlockKey, setFocusedBlockKey] = useState<string | null>(null);
  const [removedBlockKeys, setRemovedBlockKeys] = useState<Set<string>>(new Set());
  const [removeHistory, setRemoveHistory] = useState<string[]>([]);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingFailuresRef = useRef(0);
  const reviewPaneRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const sectionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const stopPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
    pollingFailuresRef.current = 0;
  }, []);

  const hydrate = useCallback((value: Extraction | null) => {
    const structured = value?.structuredContent;
    const sections = structured?.sections ? JSON.parse(JSON.stringify(structured.sections)) as ExtractionSection[] : [];
    setEditTitle(structured?.title || '');
    setEditDescription(structured?.description || '');
    setEditSections(sections);
    setSelectedSections(new Set(sections.map((_, index) => index)));
    setSectionFilter('all');
    setSearchQuery('');
    setActiveSectionIndex(0);
    setFocusedBlockKey(null);
    setRemovedBlockKeys(new Set());
    setRemoveHistory([]);
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
            ? { ...prev, extractionStatus: statusRes.data.status as ExtractionStatus, progressPercent: statusRes.data.progressPercent, totalChunks: statusRes.data.totalChunks, processedChunks: statusRes.data.processedChunks, modelUsed: statusRes.data.modelUsed }
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
        if (pollingFailuresRef.current >= POLLING_FAILURE_THRESHOLD) {
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
  const canMutateBlocks = Boolean(isEditable && !isApplied);

  const persistableSections = useMemo(
    () => editSections.map((section, sectionIndex) => ({
      ...section,
      lessonBlocks: section.lessonBlocks.filter((_, blockIndex) => !removedBlockKeys.has(getBlockKey(sectionIndex, blockIndex))),
    })),
    [editSections, removedBlockKeys],
  );

  const sanitizedSaveSections = useMemo(
    () => persistableSections.map((section, sectionIndex) => ({
      title: String(section.title || `Section ${sectionIndex + 1}`),
      description: String(section.description || ''),
      order: Number.isFinite(section.order) ? section.order : sectionIndex + 1,
      lessonBlocks: (section.lessonBlocks || []).map((block, blockIndex) => ({
        type: block.type,
        order: Number.isFinite(block.order) ? block.order : blockIndex + 1,
        content: toSerializableBlockContent(block.content),
        ...(block.metadata && typeof block.metadata === 'object' ? { metadata: block.metadata } : {}),
      })),
      ...(section.assessmentDraft ? { assessmentDraft: section.assessmentDraft } : {}),
      ...(typeof section.confidence === 'number' && Number.isFinite(section.confidence) ? { confidence: section.confidence } : {}),
    })),
    [persistableSections],
  );

  const legacySaveLessons = useMemo(
    () => sanitizedSaveSections.map((section, sectionIndex) => ({
      title: section.title,
      description: section.description,
      order: Number.isFinite(section.order) ? section.order : sectionIndex + 1,
      blocks: section.lessonBlocks,
    })),
    [sanitizedSaveSections],
  );

  const allBlockReview = useMemo(() => {
    const duplicateCount = new Map<string, number>();
    const entries: Omit<BlockReviewMeta, 'cues' | 'matchesSearch'>[] = [];

    editSections.forEach((section, sectionIndex) => {
      section.lessonBlocks.forEach((block, blockIndex) => {
        const key = getBlockKey(sectionIndex, blockIndex);
        const text = block.type === 'image'
          ? `${blockImageCaption(block) || ''} ${(blockImageUrl(block) || '').trim()}`
          : blockText(block);
        const normalizedText = normalizeForDuplicate(text);
        const confidence = getBlockConfidence(block);
        const hasContent = block.type === 'image'
          ? Boolean(blockImageUrl(block) || blockImageCaption(block))
          : text.trim().length > 0;

        if (!removedBlockKeys.has(key) && normalizedText.length > 0) {
          duplicateCount.set(normalizedText, (duplicateCount.get(normalizedText) || 0) + 1);
        }

        entries.push({
          key,
          sectionIndex,
          blockIndex,
          block,
          text,
          normalizedText,
          confidence,
          hasContent,
        });
      });
    });

    const normalizedQuery = normalizeForDuplicate(searchQuery);
    return entries.map((entry) => {
      const cues: ReviewCue[] = [];
      if (!entry.hasContent) cues.push('no-content');
      if (entry.block.type !== 'image' && entry.text.trim().length > 0 && entry.text.trim().length < VERY_SHORT_THRESHOLD) cues.push('very-short');
      if (entry.normalizedText.length > 0 && (duplicateCount.get(entry.normalizedText) || 0) > 1) cues.push('duplicate');
      if (entry.confidence !== null && entry.confidence < LOW_CONFIDENCE_THRESHOLD) cues.push('low-confidence');

      const searchable = `${entry.text} ${entry.block.type}`.toLowerCase();
      const matchesSearch = normalizedQuery.length === 0
        ? true
        : searchable.includes(normalizedQuery);

      return { ...entry, cues, matchesSearch };
    });
  }, [editSections, removedBlockKeys, searchQuery]);

  const reviewBySection = useMemo(() => {
    return editSections.map((section, sectionIndex) => {
      const allBlocks = allBlockReview.filter((entry) => entry.sectionIndex === sectionIndex);
      const removedCount = allBlocks.filter((entry) => removedBlockKeys.has(entry.key)).length;
      const filteredBlocks = allBlocks.filter((entry) => !removedBlockKeys.has(entry.key) && entry.matchesSearch);
      const flaggedCount = filteredBlocks.filter((entry) => entry.cues.length > 0).length;
      const totalRemaining = allBlocks.length - removedCount;
      return {
        section,
        sectionIndex,
        filteredBlocks,
        removedCount,
        flaggedCount,
        totalRemaining,
      };
    });
  }, [allBlockReview, editSections, removedBlockKeys]);

  const displayedSections = useMemo(() => {
    if (sectionFilter === 'all') return reviewBySection;
    return reviewBySection.filter((entry) => entry.sectionIndex === sectionFilter);
  }, [reviewBySection, sectionFilter]);

  const stats = useMemo(() => {
    const remainingBlocks = reviewBySection.reduce((sum, section) => sum + section.totalRemaining, 0);
    const removedBlocks = removedBlockKeys.size;
    const flaggedBlocks = reviewBySection.reduce((sum, section) => sum + section.flaggedCount, 0);
    return { remainingBlocks, removedBlocks, flaggedBlocks };
  }, [reviewBySection, removedBlockKeys]);

  const flaggedVisibleBlocks = useMemo(
    () => displayedSections.flatMap((section) => section.filteredBlocks).filter((block) => block.cues.length > 0),
    [displayedSections],
  );

  const emptyAfterRemovalSectionCount = useMemo(
    () => reviewBySection.filter((section) => section.totalRemaining === 0).length,
    [reviewBySection],
  );

  const updateSection = (sectionIndex: number, patch: Partial<ExtractionSection>) => {
    setEditSections((prev) => {
      const copy = [...prev];
      copy[sectionIndex] = { ...copy[sectionIndex], ...patch };
      return copy;
    });
    setDirty(true);
  };

  const updateBlock = (sectionIndex: number, blockIndex: number, patch: Partial<ExtractionBlock>) => {
    setEditSections((prev) => {
      const copy = [...prev];
      const blocks = [...copy[sectionIndex].lessonBlocks];
      blocks[blockIndex] = { ...blocks[blockIndex], ...patch };
      copy[sectionIndex] = { ...copy[sectionIndex], lessonBlocks: blocks };
      return copy;
    });
    setDirty(true);
  };

  const removeBlock = useCallback((key: string) => {
    setRemovedBlockKeys((prev) => {
      if (prev.has(key)) return prev;
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    setRemoveHistory((prev) => [...prev, key]);
    if (focusedBlockKey === key) setFocusedBlockKey(null);
    setDirty(true);
  }, [focusedBlockKey]);

  const undoLastRemove = useCallback(() => {
    let restored: string | null = null;
    setRemoveHistory((prev) => {
      if (prev.length === 0) return prev;
      restored = prev[prev.length - 1];
      return prev.slice(0, -1);
    });

    if (!restored) return;
    setRemovedBlockKeys((prev) => {
      const next = new Set(prev);
      next.delete(restored as string);
      return next;
    });
    setDirty(true);
  }, []);

  const restoreAllRemoved = () => {
    if (removedBlockKeys.size === 0) return;
    setRemovedBlockKeys(new Set());
    setRemoveHistory([]);
    setDirty(true);
  };

  const jumpToSection = useCallback((targetSectionIndex: number) => {
    if (targetSectionIndex < 0 || targetSectionIndex >= editSections.length) return;
    setActiveSectionIndex(targetSectionIndex);
    if (sectionFilter === 'all') {
      const element = sectionRefs.current[targetSectionIndex];
      if (element) element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    setSectionFilter(targetSectionIndex);
    const pane = reviewPaneRef.current;
    if (pane) pane.scrollTo({ top: 0, behavior: 'smooth' });
  }, [editSections.length, sectionFilter]);

  const navigateSection = useCallback((direction: -1 | 1) => {
    const next = Math.max(0, Math.min(editSections.length - 1, activeSectionIndex + direction));
    jumpToSection(next);
  }, [activeSectionIndex, editSections.length, jumpToSection]);

  const jumpToNextFlagged = useCallback(() => {
    if (flaggedVisibleBlocks.length === 0) return;
    const currentIndex = focusedBlockKey
      ? flaggedVisibleBlocks.findIndex((entry) => entry.key === focusedBlockKey)
      : -1;
    const nextIndex = currentIndex >= 0 && currentIndex < flaggedVisibleBlocks.length - 1 ? currentIndex + 1 : 0;
    const target = flaggedVisibleBlocks[nextIndex];
    if (!target) return;
    setFocusedBlockKey(target.key);
    const element = blockRefs.current[target.key];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.focus();
    }
    setActiveSectionIndex(target.sectionIndex);
    if (sectionFilter !== 'all' && sectionFilter !== target.sectionIndex) setSectionFilter(target.sectionIndex);
  }, [flaggedVisibleBlocks, focusedBlockKey, sectionFilter]);

  const handleSave = async () => {
    setSaving(true);
    try {
      let response = await extractionService.update(extractionId, {
        title: editTitle,
        description: editDescription,
        sections: sanitizedSaveSections,
      });

      // Compatibility retry for environments where AI service only accepts legacy lessons payload reliably.
      if (!response?.data?.structuredContent?.sections && legacySaveLessons.length > 0) {
        response = await extractionService.update(extractionId, {
          title: editTitle,
          description: editDescription,
          lessons: legacySaveLessons,
        });
      }

      setExtraction(response.data);
      hydrate(response.data);
      toast.success('Extraction changes saved');
    } catch (error: unknown) {
      const statusCode = (error as { response?: { status?: number } })?.response?.status;
      if (statusCode && statusCode >= 500) {
        try {
          const fallback = await extractionService.update(extractionId, {
            title: editTitle,
            description: editDescription,
            lessons: legacySaveLessons,
          });
          setExtraction(fallback.data);
          hydrate(fallback.data);
          toast.success('Extraction changes saved');
          return;
        } catch {
          // Surface the original error below.
        }
      }
      toast.error(getErrorMessage(error, 'Failed to save extraction changes'));
    } finally {
      setSaving(false);
    }
  };

  const handleApply = async () => {
    setApplying(true);
    try {
      const sorted = Array.from(selectedSections).sort((a, b) => a - b);
      const sectionIndices = sorted.length === editSections.length ? undefined : sorted;
      const response = await extractionService.apply(extractionId, { sectionIndices });
      toast.success(response.message || 'Extraction applied');
      setShowApplyDialog(false);
      const full = await extractionService.getById(extractionId);
      setExtraction(full.data);
      hydrate(full.data);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to apply extraction'));
    } finally {
      setApplying(false);
    }
  };

  const handleDelete = () => {
    setConfirmation({
      title: 'Delete extraction review?',
      description: 'This removes the extraction and all review edits.',
      confirmLabel: 'Delete Extraction',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await extractionService.delete(extractionId);
          toast.success('Extraction deleted');
          router.back();
        } catch (error: unknown) {
          toast.error(getErrorMessage(error, 'Failed to delete extraction'));
        }
      },
    });
  };

  useEffect(() => {
    const pane = reviewPaneRef.current;
    if (!pane) return;
    if (sectionFilter !== 'all') {
      if (typeof sectionFilter === 'number') setActiveSectionIndex(sectionFilter);
      return;
    }

    const onScroll = () => {
      const paneTop = pane.getBoundingClientRect().top;
      let bestIndex = activeSectionIndex;
      let bestDistance = Number.POSITIVE_INFINITY;
      for (const section of reviewBySection) {
        const element = sectionRefs.current[section.sectionIndex];
        if (!element) continue;
        const distance = Math.abs(element.getBoundingClientRect().top - paneTop - 24);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = section.sectionIndex;
        }
      }
      setActiveSectionIndex(bestIndex);
    };

    pane.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => pane.removeEventListener('scroll', onScroll);
  }, [activeSectionIndex, reviewBySection, sectionFilter]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTextInputTarget(event.target)) return;
      if (event.defaultPrevented) return;

      const key = event.key.toLowerCase();
      if (key === '/') {
        event.preventDefault();
        searchRef.current?.focus();
        searchRef.current?.select();
        return;
      }
      if (key === 'j') {
        event.preventDefault();
        navigateSection(1);
        return;
      }
      if (key === 'k') {
        event.preventDefault();
        navigateSection(-1);
        return;
      }
      if (key === 'r' && canMutateBlocks && focusedBlockKey) {
        event.preventDefault();
        removeBlock(focusedBlockKey);
        return;
      }
      if (key === 'u' && canMutateBlocks) {
        event.preventDefault();
        undoLastRemove();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [canMutateBlocks, focusedBlockKey, navigateSection, removeBlock, undoLastRemove]);

  if (loading) return <div className="space-y-4"><Skeleton className="h-12 w-80" /><Skeleton className="h-80 w-full" /></div>;

  if (loadError) {
    return (
      <TeacherPageShell badge="AI Extraction" title="Extraction Review" description="Review extracted content before apply.">
        <TeacherEmptyState title="Extraction unavailable" description={loadError} action={<Button onClick={fetchExtraction}>Retry</Button>} />
      </TeacherPageShell>
    );
  }

  if (!extraction) return null;

  return (
    <TeacherPageShell
      badge="AI Extraction Review"
      title="Extraction Review"
      description="Module-first review for sections, lesson blocks, and section assessments."
      actions={<div className="flex flex-wrap items-center gap-2"><Button variant="outline" onClick={() => router.back()}>Back</Button>{dirty && isEditable && !isApplied ? <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</Button> : null}{isEditable && !isApplied ? <Button onClick={() => setShowApplyDialog(true)} disabled={selectedSections.size === 0}>Apply ({selectedSections.size} section{selectedSections.size === 1 ? '' : 's'})</Button> : null}{!isApplied ? <Button variant="destructive" size="sm" onClick={handleDelete}>Delete</Button> : <Badge>Applied</Badge>}</div>}
      stats={<><TeacherStatCard label="Status" value={<Badge variant={STATUS_VARIANT[extraction.extractionStatus]}>{extraction.extractionStatus}</Badge>} caption={extraction.modelUsed ? `Model: ${extraction.modelUsed}` : 'Model pending'} icon={Shield} accent="amber" /><TeacherStatCard label="Sections" value={editSections.length} caption={`${selectedSections.size} selected`} icon={Layers3} accent="sky" /><TeacherStatCard label="Draft Questions" value={editSections.reduce((sum, section) => sum + (section.assessmentDraft?.questions?.length || 0), 0)} caption="Optional section assessments" icon={FileQuestion} accent="rose" /></>}
    >
      {['pending', 'processing'].includes(extraction.extractionStatus) ? (
        <TeacherSectionCard title="Extraction Progress" description="AI is converting the PDF into sections.">
          <div className="rounded-[14px] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
            <div className="mb-2 flex items-center justify-between text-sm"><span>Processing</span><span>{extraction.progressPercent}%</span></div>
            <Progress value={extraction.progressPercent} />
          </div>
        </TeacherSectionCard>
      ) : null}

      {pollingWarning ? <TeacherSectionCard title="Polling Warning" description="Live status polling stopped."><p className="text-sm text-yellow-700">{pollingWarning}</p></TeacherSectionCard> : null}

      <TeacherSectionCard title="Module Details" description="Applied extraction creates one hidden and locked module by default.">
        <div className="grid gap-3 md:grid-cols-2">
          <div><Label>Module Title</Label><Input value={editTitle} onChange={(event) => { setEditTitle(event.target.value); setDirty(true); }} disabled={!isEditable || isApplied} /></div>
          <div><Label>Module Description</Label><Textarea value={editDescription} onChange={(event) => { setEditDescription(event.target.value); setDirty(true); }} disabled={!isEditable || isApplied} rows={2} /></div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard title={`Sections (${editSections.length})`} description="Focused review workspace with quick travel and in-session block removals.">
        <div className="space-y-4">
          <div className="sticky top-2 z-10 rounded-[14px] border border-[#dbe4f0] bg-white/95 p-3 backdrop-blur">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="section-filter" className="text-xs uppercase tracking-wide text-[var(--teacher-text-muted)]">Section View</Label>
                <select
                  id="section-filter"
                  value={sectionFilter === 'all' ? 'all' : String(sectionFilter)}
                  onChange={(event) => {
                    const value = event.target.value === 'all' ? 'all' : Number(event.target.value);
                    setSectionFilter(value);
                    if (value !== 'all') setActiveSectionIndex(value);
                  }}
                  className="h-9 rounded-md border border-[#cbd5e1] bg-white px-3 text-sm"
                >
                  <option value="all">All sections</option>
                  {editSections.map((section, index) => (
                    <option key={`section-option-${index}`} value={String(index)}>
                      Section {index + 1}: {section.title || 'Untitled'}
                    </option>
                  ))}
                </select>
                <Button variant="outline" size="sm" onClick={() => navigateSection(-1)} disabled={activeSectionIndex <= 0}>Prev (K)</Button>
                <Button variant="outline" size="sm" onClick={() => navigateSection(1)} disabled={activeSectionIndex >= editSections.length - 1}>Next (J)</Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-[220px] flex-1 lg:w-[280px] lg:flex-none">
                  <Search className="pointer-events-none absolute left-2 top-2 h-4 w-4 text-[var(--teacher-text-muted)]" />
                  <Input
                    ref={searchRef}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search blocks (/)"
                    className="pl-8"
                  />
                </div>
                <Button variant="outline" size="sm" onClick={jumpToNextFlagged} disabled={flaggedVisibleBlocks.length === 0}>Next Flagged</Button>
                {canMutateBlocks ? (
                  <>
                    <Button variant="outline" size="sm" onClick={undoLastRemove} disabled={removeHistory.length === 0}>
                      <Undo2 className="mr-1 h-4 w-4" />
                      Undo (U)
                    </Button>
                    <Button variant="outline" size="sm" onClick={restoreAllRemoved} disabled={removedBlockKeys.size === 0}>
                      <RotateCcw className="mr-1 h-4 w-4" />
                      Restore All
                    </Button>
                  </>
                ) : null}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary">Remaining: {stats.remainingBlocks}</Badge>
              <Badge variant="outline">Removed: {stats.removedBlocks}</Badge>
              <Badge variant={stats.flaggedBlocks > 0 ? 'destructive' : 'secondary'}>Flagged: {stats.flaggedBlocks}</Badge>
              <Badge variant="outline">Active Section: {activeSectionIndex + 1}</Badge>
              <span className="text-[var(--teacher-text-muted)]"><ArrowUpDown className="mr-1 inline h-3 w-3" />Shortcuts: J/K, /, R, U</span>
            </div>

            <div className="mt-3">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--teacher-text-muted)]">Quick Travel</p>
              <div className="flex gap-1 overflow-x-auto pb-1">
                {reviewBySection.map((sectionEntry) => (
                  <button
                    key={`mini-map-inline-${sectionEntry.sectionIndex}`}
                    type="button"
                    onClick={() => {
                      setSectionFilter(sectionFilter === 'all' ? 'all' : sectionEntry.sectionIndex);
                      jumpToSection(sectionEntry.sectionIndex);
                    }}
                    className={`shrink-0 rounded-md border px-2 py-1 text-left text-[11px] transition ${activeSectionIndex === sectionEntry.sectionIndex ? 'border-sky-400 bg-sky-50' : 'border-[#e2e8f0] hover:border-sky-300'}`}
                  >
                    <div className="flex items-center gap-1">
                      <span>S{sectionEntry.sectionIndex + 1}</span>
                      <span className="text-[10px] text-[var(--teacher-text-muted)]">{sectionEntry.totalRemaining}</span>
                      {sectionEntry.flaggedCount > 0 ? <span className="rounded bg-red-100 px-1 text-[10px] text-red-700">{sectionEntry.flaggedCount}F</span> : null}
                      {sectionEntry.removedCount > 0 ? <span className="rounded bg-slate-100 px-1 text-[10px] text-slate-700">{sectionEntry.removedCount}R</span> : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="relative">
            <div
              ref={reviewPaneRef}
              className="review-scrollbar max-h-[calc(100vh-20rem)] overflow-y-auto rounded-[14px] border border-[#dbe4f0] bg-[#f8fafc] p-3"
            >
              {displayedSections.length === 0 ? (
                <p className="rounded-md border border-dashed border-[#cbd5e1] bg-white p-4 text-sm text-[var(--teacher-text-muted)]">
                  No sections match the current filter.
                </p>
              ) : null}

              {displayedSections.map(({ section, sectionIndex, filteredBlocks, flaggedCount, removedCount, totalRemaining }) => (
                <div
                  key={`${section.title}-${sectionIndex}`}
                  ref={(node) => { sectionRefs.current[sectionIndex] = node; }}
                  className="mb-4 rounded-[14px] border border-[#e2e8f0] bg-white p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isEditable && !isApplied ? (
                        <input
                          type="checkbox"
                          checked={selectedSections.has(sectionIndex)}
                          onChange={() => setSelectedSections((prev) => {
                            const next = new Set(prev);
                            if (next.has(sectionIndex)) next.delete(sectionIndex);
                            else next.add(sectionIndex);
                            return next;
                          })}
                          className="h-4 w-4"
                        />
                      ) : null}
                      <Badge variant="outline">Section {sectionIndex + 1}</Badge>
                      {flaggedCount > 0 ? <Badge variant="destructive">{flaggedCount} flagged</Badge> : <Badge variant="secondary">Clean</Badge>}
                      {removedCount > 0 ? <Badge variant="outline">{removedCount} removed</Badge> : null}
                    </div>
                    <span className="text-xs text-[var(--teacher-text-muted)]">{totalRemaining} remaining block{totalRemaining === 1 ? '' : 's'}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    <Input value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} disabled={!isEditable || isApplied} />
                    <Textarea value={section.description || ''} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} disabled={!isEditable || isApplied} rows={2} />
                  </div>
                  {totalRemaining === 0 ? <p className="mt-3 rounded-md border border-yellow-300 bg-yellow-50 px-3 py-2 text-xs text-yellow-800">This section has zero remaining lesson blocks after removals.</p> : null}
                  <div className="mt-3 space-y-3">
                    {filteredBlocks.length === 0 ? <p className="rounded-md border border-dashed border-[#cbd5e1] bg-[var(--student-surface-soft)] p-3 text-xs text-[var(--teacher-text-muted)]">No blocks match the current search/filter in this section.</p> : null}

                    {filteredBlocks.map((entry) => (
                      <div
                        key={entry.key}
                        ref={(node) => { blockRefs.current[entry.key] = node; }}
                        tabIndex={0}
                        onFocus={() => setFocusedBlockKey(entry.key)}
                        className={`rounded-[10px] border bg-[var(--student-surface-soft)] p-3 outline-none transition ${focusedBlockKey === entry.key ? 'border-sky-400 ring-2 ring-sky-100' : 'border-[#e2e8f0]'}`}
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{BLOCK_LABEL[entry.block.type] || entry.block.type}</Badge>
                            {entry.cues.includes('no-content') ? <Badge variant="destructive">No content</Badge> : null}
                            {entry.cues.includes('very-short') ? <Badge variant="outline">Very short</Badge> : null}
                            {entry.cues.includes('duplicate') ? <Badge variant="outline">Duplicate</Badge> : null}
                            {entry.cues.includes('low-confidence') ? <Badge variant="secondary">Low confidence</Badge> : null}
                          </div>
                          {canMutateBlocks ? <Button variant="ghost" size="sm" onClick={() => removeBlock(entry.key)}><Trash2 className="mr-1 h-4 w-4" />Remove (R)</Button> : null}
                        </div>
                        {entry.block.type === 'image' ? (
                          <div className="rounded-md border border-[#cbd5e1] bg-white p-2">
                            {blockImageUrl(entry.block) ? <img src={blockImageUrl(entry.block) || ''} alt="Extracted visual" className="mb-2 max-h-56 w-full rounded-md border border-[#cbd5e1] object-contain bg-white" /> : null}
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--teacher-text-muted)]">
                              {blockImageCaption(entry.block) ? <span>{blockImageCaption(entry.block)}</span> : null}
                              {blockImageMeta(entry.block).page ? <Badge variant="secondary">Page {blockImageMeta(entry.block).page}</Badge> : null}
                              {blockImageMeta(entry.block).confidence !== null ? <Badge variant="outline">Confidence {Math.round((blockImageMeta(entry.block).confidence || 0) * 100)}%</Badge> : null}
                            </div>
                          </div>
                        ) : (
                          <Textarea value={blockText(entry.block)} onChange={(event) => updateBlock(entry.sectionIndex, entry.blockIndex, { content: { text: event.target.value } })} disabled={!isEditable || isApplied} rows={entry.block.type === 'divider' ? 1 : 3} className="font-mono text-sm" />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 rounded-[10px] border border-[#e2e8f0] bg-white p-3">
                    <div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold">Assessment Draft</span>{isEditable && !isApplied && !section.assessmentDraft ? <Button variant="outline" size="sm" onClick={() => updateSection(sectionIndex, { assessmentDraft: { title: `${section.title} Checkpoint`, description: '', type: 'quiz', passingScore: 60, feedbackLevel: 'standard', questions: [] } })}>Add Draft</Button> : null}</div>
                    {!section.assessmentDraft ? <p className="text-xs text-[var(--teacher-text-muted)]">No draft assessment for this section.</p> : <div className="space-y-2"><Input value={section.assessmentDraft.title || ''} onChange={(event) => updateSection(sectionIndex, { assessmentDraft: { ...section.assessmentDraft!, title: event.target.value } })} disabled={!isEditable || isApplied} /><Textarea value={section.assessmentDraft.description || ''} onChange={(event) => updateSection(sectionIndex, { assessmentDraft: { ...section.assessmentDraft!, description: event.target.value } })} disabled={!isEditable || isApplied} rows={2} /><p className="text-xs text-[var(--teacher-text-muted)]">Questions: {section.assessmentDraft.questions?.length || 0}</p><div className="space-y-1">{section.assessmentDraft.questions?.slice(0, 3).map((question, questionIndex) => <div key={`${sectionIndex}-question-${questionIndex}`} className="flex items-center justify-between rounded-md border border-[#e2e8f0] bg-[var(--student-surface-soft)] px-2 py-1 text-xs"><span className="truncate pr-2">{question.content}</span>{question.imageUrl ? <Badge variant="outline">Image linked</Badge> : <Badge variant="secondary">No image</Badge>}</div>)}</div></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </TeacherSectionCard>

      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Extraction</DialogTitle>
            <DialogDescription>
              This creates one hidden+locked module with <strong>{selectedSections.size}</strong> section(s) as draft lessons and optional draft assessments.
            </DialogDescription>
          </DialogHeader>
          {dirty ? <p className="text-sm text-yellow-700">Unsaved edits are not included unless you save first.</p> : null}
          {removedBlockKeys.size > 0 ? <p className="text-sm text-[var(--teacher-text-muted)]">{removedBlockKeys.size} block(s) are marked removed and will only be applied after Save.</p> : null}
          {emptyAfterRemovalSectionCount > 0 ? <p className="text-sm text-yellow-700">{emptyAfterRemovalSectionCount} section(s) currently have zero remaining lesson blocks.</p> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={applying}>{applying ? 'Applying...' : 'Confirm & Apply'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
      <style jsx>{`
        .review-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 #e2e8f0;
        }
        .review-scrollbar::-webkit-scrollbar {
          width: 10px;
        }
        .review-scrollbar::-webkit-scrollbar-track {
          background: #e2e8f0;
          border-radius: 8px;
        }
        .review-scrollbar::-webkit-scrollbar-thumb {
          background: #94a3b8;
          border-radius: 8px;
          border: 2px solid #e2e8f0;
        }
        .review-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #64748b;
        }
      `}</style>
    </TeacherPageShell>
  );
}
