'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import {
  buildIndexKey,
  buildLessonItemKey,
  clearTemplateEditorDraft,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  resolveIndexKey,
  updateTemplateItemByIndex,
  updateTemplateModuleByIndex,
  updateTemplateSectionByIndex,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import { fileService } from '@/services/file-service';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
  ClassTemplateModuleItem,
  ClassTemplateModuleSection,
} from '@/types/class-template';
import type { UploadedFile } from '@/types/file';
import { normalizeRichText } from '@/lib/rich-text';
import '../../../../../teacher/classes/[id]/modules/[moduleId]/module-workspace.css';

type TemplateModuleTab = 'sections' | 'visibility' | 'locking' | 'notes';

const TAB_ITEMS: Array<{ key: TemplateModuleTab; label: string; icon: typeof Layers3 }> = [
  { key: 'sections', label: 'Sections', icon: Layers3 },
  { key: 'visibility', label: 'Visibility', icon: Eye },
  { key: 'locking', label: 'Locking', icon: Lock },
  { key: 'notes', label: 'Notes', icon: NotebookPen },
];

function normalizeTemplateRichText(value: string | undefined) {
  return normalizeRichText(value || '');
}

function getPlainTextLength(html: string) {
  return normalizeRichText(html)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim()
    .length;
}

function normalizeTemplateModules(modules: ClassTemplateModule[]) {
  return modules.map((module) => ({
    ...module,
    isVisible: module.isVisible ?? false,
    isLocked: module.isLocked ?? true,
    description: normalizeTemplateRichText(module.description),
    teacherNotes: normalizeTemplateRichText(module.teacherNotes),
    sections: (module.sections ?? []).map((section) => {
      const items = (section.items ?? []).map((item) => {
        if (item.itemType !== 'lesson') return item;
        const metadata = item.metadata;
        if (!metadata || typeof metadata !== 'object') return item;
        return {
          ...item,
          metadata: {
            ...metadata,
            lessonSummary: normalizeTemplateRichText(
              (metadata as { lessonSummary?: string }).lessonSummary,
            ),
          },
        };
      });

      return {
        ...section,
        description: normalizeTemplateRichText(section.description),
        items,
      };
    }),
  }));
}

function normalizePayload(
  modules: ClassTemplateModule[],
  assessments: ClassTemplateAssessment[],
  announcements: ClassTemplateAnnouncement[],
) {
  return {
    modules: normalizeTemplateModules(modules),
    assessments: assessments.map((assessment) => ({
      ...assessment,
      description: normalizeTemplateRichText(assessment.description),
    })),
    announcements: announcements.map((announcement) => ({
      ...announcement,
      content: normalizeTemplateRichText(announcement.content),
    })),
  };
}

function payloadKeyFromState(
  modules: ClassTemplateModule[],
  assessments: ClassTemplateAssessment[],
  announcements: ClassTemplateAnnouncement[],
) {
  return JSON.stringify(normalizePayload(modules, assessments, announcements));
}

function itemIconForType(itemType: ClassTemplateModuleItem['itemType']) {
  if (itemType === 'assessment') return ClipboardList;
  if (itemType === 'file') return FileText;
  return BookOpen;
}

function assessmentRouteKeyForItem(
  item: ClassTemplateModuleItem,
  assessments: ClassTemplateAssessment[],
) {
  const metadataLinkedKey = (item.metadata?.linkedAssessmentKey as string | undefined) ?? '';
  const linkedKey = metadataLinkedKey.startsWith('draft:') && item.templateAssessmentId
    ? `id:${item.templateAssessmentId}`
    : metadataLinkedKey || (item.templateAssessmentId ? `id:${item.templateAssessmentId}` : '');

  if (linkedKey.startsWith('draft:')) {
    const draftIndex = Number.parseInt(linkedKey.slice(6), 10);
    return Number.isNaN(draftIndex) ? '' : buildIndexKey(draftIndex);
  }

  if (linkedKey.startsWith('id:')) {
    const linkedId = linkedKey.slice(3);
    const linkedIndex = assessments.findIndex((assessment) => assessment.id === linkedId);
    return linkedIndex < 0 ? '' : buildIndexKey(linkedIndex);
  }

  return '';
}

function itemTitleForTemplate(
  item: ClassTemplateModuleItem,
  assessments: ClassTemplateAssessment[],
) {
  if (item.itemType === 'lesson') {
    return (item.metadata?.lessonTitle as string | undefined) || 'Untitled Lesson';
  }

  if (item.itemType === 'assessment') {
    const linkedKey = (item.metadata?.linkedAssessmentKey as string | undefined) ?? '';
    if (linkedKey.startsWith('draft:')) {
      const draftIndex = Number.parseInt(linkedKey.slice(6), 10);
      if (!Number.isNaN(draftIndex)) {
        return assessments[draftIndex]?.title || 'Untitled Assessment';
      }
    }
    if (linkedKey.startsWith('id:')) {
      const linkedId = linkedKey.slice(3);
      return assessments.find((assessment) => assessment.id === linkedId)?.title || 'Untitled Assessment';
    }
    if (item.templateAssessmentId) {
      return assessments.find((assessment) => assessment.id === item.templateAssessmentId)?.title || 'Untitled Assessment';
    }
    return 'Untitled Assessment';
  }

  return (item.metadata?.fileTitle as string | undefined) || 'PDF Resource';
}

function itemStatusLabelForTemplate(
  item: ClassTemplateModuleItem,
  assessments: ClassTemplateAssessment[],
) {
  if (item.itemType === 'lesson') return 'Template';
  if (item.itemType === 'assessment') {
    const linkedRouteKey = assessmentRouteKeyForItem(item, assessments);
    return linkedRouteKey ? 'Linked' : 'Unlinked';
  }
  return 'File';
}

function itemMetaForTemplate(item: ClassTemplateModuleItem) {
  if (item.itemType === 'lesson') {
    const summary = (item.metadata?.lessonSummary as string | undefined) || '';
    const plainSummary = normalizeTemplateRichText(summary)
      .replace(/<[^>]*>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return plainSummary || 'Lesson';
  }

  if (item.itemType === 'assessment') {
    return 'Assessment';
  }

  return (item.metadata?.fileUrl as string | undefined) || 'PDF Resource';
}

export default function AdminTemplateModuleWorkspacePage() {
  const params = useParams<{ id: string; moduleKey: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');
  const moduleKey = String(params?.moduleKey ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [activeTab, setActiveTab] = useState<TemplateModuleTab>('sections');
  const [loading, setLoading] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  const [sectionTitle, setSectionTitle] = useState('');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [uploadingFileBlockKey, setUploadingFileBlockKey] = useState<string | null>(null);
  const [visibilityConfirmOpen, setVisibilityConfirmOpen] = useState(false);
  const saveInFlightRef = useRef(false);
  const lastSavedPayloadKeyRef = useRef<string>('');

  const moduleIndex = useMemo(() => resolveIndexKey(moduleKey), [moduleKey]);
  const activeModule = useMemo(
    () => (moduleIndex >= 0 ? modules[moduleIndex] : undefined),
    [moduleIndex, modules],
  );
  const activeModuleId = activeModule?.id;
  const activeModuleNotes = activeModule?.teacherNotes ?? '';

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        const cached = readTemplateEditorDraft(templateId);
        const resolvedModules = normalizeTemplateModules(cached?.modules ?? workspace.state.modules);

        if (!mounted) return;

        lastSavedPayloadKeyRef.current = payloadKeyFromState(
          resolvedModules,
          cached?.assessments ?? workspace.state.assessments,
          cached?.announcements ?? workspace.state.announcements,
        );
        setTemplate(workspace.template);
        setModules(resolvedModules);
        setAssessments(cached?.assessments ?? workspace.state.assessments);
        setAnnouncements(cached?.announcements ?? workspace.state.announcements);
      } catch {
        toast.error('Failed to load module workspace');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (!templateId || loading) return;
    const handle = window.setTimeout(() => {
      writeTemplateEditorDraft(templateId, { modules, assessments, announcements });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [templateId, loading, modules, assessments, announcements]);

  useEffect(() => {
    if (!activeModuleId) return;
    setNotesDraft(activeModuleNotes);
  }, [activeModuleId, activeModuleNotes]);

  const updateModule = (patch: Partial<ClassTemplateModule>) => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateModuleByIndex(current, moduleIndex, (moduleEntry) => ({
        ...moduleEntry,
        ...patch,
      })),
    );
  };

  const setModuleVisibility = (nextVisible: boolean) => {
    updateModule({ isVisible: nextVisible });
  };

  const setModuleLockState = (nextLocked: boolean) => {
    updateModule({ isLocked: nextLocked });
  };

  const addSection = () => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;
    const nextTitle = sectionTitle.trim();

    setModules((current) =>
      updateTemplateModuleByIndex(current, moduleIndex, (moduleEntry) => {
        const sections = moduleEntry.sections ?? [];
        return {
          ...moduleEntry,
          sections: [
            ...sections,
            {
              title: nextTitle || 'New Section',
              description: '',
              order: sections.length + 1,
              items: [],
            },
          ],
        };
      }),
    );
    setSectionTitle('');
  };

  const updateSection = (sectionIndex: number, patch: Partial<ClassTemplateModuleSection>) => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateSectionByIndex(
        current,
        moduleIndex,
        sectionIndex,
        (sectionEntry) => ({
          ...sectionEntry,
          ...patch,
        }),
      ),
    );
  };

  const removeSection = (sectionIndex: number) => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateModuleByIndex(current, moduleIndex, (moduleEntry) => ({
        ...moduleEntry,
        sections: (moduleEntry.sections ?? []).filter((_, idx) => idx !== sectionIndex),
      })),
    );
  };

  const addModuleBlock = (sectionIndex: number, blockType: 'lesson' | 'assessment' | 'file') => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateSectionByIndex(current, moduleIndex, sectionIndex, (sectionEntry) => {
        const items = sectionEntry.items ?? [];

        let nextItem: ClassTemplateModuleItem;
        if (blockType === 'assessment') {
          nextItem = {
            itemType: 'assessment',
            order: items.length + 1,
            isRequired: false,
            metadata: { linkedAssessmentKey: '' },
          };
        } else if (blockType === 'lesson') {
          nextItem = {
            itemType: 'lesson',
            order: items.length + 1,
            isRequired: false,
            points: 0,
            metadata: {
              lessonTitle: 'New Lesson Block',
              lessonSummary: '',
            },
          };
        } else {
          nextItem = {
            itemType: 'file',
            order: items.length + 1,
            isRequired: false,
            metadata: {
              fileTitle: 'PDF Resource',
              fileUrl: '',
            },
          };
        }

        return {
          ...sectionEntry,
          items: [...items, nextItem],
        };
      }),
    );
  };

  const removeModuleBlock = (sectionIndex: number, itemIndex: number) => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateSectionByIndex(current, moduleIndex, sectionIndex, (sectionEntry) => ({
        ...sectionEntry,
        items: (sectionEntry.items ?? []).filter((_, idx) => idx !== itemIndex),
      })),
    );
  };

  const attachGeneralLibraryFile = (
    sectionIndex: number,
    itemIndex: number,
    selectedFile: UploadedFile,
  ) => {
    setModules((current) =>
      updateTemplateItemByIndex(
        current,
        moduleIndex,
        sectionIndex,
        itemIndex,
        (itemEntry) => ({
          ...itemEntry,
          metadata: {
            ...(itemEntry.metadata ?? {}),
            fileTitle: selectedFile.originalName ?? '',
            fileUrl: selectedFile.filePath ?? '',
            libraryFileId: selectedFile.id ?? '',
            libraryFilePath: selectedFile.filePath ?? '',
            libraryMimeType: selectedFile.mimeType ?? '',
            librarySizeBytes: selectedFile.sizeBytes ?? 0,
          },
        }),
      ),
    );
  };

  const handleUploadGeneralLibraryFile = async (
    sectionIndex: number,
    itemIndex: number,
    file: File | null,
  ) => {
    if (!file) return;

    const blockKey = `${sectionIndex}-${itemIndex}`;

    try {
      setUploadingFileBlockKey(blockKey);
      const uploaded = await fileService.upload(file, { scope: 'general' });
      attachGeneralLibraryFile(sectionIndex, itemIndex, uploaded.data);
      toast.success('PDF uploaded to General Modules and attached');
    } catch {
      toast.error('Failed to upload PDF to General Modules');
    } finally {
      setUploadingFileBlockKey((current) => (current === blockKey ? null : current));
    }
  };

  const saveModuleWorkspace = useCallback(async () => {
    if (!templateId || saveInFlightRef.current) return;

    const currentPayloadKey = payloadKeyFromState(modules, assessments, announcements);
    if (currentPayloadKey === lastSavedPayloadKeyRef.current) return;

    try {
      saveInFlightRef.current = true;
      setAutoSaving(true);

      const saved = await resolveAndSaveTemplateContent(
        templateId,
        normalizePayload(modules, assessments, announcements),
      );

      const savedPayloadKey = payloadKeyFromState(
        saved.modules,
        saved.assessments,
        saved.announcements,
      );

      lastSavedPayloadKeyRef.current = savedPayloadKey;
      setModules(normalizeTemplateModules(saved.modules));
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
    } catch {
      // Keep autosave silent; local draft persistence still protects unsaved work.
    } finally {
      saveInFlightRef.current = false;
      setAutoSaving(false);
    }
  }, [announcements, assessments, modules, templateId]);

  const handleSaveNotes = async () => {
    if (!templateId || !activeModule || savingNotes || saveInFlightRef.current) return;

    const safeNotes = normalizeTemplateRichText(notesDraft).trim() || '';
    const nextModules = updateTemplateModuleByIndex(
      modules,
      moduleIndex,
      (moduleEntry) => ({
        ...moduleEntry,
        teacherNotes: safeNotes,
      }),
    );

    try {
      saveInFlightRef.current = true;
      setSavingNotes(true);
      setAutoSaving(true);
      setModules(nextModules);

      const saved = await resolveAndSaveTemplateContent(
        templateId,
        normalizePayload(nextModules, assessments, announcements),
      );
      const normalizedModules = normalizeTemplateModules(saved.modules);
      const savedPayloadKey = payloadKeyFromState(
        normalizedModules,
        saved.assessments,
        saved.announcements,
      );

      lastSavedPayloadKeyRef.current = savedPayloadKey;
      setModules(normalizedModules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      setNotesDraft(normalizedModules[moduleIndex]?.teacherNotes ?? safeNotes);
      clearTemplateEditorDraft(templateId);
      toast.success('Notes saved');
    } catch {
      toast.error('Failed to save notes');
    } finally {
      saveInFlightRef.current = false;
      setSavingNotes(false);
      setAutoSaving(false);
    }
  };

  useEffect(() => {
    if (!templateId || loading || !activeModule) return;

    const timer = window.setInterval(() => {
      void saveModuleWorkspace();
    }, 5000);

    return () => window.clearInterval(timer);
  }, [activeModule, loading, saveModuleWorkspace, templateId]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (!activeModule) {
    return (
      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5 text-sm text-[var(--admin-text-muted)]">
        Module not found. Save the template workspace first and try again.
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Template Workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="teacher-module-detail">
      <header className="teacher-module-detail__hero">
        <button
          type="button"
          data-testid="back-to-template-workspace"
          className="teacher-module-detail__back"
          onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Template Workspace
        </button>

        <div className="teacher-module-detail__hero-row">
          <span className="teacher-module-detail__pill">M{moduleIndex + 1}</span>
          <div className="teacher-module-detail__hero-copy">
            <input
              type="text"
              value={activeModule.title ?? ''}
              onChange={(event) => updateModule({ title: event.target.value })}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                event.currentTarget.blur();
                void saveModuleWorkspace();
              }}
              placeholder="Untitled Module"
              aria-label="Module title"
              className="teacher-module-detail__hero-title-input"
            />
            <p>Template module workspace for {template?.name ?? 'class template'}.</p>
            <div className="teacher-module-detail__hero-meta">
              <span>{activeModule.sections?.length ?? 0} sections</span>
              <span>{assessments.length} assessments</span>
              <span>{announcements.length} announcements</span>
              {autoSaving ? <span>Auto-saving...</span> : null}
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

      <div className="teacher-module-detail__content">
        {activeTab === 'sections' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <div className="teacher-module-detail__section-head">
              <div>
                <h2>Sections</h2>
                <p>{activeModule.sections?.length ?? 0} sections</p>
              </div>
              <div className="teacher-module-detail__section-creator">
                <Input
                  value={sectionTitle}
                  onChange={(event) => setSectionTitle(event.target.value)}
                  placeholder="Add section title"
                  maxLength={120}
                />
                <Button
                  data-testid="add-section-button"
                  className="teacher-module-detail__primary"
                  onClick={addSection}
                >
                  <Plus className="h-4 w-4" />
                  Add Section
                </Button>
              </div>
            </div>

            {(activeModule.sections ?? []).map((section, sectionIndex) => (
              <article key={`${section.id ?? 'new'}-${sectionIndex}`} className="teacher-module-detail__section-card">
                <header className="teacher-module-detail__section-card-head">
                  <span className="teacher-module-detail__drag-handle" aria-hidden="true">
                    <GripVertical className="h-4 w-4" />
                  </span>
                  <div className="teacher-module-detail__section-main">
                    <input
                      type="text"
                      value={section.title ?? ''}
                      onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                      onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;
                        event.preventDefault();
                        event.currentTarget.blur();
                        void saveModuleWorkspace();
                      }}
                      placeholder={`Section ${sectionIndex + 1}`}
                      className="teacher-module-detail__section-title-input"
                      aria-label={`Section ${sectionIndex + 1} title`}
                    />
                    <span>{(section.items ?? []).length} items</span>
                  </div>
                  <div className="teacher-module-detail__section-actions">
                    <button
                      type="button"
                      className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                      onClick={() => removeSection(sectionIndex)}
                      aria-label="Delete section"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="teacher-module-detail__ghost"
                      onClick={() =>
                        setCollapsedSections((current) => ({
                          ...current,
                          [section.id ?? `idx-${sectionIndex}`]:
                            !(current[section.id ?? `idx-${sectionIndex}`] ?? false),
                        }))
                      }
                      aria-label="Toggle section items"
                    >
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          collapsedSections[section.id ?? `idx-${sectionIndex}`] ? '' : 'rotate-180'
                        }`}
                      />
                    </button>
                  </div>
                </header>

                {!(collapsedSections[section.id ?? `idx-${sectionIndex}`] ?? false) ? (
                  <>
                    <div className="teacher-module-detail__items">
                      {(section.items ?? []).length === 0 ? (
                        <div className="teacher-module-detail__empty">No module items yet.</div>
                      ) : (
                        (section.items ?? []).map((item, itemIndex) => {
                          const ItemIcon = itemIconForType(item.itemType);
                          const linkedRouteKey = assessmentRouteKeyForItem(item, assessments);
                          const itemTitle = itemTitleForTemplate(item, assessments);
                          const itemStatus = itemStatusLabelForTemplate(item, assessments);
                          const itemStatusKind =
                            itemStatus === 'Unlinked'
                              ? 'draft'
                              : itemStatus === 'File'
                                ? 'file'
                                : 'published';
                          const itemMeta = itemMetaForTemplate(item);
                          const lessonEditorPath =
                            item.itemType === 'lesson'
                              ? `/dashboard/admin/class-templates/${templateId}/lessons/${buildLessonItemKey(moduleIndex, sectionIndex, itemIndex)}/edit`
                              : '';
                          const fileInputId = `general-library-upload-${sectionIndex}-${itemIndex}`;
                          const fileBlockKey = `${sectionIndex}-${itemIndex}`;
                          const isUploadingThisBlock = uploadingFileBlockKey === fileBlockKey;

                          return (
                            <div
                              key={`${item.id ?? 'new'}-${itemIndex}`}
                              className={`teacher-module-detail__item-row ${item.itemType === 'lesson' ? 'cursor-pointer' : ''}`}
                              onClick={() => {
                                if (item.itemType !== 'lesson') return;
                                router.push(lessonEditorPath);
                              }}
                              onKeyDown={(event) => {
                                if (item.itemType !== 'lesson') return;
                                if (event.key !== 'Enter' && event.key !== ' ') return;
                                event.preventDefault();
                                router.push(lessonEditorPath);
                              }}
                              role={item.itemType === 'lesson' ? 'button' : undefined}
                              tabIndex={item.itemType === 'lesson' ? 0 : undefined}
                              aria-label={item.itemType === 'lesson' ? 'Open lesson studio' : undefined}
                            >
                              <span className="teacher-module-detail__drag-handle" aria-hidden="true">
                                <GripVertical className="h-4 w-4" />
                              </span>
                              <div
                                className={`teacher-module-detail__item-main ${
                                  item.itemType === 'lesson' ? '' : 'teacher-module-detail__item-main--disabled'
                                }`}
                              >
                                <div className="teacher-module-detail__item-icon">
                                  <ItemIcon className="h-4 w-4" />
                                </div>
                                <div className="teacher-module-detail__item-copy">
                                  <div className="teacher-module-detail__chips">
                                    <span data-kind={item.itemType}>{item.itemType}</span>
                                    <span data-kind={itemStatusKind}>{itemStatus}</span>
                                  </div>
                                  <h4>{itemTitle}</h4>
                                  <p>{itemMeta}</p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center justify-end gap-2">
                                {item.itemType === 'assessment' ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      if (linkedRouteKey) {
                                        router.push(`/dashboard/admin/class-templates/${templateId}/assessments/${linkedRouteKey}/edit`);
                                        return;
                                      }
                                      router.push(`/dashboard/admin/class-templates/${templateId}/assessments/new/edit`);
                                    }}
                                  >
                                    {linkedRouteKey ? 'Open Assessment Studio' : 'Create Assessment In Studio'}
                                  </Button>
                                ) : null}

                                {item.itemType === 'file' ? (
                                  <>
                                    <label htmlFor={fileInputId}>
                                      <span className="admin-button-outline inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-bold">
                                        {isUploadingThisBlock ? 'Uploading...' : 'Upload PDF'}
                                      </span>
                                    </label>
                                    <input
                                      id={fileInputId}
                                      type="file"
                                      accept="application/pdf,.pdf"
                                      className="hidden"
                                      disabled={isUploadingThisBlock}
                                      onChange={(event) => {
                                        event.stopPropagation();
                                        const file = event.target.files?.[0] ?? null;
                                        event.currentTarget.value = '';
                                        void handleUploadGeneralLibraryFile(sectionIndex, itemIndex, file);
                                      }}
                                    />
                                  </>
                                ) : null}

                                <button
                                  type="button"
                                  className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    removeModuleBlock(sectionIndex, itemIndex);
                                  }}
                                  aria-label="Delete block"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <footer className="teacher-module-detail__section-footer">
                      <Button
                        data-testid={`add-lesson-block-${sectionIndex}`}
                        type="button"
                        className="teacher-module-detail__outline"
                        onClick={() => addModuleBlock(sectionIndex, 'lesson')}
                      >
                        <BookOpen className="h-4 w-4" />
                        Add Lesson Block
                      </Button>
                      <Button
                        data-testid={`add-assessment-block-${sectionIndex}`}
                        type="button"
                        className="teacher-module-detail__outline"
                        onClick={() => addModuleBlock(sectionIndex, 'assessment')}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Add Assessment Block
                      </Button>
                      <Button
                        data-testid={`add-file-block-${sectionIndex}`}
                        type="button"
                        className="teacher-module-detail__outline"
                        onClick={() => addModuleBlock(sectionIndex, 'file')}
                      >
                        <FileText className="h-4 w-4" />
                        Attach PDF
                      </Button>
                    </footer>
                  </>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}

        {activeTab === 'visibility' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Visibility</h2>
            <p className="teacher-module-detail__lead">
              Set the default student visibility for this module when a class is created from this template.
            </p>
            <div className="teacher-module-detail__choice-grid">
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={Boolean(activeModule.isVisible)}
                onClick={() => {
                  if (activeModule.isVisible) return;
                  setVisibilityConfirmOpen(true);
                }}
                aria-label="Set module visible by default"
              >
                <Eye className="h-5 w-5" />
                <div>
                  <h3>Visible</h3>
                  <p>New classes will start with this module visible to students.</p>
                </div>
                {activeModule.isVisible ? <span><Eye className="h-4 w-4" /></span> : null}
              </button>
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={!activeModule.isVisible}
                onClick={() => setModuleVisibility(false)}
                aria-label="Set module hidden by default"
              >
                <EyeOff className="h-5 w-5" />
                <div>
                  <h3>Hidden</h3>
                  <p>New classes keep this module hidden until teachers release it.</p>
                </div>
                {!activeModule.isVisible ? <span><EyeOff className="h-4 w-4" /></span> : null}
              </button>
            </div>
            <div className="teacher-module-detail__tip" data-tone="warning">
              <strong>Default behavior:</strong> Modules are hidden by default for new template modules.
            </div>
          </div>
        ) : null}

        {activeTab === 'locking' ? (
          <div className="teacher-module-detail__stack" data-animate="fade">
            <h2>Module Locking</h2>
            <p className="teacher-module-detail__lead">
              Set whether this module starts locked or unlocked when a class is created from this template.
            </p>
            <div className="teacher-module-detail__choice-grid">
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={!activeModule.isLocked}
                onClick={() => setModuleLockState(false)}
                aria-label="Set module unlocked by default"
              >
                <Unlock className="h-5 w-5" />
                <div>
                  <h3>Unlocked</h3>
                  <p>Students can access all lessons and assessments in this module.</p>
                </div>
                {!activeModule.isLocked ? <span><Unlock className="h-4 w-4" /></span> : null}
              </button>
              <button
                type="button"
                className="teacher-module-detail__choice"
                data-active={Boolean(activeModule.isLocked)}
                onClick={() => setModuleLockState(true)}
                aria-label="Set module locked by default"
              >
                <Lock className="h-5 w-5" />
                <div>
                  <h3>Locked</h3>
                  <p>Students see the module but cannot open lessons or assessments.</p>
                </div>
                {activeModule.isLocked ? <span><Lock className="h-4 w-4" /></span> : null}
              </button>
            </div>
            <div className="teacher-module-detail__tip" data-tone="info">
              <strong>Default behavior:</strong> Modules are locked by default for new template modules.
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
              <RichTextEditor
                value={notesDraft}
                onChange={setNotesDraft}
                placeholder="Add your private notes for this module..."
                minHeight={240}
              />
              <div className="teacher-module-detail__notes-foot">
                <span>{getPlainTextLength(notesDraft)} characters</span>
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
      </div>

      <Dialog open={visibilityConfirmOpen} onOpenChange={setVisibilityConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Make Module Visible by Default?</DialogTitle>
            <DialogDescription>
              New classes created from this template will immediately show this module to students.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setVisibilityConfirmOpen(false)}
              className="teacher-module-detail__outline"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                setModuleVisibility(true);
                setVisibilityConfirmOpen(false);
              }}
            >
              Confirm Visible
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
