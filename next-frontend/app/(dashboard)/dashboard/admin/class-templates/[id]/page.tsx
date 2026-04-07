'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, ClipboardList, FileText, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  buildIndexKey,
  buildLessonItemKey,
  clearTemplateEditorDraft,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  updateTemplateItemByIndex,
  updateTemplateModuleByIndex,
  updateTemplateSectionByIndex,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import { classTemplateService } from '@/services/class-template-service';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
  ClassTemplateModuleItem,
  ClassTemplateModuleSection,
  ClassTemplateQuestion,
} from '@/types/class-template';
import '../../../teacher/classes/[id]/modules/[moduleId]/module-workspace.css';

type WorkspaceTab = 'modules' | 'assessments' | 'announcements';

export default function ClassTemplateEditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [tab, setTab] = useState<WorkspaceTab>('modules');
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [name, setName] = useState('');

  const savePayload = useMemo(
    () => ({ modules, assessments, announcements }),
    [announcements, assessments, modules],
  );

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        if (!mounted) return;
        setTemplate(workspace.template);
        setName(workspace.template?.name ?? '');

        const cached = readTemplateEditorDraft(templateId);
        if (cached) {
          setModules(cached.modules);
          setAssessments(cached.assessments);
          setAnnouncements(cached.announcements);
          toast.info('Recovered local draft');
        } else {
          setModules(workspace.state.modules);
          setAssessments(workspace.state.assessments);
          setAnnouncements(workspace.state.announcements);
        }
      } catch {
        toast.error('Failed to load template workspace');
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
      writeTemplateEditorDraft(templateId, savePayload);
    }, 500);
    return () => window.clearTimeout(handle);
  }, [templateId, savePayload, loading]);

  const saveNow = async (options?: { rethrow?: boolean }) => {
    try {
      setSaving(true);
      if (template && name.trim() && name.trim() !== template.name) {
        const updated = await classTemplateService.update(templateId, { name: name.trim() });
        setTemplate(updated.data);
      }
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules,
        assessments,
        announcements,
      });
      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      toast.success('Template saved');
    } catch (error) {
      toast.error('Failed to save template');
      if (options?.rethrow) {
        throw error;
      }
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async () => {
    try {
      setPublishing(true);
      await saveNow({ rethrow: true });
      await classTemplateService.publish(templateId, 'published');
      setTemplate((current) => (current ? { ...current, status: 'published' } : current));
      toast.success('Template published');
    } catch {
      toast.error('Failed to publish template');
    } finally {
      setPublishing(false);
    }
  };

  const addModule = () => {
    setModules((current) => [
      ...current,
      {
        title: 'New Module',
        description: '',
        order: current.length + 1,
        sections: [],
      },
    ]);
  };

  const updateModule = (index: number, patch: Partial<ClassTemplateModule>) => {
    setModules((current) =>
      updateTemplateModuleByIndex(current, index, (moduleEntry) => ({
        ...moduleEntry,
        ...patch,
      })),
    );
  };

  const removeModule = (index: number) => {
    setModules((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addSection = (moduleIndex: number) => {
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

  const updateSection = (moduleIndex: number, sectionIndex: number, patch: Partial<ClassTemplateModuleSection>) => {
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

  const removeSection = (moduleIndex: number, sectionIndex: number) => {
    setModules((current) =>
      updateTemplateModuleByIndex(current, moduleIndex, (moduleEntry) => ({
        ...moduleEntry,
        sections: (moduleEntry.sections ?? []).filter((_, idx) => idx !== sectionIndex),
      })),
    );
  };

  const addModuleBlock = (
    moduleIndex: number,
    sectionIndex: number,
    blockType: 'lesson' | 'assessment' | 'file',
  ) => {
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

  const updateAssessmentBlock = (
    moduleIndex: number,
    sectionIndex: number,
    itemIndex: number,
    patch: Partial<ClassTemplateModuleItem>,
  ) => {
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

  const removeAssessmentBlock = (moduleIndex: number, sectionIndex: number, itemIndex: number) => {
    setModules((current) =>
      updateTemplateSectionByIndex(current, moduleIndex, sectionIndex, (sectionEntry) => ({
        ...sectionEntry,
        items: (sectionEntry.items ?? []).filter((_, idx) => idx !== itemIndex),
      })),
    );
  };

  const summarizeModule = (module: ClassTemplateModule) => {
    const sections = module.sections ?? [];
    let lessons = 0;
    let assessmentsCount = 0;
    let files = 0;

    for (const section of sections) {
      for (const item of section.items ?? []) {
        if (item.itemType === 'lesson') lessons += 1;
        if (item.itemType === 'assessment') assessmentsCount += 1;
        if (item.itemType === 'file') files += 1;
      }
    }

    return { lessons, assessmentsCount, files };
  };

  const addAssessment = () => {
    setAssessments((current) => [
      ...current,
      {
        title: 'New Assessment',
        description: '',
        type: 'quiz',
        totalPoints: 10,
        order: current.length + 1,
        questions: [],
      },
    ]);
  };

  const updateAssessment = (index: number, patch: Partial<ClassTemplateAssessment>) => {
    setAssessments((current) => {
      const next = current.slice();
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const removeAssessment = (index: number) => {
    setAssessments((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const addQuestion = (assessmentIndex: number) => {
    setAssessments((current) => {
      const next = current.slice();
      const assessment = next[assessmentIndex];
      if (!assessment) return current;
      const questions = assessment.questions ?? [];
      const newQuestion: ClassTemplateQuestion = {
        type: 'multiple_choice',
        content: 'New question',
        points: 1,
        order: questions.length + 1,
        options: [
          { text: 'Option A', order: 1 },
          { text: 'Option B', order: 2 },
        ],
      };

      next[assessmentIndex] = {
        ...assessment,
        questions: [...questions, newQuestion],
      };
      return next;
    });
  };

  const updateQuestion = (
    assessmentIndex: number,
    questionIndex: number,
    patch: Partial<ClassTemplateQuestion>,
  ) => {
    setAssessments((current) => {
      const next = current.slice();
      const assessment = next[assessmentIndex];
      if (!assessment) return current;
      const questions = (assessment.questions ?? []).slice();
      if (!questions[questionIndex]) return current;
      questions[questionIndex] = { ...questions[questionIndex], ...patch };

      next[assessmentIndex] = {
        ...assessment,
        questions,
      };
      return next;
    });
  };

  const removeQuestion = (assessmentIndex: number, questionIndex: number) => {
    setAssessments((current) => {
      const next = current.slice();
      const assessment = next[assessmentIndex];
      if (!assessment) return current;

      next[assessmentIndex] = {
        ...assessment,
        questions: (assessment.questions ?? []).filter((_, idx) => idx !== questionIndex),
      };
      return next;
    });
  };

  const addAnnouncement = () => {
    setAnnouncements((current) => [
      ...current,
      { title: 'New Announcement', content: '', order: current.length + 1 },
    ]);
  };

  const openLessonStudio = (moduleIndex: number, sectionIndex: number, itemIndex: number) => {
    const itemKey = buildLessonItemKey(moduleIndex, sectionIndex, itemIndex);
    router.push(`/dashboard/admin/class-templates/${templateId}/lessons/${itemKey}/edit`);
  };

  const openAssessmentStudio = (assessmentIndex: number) => {
    router.push(`/dashboard/admin/class-templates/${templateId}/assessments/${buildIndexKey(assessmentIndex)}/edit`);
  };

  const openNewAssessmentStudio = () => {
    router.push(`/dashboard/admin/class-templates/${templateId}/assessments/new/edit`);
  };

  const openAnnouncementStudio = (announcementIndex: number) => {
    router.push(`/dashboard/admin/class-templates/${templateId}/announcements/${buildIndexKey(announcementIndex)}/edit`);
  };

  const openNewAnnouncementStudio = () => {
    router.push(`/dashboard/admin/class-templates/${templateId}/announcements/new`);
  };

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading template...</p>;
  }

  return (
    <div className="admin-template-editor space-y-6">
      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <div className="text-xs font-black uppercase tracking-[0.2em] text-[var(--admin-text-muted)]">
              Template Workspace
            </div>
            <Input
              data-testid="template-workspace-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-11 max-w-xl text-lg font-black"
            />
            <p className="text-xs text-[var(--admin-text-muted)]">
              {template?.subjectCode} | Grade {template?.subjectGradeLevel} | status: {template?.status}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={() => router.push('/dashboard/admin/class-templates')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              data-testid="save-draft-button"
              onClick={() => void saveNow()}
              disabled={saving}
              className="admin-button-outline rounded-xl font-black"
              variant="outline"
            >
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              data-testid="publish-template-button"
              onClick={() => void publishNow()}
              disabled={publishing}
              className="admin-button-solid rounded-xl font-black"
            >
              {publishing ? 'Publishing...' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as WorkspaceTab)} className="space-y-4">
        <TabsList className="admin-tab-list h-auto">
          <TabsTrigger data-testid="workspace-tab-modules" value="modules" className="admin-tab">Modules</TabsTrigger>
          <TabsTrigger data-testid="workspace-tab-assessments" value="assessments" className="admin-tab">Assessments</TabsTrigger>
          <TabsTrigger data-testid="workspace-tab-announcements" value="announcements" className="admin-tab">Announcements</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'modules' ? (
        <section className="teacher-module-detail__content">
          <div className="teacher-module-detail__stack" data-animate="fade">
            <div className="teacher-module-detail__section-head">
              <div>
                <h2>Modules</h2>
                <p>{modules.length} modules</p>
              </div>
              <div className="teacher-module-detail__section-creator">
                <Button
                  data-testid="add-module-button"
                  type="button"
                  className="teacher-module-detail__primary"
                  data-priority="primary"
                  onClick={addModule}
                >
                  <Plus className="h-4 w-4" />
                  Add Module
                </Button>
              </div>
            </div>

            {modules.map((module, moduleIndex) => {
              const summary = summarizeModule(module);
              return (
                <article key={`${module.id ?? 'new'}-${moduleIndex}`} className="teacher-module-detail__section-card">
                  <header className="teacher-module-detail__section-card-head">
                    <div className="teacher-module-detail__section-main">
                      <Input
                        data-testid={`module-title-${moduleIndex}`}
                        value={module.title}
                        onChange={(event) => updateModule(moduleIndex, { title: event.target.value })}
                        className="font-semibold"
                      />
                      <span>
                        {summary.lessons} lessons - {summary.assessmentsCount} assessments - {summary.files} PDFs
                      </span>
                    </div>
                    <div className="teacher-module-detail__section-actions">
                      <Button
                        data-testid={`open-module-workspace-${moduleIndex}`}
                        type="button"
                        variant="outline"
                        className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                        onClick={() =>
                          router.push(
                            `/dashboard/admin/class-templates/${templateId}/modules/${buildIndexKey(moduleIndex)}`,
                          )
                        }
                      >
                        Open Module Workspace
                      </Button>
                      <button
                        type="button"
                        className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                        onClick={() => removeModule(moduleIndex)}
                        aria-label="Delete module"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </header>

                  <div className="teacher-module-detail__items">
                    <Textarea
                      value={module.description ?? ''}
                      onChange={(event) => updateModule(moduleIndex, { description: event.target.value })}
                      placeholder="Add a short module description."
                    />

                    {(module.sections ?? []).map((section, sectionIndex) => (
                      <div key={`${section.id ?? 'new'}-${sectionIndex}`} className="teacher-module-detail__item-row">
                        <div className="teacher-module-detail__item-main teacher-module-detail__item-main--disabled">
                          <div className="teacher-module-detail__item-copy">
                            <div className="teacher-module-detail__chips">
                              <span data-kind="lesson">section</span>
                              <span data-kind="draft">{(section.items ?? []).length} blocks</span>
                            </div>
                            <Input
                              value={section.title}
                              onChange={(event) => updateSection(moduleIndex, sectionIndex, { title: event.target.value })}
                              className="font-semibold"
                            />
                            <Textarea
                              value={section.description ?? ''}
                              onChange={(event) => updateSection(moduleIndex, sectionIndex, { description: event.target.value })}
                              placeholder="Section/block description"
                            />
                          </div>
                        </div>
                        <div className="teacher-module-detail__item-controls">
                          <button
                            type="button"
                            className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                            onClick={() => removeSection(moduleIndex, sectionIndex)}
                            aria-label="Delete section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <footer className="teacher-module-detail__section-footer">
                    <Button type="button" className="teacher-module-detail__outline" onClick={() => addSection(moduleIndex)}>
                      <Plus className="h-4 w-4" />
                      Add Section
                    </Button>
                  </footer>

                  {(module.sections ?? []).map((section, sectionIndex) => (
                    <div key={`section-actions-${section.id ?? sectionIndex}`} className="teacher-module-detail__section-footer">
                      <Button
                        type="button"
                        className="teacher-module-detail__outline"
                        onClick={() => addModuleBlock(moduleIndex, sectionIndex, 'lesson')}
                      >
                        <BookOpen className="h-4 w-4" />
                        Add Lesson Block
                      </Button>
                      <Button
                        type="button"
                        className="teacher-module-detail__outline"
                        onClick={() => addModuleBlock(moduleIndex, sectionIndex, 'assessment')}
                      >
                        <ClipboardList className="h-4 w-4" />
                        Add Assessment Block
                      </Button>
                      <Button
                        type="button"
                        className="teacher-module-detail__outline"
                        onClick={() => addModuleBlock(moduleIndex, sectionIndex, 'file')}
                      >
                        <FileText className="h-4 w-4" />
                        Attach PDF
                      </Button>
                      {(section.items ?? []).map((item, itemIndex) => {
                        const metadataLinkedKey = (item.metadata?.linkedAssessmentKey as string | undefined) ?? '';
                        const linkedKey = metadataLinkedKey.startsWith('draft:') && item.templateAssessmentId
                          ? `id:${item.templateAssessmentId}`
                          : metadataLinkedKey || (item.templateAssessmentId ? `id:${item.templateAssessmentId}` : '');
                        const hasResolvedOption = linkedKey.startsWith('id:')
                          ? assessments.some((assessment) => assessment.id === linkedKey.slice(3))
                          : true;
                        const linkedAssessmentRouteKey = (() => {
                          if (linkedKey.startsWith('draft:')) {
                            const draftIndex = Number.parseInt(linkedKey.slice(6), 10);
                            return Number.isNaN(draftIndex) ? '' : buildIndexKey(draftIndex);
                          }

                          if (linkedKey.startsWith('id:')) {
                            const linkedId = linkedKey.slice(3);
                            const linkedIndex = assessments.findIndex((entry) => entry.id === linkedId);
                            return linkedIndex < 0 ? '' : buildIndexKey(linkedIndex);
                          }

                          return '';
                        })();
                        const lessonTitle = (item.metadata?.lessonTitle as string | undefined) ?? '';
                        const lessonSummary = (item.metadata?.lessonSummary as string | undefined) ?? '';
                        const fileTitle = (item.metadata?.fileTitle as string | undefined) ?? '';
                        const fileUrl = (item.metadata?.fileUrl as string | undefined) ?? '';
                        return (
                          <div key={`${item.id ?? 'new'}-${itemIndex}`} className="teacher-module-detail__item-row">
                            <div className="teacher-module-detail__item-main teacher-module-detail__item-main--disabled">
                              <div className="teacher-module-detail__item-icon">
                                {item.itemType === 'lesson' ? (
                                  <BookOpen className="h-4 w-4" />
                                ) : item.itemType === 'assessment' ? (
                                  <ClipboardList className="h-4 w-4" />
                                ) : (
                                  <FileText className="h-4 w-4" />
                                )}
                              </div>
                              <div className="teacher-module-detail__item-copy">
                                <div className="teacher-module-detail__chips">
                                  <span data-kind={item.itemType}>{item.itemType}</span>
                                  <span data-kind="draft">template</span>
                                </div>

                                {item.itemType === 'assessment' ? (
                                  <>
                                    <select
                                      className="admin-select h-9 w-full rounded-lg px-2 text-sm"
                                      value={linkedKey}
                                      onChange={(event) =>
                                        updateAssessmentBlock(moduleIndex, sectionIndex, itemIndex, {
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
                                    <label className="teacher-module-detail__control-toggle">
                                      <input
                                        type="checkbox"
                                        checked={Boolean(item.isRequired)}
                                        onChange={(event) =>
                                          updateAssessmentBlock(moduleIndex, sectionIndex, itemIndex, {
                                            isRequired: event.target.checked,
                                          })
                                        }
                                      />
                                      Required
                                    </label>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                                      onClick={() => {
                                        if (linkedAssessmentRouteKey) {
                                          router.push(`/dashboard/admin/class-templates/${templateId}/assessments/${linkedAssessmentRouteKey}/edit`);
                                          return;
                                        }

                                        openNewAssessmentStudio();
                                      }}
                                    >
                                      {linkedAssessmentRouteKey ? 'Open Assessment Studio' : 'Create Assessment In Studio'}
                                    </Button>
                                  </>
                                ) : null}

                                {item.itemType === 'lesson' ? (
                                  <>
                                    <Input
                                      value={lessonTitle}
                                      onChange={(event) =>
                                        updateAssessmentBlock(moduleIndex, sectionIndex, itemIndex, {
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
                                        updateAssessmentBlock(moduleIndex, sectionIndex, itemIndex, {
                                          metadata: {
                                            ...(item.metadata ?? {}),
                                            lessonSummary: event.target.value,
                                          },
                                        })
                                      }
                                      placeholder="Lesson summary/instructions"
                                    />
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="admin-button-outline h-8 rounded-lg px-3 text-xs font-bold"
                                      onClick={() => openLessonStudio(moduleIndex, sectionIndex, itemIndex)}
                                    >
                                      Open Lesson Studio
                                    </Button>
                                  </>
                                ) : null}

                                {item.itemType === 'file' ? (
                                  <>
                                    <Input
                                      value={fileTitle}
                                      onChange={(event) =>
                                        updateAssessmentBlock(moduleIndex, sectionIndex, itemIndex, {
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
                                        updateAssessmentBlock(moduleIndex, sectionIndex, itemIndex, {
                                          metadata: {
                                            ...(item.metadata ?? {}),
                                            fileUrl: event.target.value,
                                          },
                                        })
                                      }
                                      placeholder="PDF URL (https://...)"
                                    />
                                  </>
                                ) : null}
                              </div>
                            </div>
                            <div className="teacher-module-detail__item-controls">
                              <button
                                type="button"
                                className="teacher-module-detail__ghost teacher-module-detail__ghost--danger"
                                onClick={() => removeAssessmentBlock(moduleIndex, sectionIndex, itemIndex)}
                                aria-label="Delete block"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </article>
              );
            })}
          </div>
        </section>
      ) : null}

      {tab === 'assessments' ? (
        <div className="space-y-4">
          {assessments.map((assessment, assessmentIndex) => (
            <article key={`${assessment.id ?? 'new'}-${assessmentIndex}`} className="rounded-2xl border border-[var(--admin-outline)] bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  data-testid={`assessment-title-${assessmentIndex}`}
                  value={assessment.title}
                  onChange={(event) => updateAssessment(assessmentIndex, { title: event.target.value })}
                  className="font-bold"
                />
                <Button variant="outline" onClick={() => openAssessmentStudio(assessmentIndex)}>
                  Open Studio
                </Button>
                <Button variant="outline" onClick={() => removeAssessment(assessmentIndex)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={assessment.description ?? ''}
                onChange={(event) => updateAssessment(assessmentIndex, { description: event.target.value })}
                placeholder="Assessment description"
              />
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">Type</label>
                  <select
                    className="admin-select h-9 w-full rounded-lg px-2 text-sm"
                    value={assessment.type ?? 'quiz'}
                    onChange={(event) => updateAssessment(assessmentIndex, { type: event.target.value })}
                  >
                    <option value="quiz">Quiz</option>
                    <option value="exam">Exam</option>
                    <option value="activity">Activity</option>
                    <option value="file_upload">File Upload</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">Total Points</label>
                  <Input
                    type="number"
                    value={assessment.totalPoints ?? 0}
                    onChange={(event) => updateAssessment(assessmentIndex, { totalPoints: Number(event.target.value || 0) })}
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2 rounded-xl border border-dashed border-[var(--admin-outline)] p-3">
                {(assessment.questions ?? []).map((question, questionIndex) => (
                  <div key={`${question.id ?? 'new'}-${questionIndex}`} className="rounded-lg border border-[var(--admin-outline)] p-3">
                    <div className="mb-2 flex items-center gap-2">
                      <Input
                        value={question.content}
                        onChange={(event) => updateQuestion(assessmentIndex, questionIndex, { content: event.target.value })}
                        className="font-medium"
                      />
                      <Button variant="outline" onClick={() => removeQuestion(assessmentIndex, questionIndex)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="grid gap-2 md:grid-cols-3">
                      <select
                        className="admin-select h-9 rounded-lg px-2 text-sm"
                        value={question.type}
                        onChange={(event) => updateQuestion(assessmentIndex, questionIndex, { type: event.target.value })}
                      >
                        <option value="multiple_choice">Multiple Choice</option>
                        <option value="short_answer">Short Answer</option>
                        <option value="true_false">True / False</option>
                      </select>
                      <Input
                        type="number"
                        value={question.points ?? 1}
                        onChange={(event) => updateQuestion(assessmentIndex, questionIndex, { points: Number(event.target.value || 1) })}
                        placeholder="Points"
                      />
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={() => addQuestion(assessmentIndex)}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add Question
                </Button>
              </div>
            </article>
          ))}
          <Button
            data-testid="add-assessment-button"
            className="admin-button-outline rounded-xl font-black"
            variant="outline"
            onClick={addAssessment}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Assessment
          </Button>
        </div>
      ) : null}

      {tab === 'announcements' ? (
        <div className="space-y-3">
          {announcements.map((announcement, index) => (
            <div key={`${announcement.id ?? 'new'}-${index}`} className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <Input
                  value={announcement.title}
                  onChange={(event) => {
                    const next = announcements.slice();
                    next[index] = { ...announcement, title: event.target.value };
                    setAnnouncements(next);
                  }}
                  className="font-bold"
                  placeholder="Announcement title"
                />
                <Button variant="outline" onClick={() => openAnnouncementStudio(index)}>
                  Open Studio
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setAnnouncements((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Textarea
                value={announcement.content}
                onChange={(event) => {
                  const next = announcements.slice();
                  next[index] = { ...announcement, content: event.target.value };
                  setAnnouncements(next);
                }}
                placeholder="Announcement content"
              />
            </div>
          ))}
          <Button className="admin-button-outline rounded-xl font-black" variant="outline" onClick={addAnnouncement}>
            <Plus className="mr-1 h-4 w-4" />
            Add Announcement
          </Button>
          <Button className="admin-button-solid rounded-xl font-black" onClick={openNewAnnouncementStudio}>
            <Plus className="mr-1 h-4 w-4" />
            Create In Studio
          </Button>
        </div>
      ) : null}

      {tab === 'assessments' ? (
        <Button className="admin-button-solid rounded-xl font-black" onClick={openNewAssessmentStudio}>
          <Plus className="mr-1 h-4 w-4" />
          Create In Studio
        </Button>
      ) : null}
    </div>
  );
}
