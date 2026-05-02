'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
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
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { normalizeRichText } from '@/lib/rich-text';
import { toast } from 'sonner';
import { TeacherSectionCard } from '@/components/teacher/TeacherPageShell';
import type { Lesson, ContentBlock, CreateContentBlockDto } from '@/types/lesson';
import type { LessonVersion } from '@/types/lesson';
import type {
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
} from '@/types/class-template';
import {
  clearTemplateEditorDraft,
  findLessonItemContext,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  updateLessonMetadataByKey,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import {
  createStructuredLessonBlockContent,
  getStructuredLessonBlockHeading,
  getStructuredLessonBlockHtml,
  getStructuredLessonQuestionModel,
  normalizeStructuredLessonBlock,
  type StructuredLessonTextVariant,
} from '@/features/lesson-blocks/structured-content';
import { cn } from '@/utils/cn';

type LessonEditorTab = 'overview' | 'content';

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
    hint: 'Paste an image URL for diagrams or visual examples.',
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
    hint: 'Link to a worksheet, PDF, or external supporting file.',
    icon: Paperclip,
  },
  {
    type: 'divider',
    label: 'Divider',
    hint: 'Break the lesson into clearer parts without extra text.',
    icon: Minus,
  },
] as const;

function getDefaultBlockContent(type: CreateContentBlockDto['type']): string {
  switch (type) {
    case 'text':
      return 'Start writing the core explanation for this lesson section.';
    case 'image':
      return 'https://';
    case 'video':
      return 'https://';
    case 'question':
      return 'Add a short checkpoint question for learners.';
    case 'file':
      return 'https://';
    case 'divider':
      return 'Section break';
    default:
      return 'New content block';
  }
}

function getBlockUrlValue(content: ContentBlock['content']): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const maybeUrl = content.url;
    if (typeof maybeUrl === 'string') return maybeUrl;
    const maybeText = content.text;
    if (typeof maybeText === 'string') return maybeText;
  }
  return '';
}

function normalizeRichValue(input?: string | null) {
  return normalizeRichText(input || '').trim();
}

function getPlainChoiceText(html: string) {
  return normalizeRichText(html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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

function parseLessonBlocks(raw: unknown, lessonKey: string): ContentBlock[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is Partial<ContentBlock> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => {
      const type = BLOCK_TYPES.some((item) => item.type === entry.type)
        ? (entry.type as CreateContentBlockDto['type'])
        : 'text';

      return normalizeStructuredLessonBlock({
        id: entry.id || `draft-${lessonKey}-${index}`,
        lessonId: entry.lessonId || lessonKey,
        type,
        order: typeof entry.order === 'number' ? entry.order : index + 1,
        content:
          typeof entry.content === 'string' ||
          (entry.content && typeof entry.content === 'object')
            ? entry.content
            : getDefaultBlockContent(type),
        metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : undefined,
      });
    })
    .sort((left, right) => left.order - right.order)
    .map((entry, index) => ({
      ...entry,
      order: index + 1,
    }));
}

export default function LessonEditorPage() {
  const params = useParams<{ id: string; lessonKey: string }>();
  const router = useRouter();
  const { role } = useAuth();
  const templateId = String(params?.id ?? '');
  const lessonKey = String(params?.lessonKey ?? '');

  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);

  const [lesson, setLesson] = useState<Lesson | null>(null);
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
  const [snapshotDropdownOpen, setSnapshotDropdownOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LessonEditorTab>('overview');
  const [snapshotPayloads, setSnapshotPayloads] = useState<
    Record<string, { title: string; description: string; isDraft: boolean; blocks: ContentBlock[] }>
  >({});

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const bottomSentinelRef = useRef<HTMLDivElement | null>(null);

  const lessonContext = useMemo(
    () => findLessonItemContext(modules, lessonKey),
    [modules, lessonKey],
  );

  const nextVersionNumberRef = useRef(1);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const workspace = await loadTemplateWorkspace(templateId);
      const cached = readTemplateEditorDraft(templateId);
      const workspaceModules = cached?.modules ?? workspace.state.modules;
      const workspaceAssessments = cached?.assessments ?? workspace.state.assessments;
      const workspaceAnnouncements = cached?.announcements ?? workspace.state.announcements;
      const context = findLessonItemContext(workspaceModules, lessonKey);

      if (!context) {
        setLesson(null);
        setTitle('');
        setDescription('');
        setBlocks([]);
        setModules(workspaceModules);
        setAssessments(workspaceAssessments);
        setAnnouncements(workspaceAnnouncements);
        setVersions([]);
        setSelectedVersionId('');
        return;
      }

      const metadata = context.item.metadata ?? {};
      const resolvedTitle =
        typeof metadata.lessonTitle === 'string' && metadata.lessonTitle.trim()
          ? metadata.lessonTitle
          : 'Untitled Lesson';
      const resolvedDescription = normalizeRichValue(
        typeof metadata.lessonSummary === 'string' ? metadata.lessonSummary : '',
      );
      const parsedBlocks = parseLessonBlocks(
        metadata.lessonBlocks ?? metadata.contentBlocks,
        lessonKey,
      );
      const isDraft =
        typeof metadata.isDraft === 'boolean'
          ? metadata.isDraft
          : true;

      setModules(workspaceModules);
      setAssessments(workspaceAssessments);
      setAnnouncements(workspaceAnnouncements);
      setLesson({
        id: lessonKey,
        title: resolvedTitle,
        description: resolvedDescription,
        classId: templateId,
        order: context.itemIndex + 1,
        isDraft,
        contentBlocks: parsedBlocks,
      });
      setTitle(resolvedTitle);
      setDescription(resolvedDescription);
      setBlocks(parsedBlocks);
      setVersions([]);
      setSelectedVersionId('');
      setSnapshotPayloads({});
      nextVersionNumberRef.current = 1;
    } catch {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonKey, templateId]);

  const refreshVersions = useCallback(async () => {
    setSelectedVersionId((current) => current || versions[0]?.id || '');
  }, [versions]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const buildDraftModulesWithLessonProgress = useCallback(() => {
    const safeTitle = title.trim() || 'Untitled Lesson';
    const safeDescription = normalizeRichValue(description);
    const normalizedBlocks = blocks.map((block, index) => ({
      ...block,
      lessonId: lessonKey,
      order: index + 1,
      content:
        typeof block.content === 'string'
          ? block.content
          : JSON.parse(JSON.stringify(block.content ?? {})),
    }));

    return updateLessonMetadataByKey(modules, lessonKey, {
      lessonTitle: safeTitle,
      lessonSummary: safeDescription,
      lessonBlocks: normalizedBlocks,
      isDraft: lesson?.isDraft ?? true,
    });
  }, [blocks, description, lesson?.isDraft, lessonKey, modules, title]);

  const persistLessonDraft = useCallback(() => {
    if (!templateId || loading) return;
    const draftModules = buildDraftModulesWithLessonProgress();
    writeTemplateEditorDraft(templateId, {
      modules: draftModules,
      assessments,
      announcements,
    });
  }, [
    announcements,
    assessments,
    buildDraftModulesWithLessonProgress,
    loading,
    templateId,
  ]);

  useEffect(() => {
    if (!templateId || loading) return;
    const handle = window.setTimeout(() => {
      persistLessonDraft();
    }, 350);
    return () => window.clearTimeout(handle);
  }, [loading, persistLessonDraft, templateId]);

  const persistTemplateLesson = useCallback(async (
    {
      nextTitle = title,
      nextDescription = description,
      nextBlocks = blocks,
      nextDraft = lesson?.isDraft ?? true,
    }: {
      nextTitle?: string;
      nextDescription?: string;
      nextBlocks?: ContentBlock[];
      nextDraft?: boolean;
    } = {},
    options?: { successMessage?: string; silent?: boolean },
  ): Promise<boolean> => {
    if (!lessonContext) return false;

    const safeTitle = nextTitle.trim() || 'Untitled Lesson';
    const safeDescription = normalizeRichValue(nextDescription);
    const normalizedBlocks = nextBlocks.map((block, index) => ({
      ...block,
      lessonId: lessonKey,
      order: index + 1,
      content:
        typeof block.content === 'string'
          ? block.content
          : JSON.parse(JSON.stringify(block.content ?? {})),
    }));

    const nextModules = updateLessonMetadataByKey(modules, lessonKey, {
      lessonTitle: safeTitle,
      lessonSummary: safeDescription,
      lessonBlocks: normalizedBlocks,
      isDraft: nextDraft,
    });

    try {
      setSaving(true);
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules: nextModules,
        assessments,
        announcements,
      });

      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      setLesson((current) => (
        current
          ? {
            ...current,
            title: safeTitle,
            description: safeDescription,
            isDraft: nextDraft,
            contentBlocks: normalizedBlocks,
          }
          : current
      ));
      setTitle(safeTitle);
      setDescription(safeDescription);
      setBlocks(normalizedBlocks);
      clearTemplateEditorDraft(templateId);

      if (!options?.silent && options?.successMessage) {
        toast.success(options.successMessage);
      }
      return true;
    } catch {
      if (!options?.silent) {
        toast.error('Failed to save lesson');
      }
      return false;
    } finally {
      setSaving(false);
    }
  }, [
    announcements,
    assessments,
    blocks,
    description,
    lesson?.isDraft,
    lessonContext,
    lessonKey,
    modules,
    templateId,
    title,
  ]);

  const handleSaveDetails = async () => {
    await persistTemplateLesson({}, { successMessage: 'Lesson details saved' });
    await refreshVersions();
  };

  const handlePublishToggle = async () => {
    if (!lesson) return;
    const nextDraft = !lesson.isDraft;
    const success = await persistTemplateLesson(
      { nextDraft },
      { successMessage: nextDraft ? 'Lesson moved to draft' : 'Lesson published' },
    );
    if (!success) return;
    await refreshVersions();
  };

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
    const saved = await persistTemplateLesson(
      { nextBlocks },
      { silent: true },
    );
    if (saved) {
      await refreshVersions();
      if (!options?.silent) {
        toast.success('Block order updated');
      }
    } else if (!options?.silent) {
      toast.error('Failed to save block order');
    }
    setReorderingBlocks(false);
  }, [persistTemplateLesson, refreshVersions]);

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
        content:
          type === 'text' || type === 'question'
            ? createStructuredLessonBlockContent(type, options?.variant)
            : getDefaultBlockContent(type),
        metadata: options?.variant ? { variant: options.variant } : undefined,
      };
      const createdBlock = normalizeStructuredLessonBlock({
        id: `draft-${lessonKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        lessonId: lessonKey,
        ...dto,
      });
      const appended = [...blocks, createdBlock];
      const shouldInsertAfter = insertAfterIndex !== null && insertAfterIndex < blocks.length;
      const nextBlocks = shouldInsertAfter
        ? reorderBlocksLocally(appended, appended.length - 1, insertAfterIndex + 1)
        : appended;
      setBlocks(nextBlocks);
      await persistTemplateLesson(
        { nextBlocks },
        { silent: true },
      );
      await refreshVersions();
      setAddBlockDialogOpen(false);
      setInsertAfterIndex(null);
      if (shouldInsertAfter) {
        await persistBlockOrder(nextBlocks, { silent: true });
      }
      if (type !== 'divider') setEditingBlockId(createdBlock.id);
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
    const nextBlocks = blocks.map((block) => (
      block.id === blockId ? normalizeStructuredLessonBlock({ ...block, ...patch }) : block
    ));
    setBlocks(nextBlocks);
    const success = await persistTemplateLesson(
      { nextBlocks },
      { silent: true },
    );
    if (!success) {
      toast.error('Failed to update block');
      return;
    }
    setEditingBlockId(null);
    await refreshVersions();
    toast.success('Block updated');
  };

  const handleDeleteBlock = (blockId: string) => {
    setConfirmation({
      title: 'Delete content block?',
      description: 'This removes the selected lesson block from the lesson permanently.',
      confirmLabel: 'Delete Block',
      tone: 'danger',
      onConfirm: async () => {
        const nextBlocks = blocks.filter((block) => block.id !== blockId);
        setBlocks(nextBlocks);
        const success = await persistTemplateLesson(
          { nextBlocks },
          { silent: true },
        );
        if (!success) {
          toast.error('Failed to delete block');
          return;
        }
        await refreshVersions();
        toast.success('Block deleted');
      },
    });
  };

  const handleCreateManualSnapshot = async () => {
    try {
      setCreatingVersion(true);
      const snapshotId = `snapshot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const nowIso = new Date().toISOString();
      setSnapshotPayloads((current) => ({
        ...current,
        [snapshotId]: {
          title: title || lesson?.title || 'Untitled Lesson',
          description,
          isDraft: lesson?.isDraft ?? true,
          blocks: blocks.map((block) => ({
            ...block,
            content:
              typeof block.content === 'string'
                ? block.content
                : JSON.parse(JSON.stringify(block.content ?? {})),
          })),
        },
      }));
      setVersions((current) => {
        const nextVersion: LessonVersion = {
          id: snapshotId,
          lessonId: lessonKey,
          versionNumber: nextVersionNumberRef.current,
          type: 'manual',
          label: `Manual snapshot - ${new Date(nowIso).toLocaleString()}`,
          createdAt: nowIso,
        };
        nextVersionNumberRef.current += 1;
        return [nextVersion, ...current];
      });
      setSelectedVersionId(snapshotId);
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
        const snapshot = snapshotPayloads[selectedVersionId];
        if (!snapshot) {
          toast.error('Selected snapshot is no longer available');
          return;
        }

        try {
          setRestoringVersion(true);
          const success = await persistTemplateLesson(
            {
              nextTitle: snapshot.title,
              nextDescription: snapshot.description,
              nextBlocks: snapshot.blocks,
              nextDraft: snapshot.isDraft,
            },
            { silent: true },
          );
          if (!success) {
            toast.error('Failed to restore lesson snapshot');
            return;
          }
          const restoreId = `restore-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          const nowIso = new Date().toISOString();
          setVersions((current) => {
            const restoreVersion: LessonVersion = {
              id: restoreId,
              lessonId: lessonKey,
              versionNumber: nextVersionNumberRef.current,
              type: 'restore',
              label: `Restored from snapshot - ${new Date(nowIso).toLocaleString()}`,
              createdAt: nowIso,
            };
            nextVersionNumberRef.current += 1;
            return [restoreVersion, ...current];
          });
          setSelectedVersionId(restoreId);
          await refreshVersions();
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

  const latestSnapshotLabel = versions[0]
    ? `v${versions[0].versionNumber} - ${versions[0].type.toUpperCase()}`
    : 'No snapshots yet';

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
                      onClick={() => {
                        persistLessonDraft();
                        router.back();
                      }}
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
                  <DropdownMenu open={snapshotDropdownOpen} onOpenChange={setSnapshotDropdownOpen}>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[320px] rounded-2xl border-slate-200 bg-white p-3">
                      <div className="space-y-3" onClick={(event) => event.stopPropagation()}>
                        <div>
                          <p className="text-sm font-black text-[var(--teacher-text-strong)]">Restore snapshot</p>
                          <p className="text-xs text-[var(--teacher-text-muted)]">Pick a saved version to roll back this lesson.</p>
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
                          className="teacher-input h-10 w-full rounded-xl"
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
                          onClick={() => {
                            setSnapshotDropdownOpen(false);
                            void handleRestoreVersion();
                          }}
                          disabled={!selectedVersionId || restoringVersion || versions.length === 0}
                          className="teacher-button-solid w-full rounded-xl font-black"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {restoringVersion ? 'Restoring...' : 'Restore Snapshot'}
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <Button
                    size="sm"
                    onClick={() => void handlePublishToggle()}
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
                    {saving ? 'Saving lesson details...' : `Latest snapshot: ${latestSnapshotLabel}`}
                  </p>
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
                            onClick={() => handleAddBlock(blockType.type, { variant: blockType.variant })}
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
                                    <BlockEditor
                                      block={block}
                                      onSave={(patch) => handleUpdateBlock(block.id, patch)}
                                      onCancel={() => setEditingBlockId(null)}
                                    />
                                  ) : (
                                    <BlockPreview block={block} />
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

function BlockEditor({
  block,
  onSave,
  onCancel,
}: {
  block: ContentBlock;
  onSave: (patch: { content: ContentBlock['content']; metadata?: ContentBlock['metadata'] }) => void;
  onCancel: () => void;
}) {
  const normalizedBlock = normalizeStructuredLessonBlock(block);
  const questionModel = getStructuredLessonQuestionModel(normalizedBlock);
  const [heading, setHeading] = useState(getStructuredLessonBlockHeading(normalizedBlock));
  const [html, setHtml] = useState(getStructuredLessonBlockHtml(normalizedBlock));
  const [prompt, setPrompt] = useState(questionModel.prompt);
  const [answerType, setAnswerType] = useState(questionModel.answerType);
  const [choicesInput, setChoicesInput] = useState(
    questionModel.choices.map((choice) => getPlainChoiceText(choice.html)).join('\n'),
  );
  const [explanation, setExplanation] = useState(questionModel.explanation);
  const [points, setPoints] = useState(questionModel.points ? String(questionModel.points) : '0');
  const [urlValue, setUrlValue] = useState(getBlockUrlValue(normalizedBlock.content));

  const handleSave = () => {
    if (normalizedBlock.type === 'text') {
      onSave({
        content: {
          heading,
          html,
        },
        metadata: normalizedBlock.metadata,
      });
      return;
    }

    if (normalizedBlock.type === 'question') {
      const choices = choicesInput
        .split(/\r?\n/)
        .map((entry) => entry.trim())
        .filter(Boolean);

      onSave({
        content: {
          prompt,
          answerType,
          choices,
        },
        metadata: {
          ...(normalizedBlock.metadata ?? {}),
          explanation,
          points: Number.isFinite(Number(points)) ? Number(points) : 0,
        },
      });
      return;
    }

    onSave({
      content: urlValue,
      metadata: normalizedBlock.metadata,
    });
  };

  return (
    <div className="space-y-4">
      {normalizedBlock.type === 'text' ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              <Label htmlFor={`heading-${block.id}`}>Section heading</Label>
              <Input
                id={`heading-${block.id}`}
                value={heading}
                onChange={(e) => setHeading(e.target.value)}
                placeholder="Add an optional heading for this section"
                className="teacher-input h-12 rounded-2xl"
              />
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-xs leading-5 text-emerald-800">
              Structured text blocks stay AI-readable and render with the lesson reader&apos;s semantic styling.
            </div>
          </div>
          <RichTextEditor
            value={html}
            onChange={setHtml}
            minHeight={220}
            placeholder="Write lesson content..."
          />
        </>
      ) : null}

      {normalizedBlock.type === 'question' ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`prompt-${block.id}`}>Checkpoint prompt</Label>
              <RichTextEditor
                value={prompt}
                onChange={setPrompt}
                minHeight={120}
                placeholder="What should learners answer here?"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`answer-type-${block.id}`}>Answer type</Label>
              <select
                id={`answer-type-${block.id}`}
                value={answerType}
                onChange={(e) => setAnswerType(e.target.value as typeof answerType)}
                className="teacher-input h-12 w-full rounded-2xl border border-[var(--teacher-outline)] bg-white px-4 text-sm text-[var(--teacher-text-strong)]"
              >
                <option value="single_select">Single select</option>
                <option value="multi_select">Multi-select</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`choices-${block.id}`}>Choices</Label>
            <textarea
              id={`choices-${block.id}`}
              value={choicesInput}
              onChange={(e) => setChoicesInput(e.target.value)}
              placeholder="One choice per line"
              className="teacher-input min-h-[140px] w-full rounded-2xl border border-[var(--teacher-outline)] bg-white px-4 py-3 text-sm text-[var(--teacher-text-strong)]"
            />
          </div>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_160px]">
            <div className="space-y-2">
              <Label htmlFor={`explanation-${block.id}`}>Explanation</Label>
              <RichTextEditor
                value={explanation}
                onChange={setExplanation}
                minHeight={160}
                placeholder="Explain the expected response or feedback learners should see."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`points-${block.id}`}>Points</Label>
              <Input
                id={`points-${block.id}`}
                type="number"
                min="0"
                step="1"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                className="teacher-input h-12 rounded-2xl"
              />
            </div>
          </div>
        </div>
      ) : null}

      {normalizedBlock.type !== 'text' && normalizedBlock.type !== 'question' ? (
        <div className="space-y-2">
          <Label htmlFor={`url-${block.id}`}>{block.type === 'file' ? 'File link' : `${block.type} URL`}</Label>
          <Input
            id={`url-${block.id}`}
            value={urlValue}
            onChange={(e) => setUrlValue(e.target.value)}
            placeholder={`Enter ${block.type} URL...`}
            className="teacher-input h-12 rounded-2xl"
          />
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} className="teacher-button-solid rounded-xl font-black">Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="teacher-button-outline rounded-xl font-black">Cancel</Button>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: ContentBlock }) {
  const baseClass = 'rounded-2xl border border-white/60 bg-white/70 px-4 py-4 text-sm text-slate-700';
  const normalizedBlock = normalizeStructuredLessonBlock(block);

  switch (normalizedBlock.type) {
    case 'text': {
      const heading = getStructuredLessonBlockHeading(normalizedBlock);
      const html = getStructuredLessonBlockHtml(normalizedBlock);
      return (
        <div className={baseClass}>
          {heading ? <p className="mb-3 text-xs font-black uppercase tracking-[0.16em] text-emerald-700">{heading}</p> : null}
          {html.trim() ? (
            <RichTextRenderer html={normalizeRichValue(html)} />
          ) : (
            'Empty text block'
          )}
        </div>
      );
    }
    case 'image':
      return <p className={baseClass}>Image URL: {getBlockUrlValue(normalizedBlock.content) || 'No URL yet'}</p>;
    case 'video':
      return <p className={baseClass}>Video URL: {getBlockUrlValue(normalizedBlock.content) || 'No URL yet'}</p>;
    case 'question': {
      const question = getStructuredLessonQuestionModel(normalizedBlock);
      return (
        <div className={`${baseClass} space-y-3`}>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-700">Checkpoint</p>
            <RichTextRenderer
              className="mt-2 text-sm font-semibold text-slate-900"
              html={normalizeRichValue(question.prompt || 'Empty question block')}
            />
          </div>
          {question.choices.length > 0 ? (
            <ul className="space-y-2">
              {question.choices.map((choice, index) => (
                <li key={`${block.id}-preview-choice-${index}`} className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-2">
                  <RichTextRenderer html={normalizeRichValue(choice.html)} />
                </li>
              ))}
            </ul>
          ) : null}
          {question.explanation ? (
            <div className="rounded-xl border border-slate-200/70 bg-white/75 px-3 py-3">
              <RichTextRenderer html={normalizeRichValue(question.explanation)} />
            </div>
          ) : null}
          <p className="text-xs font-semibold text-slate-500">{question.points} point{question.points === 1 ? '' : 's'}</p>
        </div>
      );
    }
    case 'file':
      return <p className={baseClass}>File link: {getBlockUrlValue(normalizedBlock.content) || 'No URL yet'}</p>;
    case 'divider':
      return (
        <div className="rounded-2xl border border-dashed border-[var(--teacher-outline)] bg-white/60 px-4 py-4">
          <hr className="border-[var(--teacher-outline)]" />
        </div>
      );
    default:
      return <p className={baseClass}>Unknown block type</p>;
  }
}

