'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ClipboardList, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
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
import '../../../../../teacher/classes/[id]/modules/[moduleId]/module-workspace.css';

export default function AdminTemplateModuleWorkspacePage() {
  const params = useParams<{ id: string; moduleKey: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');
  const moduleKey = String(params?.moduleKey ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generalLibraryFiles, setGeneralLibraryFiles] = useState<UploadedFile[]>([]);
  const [loadingGeneralLibrary, setLoadingGeneralLibrary] = useState(false);
  const [uploadingFileBlockKey, setUploadingFileBlockKey] = useState<string | null>(null);

  const moduleIndex = useMemo(() => resolveIndexKey(moduleKey), [moduleKey]);
  const activeModule = useMemo(
    () => (moduleIndex >= 0 ? modules[moduleIndex] : undefined),
    [moduleIndex, modules],
  );

  const loadGeneralLibraryFiles = useCallback(async () => {
    try {
      setLoadingGeneralLibrary(true);
      const response = await fileService.getAll({ scope: 'general', limit: 200 });
      setGeneralLibraryFiles(response.data ?? []);
    } catch {
      toast.error('Failed to load General Modules files');
    } finally {
      setLoadingGeneralLibrary(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        const cached = readTemplateEditorDraft(templateId);

        if (!mounted) return;

        setTemplate(workspace.template);
        setModules(cached?.modules ?? workspace.state.modules);
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
    void loadGeneralLibraryFiles();
  }, [loadGeneralLibraryFiles]);

  const updateModule = (patch: Partial<ClassTemplateModule>) => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateModuleByIndex(current, moduleIndex, (moduleEntry) => ({
        ...moduleEntry,
        ...patch,
      })),
    );
  };

  const addSection = () => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateModuleByIndex(current, moduleIndex, (moduleEntry) => {
        const sections = moduleEntry.sections ?? [];
        return {
          ...moduleEntry,
          sections: [
            ...sections,
            {
              title: 'New Section',
              description: '',
              order: sections.length + 1,
              items: [],
            },
          ],
        };
      }),
    );
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

  const updateModuleBlock = (sectionIndex: number, itemIndex: number, patch: Partial<ClassTemplateModuleItem>) => {
    if (moduleIndex < 0 || !modules[moduleIndex]) return;

    setModules((current) =>
      updateTemplateItemByIndex(
        current,
        moduleIndex,
        sectionIndex,
        itemIndex,
        (itemEntry) => ({
          ...itemEntry,
          ...patch,
        }),
      ),
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
    selectedFile: UploadedFile | null,
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
            fileTitle: selectedFile?.originalName ?? '',
            fileUrl: selectedFile?.filePath ?? '',
            libraryFileId: selectedFile?.id ?? '',
            libraryFilePath: selectedFile?.filePath ?? '',
            libraryMimeType: selectedFile?.mimeType ?? '',
            librarySizeBytes: selectedFile?.sizeBytes ?? 0,
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
      await loadGeneralLibraryFiles();
      toast.success('PDF uploaded to General Modules and attached');
    } catch {
      toast.error('Failed to upload PDF to General Modules');
    } finally {
      setUploadingFileBlockKey((current) => (current === blockKey ? null : current));
    }
  };

  const saveModuleWorkspace = async () => {
    try {
      setSaving(true);
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules,
        assessments,
        announcements,
      });
      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      toast.success('Module workspace saved');
    } catch {
      toast.error('Failed to save module workspace');
    } finally {
      setSaving(false);
    }
  };

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
            <h1>{activeModule.title || 'Untitled Module'}</h1>
            <p>Template module workspace for {template?.name ?? 'class template'}.</p>
            <div className="teacher-module-detail__hero-meta">
              <span>{activeModule.sections?.length ?? 0} sections</span>
              <span>{assessments.length} assessments</span>
              <span>{announcements.length} announcements</span>
            </div>
          </div>
        </div>
      </header>

      <div className="teacher-module-detail__content">
        <div className="teacher-module-detail__stack" data-animate="fade">
          <div className="teacher-module-detail__section-head">
            <div>
              <h2>Module Workspace</h2>
              <p>Mirror teacher-side section and block structure while authoring templates.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                data-testid="add-section-button"
                className="teacher-module-detail__outline"
                variant="outline"
                onClick={addSection}
              >
                <Plus className="h-4 w-4" />
                Add Section
              </Button>
              <Button
                data-testid="save-module-workspace"
                className="teacher-module-detail__primary"
                onClick={saveModuleWorkspace}
                disabled={saving}
              >
                <Save className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Module'}
              </Button>
            </div>
          </div>

          <article className="teacher-module-detail__section-card">
            <div className="space-y-3">
              <Input
                value={activeModule.title}
                onChange={(event) => updateModule({ title: event.target.value })}
                className="font-semibold"
                placeholder="Module title"
              />
              <Textarea
                value={activeModule.description ?? ''}
                onChange={(event) => updateModule({ description: event.target.value })}
                placeholder="Module description"
              />
            </div>
          </article>

          {(activeModule.sections ?? []).map((section, sectionIndex) => (
            <article key={`${section.id ?? 'new'}-${sectionIndex}`} className="teacher-module-detail__section-card">
              <header className="teacher-module-detail__section-card-head">
                <div className="teacher-module-detail__section-main">
                  <Input
                    value={section.title}
                    onChange={(event) => updateSection(sectionIndex, { title: event.target.value })}
                    className="font-semibold"
                  />
                  <span>{(section.items ?? []).length} blocks</span>
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
                </div>
              </header>

              <Textarea
                value={section.description ?? ''}
                onChange={(event) => updateSection(sectionIndex, { description: event.target.value })}
                placeholder="Section description"
              />

              <div className="teacher-module-detail__section-footer">
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
              </div>

              {(section.items ?? []).map((item, itemIndex) => {
                const metadataLinkedKey = (item.metadata?.linkedAssessmentKey as string | undefined) ?? '';
                const linkedKey = metadataLinkedKey.startsWith('draft:') && item.templateAssessmentId
                  ? `id:${item.templateAssessmentId}`
                  : metadataLinkedKey || (item.templateAssessmentId ? `id:${item.templateAssessmentId}` : '');
                const hasResolvedOption = linkedKey.startsWith('id:')
                  ? assessments.some((assessment) => assessment.id === linkedKey.slice(3))
                  : true;

                const linkedRouteKey = (() => {
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
                })();

                const lessonTitle = (item.metadata?.lessonTitle as string | undefined) ?? '';
                const lessonSummary = (item.metadata?.lessonSummary as string | undefined) ?? '';
                const fileTitle = (item.metadata?.fileTitle as string | undefined) ?? '';
                const fileUrl = (item.metadata?.fileUrl as string | undefined) ?? '';
                const selectedLibraryFileId =
                  (item.metadata?.libraryFileId as string | undefined) ?? '';
                const selectedLibraryFile = generalLibraryFiles.find(
                  (entry) => entry.id === selectedLibraryFileId,
                );
                const hasSelectedLibraryOption =
                  !selectedLibraryFileId || Boolean(selectedLibraryFile);
                const fileBlockKey = `${sectionIndex}-${itemIndex}`;
                const fileInputId = `general-library-upload-${sectionIndex}-${itemIndex}`;
                const isUploadingThisBlock = uploadingFileBlockKey === fileBlockKey;

                return (
                  <div key={`${item.id ?? 'new'}-${itemIndex}`} className="teacher-module-detail__item-row">
                    <div className="teacher-module-detail__item-main teacher-module-detail__item-main--disabled">
                      <div className="teacher-module-detail__item-copy">
                        <div className="teacher-module-detail__chips">
                          <span data-kind={item.itemType}>{item.itemType}</span>
                          <span data-kind="draft">template</span>
                        </div>

                        {item.itemType === 'lesson' ? (
                          <>
                            <Input
                              value={lessonTitle}
                              onChange={(event) =>
                                updateModuleBlock(sectionIndex, itemIndex, {
                                  metadata: {
                                    ...(item.metadata ?? {}),
                                    lessonTitle: event.target.value,
                                  },
                                })
                              }
                              placeholder="Lesson block title"
                            />
                            <Textarea
                              value={lessonSummary}
                              onChange={(event) =>
                                updateModuleBlock(sectionIndex, itemIndex, {
                                  metadata: {
                                    ...(item.metadata ?? {}),
                                    lessonSummary: event.target.value,
                                  },
                                })
                              }
                              placeholder="Lesson summary"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                              onClick={() =>
                                router.push(
                                  `/dashboard/admin/class-templates/${templateId}/lessons/${buildLessonItemKey(moduleIndex, sectionIndex, itemIndex)}/edit`,
                                )
                              }
                            >
                              Open Lesson Studio
                            </Button>
                          </>
                        ) : null}

                        {item.itemType === 'assessment' ? (
                          <>
                            <select
                              data-testid={`assessment-link-select-${sectionIndex}-${itemIndex}`}
                              className="admin-select h-9 w-full rounded-lg px-2 text-sm"
                              value={linkedKey}
                              onChange={(event) =>
                                updateModuleBlock(sectionIndex, itemIndex, {
                                  metadata: {
                                    ...(item.metadata ?? {}),
                                    linkedAssessmentKey: event.target.value,
                                  },
                                })
                              }
                            >
                              <option value="">Unlinked</option>
                              {!hasResolvedOption && linkedKey.startsWith('id:') ? (
                                <option value={linkedKey}>Linked Assessment (saved)</option>
                              ) : null}
                              {assessments.map((assessment, assessmentIndex) => (
                                <option
                                  key={assessment.id ?? `draft-${assessmentIndex}`}
                                  value={assessment.id ? `id:${assessment.id}` : `draft:${assessmentIndex}`}
                                >
                                  {assessment.title} {assessment.id ? '(saved)' : '(draft)'}
                                </option>
                              ))}
                            </select>

                            <Button
                              type="button"
                              variant="outline"
                              className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                              onClick={() => {
                                if (linkedRouteKey) {
                                  router.push(`/dashboard/admin/class-templates/${templateId}/assessments/${linkedRouteKey}/edit`);
                                  return;
                                }
                                router.push(`/dashboard/admin/class-templates/${templateId}/assessments/new/edit`);
                              }}
                            >
                              {linkedRouteKey ? 'Open Assessment Studio' : 'Create Assessment In Studio'}
                            </Button>
                          </>
                        ) : null}

                        {item.itemType === 'file' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                                Nexora Library (General Modules)
                              </label>
                              <select
                                className="admin-select h-9 w-full rounded-lg px-2 text-sm"
                                value={selectedLibraryFileId}
                                onChange={(event) => {
                                  const selectedId = event.target.value;
                                  if (!selectedId) {
                                    attachGeneralLibraryFile(sectionIndex, itemIndex, null);
                                    return;
                                  }

                                  const file = generalLibraryFiles.find((entry) => entry.id === selectedId);
                                  if (!file) {
                                    toast.error('Selected library file is no longer available');
                                    return;
                                  }

                                  attachGeneralLibraryFile(sectionIndex, itemIndex, file);
                                }}
                                disabled={loadingGeneralLibrary}
                              >
                                <option value="">Select from General Modules</option>
                                {!hasSelectedLibraryOption && selectedLibraryFileId ? (
                                  <option value={selectedLibraryFileId}>Linked file (not in current results)</option>
                                ) : null}
                                {generalLibraryFiles.map((file) => (
                                  <option key={file.id} value={file.id}>
                                    {file.originalName}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <Input
                              value={fileTitle}
                              onChange={(event) =>
                                updateModuleBlock(sectionIndex, itemIndex, {
                                  metadata: {
                                    ...(item.metadata ?? {}),
                                    fileTitle: event.target.value,
                                  },
                                })
                              }
                              placeholder="PDF title"
                            />
                            <Input
                              value={fileUrl}
                              onChange={(event) =>
                                updateModuleBlock(sectionIndex, itemIndex, {
                                  metadata: {
                                    ...(item.metadata ?? {}),
                                    fileUrl: event.target.value,
                                  },
                                })
                              }
                              placeholder="PDF link or selected file path"
                            />
                            <div className="flex flex-wrap items-center gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                                onClick={() => void loadGeneralLibraryFiles()}
                                disabled={loadingGeneralLibrary}
                              >
                                {loadingGeneralLibrary ? 'Refreshing...' : 'Refresh General Modules'}
                              </Button>
                              <label htmlFor={fileInputId}>
                                <span className="admin-button-outline inline-flex h-8 cursor-pointer items-center rounded-lg px-3 text-xs font-bold">
                                  {isUploadingThisBlock ? 'Uploading...' : 'Upload PDF to General Modules'}
                                </span>
                              </label>
                              <input
                                id={fileInputId}
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                disabled={isUploadingThisBlock}
                                onChange={(event) => {
                                  const file = event.target.files?.[0] ?? null;
                                  event.currentTarget.value = '';
                                  void handleUploadGeneralLibraryFile(sectionIndex, itemIndex, file);
                                }}
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>
                    <div className="teacher-module-detail__item-controls">
                      <button
                        type="button"
                        className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                        onClick={() => removeModuleBlock(sectionIndex, itemIndex)}
                        aria-label="Delete block"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
