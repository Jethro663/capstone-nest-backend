'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Layers3, Shield, FileQuestion } from 'lucide-react';
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
    setEditTitle(structured?.title || '');
    setEditDescription(structured?.description || '');
    setEditSections(sections);
    setSelectedSections(new Set(sections.map((_, index) => index)));
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

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await extractionService.update(extractionId, { title: editTitle, description: editDescription, sections: editSections });
      setExtraction(response.data);
      hydrate(response.data);
      toast.success('Extraction changes saved');
    } catch (error: unknown) {
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

      <TeacherSectionCard title={`Sections (${editSections.length})`} description="Review section lesson blocks and optional assessment drafts.">
        <div className="space-y-4">
          {editSections.map((section, sectionIndex) => (
            <div key={`${section.title}-${sectionIndex}`} className="rounded-[14px] border border-[#e2e8f0] bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isEditable && !isApplied ? <input type="checkbox" checked={selectedSections.has(sectionIndex)} onChange={() => setSelectedSections((prev) => { const next = new Set(prev); if (next.has(sectionIndex)) next.delete(sectionIndex); else next.add(sectionIndex); return next; })} className="h-4 w-4" /> : null}
                  <Badge variant="outline">Section {sectionIndex + 1}</Badge>
                </div>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Input value={section.title} onChange={(event) => updateSection(sectionIndex, { title: event.target.value })} disabled={!isEditable || isApplied} />
                <Textarea value={section.description || ''} onChange={(event) => updateSection(sectionIndex, { description: event.target.value })} disabled={!isEditable || isApplied} rows={2} />
              </div>
              <div className="mt-3 space-y-3">
                {section.lessonBlocks.map((block, blockIndex) => (
                  <div key={`${sectionIndex}-${blockIndex}`} className="rounded-[10px] border border-[#e2e8f0] bg-[var(--student-surface-soft)] p-3">
                    <div className="mb-2 flex items-center gap-2"><Badge variant="outline">{BLOCK_LABEL[block.type] || block.type}</Badge></div>
                    {block.type === 'image' ? (
                      <div className="rounded-md border border-[#cbd5e1] bg-white p-2">
                        {blockImageUrl(block) ? <img src={blockImageUrl(block) || ''} alt="Extracted visual" className="mb-2 max-h-56 w-full rounded-md border border-[#cbd5e1] object-contain bg-white" /> : null}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--teacher-text-muted)]">
                          {blockImageCaption(block) ? <span>{blockImageCaption(block)}</span> : null}
                          {blockImageMeta(block).page ? <Badge variant="secondary">Page {blockImageMeta(block).page}</Badge> : null}
                          {blockImageMeta(block).confidence !== null ? <Badge variant="outline">Confidence {Math.round((blockImageMeta(block).confidence || 0) * 100)}%</Badge> : null}
                        </div>
                      </div>
                    ) : (
                      <Textarea value={blockText(block)} onChange={(event) => updateBlock(sectionIndex, blockIndex, { content: { text: event.target.value } })} disabled={!isEditable || isApplied} rows={block.type === 'divider' ? 1 : 3} className="font-mono text-sm" />
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>Cancel</Button>
            <Button onClick={handleApply} disabled={applying}>{applying ? 'Applying...' : 'Confirm & Apply'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </TeacherPageShell>
  );
}
