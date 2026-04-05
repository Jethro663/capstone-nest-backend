'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  ClipboardList,
  Eye,
  EyeOff,
  FileText,
  GripVertical,
  Layers3,
  Lock,
  NotebookPen,
  Plus,
  Save,
  Trash2,
  Unlock,
} from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { fileService } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { ActionTooltip } from '@/components/shared/ActionTooltip';
import { cn } from '@/utils/cn';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { ClassModule, ModuleItem, ModuleItemType } from '@/types/module';
import './module-workspace.css';

type ModuleTab = 'sections' | 'visibility' | 'locking' | 'notes' | 'grading';

type AttachState = {
  open: boolean;
  sectionId: string;
  itemType: ModuleItemType | null;
  itemId: string;
  lessonPoints: string;
  file: File | null;
};

type DraggingItem = {
  sectionId: string;
  itemId: string;
} | null;

type GradingRow = {
  id: string;
  letter: string;
  label: string;
  minScore: string;
  maxScore: string;
  description: string;
};

const TAB_ITEMS: Array<{ key: ModuleTab; label: string; icon: typeof Layers3 }> = [
  { key: 'sections', label: 'Sections', icon: Layers3 },
  { key: 'visibility', label: 'Visibility', icon: Eye },
  { key: 'locking', label: 'Locking', icon: Lock },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
  { key: 'grading', label: 'Grading Scale', icon: ClipboardList },
];

const DEFAULT_GRADING_ROWS: Array<Omit<GradingRow, 'id'>> = [
  { letter: 'A', label: 'Outstanding', minScore: '90', maxScore: '100', description: 'Exceptional performance' },
  { letter: 'B+', label: 'Very Satisfactory', minScore: '85', maxScore: '89', description: 'Above average performance' },
  { letter: 'B', label: 'Satisfactory', minScore: '80', maxScore: '84', description: 'Meets expected standards' },
  { letter: 'C', label: 'Fairly Satisfactory', minScore: '75', maxScore: '79', description: 'Partially meets standards' },
  { letter: 'F', label: 'Did Not Meet Expectation', minScore: '0', maxScore: '74', description: 'Below passing threshold' },
];

function createRowId() {
  return `row-${Math.random().toString(36).slice(2, 10)}`;
}

function toParamValue(input: string | string[] | undefined) {
  if (Array.isArray(input)) return input[0] || '';
  return input || '';
}

function toSafeNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function normalizeModule(raw: ClassModule) {
  const orderedSections = [...raw.sections]
    .sort((a, b) => a.order - b.order)
    .map((section, index) => ({
      ...section,
      order: index + 1,
      items: [...section.items]
        .sort((a, b) => a.order - b.order)
        .map((item, itemIndex) => ({ ...item, order: itemIndex + 1 })),
    }));

  return {
    ...raw,
    sections: orderedSections,
  };
}

function moveEntry<T>(list: T[], fromIndex: number, toIndex: number) {
  const next = [...list];
  const [moved] = next.splice(fromIndex, 1);
  if (!moved) return list;
  next.splice(toIndex, 0, moved);
  return next;
}

function formatScheduleSummary(classItem: ClassItem) {
  const schedule = classItem.schedules?.[0];
  if (!schedule) return 'Schedule unavailable';
  const day = schedule.days?.[0] || 'Day';
  return `${day} ${schedule.startTime}-${schedule.endTime}`;
}

function iconForItemType(itemType: ModuleItemType) {
  if (itemType === 'assessment') return ClipboardList;
  if (itemType === 'file') return FileText;
  return BookOpen;
}

function titleForItem(item: ModuleItem) {
  if (item.itemType === 'lesson') return item.lesson?.title || 'Untitled lesson';
  if (item.itemType === 'assessment') return item.assessment?.title || 'Untitled assessment';
  return item.file?.originalName || 'Untitled file';
}

function statusForItem(item: ModuleItem) {
  if (item.itemType === 'lesson') {
    return item.lesson?.isDraft ? 'Draft' : 'Published';
  }
  if (item.itemType === 'assessment') {
    return item.assessment?.isPublished ? 'Published' : 'Draft';
  }
  return 'File';
}

function itemMeta(item: ModuleItem) {
  if (item.itemType === 'assessment') {
    const scoreText = item.assessment?.totalPoints ? `${item.assessment.totalPoints} pts` : 'Assessment';
    return scoreText;
  }
  if (item.itemType === 'file') {
    return item.file?.mimeType || 'File';
  }
  return 'Lesson';
}

function getItemEditorHref(item: ModuleItem, classId: string, moduleId: string) {
  if (item.itemType === 'lesson' && item.lessonId) {
    return `/dashboard/teacher/lessons/${item.lessonId}/edit`;
  }
  if (item.itemType === 'assessment' && item.assessmentId) {
    return `/dashboard/teacher/assessments/${item.assessmentId}/edit`;
  }
  if (item.itemType === 'file' && item.fileId) {
    return `/dashboard/teacher/classes/${classId}/modules/${moduleId}/files/${item.fileId}`;
  }
  return null;
}

function buildGradingRows(module: ClassModule | null) {
  if (!module || module.gradingScaleEntries.length === 0) {
    return DEFAULT_GRADING_ROWS.map((entry) => ({ ...entry, id: createRowId() }));
  }

  return [...module.gradingScaleEntries]
    .sort((a, b) => a.order - b.order)
    .map((entry) => ({
      id: entry.id || createRowId(),
      letter: entry.letter || '',
      label: entry.label || '',
      minScore: String(entry.minScore ?? ''),
      maxScore: String(entry.maxScore ?? ''),
      description: entry.description || '',
    }));
}

export default function TeacherModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const classId = toParamValue(params.id);
  const moduleId = toParamValue(params.moduleId);

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [classModules, setClassModules] = useState<ClassModule[]>([]);
  const [module, setModule] = useState<ClassModule | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [activeTab, setActiveTab] = useState<ModuleTab>('sections');
  const [loading, setLoading] = useState(true);
  const [creatingSection, setCreatingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingScale, setSavingScale] = useState(false);
  const [gradingRows, setGradingRows] = useState<GradingRow[]>([]);
  const [updatingModule, setUpdatingModule] = useState(false);
  const [attachingItem, setAttachingItem] = useState(false);
  const [attachState, setAttachState] = useState<AttachState>({
    open: false,
    sectionId: '',
    itemType: null,
    itemId: '',
    lessonPoints: '0',
    file: null,
  });
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [editingSectionTitle, setEditingSectionTitle] = useState('');
  const [savingSectionEdit, setSavingSectionEdit] = useState(false);
  const [draggingSectionId, setDraggingSectionId] = useState<string | null>(null);
  const [draggingItem, setDraggingItem] = useState<DraggingItem>(null);
  const [pendingItemIds, setPendingItemIds] = useState<Record<string, boolean>>({});
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchData = useCallback(async () => {
    if (!classId || !moduleId) return;

    try {
      setLoading(true);
      const [classResponse, modulesResponse, lessonResponse, assessmentResponse] = await Promise.all([
        classService.getById(classId),
        moduleService.getByClass(classId),
        lessonService.getByClass(classId),
        assessmentService.getByClass(classId),
      ]);

      const resolvedClass = classResponse.data || null;
      const normalizedModules = (modulesResponse.data || []).map((entry) =>
        normalizeModule(entry),
      );
      const currentModule =
        normalizedModules.find((entry) => entry.id === moduleId) || null;

      setClassItem(resolvedClass);
      setClassModules(normalizedModules);
      setModule(currentModule);
      setLessons(lessonResponse.data || []);
      setAssessments(assessmentResponse.data || []);
      setNotesDraft(currentModule?.teacherNotes || '');
      setGradingRows(buildGradingRows(currentModule));
      setExpandedSections((current) => {
        if (!currentModule) return {};
        const next: Record<string, boolean> = {};
        currentModule.sections.forEach((section) => {
          next[section.id] = current[section.id] ?? true;
        });
        return next;
      });
    } catch {
      setClassItem(null);
      setClassModules([]);
      setModule(null);
      setLessons([]);
      setAssessments([]);
      toast.error('Unable to load module details');
    } finally {
      setLoading(false);
    }
  }, [classId, moduleId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const sectionList = useMemo(() => module?.sections || [], [module]);

  const allAttachedAssessmentIds = useMemo(() => {
    return new Set(
      sectionList.flatMap((section) =>
        section.items
          .filter((item) => item.itemType === 'assessment' && item.assessmentId)
          .map((item) => item.assessmentId as string),
      ),
    );
  }, [sectionList]);

  const availableAttachOptions = useMemo(() => {
    if (attachState.itemType === 'assessment') {
      return assessments
        .filter((assessment) => !allAttachedAssessmentIds.has(assessment.id))
        .map((assessment) => ({ id: assessment.id, label: assessment.title }));
    }
    return [];
  }, [assessments, allAttachedAssessmentIds, attachState.itemType]);

  const attachDialogTitle =
    attachState.itemType === 'lesson'
      ? 'Add Lesson Block'
      : attachState.itemType === 'assessment'
        ? 'Add Assessment Block'
        : attachState.itemType === 'file'
          ? 'Add PDF Block'
          : 'Add Block';

  const attachDialogDescription =
    attachState.itemType === 'lesson'
      ? 'Create a new empty lesson, attach it to this section, then open the lesson editor.'
      : attachState.itemType === 'assessment'
        ? 'Attach an assessment block. New assessment blocks start with Give unchecked.'
        : attachState.itemType === 'file'
          ? 'Upload a PDF and attach it as a downloadable module block.'
          : 'Choose the block type you want to add to this section.';

  const canSubmitAttach =
    attachState.itemType === 'file'
      ? Boolean(attachState.file)
      : attachState.itemType === 'lesson'
        ? true
      : attachState.itemType === null
        ? false
        : Boolean(attachState.itemId);

  useEffect(() => {
    if (!attachState.open) return;
    if (
      attachState.itemType === 'file' ||
      attachState.itemType === 'lesson' ||
      attachState.itemType === null
    ) {
      return;
    }
    setAttachState((current) => {
      if (current.itemId && availableAttachOptions.some((option) => option.id === current.itemId)) {
        return current;
      }
      return {
        ...current,
        itemId: availableAttachOptions[0]?.id || '',
      };
    });
  }, [attachState.itemType, attachState.open, availableAttachOptions]);

  const lessonCount = sectionList.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'lesson').length,
    0,
  );

  const attachedLessonIdsAcrossClass = useMemo(() => {
    return new Set(
      classModules.flatMap((entry) =>
        entry.sections.flatMap((section) =>
          section.items
            .filter((item) => item.itemType === 'lesson' && Boolean(item.lessonId))
            .map((item) => item.lessonId as string),
        ),
      ),
    );
  }, [classModules]);

  const legacyLessons = useMemo(() => {
    return lessons.filter((lesson) => !attachedLessonIdsAcrossClass.has(lesson.id));
  }, [attachedLessonIdsAcrossClass, lessons]);

  const assessmentCount = sectionList.reduce(
    (sum, section) => sum + section.items.filter((item) => item.itemType === 'assessment').length,
    0,
  );

  const runModulePatch = async (patch: { isVisible?: boolean; isLocked?: boolean; teacherNotes?: string }) => {
    if (!module) return;

    const previous = module;
    const next = { ...module, ...patch };
    setModule(next);

    try {
      setUpdatingModule(true);
      await moduleService.update(module.id, patch);
    } catch {
      setModule(previous);
      toast.error('Unable to update module settings');
    } finally {
      setUpdatingModule(false);
    }
  };

  const handleCreateSection = async () => {
    if (!module || creatingSection) return;
    const title = sectionTitle.trim();
    if (!title) {
      toast.error('Section title is required');
      return;
    }

    try {
      setCreatingSection(true);
      await moduleService.createSection(module.id, {
        title,
        order: module.sections.length + 1,
      });
      setSectionTitle('');
      await fetchData();
      toast.success('Section created');
    } catch {
      toast.error('Unable to create section');
    } finally {
      setCreatingSection(false);
    }
  };

  const handleSaveSectionTitle = async (sectionId: string) => {
    const title = editingSectionTitle.trim();
    if (!title || savingSectionEdit) return;

    try {
      setSavingSectionEdit(true);
      await moduleService.updateSection(sectionId, { title });
      setModule((current) => {
        if (!current) return current;
        return {
          ...current,
          sections: current.sections.map((section) =>
            section.id === sectionId ? { ...section, title } : section,
          ),
        };
      });
      setEditingSectionId(null);
      setEditingSectionTitle('');
      toast.success('Section updated');
    } catch {
      toast.error('Unable to update section');
    } finally {
      setSavingSectionEdit(false);
    }
  };

  const confirmDeleteSection = (sectionId: string) => {
    setConfirmation({
      title: 'Delete section?',
      description: 'The section and all attached items will be removed from this module.',
      tone: 'danger',
      confirmLabel: 'Delete Section',
      details: 'This action cannot be undone.',
      onConfirm: async () => {
        await moduleService.deleteSection(sectionId);
        await fetchData();
        toast.success('Section deleted');
      },
    });
  };

  const handleReorderSections = async (targetSectionId: string) => {
    if (!module || !draggingSectionId || draggingSectionId === targetSectionId) return;

    const sections = [...module.sections];
    const fromIndex = sections.findIndex((section) => section.id === draggingSectionId);
    const toIndex = sections.findIndex((section) => section.id === targetSectionId);
    if (fromIndex < 0 || toIndex < 0) return;

    const moved = moveEntry(sections, fromIndex, toIndex).map((section, index) => ({
      ...section,
      order: index + 1,
    }));

    const previous = module.sections;
    setModule((current) => (current ? { ...current, sections: moved } : current));

    try {
      await moduleService.reorderSections(
        module.id,
        moved.map((section) => ({ id: section.id, order: section.order })),
      );
    } catch {
      setModule((current) => (current ? { ...current, sections: previous } : current));
      toast.error('Unable to reorder sections');
    } finally {
      setDraggingSectionId(null);
    }
  };

  const handleReorderItems = async (sectionId: string, targetItemId: string) => {
    if (!module || !draggingItem || draggingItem.sectionId !== sectionId) return;
    if (draggingItem.itemId === targetItemId) return;

    const section = module.sections.find((entry) => entry.id === sectionId);
    if (!section) return;

    const fromIndex = section.items.findIndex((item) => item.id === draggingItem.itemId);
    const toIndex = section.items.findIndex((item) => item.id === targetItemId);
    if (fromIndex < 0 || toIndex < 0) return;

    const reorderedItems = moveEntry(section.items, fromIndex, toIndex).map((item, index) => ({
      ...item,
      order: index + 1,
    }));

    const previous = section.items;
    setModule((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((entry) =>
          entry.id === sectionId ? { ...entry, items: reorderedItems } : entry,
        ),
      };
    });

    try {
      await moduleService.reorderItems(
        sectionId,
        reorderedItems.map((item) => ({ id: item.id, order: item.order })),
      );
    } catch {
      setModule((current) => {
        if (!current) return current;
        return {
          ...current,
          sections: current.sections.map((entry) =>
            entry.id === sectionId ? { ...entry, items: previous } : entry,
          ),
        };
      });
      toast.error('Unable to reorder items');
    } finally {
      setDraggingItem(null);
    }
  };

  const handleUpdateItem = async (
    sectionId: string,
    itemId: string,
    patch: { isRequired?: boolean; isVisible?: boolean; isGiven?: boolean; points?: number },
  ) => {
    if (!module || pendingItemIds[itemId]) return;

    const snapshot = module;
    setPendingItemIds((current) => ({ ...current, [itemId]: true }));
    setModule((current) => {
      if (!current) return current;
      return {
        ...current,
        sections: current.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                items: section.items.map((item) =>
                  item.id === itemId
                    ? {
                        ...item,
                        ...patch,
                        ...(patch.points !== undefined
                          ? {
                              lessonPoints: patch.points,
                              metadata: {
                                ...(item.metadata || {}),
                                points: patch.points,
                              },
                            }
                          : {}),
                      }
                    : item,
                ),
              }
            : section,
        ),
      };
    });

    try {
      await moduleService.updateItem(itemId, patch);
    } catch {
      setModule(snapshot);
      toast.error('Unable to update item setting');
    } finally {
      setPendingItemIds((current) => {
        const next = { ...current };
        delete next[itemId];
        return next;
      });
    }
  };

  const confirmDetachItem = (itemId: string) => {
    setConfirmation({
      title: 'Remove item from module?',
      description: 'This removes the item from this module section only.',
      tone: 'danger',
      confirmLabel: 'Remove Item',
      details: 'The source lesson or assessment remains available in the class.',
      onConfirm: async () => {
        await moduleService.detachItem(itemId);
        await fetchData();
        toast.success('Item removed');
      },
    });
  };

  const confirmDeleteLegacyLesson = (lesson: Lesson) => {
    setConfirmation({
      title: 'Delete legacy lesson?',
      description:
        'This lesson is not attached to any module and will be permanently deleted.',
      tone: 'danger',
      confirmLabel: 'Delete Lesson',
      details: 'This action cannot be undone.',
      onConfirm: async () => {
        await lessonService.delete(lesson.id);
        await fetchData();
        toast.success('Legacy lesson deleted');
      },
    });
  };

  const handleAttachItem = async () => {
    if (!attachState.sectionId || !attachState.itemType || attachingItem) return;

    if (attachState.itemType === 'assessment' && !attachState.itemId) {
      toast.error('Select an item to attach');
      return;
    }

    try {
      setAttachingItem(true);
      let payload:
        | {
            itemType: 'lesson';
            lessonId: string;
            points?: number;
          }
        | {
            itemType: 'assessment';
            assessmentId: string;
            isGiven: boolean;
          }
        | {
            itemType: 'file';
            fileId: string;
            metadata: Record<string, unknown>;
          };

      if (attachState.itemType === 'lesson') {
        const createdLesson = await lessonService.create({
          classId,
          title: 'Untitled Lesson',
          description: '',
        });
        const parsedPoints = Number.parseInt(attachState.lessonPoints || '0', 10);
        payload = {
          itemType: 'lesson',
          lessonId: createdLesson.data.id,
          points: Number.isFinite(parsedPoints) && parsedPoints >= 0 ? parsedPoints : 0,
        };
      } else if (attachState.itemType === 'assessment') {
        payload = {
          itemType: 'assessment',
          assessmentId: attachState.itemId,
          isGiven: false,
        };
      } else {
        if (!attachState.file) {
          toast.error('Upload a PDF file first');
          setAttachingItem(false);
          return;
        }
        const uploaded = await fileService.upload(attachState.file, {
          classId,
          scope: 'private',
        });
        payload = {
          itemType: 'file',
          fileId: uploaded.data.id,
          metadata: { fileSubtype: 'pdf' },
        };
      }
      await moduleService.attachItem(attachState.sectionId, payload);
      setAttachState({
        open: false,
        sectionId: '',
        itemType: null,
        itemId: '',
        lessonPoints: '0',
        file: null,
      });
      await fetchData();
      if (attachState.itemType === 'lesson' && payload.itemType === 'lesson') {
        toast.success('Lesson block created');
        router.push(`/dashboard/teacher/lessons/${payload.lessonId}/edit`);
        return;
      }

      toast.success(
        attachState.itemType === 'assessment'
          ? 'Assessment attached (not given yet)'
          : 'PDF block attached',
      );
    } catch {
      toast.error('Unable to attach item');
    } finally {
      setAttachingItem(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!module || savingNotes) return;
    try {
      setSavingNotes(true);
      await moduleService.update(module.id, { teacherNotes: notesDraft.trim() || '' });
      setModule((current) => (current ? { ...current, teacherNotes: notesDraft.trim() || '' } : current));
      toast.success('Notes saved');
    } catch {
      toast.error('Unable to save notes');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleSaveScale = async () => {
    if (!module || savingScale) return;

    const sanitizedRows = gradingRows
      .map((row, index) => ({
        ...row,
        order: index + 1,
        letter: row.letter.trim(),
        label: row.label.trim(),
        description: row.description.trim(),
        minValue: toSafeNumber(row.minScore),
        maxValue: toSafeNumber(row.maxScore),
      }))
      .filter((row) => row.letter || row.label || row.minScore || row.maxScore || row.description);

    if (sanitizedRows.length === 0) {
      toast.error('Add at least one grading row');
      return;
    }

    const hasInvalidRow = sanitizedRows.some(
      (row) =>
        !row.letter ||
        !row.label ||
        Number.isNaN(row.minValue) ||
        Number.isNaN(row.maxValue) ||
        row.minValue > row.maxValue,
    );

    if (hasInvalidRow) {
      toast.error('Check grading rows: letter, label, and valid min/max ranges are required');
      return;
    }

    try {
      setSavingScale(true);
      await moduleService.replaceGradingScale(module.id, {
        entries: sanitizedRows.map((row) => ({
          letter: row.letter,
          label: row.label,
          minScore: row.minValue,
          maxScore: row.maxValue,
          description: row.description,
          order: row.order,
        })),
      });
      await fetchData();
      toast.success('Grading scale saved');
    } catch {
      toast.error('Unable to save grading scale');
    } finally {
      setSavingScale(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-[32rem] rounded-2xl" />
      </div>
    );
  }

  if (!module || !classItem) {
    return <p className="text-sm text-slate-500">Module not found.</p>;
  }

  return (
    <div className="teacher-module-detail">
      <header className="teacher-module-detail__hero">
        <Link href={`/dashboard/teacher/classes/${classId}`} className="teacher-module-detail__back">
          <ArrowLeft className="h-4 w-4" />
          Back to Class
        </Link>
        <div className="teacher-module-detail__hero-row">
          <span className="teacher-module-detail__pill">M{module.order}</span>
          <div className="teacher-module-detail__hero-copy">
            <h1>{module.title}</h1>
            <p>{module.description || 'No module description yet.'}</p>
            <div className="teacher-module-detail__hero-meta">
              <span data-tone={module.isVisible ? 'good' : 'muted'}>
                {module.isVisible ? (
                  <>
                    <Eye className="h-3.5 w-3.5" />
                    Visible
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5" />
                    Hidden
                  </>
                )}
              </span>
              <span data-tone={module.isLocked ? 'warn' : 'neutral'}>
                {module.isLocked ? (
                  <>
                    <Lock className="h-3.5 w-3.5" />
                    Locked
                  </>
                ) : (
                  <>
                    <Unlock className="h-3.5 w-3.5" />
                    Unlocked
                  </>
                )}
              </span>
              <span>
                {lessonCount} lessons - {assessmentCount} assessments - {formatScheduleSummary(classItem)}
              </span>
            </div>
          </div>
        </div>
      </header>

      <nav className="teacher-module-detail__tabs" aria-label="Module detail tabs">
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              className="teacher-module-detail__tab"
              data-active={active}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </nav>

      <section className="teacher-module-detail__content">
        {activeTab === 'sections' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <div className="teacher-module-detail__section-head">
              <div>
                <h2>Sections</h2>
                <p>{sectionList.length} sections</p>
              </div>
              <div className="teacher-module-detail__section-creator">
                <Input
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  placeholder="Add section title"
                  maxLength={120}
                />
                <Button
                  type="button"
                  className="teacher-module-detail__primary"
                  data-priority="primary"
                  onClick={() => void handleCreateSection()}
                  disabled={creatingSection}
                >
                  <Plus className="h-4 w-4" />
                  Add Section
                </Button>
              </div>
            </div>

            {sectionList.map((section) => {
              const expanded = expandedSections[section.id] ?? true;
              return (
                <article
                  key={section.id}
                  className="teacher-module-detail__section-card"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => void handleReorderSections(section.id)}
                  data-dragging={draggingSectionId === section.id}
                >
                  <header className="teacher-module-detail__section-card-head">
                    <ActionTooltip label="Drag to reorder section">
                      <button
                        type="button"
                        className="teacher-module-detail__drag-handle"
                        draggable
                        onDragStart={() => setDraggingSectionId(section.id)}
                        onDragEnd={() => setDraggingSectionId(null)}
                        aria-label="Reorder section"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </ActionTooltip>
                    <div className="teacher-module-detail__section-main">
                      {editingSectionId === section.id ? (
                        <div className="teacher-module-detail__section-edit">
                          <Input
                            value={editingSectionTitle}
                            onChange={(event) => setEditingSectionTitle(event.target.value)}
                            maxLength={120}
                          />
                          <Button
                            type="button"
                            size="sm"
                            className="teacher-module-detail__primary"
                            data-priority="primary"
                            onClick={() => void handleSaveSectionTitle(section.id)}
                            disabled={savingSectionEdit}
                          >
                            Save
                          </Button>
                        </div>
                      ) : (
                        <>
                          <h3>{section.title}</h3>
                          <span>{section.items.length} items</span>
                        </>
                      )}
                    </div>
                    <div className="teacher-module-detail__section-actions">
                      <ActionTooltip label="Rename section">
                        <button
                          type="button"
                          className="teacher-module-detail__ghost"
                          onClick={() => {
                            setEditingSectionId(section.id);
                            setEditingSectionTitle(section.title);
                          }}
                          aria-label="Edit section title"
                        >
                          <NotebookPen className="h-4 w-4" />
                        </button>
                      </ActionTooltip>
                      <ActionTooltip label="Delete section">
                        <button
                          type="button"
                          className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                          onClick={() => confirmDeleteSection(section.id)}
                          aria-label="Delete section"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </ActionTooltip>
                      <ActionTooltip label={expanded ? 'Collapse items' : 'Expand items'}>
                        <button
                          type="button"
                          className="teacher-module-detail__ghost"
                          onClick={() =>
                            setExpandedSections((current) => ({
                              ...current,
                              [section.id]: !expanded,
                            }))
                          }
                          aria-label="Toggle section items"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform', expanded && 'rotate-180')} />
                        </button>
                      </ActionTooltip>
                    </div>
                  </header>

                  {expanded ? (
                    <div className="teacher-module-detail__items">
                      {section.items.length === 0 ? (
                        <div className="teacher-module-detail__empty">No module items yet.</div>
                      ) : (
                        section.items.map((item) => {
                          const Icon = iconForItemType(item.itemType);
                          const pending = pendingItemIds[item.id] || false;
                          const status = statusForItem(item);
                          const itemEditorHref = getItemEditorHref(item, classId, moduleId);
                          return (
                            <div
                              key={item.id}
                              className="teacher-module-detail__item-row"
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={() => void handleReorderItems(section.id, item.id)}
                            >
                              <ActionTooltip label="Drag to reorder item">
                                <button
                                  type="button"
                                  className="teacher-module-detail__drag-handle"
                                  draggable
                                  onDragStart={() => setDraggingItem({ sectionId: section.id, itemId: item.id })}
                                  onDragEnd={() => setDraggingItem(null)}
                                  aria-label="Reorder item"
                                >
                                  <GripVertical className="h-4 w-4" />
                                </button>
                              </ActionTooltip>

                              {itemEditorHref ? (
                                <Link
                                  href={itemEditorHref}
                                  className="teacher-module-detail__item-main"
                                  aria-label={`Open ${item.itemType} editor`}
                                >
                                  <div className="teacher-module-detail__item-icon">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="teacher-module-detail__item-copy">
                                    <div className="teacher-module-detail__chips">
                                      <span data-kind={item.itemType}>{item.itemType}</span>
                                      <span data-kind={status === 'Published' ? 'published' : status === 'Draft' ? 'draft' : 'file'}>
                                        {status}
                                      </span>
                                    </div>
                                    <h4>{titleForItem(item)}</h4>
                                    <p>{itemMeta(item)}</p>
                                  </div>
                                </Link>
                              ) : (
                                <div className="teacher-module-detail__item-main teacher-module-detail__item-main--disabled">
                                  <div className="teacher-module-detail__item-icon">
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="teacher-module-detail__item-copy">
                                    <div className="teacher-module-detail__chips">
                                      <span data-kind={item.itemType}>{item.itemType}</span>
                                      <span data-kind={status === 'Published' ? 'published' : status === 'Draft' ? 'draft' : 'file'}>
                                        {status}
                                      </span>
                                    </div>
                                    <h4>{titleForItem(item)}</h4>
                                    <p>{itemMeta(item)}</p>
                                  </div>
                                </div>
                              )}
                              <div className="teacher-module-detail__item-controls">
                                <label className="teacher-module-detail__control-toggle">
                                  <input
                                    type="checkbox"
                                    checked={item.isRequired}
                                    disabled={pending}
                                    onChange={(event) =>
                                      void handleUpdateItem(section.id, item.id, { isRequired: event.target.checked })
                                    }
                                  />
                                  Required
                                </label>
                                <label className="teacher-module-detail__control-toggle">
                                  <input
                                    type="checkbox"
                                    checked={!item.isVisible}
                                    disabled={pending}
                                    onChange={(event) =>
                                      void handleUpdateItem(section.id, item.id, { isVisible: !event.target.checked })
                                    }
                                  />
                                  Hide
                                </label>
                                {item.itemType === 'assessment' ? (
                                  <label className="teacher-module-detail__control-toggle">
                                    <input
                                      type="checkbox"
                                      checked={item.isGiven}
                                      disabled={pending}
                                      onChange={(event) =>
                                        void handleUpdateItem(section.id, item.id, { isGiven: event.target.checked })
                                      }
                                    />
                                    Give
                                  </label>
                                ) : null}
                                {item.itemType === 'lesson' ? (
                                  <label className="teacher-module-detail__points-field">
                                    Points
                                    <input
                                      type="number"
                                      min={0}
                                      max={10000}
                                      value={String(item.lessonPoints ?? Number((item.metadata as Record<string, unknown> | null)?.points ?? 0))}
                                      disabled={pending}
                                      onChange={(event) =>
                                        void handleUpdateItem(section.id, item.id, {
                                          points: Math.max(0, Number.parseInt(event.target.value || '0', 10) || 0),
                                        })
                                      }
                                    />
                                  </label>
                                ) : null}
                                <ActionTooltip label="Remove item from section">
                                  <button
                                    type="button"
                                    className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                                    onClick={() => confirmDetachItem(item.id)}
                                    aria-label="Remove item"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </ActionTooltip>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  ) : null}

                  <footer className="teacher-module-detail__section-footer">
                    <button
                      type="button"
                      className="teacher-module-detail__outline"
                      data-priority="section-add"
                      onClick={() =>
                        setAttachState({
                          open: true,
                          sectionId: section.id,
                          itemType: null,
                          itemId: '',
                          lessonPoints: '0',
                          file: null,
                        })
                      }
                    >
                      <Plus className="h-4 w-4" />
                      Add Block
                    </button>
                  </footer>
                </article>
              );
            })}

            <article className="teacher-module-detail__section-card">
              <header className="teacher-module-detail__section-card-head">
                <div className="teacher-module-detail__section-main">
                  <h3>Legacy Lessons (Not In Modules)</h3>
                  <span>{legacyLessons.length} lessons</span>
                </div>
              </header>
              <div className="teacher-module-detail__items">
                {legacyLessons.length === 0 ? (
                  <div className="teacher-module-detail__empty">
                    No legacy lessons found. All class lessons are attached to modules.
                  </div>
                ) : (
                  legacyLessons.map((lesson) => (
                    <div key={lesson.id} className="teacher-module-detail__item-row">
                      <div className="teacher-module-detail__item-main">
                        <div className="teacher-module-detail__item-icon">
                          <BookOpen className="h-4 w-4" />
                        </div>
                        <div className="teacher-module-detail__item-copy">
                          <div className="teacher-module-detail__chips">
                            <span data-kind="lesson">lesson</span>
                            <span data-kind={lesson.isDraft ? 'draft' : 'published'}>
                              {lesson.isDraft ? 'Draft' : 'Published'}
                            </span>
                          </div>
                          <h4>{lesson.title}</h4>
                          <p>Legacy lesson not attached to any module section.</p>
                        </div>
                      </div>
                      <div className="teacher-module-detail__item-controls">
                        <ActionTooltip label="Open lesson editor">
                          <Link
                            href={`/dashboard/teacher/lessons/${lesson.id}/edit`}
                            className="teacher-module-detail__ghost"
                            aria-label="Open legacy lesson editor"
                          >
                            <NotebookPen className="h-4 w-4" />
                          </Link>
                        </ActionTooltip>
                        <ActionTooltip label="Delete legacy lesson">
                          <button
                            type="button"
                            className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                            onClick={() => confirmDeleteLegacyLesson(lesson)}
                            aria-label="Delete legacy lesson"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </ActionTooltip>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>
          </div>
        ) : null}
        {activeTab === 'visibility' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Visibility</h2>
            <p className="teacher-module-detail__lead">
              Control whether students can see this module in their course view.
            </p>
            <div className="teacher-module-detail__choice-grid">
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={module.isVisible}
                onClick={() => void runModulePatch({ isVisible: true })}
                disabled={updatingModule}
              >
                <Eye className="h-5 w-5" />
                <div>
                  <h3>Visible</h3>
                  <p>Students can see this module and access its content.</p>
                </div>
                {module.isVisible ? <span><Eye className="h-4 w-4" /></span> : null}
              </button>
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={!module.isVisible}
                onClick={() => void runModulePatch({ isVisible: false })}
                disabled={updatingModule}
              >
                <EyeOff className="h-5 w-5" />
                <div>
                  <h3>Hidden</h3>
                  <p>This module is hidden from students. Only teachers can see it.</p>
                </div>
                {!module.isVisible ? <span><EyeOff className="h-4 w-4" /></span> : null}
              </button>
            </div>
            <div className="teacher-module-detail__tip" data-tone="warning">
              <strong>Note:</strong> Hiding a module does not delete any content.
            </div>
          </div>
        ) : null}

        {activeTab === 'locking' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Locking</h2>
            <p className="teacher-module-detail__lead">
              Lock this module to prevent students from opening content until you unlock it.
            </p>
            <div className="teacher-module-detail__choice-grid">
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={!module.isLocked}
                onClick={() => void runModulePatch({ isLocked: false })}
                disabled={updatingModule}
              >
                <Unlock className="h-5 w-5" />
                <div>
                  <h3>Unlocked</h3>
                  <p>Students can access all lessons and assessments in this module.</p>
                </div>
                {!module.isLocked ? <span><Unlock className="h-4 w-4" /></span> : null}
              </button>
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={module.isLocked}
                onClick={() => void runModulePatch({ isLocked: true })}
                disabled={updatingModule}
              >
                <Lock className="h-5 w-5" />
                <div>
                  <h3>Locked</h3>
                  <p>Students see the module but cannot open lessons or assessments.</p>
                </div>
                {module.isLocked ? <span><Lock className="h-4 w-4" /></span> : null}
              </button>
            </div>
            <div className="teacher-module-detail__tip" data-tone="info">
              <strong>Tip:</strong> Use locking to release modules progressively.
            </div>
          </div>
        ) : null}

        {activeTab === 'notes' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Notes</h2>
            <p className="teacher-module-detail__lead">
              Private notes visible only to you. Use this for reminders and pacing notes.
            </p>
            <article className="teacher-module-detail__notes-card">
              <Textarea
                value={notesDraft}
                onChange={(event) => setNotesDraft(event.target.value)}
                rows={8}
                placeholder="Add your private notes for this module..."
              />
              <div className="teacher-module-detail__notes-foot">
                <span>{notesDraft.trim().length} characters</span>
                <Button
                  type="button"
                  className="teacher-module-detail__primary"
                  data-priority="primary"
                  onClick={() => void handleSaveNotes()}
                  disabled={savingNotes}
                >
                  <Save className="h-4 w-4" />
                  {savingNotes ? 'Saving...' : 'Save Notes'}
                </Button>
              </div>
            </article>
          </div>
        ) : null}

        {activeTab === 'grading' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <div className="teacher-module-detail__grading-head">
              <div>
                <h2>Grading Scale</h2>
                <p className="teacher-module-detail__lead">
                  Define grade thresholds and labels for this module.
                </p>
              </div>
              <button
                type="button"
                className="teacher-module-detail__outline"
                data-priority="secondary"
                onClick={() =>
                  setGradingRows((current) => [
                    ...current,
                    { id: createRowId(), letter: '', label: '', minScore: '', maxScore: '', description: '' },
                  ])
                }
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>

            <div className="teacher-module-detail__grading-table-wrap">
              <table className="teacher-module-detail__grading-table">
                <thead>
                  <tr>
                    <th>Letter</th>
                    <th>Label</th>
                    <th>Min Score</th>
                    <th>Max Score</th>
                    <th>Description</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {gradingRows.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="teacher-module-detail__grade-pill">{row.letter || '--'}</span>
                      </td>
                      <td>
                        <input
                          value={row.label}
                          onChange={(event) =>
                            setGradingRows((current) =>
                              current.map((entry) =>
                                entry.id === row.id ? { ...entry, label: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="Label"
                        />
                      </td>
                      <td>
                        <input
                          value={row.minScore}
                          onChange={(event) =>
                            setGradingRows((current) =>
                              current.map((entry) =>
                                entry.id === row.id ? { ...entry, minScore: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="0"
                        />
                      </td>
                      <td>
                        <input
                          value={row.maxScore}
                          onChange={(event) =>
                            setGradingRows((current) =>
                              current.map((entry) =>
                                entry.id === row.id ? { ...entry, maxScore: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="100"
                        />
                      </td>
                      <td>
                        <input
                          value={row.description}
                          onChange={(event) =>
                            setGradingRows((current) =>
                              current.map((entry) =>
                                entry.id === row.id ? { ...entry, description: event.target.value } : entry,
                              ),
                            )
                          }
                          placeholder="Description"
                        />
                      </td>
                      <td>
                        <button
                          type="button"
                          className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                          onClick={() =>
                            setGradingRows((current) =>
                              current.length > 1 ? current.filter((entry) => entry.id !== row.id) : current,
                            )
                          }
                          aria-label="Remove grade row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="teacher-module-detail__save-row">
              <Button
                type="button"
                className="teacher-module-detail__primary"
                data-priority="primary"
                onClick={() => void handleSaveScale()}
                disabled={savingScale}
              >
                <Save className="h-4 w-4" />
                {savingScale ? 'Saving...' : 'Save Scale'}
              </Button>
            </div>
          </div>
        ) : null}
      </section>

      <Dialog
        open={attachState.open}
        onOpenChange={(open) =>
          setAttachState((current) =>
            open
              ? { ...current, open: true }
              : {
                  ...current,
                  open: false,
                  sectionId: '',
                  itemType: null,
                  itemId: '',
                  lessonPoints: '0',
                  file: null,
                },
          )
        }
      >
        <DialogContent className="teacher-module-detail__attach-modal">
          <DialogHeader>
            <DialogTitle>{attachDialogTitle}</DialogTitle>
            <DialogDescription>{attachDialogDescription}</DialogDescription>
          </DialogHeader>
          <div className="teacher-module-detail__attach-modal-body">
            <div className="teacher-module-detail__attach-type-grid">
              {([
                {
                  type: 'lesson' as const,
                  label: 'Lesson',
                  description: 'Attach lesson content already created in this class.',
                  icon: BookOpen,
                },
                {
                  type: 'assessment' as const,
                  label: 'Assessment',
                  description: 'Attach assessment content and control student release with Give.',
                  icon: ClipboardList,
                },
                {
                  type: 'file' as const,
                  label: 'PDF',
                  description: 'Upload a PDF resource block for this section.',
                  icon: FileText,
                },
              ]).map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.type}
                    type="button"
                    className="teacher-module-detail__attach-type"
                    data-active={attachState.itemType === option.type}
                    onClick={() =>
                      setAttachState((current) => ({
                        ...current,
                        itemType: option.type,
                        itemId: '',
                        lessonPoints: '0',
                        file: null,
                      }))
                    }
                  >
                    <Icon className="h-4 w-4" />
                    <div>
                      <strong>{option.label}</strong>
                      <p>{option.description}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {attachState.itemType === 'file' ? (
              <div className="teacher-module-detail__attach-field">
                <label htmlFor="attach-file">PDF File</label>
                <Input
                  id="attach-file"
                  type="file"
                  accept="application/pdf"
                  onChange={(event) =>
                    setAttachState((current) => ({
                      ...current,
                      file: event.target.files?.[0] || null,
                    }))
                  }
                />
                {attachState.file ? (
                  <p className="teacher-module-detail__attach-note">
                    Selected file: <strong>{attachState.file.name}</strong>
                  </p>
                ) : (
                  <p className="teacher-module-detail__attach-note">Upload a PDF to continue.</p>
                )}
              </div>
            ) : attachState.itemType ? (
              <>
                {attachState.itemType === 'lesson' ? (
                  <div className="teacher-module-detail__attach-field">
                    <label htmlFor="attach-lesson-points">Lesson Reward Points</label>
                    <Input
                      id="attach-lesson-points"
                      type="number"
                      min={0}
                      max={10000}
                      value={attachState.lessonPoints}
                      onChange={(event) =>
                        setAttachState((current) => ({
                          ...current,
                          lessonPoints: event.target.value,
                        }))
                      }
                    />
                    <p className="teacher-module-detail__attach-note">
                      Students earn these points after completing the lesson.
                    </p>
                    <p className="teacher-module-detail__attach-note">
                      A new empty draft lesson will be created and attached to this section.
                    </p>
                  </div>
                ) : null}
                {attachState.itemType === 'assessment' ? (
                  <>
                    <label htmlFor="attach-item">Available assessments</label>
                    <select
                      id="attach-item"
                      value={attachState.itemId}
                      onChange={(event) =>
                        setAttachState((current) => ({
                          ...current,
                          itemId: event.target.value,
                        }))
                      }
                    >
                      {availableAttachOptions.length === 0 ? (
                        <option value="">No available items</option>
                      ) : (
                        availableAttachOptions.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))
                      )}
                    </select>
                    {availableAttachOptions.length === 0 ? (
                      <p className="teacher-module-detail__attach-note">
                        No available assessments. Create one from{' '}
                        <Link href="/dashboard/teacher/assessments">Assessments</Link>.
                      </p>
                    ) : null}
                  </>
                ) : null}
              </>
            ) : (
              <p className="teacher-module-detail__attach-note">
                Pick a block type above to continue.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setAttachState({
                  open: false,
                  sectionId: '',
                  itemType: null,
                  itemId: '',
                  lessonPoints: '0',
                  file: null,
                })
              }
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-module-detail__primary"
              data-priority="primary"
              onClick={() => void handleAttachItem()}
              disabled={!canSubmitAttach || attachingItem || !attachState.itemType}
            >
              {attachingItem ? 'Attaching...' : 'Add Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}
