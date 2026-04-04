'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { extractionService } from '@/services/extraction-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { toast } from 'sonner';
import type {
  Extraction,
  ExtractionLesson,
  ExtractionBlock,
  ExtractionStatus,
} from '@/types/extraction';

/* ── Status badge color mapping ────────────────────────────────────────── */
const statusVariant: Record<ExtractionStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'outline',
  processing: 'secondary',
  completed: 'default',
  applied: 'default',
  failed: 'destructive',
};

/* ── Block type display names ──────────────────────────────────────────── */
const blockTypeLabel: Record<string, string> = {
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
    const responseMessage = (
      error as { response?: { data?: { message?: unknown } } }
    ).response?.data?.message;
    if (typeof responseMessage === 'string' && responseMessage.trim().length > 0) {
      return responseMessage;
    }

    const directMessage = (error as { message?: unknown }).message;
    if (typeof directMessage === 'string' && directMessage.trim().length > 0) {
      return directMessage;
    }
  }

  return fallback;
}

function getBlockTextContent(block: ExtractionBlock): string {
  if (typeof block.content === 'string') return block.content;
  if (block.content && typeof block.content === 'object') {
    const fromText = (block.content as Record<string, unknown>).text;
    if (typeof fromText === 'string') return fromText;
    return JSON.stringify(block.content, null, 2);
  }
  return '';
}

function buildBlockContent(
  block: ExtractionBlock,
  rawValue: string,
): Record<string, unknown> {
  if (block.type === 'divider') return {};
  const trimmed = rawValue.trim();
  if (!trimmed) return { text: '' };

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // no-op: fallback to plain text
    }
  }

  return { text: rawValue };
}

export default function ExtractionReviewPage() {
  const params = useParams();
  const router = useRouter();
  const extractionId = params.id as string;

  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [pollingWarning, setPollingWarning] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [saving, setSaving] = useState(false);

  /* editable copy of structured content */
  const [editLessons, setEditLessons] = useState<ExtractionLesson[]>([]);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [dirty, setDirty] = useState(false);

  /* selective application */
  const [selectedLessons, setSelectedLessons] = useState<Set<number>>(new Set());
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingFailuresRef = useRef(0);

  /* ── Load extraction ──────────────────────────────────────────────── */
  const fetchExtraction = useCallback(async () => {
    try {
      setLoadError(null);
      const res = await extractionService.getById(extractionId);
      setExtraction(res.data);
      setPollingWarning(null);
      pollingFailuresRef.current = 0;

      if (res.data.structuredContent) {
        setEditTitle(res.data.structuredContent.title || '');
        setEditDescription(res.data.structuredContent.description || '');
        setEditLessons(JSON.parse(JSON.stringify(res.data.structuredContent.lessons || [])));
        setSelectedLessons(new Set((res.data.structuredContent.lessons || []).map((_: ExtractionLesson, i: number) => i)));
      } else {
        setEditTitle('');
        setEditDescription('');
        setEditLessons([]);
        setSelectedLessons(new Set());
      }

      /* start polling if still processing */
      if (['pending', 'processing'].includes(res.data.extractionStatus)) {
        startPolling();
      }
    } catch (error: unknown) {
      const message = getErrorMessage(error, 'Failed to load extraction');
      setLoadError(message);
      stopPolling();
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [extractionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const startPolling = useCallback(() => {
    if (pollRef.current) return;
    setPolling(true);
    setPollingWarning(null);
    pollingFailuresRef.current = 0;

    pollRef.current = setInterval(async () => {
      try {
        const res = await extractionService.getStatus(extractionId);
        pollingFailuresRef.current = 0;
        setPollingWarning(null);

        setExtraction((prev) =>
          prev
            ? {
                ...prev,
                extractionStatus: res.data.status as ExtractionStatus,
                progressPercent: res.data.progressPercent,
                totalChunks: res.data.totalChunks,
                processedChunks: res.data.processedChunks,
                modelUsed: res.data.modelUsed,
              }
            : prev,
        );

        if (!['pending', 'processing'].includes(res.data.status)) {
          stopPolling();
          try {
            const full = await extractionService.getById(extractionId);
            setExtraction(full.data);
            if (full.data.structuredContent) {
              setEditTitle(full.data.structuredContent.title || '');
              setEditDescription(full.data.structuredContent.description || '');
              setEditLessons(JSON.parse(JSON.stringify(full.data.structuredContent.lessons || [])));
              setSelectedLessons(new Set((full.data.structuredContent.lessons || []).map((_: ExtractionLesson, i: number) => i)));
            } else {
              setEditTitle('');
              setEditDescription('');
              setEditLessons([]);
              setSelectedLessons(new Set());
            }
          } catch (error: unknown) {
            const warning = getErrorMessage(
              error,
              'Extraction finished but details could not be refreshed. Reload this page.',
            );
            setPollingWarning(warning);
            toast.error(warning);
          }

          if (res.data.status === 'completed') {
            toast.success('Extraction completed!');
          } else if (res.data.status === 'failed') {
            toast.error('Extraction failed');
          }
        }
      } catch (error: unknown) {
        pollingFailuresRef.current += 1;
        if (pollingFailuresRef.current >= POLLING_FAILURE_THRESHOLD) {
          stopPolling();
          const warning = getErrorMessage(
            error,
            'Live extraction updates are temporarily unavailable. Refresh to retry.',
          );
          setPollingWarning(warning);
          toast.error(warning);
        }
      }
    }, 3000);
  }, [extractionId]); // eslint-disable-line react-hooks/exhaustive-deps

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    pollingFailuresRef.current = 0;
    setPolling(false);
  }, []);

  useEffect(() => {
    fetchExtraction();
    return () => stopPolling();
  }, [fetchExtraction, stopPolling]);

  const handleRetryLoad = () => {
    setLoading(true);
    setLoadError(null);
    fetchExtraction();
  };

  /* ── Save edits ───────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await extractionService.update(extractionId, {
        title: editTitle,
        description: editDescription,
        lessons: editLessons,
      });
      setExtraction(res.data);
      setDirty(false);
      toast.success('Changes saved');
    } catch {
      toast.error('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  /* ── Apply extraction → create lessons ────────────────────────────── */
  const handleApply = async () => {
    setApplying(true);
    try {
      const indices = selectedLessons.size === editLessons.length ? undefined : Array.from(selectedLessons);
      const res = await extractionService.apply(extractionId, { lessonIndices: indices });
      toast.success(res.message || 'Extraction applied');
      setShowApplyDialog(false);
      /* refresh to show applied status */
      try {
        const full = await extractionService.getById(extractionId);
        setExtraction(full.data);
      } catch (refreshError: unknown) {
        const warning = getErrorMessage(
          refreshError,
          'Extraction applied, but latest details could not be refreshed.',
        );
        toast.error(warning);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, 'Failed to apply extraction'));
    } finally {
      setApplying(false);
    }
  };

  /* ── Delete extraction ────────────────────────────────────────────── */
  const handleDelete = () => {
    setConfirmation({
      title: 'Delete extraction review?',
      description: 'This removes the extraction job and its review state permanently.',
      confirmLabel: 'Delete Extraction',
      tone: 'danger',
      details: extraction?.originalName ? (
        <p className="text-sm font-black text-[var(--student-text-strong)]">{extraction.originalName}</p>
      ) : undefined,
      onConfirm: async () => {
        try {
          await extractionService.delete(extractionId);
          toast.success('Extraction deleted');
          router.back();
        } catch {
          toast.error('Failed to delete extraction');
        }
      },
    });
  };

  /* ── Lesson editing helpers ───────────────────────────────────────── */
  const updateLesson = (idx: number, field: keyof ExtractionLesson, value: string | number) => {
    setEditLessons((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
    setDirty(true);
  };

  const updateBlock = (
    lessonIdx: number,
    blockIdx: number,
    field: keyof ExtractionBlock,
    value: string | number | Record<string, unknown>,
  ) => {
    setEditLessons((prev) => {
      const copy = [...prev];
      const blocks = [...copy[lessonIdx].blocks];
      blocks[blockIdx] = { ...blocks[blockIdx], [field]: value };
      copy[lessonIdx] = { ...copy[lessonIdx], blocks };
      return copy;
    });
    setDirty(true);
  };

  const removeBlock = (lessonIdx: number, blockIdx: number) => {
    setEditLessons((prev) => {
      const copy = [...prev];
      const blocks = copy[lessonIdx].blocks.filter((_, i) => i !== blockIdx);
      copy[lessonIdx] = { ...copy[lessonIdx], blocks };
      return copy;
    });
    setDirty(true);
  };

  const removeLesson = (idx: number) => {
    setEditLessons((prev) => prev.filter((_, i) => i !== idx));
    setSelectedLessons((prev) => {
      const next = new Set<number>();
      prev.forEach((v) => {
        if (v < idx) next.add(v);
        else if (v > idx) next.add(v - 1);
      });
      return next;
    });
    setDirty(true);
  };

  const toggleLessonSelected = (idx: number) => {
    setSelectedLessons((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  /* ── Loading skeleton ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  if (loadError) {
    return (
      <Card className="max-w-3xl mx-auto border-destructive">
        <CardHeader>
          <CardTitle>Extraction unavailable</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <div className="flex items-center gap-2">
            <Button onClick={handleRetryLoad}>Retry</Button>
            <Button variant="outline" onClick={() => router.back()}>
              Back
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!extraction) {
    return <p className="text-muted-foreground text-center mt-10">Extraction not found.</p>;
  }

  const isEditable = extraction.extractionStatus === 'completed';
  const isApplied = extraction.extractionStatus === 'applied' || extraction.isApplied;

  /* ── Render ───────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">Extraction Review</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant={statusVariant[extraction.extractionStatus as ExtractionStatus]}>
              {extraction.extractionStatus}
            </Badge>
            {extraction.modelUsed && (
              <span className="text-sm text-muted-foreground">Model: {extraction.modelUsed}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && isEditable && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
          {isEditable && !isApplied && (
            <Button
              variant="default"
              onClick={() => setShowApplyDialog(true)}
              disabled={selectedLessons.size === 0}
            >
              Apply ({selectedLessons.size} lesson{selectedLessons.size !== 1 ? 's' : ''})
            </Button>
          )}
          {isApplied && <Badge variant="default">Applied</Badge>}
          {!isApplied && (
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar (while processing) */}
      {['pending', 'processing'].includes(extraction.extractionStatus) && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Extracting lessons from PDF...</span>
              <span>{extraction.progressPercent ?? 0}%</span>
            </div>
            <Progress value={extraction.progressPercent ?? 0} />
            {extraction.totalChunks && (
              <p className="text-xs text-muted-foreground">
                Chunk {extraction.processedChunks} of {extraction.totalChunks}
              </p>
            )}
            {polling && (
              <p className="text-xs text-muted-foreground animate-pulse">Polling for updates...</p>
            )}
          </CardContent>
        </Card>
      )}

      {pollingWarning && (
        <Card className="border-yellow-500/60">
          <CardContent className="p-4 text-sm text-yellow-800">
            {pollingWarning}
          </CardContent>
        </Card>
      )}

      {/* Failed message */}
      {extraction.extractionStatus === 'failed' && (
        <Card className="border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive font-medium">This extraction failed.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start a new run from the class Extraction tab. Scanned PDFs and image-only files usually need OCR-friendly source text first.
            </p>
            {extraction.errorMessage && (
              <pre className="mt-3 whitespace-pre-wrap rounded-md bg-destructive/10 p-3 text-xs text-destructive">
                {extraction.errorMessage}
              </pre>
            )}
          </CardContent>
        </Card>
      )}

      {/* Module-level title & description (editable) */}
      {(isEditable || isApplied) && editLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Module Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label>Module Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => {
                  setEditTitle(e.target.value);
                  setDirty(true);
                }}
                disabled={!isEditable || isApplied}
                placeholder="Module title"
              />
            </div>
            <div>
              <Label>Module Description</Label>
              <Textarea
                value={editDescription}
                onChange={(e) => {
                  setEditDescription(e.target.value);
                  setDirty(true);
                }}
                disabled={!isEditable || isApplied}
                placeholder="Module description"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lessons list (editable) */}
      {(isEditable || isApplied) && editLessons.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Extracted Lessons ({editLessons.length})
          </h2>

          {editLessons.map((lesson, li) => (
            <Card key={li} className={`transition-all shadow-sm ${selectedLessons.has(li) ? 'ring-2 ring-primary' : ''}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {isEditable && !isApplied && (
                      <input
                        type="checkbox"
                        checked={selectedLessons.has(li)}
                        onChange={() => toggleLessonSelected(li)}
                        className="h-4 w-4"
                      />
                    )}
                    <div className="flex-1">
                      <Input
                        value={lesson.title}
                        onChange={(e) => updateLesson(li, 'title', e.target.value)}
                        disabled={!isEditable || isApplied}
                        className="font-semibold"
                        placeholder="Lesson title"
                      />
                    </div>
                    <Badge variant="outline">Lesson {li + 1}</Badge>
                  </div>
                  {isEditable && !isApplied && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive ml-2"
                      onClick={() => removeLesson(li)}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                {/* Lesson description */}
                <div className="mt-2">
                  <Textarea
                    value={lesson.description || ''}
                    onChange={(e) => updateLesson(li, 'description', e.target.value)}
                    disabled={!isEditable || isApplied}
                    placeholder="Lesson description"
                    rows={1}
                    className="text-sm"
                  />
                </div>
              </CardHeader>

              <CardContent className="pt-0 space-y-3">
                {lesson.blocks.map((block, bi) => (
                  <div
                    key={bi}
                    className="relative rounded-md border p-3 space-y-2 bg-muted/20"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {blockTypeLabel[block.type] || block.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">#{bi + 1}</span>
                      </div>
                      {isEditable && !isApplied && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive h-6 text-xs"
                          onClick={() => removeBlock(li, bi)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* Block type selector */}
                    {isEditable && !isApplied && (
                      <div>
                        <select
                          value={block.type}
                          onChange={(e) => updateBlock(li, bi, 'type', e.target.value)}
                          className="rounded-md border px-2 py-1 text-xs"
                        >
                          {Object.entries(blockTypeLabel).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Block content */}
                    <Textarea
                      value={getBlockTextContent(block)}
                      onChange={(e) =>
                        updateBlock(
                          li,
                          bi,
                          'content',
                          buildBlockContent(block, e.target.value),
                        )
                      }
                      disabled={!isEditable || isApplied}
                      rows={block.type === 'divider' ? 1 : 4}
                      className="text-sm font-mono"
                    />
                  </div>
                ))}

                {lesson.blocks.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-2">No content blocks</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Apply confirmation dialog */}
      <Dialog open={showApplyDialog} onOpenChange={setShowApplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Extraction</DialogTitle>
            <DialogDescription>
              This will create <strong>{selectedLessons.size} lesson(s)</strong> as drafts in the class.
              You can publish them individually afterwards.
            </DialogDescription>
          </DialogHeader>
          {dirty && (
            <p className="text-sm text-yellow-600">
              You have unsaved edits. They will NOT be included unless you save first.
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApplyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleApply} disabled={applying}>
              {applying ? 'Creating lessons...' : 'Confirm & Apply'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}


