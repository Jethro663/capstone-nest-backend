'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenText,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  History,
  ImageIcon,
  LayoutPanelTop,
  Minus,
  MoreHorizontal,
  NotebookPen,
  Paperclip,
  PencilLine,
  Plus,
  Rocket,
  RotateCcw,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { lessonService } from '@/services/lesson-service';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { normalizeRichText } from '@/lib/rich-text';
import { toast } from 'sonner';
import { TeacherSectionCard } from '@/components/teacher/TeacherPageShell';
import { classService } from '@/services/class-service';
import type { Lesson, ContentBlock, CreateContentBlockDto } from '@/types/lesson';
import type { LessonVersion } from '@/types/lesson';
import type { ClassItem } from '@/types/class';
import {
  createStructuredLessonBlockContent,
  normalizeStructuredLessonBlock,
  type StructuredLessonTextVariant,
} from '@/features/lesson-blocks/structured-content';
import {
  LessonBlockTeacherEditor,
  LessonBlockTeacherPreview,
} from '@/features/lesson-blocks/LessonBlockTeacherEditor';
import { cn } from '@/utils/cn';

type LessonBlockPaletteItem = {
  type: CreateContentBlockDto['type'];
  variant?: StructuredLessonTextVariant;
  label: string;
  hint: string;
  icon: typeof PencilLine;
};

const BLOCK_TYPES: ReadonlyArray<LessonBlockPaletteItem> = [
  {
    type: 'text',
    variant: 'body',
    label: 'Body paragraph',
    hint: 'Use this for explanations, instructions, or summaries.',
    icon: PencilLine,
  },
  {
    type: 'text',
    variant: 'objectives',
    label: 'Learning objectives',
    hint: 'Highlight what learners should reach by the end of the lesson.',
    icon: Sparkles,
  },
  {
    type: 'text',
    variant: 'key_points',
    label: 'Key points',
    hint: 'Emphasize the ideas students need to remember.',
    icon: BookOpenText,
  },
  {
    type: 'text',
    variant: 'example',
    label: 'Worked example',
    hint: 'Add a concrete example that makes the concept easier to understand.',
    icon: PencilLine,
  },
  {
    type: 'image',
    label: 'Image',
    hint: 'Upload or select a secure image from Nexora Library.',
    icon: ImageIcon,
  },
  {
    type: 'video',
    label: 'Video',
    hint: 'Drop in a video link for walkthroughs or demonstrations.',
    icon: Video,
  },
  {
    type: 'question',
    label: 'Checkpoint',
    hint: 'Add a reflection prompt or quick learner checkpoint.',
    icon: CircleHelp,
  },
  {
    type: 'text',
    variant: 'recap',
    label: 'Recap',
    hint: 'Close the lesson with a short summary of the core idea.',
    icon: Rocket,
  },
  {
    type: 'text',
    variant: 'reflection',
    label: 'Reflection',
    hint: 'Ask learners to connect the lesson to what they already know.',
    icon: Sparkles,
  },
  {
    type: 'file',
    label: 'File',
    hint: 'Upload or select a worksheet, PDF, text file, or deck.',
    icon: Paperclip,
  },
  {
    type: 'divider',
    label: 'Divider',
    hint: 'Break the lesson into clearer parts without extra text.',
    icon: Minus,
  },
] as const;

type LessonEditorTab = 'overview' | 'content';

function normalizeRichValue(input?: string | null) {
  return normalizeRichText(input || '').trim();
}

function reorderBlocksLocally(items: ContentBlock[], fromIndex: number, toIndex: number) {
  const next = items.slice();
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return items;
  next.splice(toIndex, 0, moved);
  return next.map((block, index) => ({ ...block, order: index + 1 }));
}

function isNestedInteractiveTarget(
  event: ReactMouseEvent<HTMLElement> | ReactKeyboardEvent<HTMLElement>,
) {
  if (!(event.target instanceof Element)) return false;
  const interactive = event.target.closest(
    'button, a, input, textarea, select, [contenteditable="true"], [role="button"]',
  );
  return Boolean(interactive && interactive !== event.currentTarget);
}

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reorderingBlocks, setReorderingBlocks] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [addBlockDialogOpen, setAddBlockDialogOpen] = useState(false);
  const [insertAfterIndex, setInsertAfterIndex] = useState<number | null>(null);
  const [hideFloatingAdd, setHideFloatingAdd] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [versions, setVersions] = useState<LessonVersion[]>([]);
  const [selectedVersionId, setSelectedVersionId] = useState<string>('');
  const [creatingVersion, setCreatingVersion] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(false);
  const [activeTab, setActiveTab] = useState<LessonEditorTab>('overview');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);
  const detailsSaveInFlightRef = useRef(false);
  const lastSavedDetailsRef = useRef<{ title: string; description: string }>({
    title: '',
    description: '',
  });
  const [detailsDirty, setDetailsDirty] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [res, versionsRes] = await Promise.all([
        lessonService.getById(lessonId),
        lessonService.getVersions(lessonId),
      ]);
      setLesson(res.data);
      if (res.data.classId) {
        const classResponse = await classService.getById(res.data.classId).catch(() => null);
        setClassItem(classResponse?.data ?? null);
      } else {
        setClassItem(null);
      }
      setTitle(res.data.title);
      const normalizedDescription = normalizeRichValue(res.data.description);
      setDescription(normalizedDescription);
      lastSavedDetailsRef.current = {
        title: res.data.title,
        description: normalizedDescription,
      };
      setDetailsDirty(false);
      setBlocks(
        (res.data.contentBlocks || [])
          .sort((a, b) => a.order - b.order)
          .map((block) => normalizeStructuredLessonBlock(block)),
      );
      setVersions(versionsRes.data || []);
      setSelectedVersionId((versionsRes.data || [])[0]?.id ?? '');
    } catch {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  const refreshVersions = useCallback(async () => {
    try {
      const response = await lessonService.getVersions(lessonId);
      setVersions(response.data || []);
      setSelectedVersionId((response.data || [])[0]?.id ?? '');
    } catch {
      // keep silent; editor should remain usable even if version feed fails
    }
  }, [lessonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const persistLessonDetails = useCallback(async (
    options?: { notify?: boolean },
  ) => {
    const normalizedTitle = title.trim();
    const normalizedDescription = normalizeRichValue(description);

    if (!normalizedTitle) {
      if (options?.notify) {
        toast.error('Lesson title is required');
      }
      return;
    }

    if (
      normalizedTitle === lastSavedDetailsRef.current.title &&
      normalizedDescription === lastSavedDetailsRef.current.description
    ) {
      setDetailsDirty(false);
      return;
    }

    if (detailsSaveInFlightRef.current) {
      return;
    }

    try {
      detailsSaveInFlightRef.current = true;
      setSaving(true);
      await lessonService.update(lessonId, {
        title: normalizedTitle,
        description: normalizedDescription,
      });
      setLesson((prev) => (
        prev
          ? {
              ...prev,
              title: normalizedTitle,
              description: normalizedDescription,
            }
          : prev
      ));
      lastSavedDetailsRef.current = {
        title: normalizedTitle,
        description: normalizedDescription,
      };
      setDetailsDirty(false);
      await refreshVersions();
      if (options?.notify) {
        toast.success('Lesson details saved');
      }
    } catch {
      if (options?.notify) {
        toast.error('Failed to save lesson details');
      } else {
        toast.error('Autosave failed. Use Save Changes to retry.');
      }
    } finally {
      detailsSaveInFlightRef.current = false;
      setSaving(false);
    }
  }, [description, lessonId, refreshVersions, title]);

  const handleSaveDetails = async () => {
    await persistLessonDetails({ notify: true });
  };

  useEffect(() => {
    if (loading) return;

    const normalizedTitle = title.trim();
    const normalizedDescription = normalizeRichValue(description);
    const hasChanges =
      normalizedTitle !== lastSavedDetailsRef.current.title ||
      normalizedDescription !== lastSavedDetailsRef.current.description;
    setDetailsDirty(hasChanges);

    if (!hasChanges) return;

    const timer = window.setTimeout(() => {
      void persistLessonDetails({ notify: false });
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [description, loading, persistLessonDetails, title]);

  useEffect(() => {
    const observerTarget = bottomSentinelRef.current;
    if (!observerTarget) return;

    const observer = new IntersectionObserver(
      (entries) => {
        setHideFloatingAdd(Boolean(entries[0]?.isIntersecting));
      },
      { root: null, threshold: 0.12 },
    );
    observer.observe(observerTarget);
    return () => observer.disconnect();
  }, [blocks.length]);

  const persistBlockOrder = useCallback(async (
    nextBlocks: ContentBlock[],
    options?: { silent?: boolean },
  ) => {
    setReorderingBlocks(true);
    try {
      await lessonService.reorderBlocks(lessonId, {
        blocks: nextBlocks.map((block, index) => ({
          id: block.id,
          order: index + 1,
        })),
      });
      await refreshVersions();
      if (!options?.silent) {
        toast.success('Block order updated');
      }
    } catch {
      toast.error('Failed to save block order');
      await fetchData();
    } finally {
      setReorderingBlocks(false);
    }
  }, [fetchData, lessonId, refreshVersions]);

  const handlePublishToggle = async () => {
    if (!lesson) return;
    try {
      if (lesson.isDraft) {
        await lessonService.publish(lessonId);
        setLesson((prev) => (prev ? { ...prev, isDraft: false } : prev));
        toast.success('Lesson published');
      } else {
        await lessonService.update(lessonId, { isDraft: true });
        setLesson((prev) => (prev ? { ...prev, isDraft: true } : prev));
        toast.success('Lesson moved back to draft');
      }
      await refreshVersions();
    } catch {
      toast.error('Failed to update lesson status');
    }
  };

  const handleOpenAddDialog = (afterIndex: number | null = null) => {
    setInsertAfterIndex(afterIndex);
    setAddBlockDialogOpen(true);
  };

  const handleAddBlock = async (
    type: CreateContentBlockDto['type'],
    options?: { variant?: StructuredLessonTextVariant },
  ) => {
    try {
      const dto: CreateContentBlockDto = {
        type,
        order: blocks.length + 1,
        content: createStructuredLessonBlockContent(type, options?.variant),
        metadata:
          type === 'text' && options?.variant
            ? { variant: options.variant }
            : type === 'question'
              ? { correctAnswers: [], explanation: '', points: 0 }
              : undefined,
      };
      const res = await lessonService.createBlock(lessonId, dto);
      const createdBlock = normalizeStructuredLessonBlock(res.data);
      const appended = [...blocks, createdBlock];
      const shouldInsertAfter = insertAfterIndex !== null && insertAfterIndex < blocks.length;
      const nextBlocks = shouldInsertAfter
        ? reorderBlocksLocally(appended, appended.length - 1, insertAfterIndex + 1)
        : appended;
      setBlocks(nextBlocks);
      await refreshVersions();
      setAddBlockDialogOpen(false);
      setInsertAfterIndex(null);
      if (shouldInsertAfter) {
        await persistBlockOrder(nextBlocks, { silent: true });
      }
      setActiveTab('content');
      if (type !== 'divider') setEditingBlockId(res.data.id);
      toast.success('Block added');
    } catch {
      toast.error('Failed to add block');
    }
  };

  const handleMoveBlock = async (blockId: string, direction: 'up' | 'down') => {
    const fromIndex = blocks.findIndex((block) => block.id === blockId);
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;
    if (toIndex >= blocks.length) return;

    const nextBlocks = reorderBlocksLocally(blocks, fromIndex, toIndex);
    setBlocks(nextBlocks);
    await persistBlockOrder(nextBlocks, { silent: true });
  };

  const handleUpdateBlock = async (
    blockId: string,
    patch: { content: ContentBlock['content']; metadata?: ContentBlock['metadata'] },
  ) => {
    try {
      await lessonService.updateBlock(blockId, patch);
      setBlocks((prev) => prev.map((block) => (
        block.id === blockId ? normalizeStructuredLessonBlock({ ...block, ...patch }) : block
      )));
      setEditingBlockId(null);
      await refreshVersions();
      toast.success('Block updated');
    } catch {
      toast.error('Failed to update block');
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    setConfirmation({
      title: 'Delete content block?',
      description: 'This removes the selected lesson block from the lesson permanently.',
      confirmLabel: 'Delete Block',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await lessonService.deleteBlock(blockId);
          setBlocks((prev) => prev.filter((block) => block.id !== blockId));
          await refreshVersions();
          toast.success('Block deleted');
        } catch {
          toast.error('Failed to delete block');
        }
      },
    });
  };

  const handleCreateManualSnapshot = async () => {
    try {
      setCreatingVersion(true);
      await lessonService.createVersion(lessonId, {
        label: `Manual snapshot - ${new Date().toLocaleString()}`,
      });
      await refreshVersions();
      toast.success('Lesson snapshot created');
    } catch {
      toast.error('Failed to create lesson snapshot');
    } finally {
      setCreatingVersion(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!selectedVersionId) return;
    setConfirmation({
      title: 'Restore selected lesson snapshot?',
      description:
        'This will replace current lesson details and content blocks with the selected snapshot.',
      confirmLabel: 'Restore Snapshot',
      tone: 'danger',
      onConfirm: async () => {
        try {
          setRestoringVersion(true);
          await lessonService.restoreVersion(lessonId, selectedVersionId);
          await fetchData();
          toast.success('Lesson restored from snapshot');
        } catch {
          toast.error('Failed to restore lesson snapshot');
        } finally {
          setRestoringVersion(false);
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[34rem] rounded-[1.7rem]" />
      </div>
    );
  }

  if (!lesson) return <p className="text-muted-foreground">Lesson not found.</p>;

  const blockSummary = blocks.reduce(
    (summary, block) => {
      if (block.type === 'text') summary.text += 1;
      if (block.type === 'image' || block.type === 'video') summary.media += 1;
      if (block.type === 'question') summary.checkpoints += 1;
      if (block.type === 'file') summary.files += 1;
      if (block.type === 'divider') summary.dividers += 1;
      return summary;
    },
    { text: 0, media: 0, checkpoints: 0, files: 0, dividers: 0 },
  );

  return (
    <>
      <div className={role === 'admin' ? 'theme-admin-bridge w-full min-w-0 space-y-6 pb-8' : 'w-full min-w-0 space-y-6 pb-8'}>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as LessonEditorTab)} className="space-y-5">
          <div className="space-y-3">
            <header className="rounded-[1.35rem] border border-[var(--teacher-outline)] bg-white px-5 py-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)]">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.back()}
                      className="teacher-button-outline rounded-xl font-black"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <h1 className="truncate text-xl font-black tracking-tight text-[var(--teacher-text-strong)] md:text-[1.65rem]">
                      {title || lesson.title}
                    </h1>
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full px-3 py-1 text-[11px] font-black',
                        lesson.isDraft
                          ? 'border-amber-200 bg-amber-50 text-amber-700'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700',
                      )}
                    >
                      {lesson.isDraft ? 'Draft' : 'Published'}
                    </Badge>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        className="teacher-button-outline h-9 w-9 rounded-xl"
                        aria-label="Lesson snapshots and recovery"
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[320px] rounded-2xl border-slate-200 bg-white p-3">
                      <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
                        <div>
                          <p className="text-sm font-black text-[var(--teacher-text-strong)]">Snapshots & Recovery</p>
                          <p className="text-xs text-[var(--teacher-text-muted)]">
                            Save a manual snapshot or restore an earlier lesson version.
                          </p>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateManualSnapshot}
                          disabled={creatingVersion}
                          className="teacher-button-outline w-full rounded-xl font-black"
                        >
                          <History className="h-4 w-4" />
                          {creatingVersion ? 'Saving...' : 'Save Snapshot'}
                        </Button>

                        <select
                          value={selectedVersionId}
                          onChange={(event) => setSelectedVersionId(event.target.value)}
                          className="teacher-input h-11 w-full rounded-xl"
                        >
                          {versions.length === 0 ? (
                            <option value="">No snapshots yet</option>
                          ) : (
                            versions.map((version) => (
                              <option key={version.id} value={version.id}>
                                v{version.versionNumber} - {version.type.toUpperCase()} - {new Date(version.createdAt).toLocaleString()}
                              </option>
                            ))
                          )}
                        </select>

                        <Button
                          onClick={() => void handleRestoreVersion()}
                          disabled={!selectedVersionId || restoringVersion || versions.length === 0}
                          className="w-full rounded-xl border border-amber-300 bg-amber-50 font-black text-amber-800 hover:bg-amber-100"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {restoringVersion ? 'Restoring...' : 'Restore Snapshot'}
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    onClick={handlePublishToggle}
                    className={lesson.isDraft
                      ? 'teacher-button-solid rounded-xl font-black'
                      : 'rounded-xl border border-amber-300 bg-amber-50 font-black text-amber-800 hover:bg-amber-100'}
                  >
                      <Rocket className="h-4 w-4" />
                      {lesson.isDraft ? 'Publish Lesson' : 'Move To Draft'}
                  </Button>
                </div>
              </div>
            </header>

            <TabsList className="grid h-auto w-fit grid-cols-2 rounded-[1.1rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] p-1">
              <TabsTrigger
                value="overview"
                className="flex min-h-[50px] min-w-[154px] items-center justify-start gap-2 rounded-[0.9rem] px-4 py-3 text-left text-sm font-black data-[state=active]:bg-white data-[state=active]:text-[var(--teacher-text-strong)] data-[state=active]:shadow-none"
              >
                <LayoutPanelTop className="h-4 w-4" />
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
          </div>

          <TabsContent value="overview" className="mt-0">
            <TeacherSectionCard
              title="Lesson Details"
              description="Keep the title and lesson context clear here, then move to the Content tab when you are ready to arrange the lesson flow."
              className="rounded-[1.55rem]"
              contentClassName="p-5 md:p-6"
              action={(
                <Button onClick={handleSaveDetails} disabled={saving} className="teacher-button-solid rounded-xl font-black">
                  <PencilLine className="h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              )}
            >
              <div className="grid gap-5">
                <div className="space-y-2">
                  <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} className="teacher-input h-12 rounded-2xl" />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Description</Label>
                  <RichTextEditor
                    value={description}
                    onChange={setDescription}
                    minHeight={300}
                    placeholder="Write lesson context, goals, and what students should expect in this lesson."
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.2rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--teacher-text-muted)]">
                    {saving
                      ? 'Saving lesson details...'
                      : detailsDirty
                        ? 'Unsaved changes. Autosaving in 5 seconds.'
                        : 'All detail changes saved.'}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-[var(--teacher-outline)] bg-white px-4 py-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-black text-[var(--teacher-text-strong)]">Block mix</p>
                    <span className="text-xs font-semibold text-[var(--teacher-text-muted)]">Keep the lesson rhythm balanced.</span>
                  </div>
                  <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
                    {[
                      ['Text blocks', blockSummary.text],
                      ['Media', blockSummary.media],
                      ['Checkpoints', blockSummary.checkpoints],
                      ['Files', blockSummary.files],
                      ['Dividers', blockSummary.dividers],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl bg-[var(--teacher-surface-soft)] px-3 py-2 text-[var(--teacher-text-strong)]">
                        <span className="font-semibold">{label}</span>
                        <span className="text-sm font-black">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TeacherSectionCard>
          </TabsContent>

          <TabsContent value="content" className="mt-0">
            <TeacherSectionCard
              title={`Content Blocks (${blocks.length})`}
              description={blocks.length === 0
                ? 'Start with the first block type that matches your lesson flow.'
                : 'Drag blocks to reorder. Open only the block you are working on so the page stays focused.'}
              action={(
                <Button size="sm" onClick={() => handleOpenAddDialog(null)} className="teacher-button-solid rounded-xl font-black">
                  <Plus className="h-4 w-4" />
                  Add Block
                </Button>
              )}
              className="rounded-[1.55rem]"
            >
              <div className="space-y-4">
                {reorderingBlocks ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-700">
                    Saving block order...
                  </div>
                ) : null}

                {blocks.length === 0 ? (
                  <div className="space-y-3">
                    <div className="rounded-[1.5rem] border border-dashed border-[var(--teacher-outline)] bg-white/55 px-6 py-8 text-center text-sm text-[var(--teacher-text-muted)]">
                      No content blocks yet. Start quickly by choosing one below.
                    </div>
                    <div className="grid gap-3 lg:grid-cols-3">
                      {BLOCK_TYPES.map((blockType) => {
                        const Icon = blockType.icon;
                        return (
                          <button
                            key={`${blockType.type}-${blockType.variant ?? 'default'}-quick-start`}
                            type="button"
                            onClick={() => void handleAddBlock(blockType.type, { variant: blockType.variant })}
                            className="rounded-[1.35rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-4 py-4 text-left transition hover:border-[var(--teacher-accent)]/35 hover:bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <span className="mt-0.5 rounded-xl bg-white p-2 text-[var(--teacher-accent-strong)] shadow-sm">
                                <Icon className="h-4 w-4" />
                              </span>
                              <div>
                                <p className="text-sm font-black text-[var(--teacher-text-strong)]">{blockType.label}</p>
                                <p className="mt-1 text-xs leading-5 text-[var(--teacher-text-muted)]">{blockType.hint}</p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {blocks.map((block, index) => {
                      const isLastBlock = index === blocks.length - 1;
                      const isEditing = editingBlockId === block.id;
                      const canClickToEdit = block.type !== 'divider' && !isEditing;
                      const canMoveUp = index > 0;
                      const canMoveDown = index < blocks.length - 1;
                      return (
                        <div key={block.id} className="group space-y-2">
                          <Card
                            role={canClickToEdit ? 'button' : undefined}
                            tabIndex={canClickToEdit ? 0 : undefined}
                            aria-label={canClickToEdit ? `Edit ${block.type} block ${index + 1}` : undefined}
                            onClick={(event) => {
                              if (!canClickToEdit || isNestedInteractiveTarget(event)) return;
                              setEditingBlockId(block.id);
                            }}
                            onKeyDown={(event) => {
                              if (!canClickToEdit || isNestedInteractiveTarget(event)) return;
                              if (event.key !== 'Enter' && event.key !== ' ') return;
                              event.preventDefault();
                              setEditingBlockId(block.id);
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
                                  <span>#{index + 1}</span>
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
                                      block={block}
                                      classId={lesson.classId}
                                      classItem={classItem}
                                      onSave={(patch) => handleUpdateBlock(block.id, patch)}
                                      onCancel={() => setEditingBlockId(null)}
                                    />
                                  ) : (
                                    <LessonBlockTeacherPreview block={block} />
                                  )}
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-xl border-[var(--teacher-outline)] bg-white text-[var(--teacher-text-muted)] hover:bg-[var(--teacher-surface-soft)]"
                                  aria-label={`Move block ${index + 1} up`}
                                  disabled={!canMoveUp}
                                  onClick={() => void handleMoveBlock(block.id, 'up')}
                                >
                                  <ChevronUp className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="rounded-xl border-[var(--teacher-outline)] bg-white text-[var(--teacher-text-muted)] hover:bg-[var(--teacher-surface-soft)]"
                                  aria-label={`Move block ${index + 1} down`}
                                  disabled={!canMoveDown}
                                  onClick={() => void handleMoveBlock(block.id, 'down')}
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="rounded-xl border-rose-200 bg-white font-black text-rose-600 hover:bg-rose-50"
                                  onClick={() => handleDeleteBlock(block.id)}
                                >
                                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                                  Delete
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="flex justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              aria-label={`Add block after block ${index + 1}`}
                              onClick={() => handleOpenAddDialog(index)}
                              className={cn(
                                'teacher-button-outline h-10 min-w-14 rounded-full border-[var(--teacher-accent)]/25 bg-white px-4 shadow-[0_10px_22px_-16px_rgba(15,23,42,0.32)] transition hover:border-[var(--teacher-accent)]/55 hover:bg-rose-50/70',
                                isLastBlock
                                  ? ''
                                  : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
                              )}
                            >
                              <Plus className="h-3.5 w-3.5" />
                              <span className="ml-1 text-[11px] font-semibold leading-none tracking-[0.04em]">Add block</span>
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={bottomSentinelRef} className="h-2" />
                  </div>
                )}
              </div>
            </TeacherSectionCard>
          </TabsContent>

          {activeTab === 'content' && blocks.length > 0 && !hideFloatingAdd ? (
            <Button
              type="button"
              onClick={() => handleOpenAddDialog(null)}
              aria-label="Quick add content block"
              className="fixed bottom-5 right-5 z-30 h-11 w-11 rounded-full border border-[var(--teacher-accent)]/20 bg-[var(--teacher-accent)] p-0 text-white shadow-[0_20px_36px_-20px_rgba(15,23,42,0.45)]"
            >
              <Plus className="h-4 w-4" />
            </Button>
          ) : null}
        </Tabs>
      </div>

      <Dialog
        open={addBlockDialogOpen}
        onOpenChange={(open) => {
          setAddBlockDialogOpen(open);
          if (!open) {
            setInsertAfterIndex(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl rounded-3xl border-slate-200 p-0">
          <DialogHeader className="border-b border-slate-100 px-6 py-5">
            <DialogTitle className="text-xl font-black text-slate-900">Add Content Block</DialogTitle>
            <DialogDescription className="text-slate-500">
              Pick the next block type to continue your lesson flow.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[62vh] overflow-y-auto px-6 py-5">
            <div className="grid gap-3 lg:grid-cols-2">
              {BLOCK_TYPES.map((blockType) => {
                const Icon = blockType.icon;
                return (
                  <button
                    key={`${blockType.type}-${blockType.variant ?? 'default'}-dialog`}
                    type="button"
                    onClick={() => {
                      void handleAddBlock(blockType.type, { variant: blockType.variant });
                    }}
                    className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-4 text-left transition hover:border-[var(--teacher-accent)]/35 hover:bg-emerald-50/60"
                  >
                    <span className="mt-0.5 rounded-xl bg-white p-2 text-[var(--teacher-accent-strong)] shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>
                      <span className="block text-sm font-black text-slate-800">{blockType.label}</span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">{blockType.hint}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <DialogFooter className="border-t border-slate-100 px-6 py-4">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl font-black"
              onClick={() => {
                setAddBlockDialogOpen(false);
                setInsertAfterIndex(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}


