'use client';

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Download,
  FileCheck2,
  FileText,
  FileUp,
  GripVertical,
  LayoutGrid,
  Plus,
  Rows3,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { normalizeRichText } from '@/lib/rich-text';
import {
  buildIndexKey,
  clearTemplateEditorDraft,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import { classTemplateService } from '@/services/class-template-service';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  EngineImportValidationResult,
  ClassTemplateModule,
  ClassTemplateModuleSection,
  ClassTemplateQuestion,
} from '@/types/class-template';
import '../../../teacher/classes/[id]/workspace.css';
import '../../../teacher/classes/[id]/modules/[moduleId]/module-workspace.css';

type WorkspaceTab = 'modules' | 'assessments' | 'announcements' | 'template';

function normalizeRichTemplateField(value: string | undefined) {
  return normalizeRichText(value || '');
}

function normalizeTemplateSections(
  sections: ClassTemplateModuleSection[] | undefined,
): ClassTemplateModuleSection[] {
  return (sections ?? []).map((section) => ({
    ...section,
    description: normalizeRichTemplateField(section.description),
  }));
}

function normalizeTemplateModules(modules: ClassTemplateModule[]) {
  return modules.map((module) => {
    const sections = normalizeTemplateSections(module.sections);
    const description = normalizeRichTemplateField(module.description);
    const mappedSections = sections.map((section) => {
      const items = (section.items ?? []).map((item) => {
        if (item.itemType !== 'lesson') return item;
        const metadata = item.metadata;
        if (!metadata || typeof metadata !== 'object') return item;
        const lessonSummary = normalizeRichTemplateField(
          (metadata as { lessonSummary?: string }).lessonSummary,
        );
        return {
          ...item,
          metadata: {
            ...metadata,
            lessonSummary,
          },
        };
      });

      if (!items.length) return { ...section, description: section.description };

      return {
        ...section,
        items,
      };
    });

    return {
      ...module,
      description,
      isVisible: module.isVisible ?? false,
      isLocked: module.isLocked ?? true,
      sections: mappedSections,
    };
  });
}

function normalizeTemplateAnnouncements(announcements: ClassTemplateAnnouncement[]) {
  return announcements.map((announcement) => ({
    ...announcement,
    content: normalizeRichTemplateField(announcement.content),
  }));
}

function normalizeTemplateAssessments(assessments: ClassTemplateAssessment[]) {
  return assessments.map((assessment) => ({
    ...assessment,
    description: normalizeRichTemplateField(assessment.description),
  }));
}

function normalizeTemplatePayload(
  modules: ClassTemplateModule[],
  assessments: ClassTemplateAssessment[],
  announcements: ClassTemplateAnnouncement[],
) {
  return {
    modules: normalizeTemplateModules(modules),
    assessments: normalizeTemplateAssessments(assessments),
    announcements: normalizeTemplateAnnouncements(announcements),
  };
}

function summarizeRichText(value: string | undefined) {
  if (!value) return '';
  return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

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
  const [exportingEngine, setExportingEngine] = useState(false);
  const [validatingEngine, setValidatingEngine] = useState(false);
  const [importingEngine, setImportingEngine] = useState(false);
  const [engineManifest, setEngineManifest] = useState('');
  const [engineValidation, setEngineValidation] =
    useState<EngineImportValidationResult | null>(null);
  const manifestFileRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState('');
  const [selectedModuleIndexes, setSelectedModuleIndexes] = useState<number[]>([]);
  const [moduleView, setModuleView] = useState<'cards' | 'compact'>('cards');

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
          setModules(normalizeTemplateModules(cached.modules));
          setAssessments(cached.assessments);
          setAnnouncements(cached.announcements);
          toast.info('Recovered local draft');
        } else {
          setModules(normalizeTemplateModules(workspace.state.modules));
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

  useEffect(() => {
    setSelectedModuleIndexes((current) => current.filter((index) => index < modules.length));
  }, [modules.length]);

  const saveNow = async (options?: { rethrow?: boolean }) => {
    try {
      setSaving(true);
      if (template && name.trim() && name.trim() !== template.name) {
        const updated = await classTemplateService.update(templateId, { name: name.trim() });
        setTemplate(updated.data);
      }
      const normalizedPayload = normalizeTemplatePayload(modules, assessments, announcements);
      const saved = await resolveAndSaveTemplateContent(templateId, normalizedPayload);
      setModules(normalizeTemplateModules(saved.modules));
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

  const updateTemplatePublication = async (nextStatus: 'published' | 'draft') => {
    try {
      setPublishing(true);
      await saveNow({ rethrow: true });
      await classTemplateService.publish(templateId, nextStatus);
      setTemplate((current) => (current ? { ...current, status: nextStatus } : current));
      toast.success(
        nextStatus === 'published'
          ? 'Template published and core content released'
          : 'Template unpublished and core content set to draft',
      );
    } catch {
      toast.error(
        nextStatus === 'published'
          ? 'Failed to publish template'
          : 'Failed to unpublish template',
      );
    } finally {
      setPublishing(false);
    }
  };

  const publishNow = async () => updateTemplatePublication('published');
  const unpublishNow = async () => updateTemplatePublication('draft');

  const handleExportEngine = async () => {
    try {
      setExportingEngine(true);
      const response = await classTemplateService.exportEngine(templateId);
      const payload = response.data;
      setEngineManifest(payload.yaml);
      setEngineValidation(null);

      const blob = new Blob([payload.yaml], {
        type: 'application/x-yaml;charset=utf-8',
      });
      const url = window.URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = payload.fileName;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Template export generated');
    } catch {
      toast.error('Failed to export template manifest');
    } finally {
      setExportingEngine(false);
    }
  };

  const handleValidateEngine = async () => {
    const manifest = engineManifest.trim();
    if (!manifest) {
      toast.error('Paste or load a template manifest first');
      return;
    }

    try {
      setValidatingEngine(true);
      const response = await classTemplateService.validateEngineImport(manifest);
      setEngineValidation(response.data);
      if (response.data.valid) {
        toast.success('Template manifest is valid');
      } else {
        toast.error('Template manifest has validation errors');
      }
    } catch {
      toast.error('Failed to validate template manifest');
    } finally {
      setValidatingEngine(false);
    }
  };

  const handleImportEngine = async () => {
    const manifest = engineManifest.trim();
    if (!manifest) {
      toast.error('Paste or load a template manifest first');
      return;
    }

    if (engineValidation && !engineValidation.valid) {
      toast.error('Fix validation errors before import');
      return;
    }

    try {
      setImportingEngine(true);
      const response = await classTemplateService.importEngine(manifest);
      const workspace = await loadTemplateWorkspace(response.data.template.id);
      setTemplate(workspace.template);
      setName(workspace.template?.name ?? '');
      setModules(workspace.state.modules);
      setAssessments(workspace.state.assessments);
      setAnnouncements(workspace.state.announcements);
      clearTemplateEditorDraft(response.data.template.id);
      toast.success('Template manifest imported');
    } catch {
      toast.error('Failed to import template manifest');
    } finally {
      setImportingEngine(false);
    }
  };

  const handleManifestFileLoad = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setEngineManifest(text);
      setEngineValidation(null);
      toast.success('Manifest loaded');
    } catch {
      toast.error('Unable to read manifest file');
    } finally {
      event.target.value = '';
    }
  };

  const addModule = () => {
    setModules((current) => [
      ...current,
      {
        title: 'New Module',
        description: '',
        order: current.length + 1,
        isVisible: false,
        isLocked: true,
        sections: [],
      },
    ]);
    setSelectedModuleIndexes([]);
  };

  const removeModule = (index: number) => {
    setModules((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setSelectedModuleIndexes((current) =>
      current.filter((itemIndex) => itemIndex !== index).map((itemIndex) => (itemIndex > index ? itemIndex - 1 : itemIndex)),
    );
  };

  const toggleModuleSelection = (index: number) => {
    setSelectedModuleIndexes((current) => {
      if (current.includes(index)) {
        return current.filter((itemIndex) => itemIndex !== index);
      }
      return [...current, index].sort((left, right) => left - right);
    });
  };

  const toggleAllModules = () => {
    if (selectedModuleIndexes.length === modules.length) {
      setSelectedModuleIndexes([]);
      return;
    }
    setSelectedModuleIndexes(modules.map((_, index) => index));
  };

  const removeSelectedModules = () => {
    if (!selectedModuleIndexes.length) return;
    setModules((current) => current.filter((_, index) => !selectedModuleIndexes.includes(index)));
    setSelectedModuleIndexes([]);
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

  const openAssessmentStudio = (assessmentIndex: number) => {
    router.push(`/dashboard/admin/class-templates/${templateId}/assessments/${buildIndexKey(assessmentIndex)}/edit`);
  };

  const openNewAssessmentStudio = () => {
    router.push(`/dashboard/admin/class-templates/${templateId}/assessments/new/edit`);
  };

  const openModuleWorkspace = (moduleIndex: number) => {
    router.push(`/dashboard/admin/class-templates/${templateId}/modules/${buildIndexKey(moduleIndex)}`);
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
    <div className="teacher-class-workspace admin-template-editor">
      <header className="teacher-class-workspace__hero">
        <button
          type="button"
          className="teacher-class-workspace__back"
          onClick={() => router.push('/dashboard/admin/class-templates')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Templates
        </button>
        <div className="teacher-class-workspace__hero-row admin-template-editor__hero-row">
          <div className="admin-template-editor__hero-main">
            <div className="teacher-class-workspace__hero-icon">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="teacher-class-workspace__hero-copy">
              <h1>{name || template?.name || 'Template Workspace'}</h1>
              <p>
                Shape this template with the same workspace rhythm teachers use in live classes:
                modules first, then assessments, then announcements.
              </p>
              <div className="teacher-class-workspace__hero-meta">
                <span>{template?.subjectCode} / Grade {template?.subjectGradeLevel}</span>
                <span>{modules.length} modules</span>
                <span>{assessments.length} assessments</span>
                <span>{announcements.length} announcements</span>
                <span>Status: {template?.status || 'draft'}</span>
              </div>
            </div>
          </div>

          <div className="admin-template-editor__hero-tools">
            <Input
              data-testid="template-workspace-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="admin-template-editor__hero-name-input"
            />
            <div className="admin-template-editor__hero-actions">
              <Button
                data-testid="save-draft-button"
                onClick={() => void saveNow()}
                disabled={saving}
                className="teacher-class-workspace__outline admin-template-editor__hero-outline"
                variant="outline"
              >
                {saving ? 'Saving...' : 'Save Draft'}
              </Button>
              {template?.status === 'published' ? (
                <Button
                  data-testid="unpublish-template-button"
                  onClick={() => void unpublishNow()}
                  disabled={publishing}
                  className="teacher-class-workspace__outline admin-template-editor__hero-outline"
                  variant="outline"
                >
                  {publishing ? 'Updating...' : 'Unpublish'}
                </Button>
              ) : (
                <Button
                  data-testid="publish-template-button"
                  onClick={() => void publishNow()}
                  disabled={publishing}
                  className="teacher-class-workspace__solid"
                >
                  {publishing ? 'Publishing...' : 'Publish'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <nav className="teacher-class-workspace__tabs" aria-label="Template workspace tabs">
        {([
          { key: 'modules', label: 'Modules', icon: BookOpen },
          { key: 'assessments', label: 'Assessments', icon: ClipboardList },
          { key: 'announcements', label: 'Announcements', icon: FileText },
          { key: 'template', label: 'Template', icon: FileCheck2 },
        ] as const).map((entry) => {
          const Icon = entry.icon;
          return (
            <button
              key={entry.key}
              type="button"
              data-testid={`workspace-tab-${entry.key}`}
              className="teacher-class-workspace__tab"
              data-active={tab === entry.key}
              onClick={() => setTab(entry.key)}
            >
              <Icon className="h-4 w-4" />
              {entry.label}
            </button>
          );
        })}
      </nav>

      <section className="teacher-class-workspace__body pt-4">
        {tab === 'template' ? (
          <div className="teacher-class-workspace__panel">
            <div className="space-y-3 rounded-2xl border border-[var(--admin-outline)] bg-white p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="admin-button-outline h-9 rounded-lg px-3 text-xs font-bold"
                  onClick={() => void handleExportEngine()}
                  disabled={exportingEngine}
                >
                  <Download className="h-4 w-4" />
                  {exportingEngine ? 'Exporting...' : 'Export Template YAML'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="admin-button-outline h-9 rounded-lg px-3 text-xs font-bold"
                  onClick={() => manifestFileRef.current?.click()}
                >
                  <FileUp className="h-4 w-4" />
                  Load YAML File
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="admin-button-outline h-9 rounded-lg px-3 text-xs font-bold"
                  onClick={() => void handleValidateEngine()}
                  disabled={validatingEngine}
                >
                  <FileCheck2 className="h-4 w-4" />
                  {validatingEngine ? 'Validating...' : 'Validate Import'}
                </Button>
                <Button
                  type="button"
                  className="teacher-class-workspace__solid h-9 rounded-lg px-3 text-xs"
                  onClick={() => void handleImportEngine()}
                  disabled={importingEngine}
                >
                  {importingEngine ? 'Importing...' : 'Import Template'}
                </Button>
              </div>
              <input
                ref={manifestFileRef}
                type="file"
                accept=".yaml,.yml,text/yaml,text/x-yaml"
                className="hidden"
                onChange={(event) => void handleManifestFileLoad(event)}
              />
              <textarea
                value={engineManifest}
                onChange={(event) => setEngineManifest(event.target.value)}
                placeholder="Paste template YAML manifest here..."
                className="min-h-[180px] w-full rounded-xl border border-[var(--admin-outline)] bg-[#f8fbff] p-3 text-xs leading-6 text-[var(--admin-text-strong)] outline-none transition focus:border-[#6e7cc8]"
              />
              {engineValidation ? (
                <div className="space-y-1 text-xs">
                  <p className="font-bold text-[var(--admin-text-strong)]">
                    Validation: {engineValidation.valid ? 'Valid' : 'Invalid'}
                  </p>
                  <p className="text-[var(--admin-text-muted)]">
                    Modules {engineValidation.summary.modules} • Lessons {engineValidation.summary.lessons} • Assessments{' '}
                    {engineValidation.summary.assessments} • Chunks {engineValidation.summary.chunks}
                  </p>
                  {engineValidation.errors.length > 0 ? (
                    <p className="text-red-600">
                      {engineValidation.errors.length} error(s): {engineValidation.errors[0]?.message}
                    </p>
                  ) : null}
                  {engineValidation.warnings.length > 0 ? (
                    <p className="text-amber-700">
                      {engineValidation.warnings.length} warning(s): {engineValidation.warnings[0]?.message}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

      {tab === 'modules' ? (
        <section className="space-y-2">
          <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-black leading-tight text-[var(--admin-text-strong)]">Course Modules</h2>
                <p className="mt-1 text-xs font-semibold text-[var(--admin-text-muted)]">{modules.length} modules</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  data-testid="add-module-button"
                  type="button"
                  className="teacher-class-workspace__solid h-9 rounded-full px-4 text-xs"
                  onClick={addModule}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Module
                </Button>
                <div className="inline-flex items-center rounded-full border border-[#d7e1ef] bg-[#edf3ff] p-1">
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                      moduleView === 'cards' ? 'bg-white text-[#24467f]' : 'text-[#6b82a6]'
                    }`}
                    onClick={() => setModuleView('cards')}
                    aria-label="Card view"
                  >
                    <Rows3 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-full transition ${
                      moduleView === 'compact' ? 'bg-white text-[#24467f]' : 'text-[#6b82a6]'
                    }`}
                    onClick={() => setModuleView('compact')}
                    aria-label="Compact view"
                  >
                    <LayoutGrid className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={toggleAllModules}
                  className="h-9 rounded-full border-[#cddbf0] px-3 text-xs font-bold text-[#27497e]"
                >
                  Select All
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={removeSelectedModules}
                  disabled={!selectedModuleIndexes.length}
                  className="h-9 rounded-full border-[#f2c7ce] px-3 text-xs font-bold text-[#d86b7b] hover:bg-[#fff3f5] disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Selected
                </Button>
              </div>
            </div>
          </div>

          <div className={moduleView === 'cards' ? 'space-y-2' : 'grid gap-2 xl:grid-cols-2'}>
            {modules.map((module, moduleIndex) => {
              const summary = summarizeModule(module);
              const description = summarizeRichText(module.description);
              const isSelected = selectedModuleIndexes.includes(moduleIndex);
              const accentColor = moduleIndex % 2 === 0 ? '#3d64de' : '#1ea673';

              return (
                <article
                  key={`${module.id ?? 'new'}-${moduleIndex}`}
                  className="relative overflow-hidden rounded-3xl border border-[#c9d7ec] bg-white p-3 shadow-[0_12px_28px_-28px_rgba(17,41,88,0.45)]"
                  style={{ borderTop: `4px solid ${accentColor}` }}
                >
                  <div
                    data-testid={`open-module-workspace-${moduleIndex}`}
                    className="flex cursor-pointer flex-col gap-2 rounded-2xl lg:flex-row lg:items-center"
                    onClick={() => openModuleWorkspace(moduleIndex)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        openModuleWorkspace(moduleIndex);
                      }
                    }}
                    role="button"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-2 pt-1">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onClick={(event) => event.stopPropagation()}
                          onChange={() => toggleModuleSelection(moduleIndex)}
                          className="h-4 w-4 rounded border-[#9cb0cf] accent-[#e70012]"
                          aria-label={`Select ${module.title || `Module ${moduleIndex + 1}`}`}
                        />
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#d2ddec] bg-[#eff4fb] text-[#6d83a8]"
                          onClick={(event) => event.stopPropagation()}
                          aria-label="Drag module"
                        >
                          <GripVertical className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="h-20 w-28 rounded-2xl bg-gradient-to-b from-[#b6c4d9] via-[#89a0c9] to-[#486ede] p-1.5">
                        <div className="h-full rounded-xl border border-[#9ab1d4] bg-[rgba(255,255,255,0.22)] p-1.5">
                          <div className="space-y-1">
                            <div className="h-1.5 w-4/5 rounded bg-[rgba(226,238,255,0.92)]" />
                            <div className="h-1.5 w-3/4 rounded bg-[rgba(226,238,255,0.8)]" />
                            <div className="h-1.5 w-2/3 rounded bg-[rgba(226,238,255,0.68)]" />
                            <div className="mt-2.5 h-1.5 w-1/2 rounded bg-[rgba(226,238,255,0.72)]" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-3">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f8d4d9] text-xs font-black text-[#c81d33]">
                          {moduleIndex + 1}
                        </span>
                        <div className="min-w-0">
                          <h3
                            data-testid={`module-title-${moduleIndex}`}
                            className="truncate text-xl font-black leading-tight text-[#0b2346]"
                          >
                            {module.title || `Module ${moduleIndex + 1}`}
                          </h3>
                          <p className="mt-1 text-sm font-semibold leading-tight text-[#112f5a]">
                            {moduleIndex === 0 ? 'Core Module' : 'Learning Module'}
                          </p>
                          <p className="mt-1.5 text-xs font-medium text-[#6f88ac]">
                            {description || 'Add a short module description.'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-2.5 grid gap-1.5 md:grid-cols-2">
                        <div className="rounded-xl border border-[#d4deee] bg-[#f4f8ff] px-2.5 py-2">
                          <div className="flex items-center gap-1.5 text-lg font-black text-[#0a2c59]">
                            <BookOpen className="h-4 w-4" />
                            <span>{summary.lessons}</span>
                          </div>
                          <p className="text-xs font-semibold text-[#6680a9]">Lessons</p>
                        </div>
                        <div className="rounded-xl border border-[#d4deee] bg-[#f4f8ff] px-2.5 py-2">
                          <div className="flex items-center gap-1.5 text-lg font-black text-[#0a2c59]">
                            <ClipboardList className="h-4 w-4" />
                            <span>{summary.assessmentsCount}</span>
                          </div>
                          <p className="text-xs font-semibold text-[#6680a9]">Assessments</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="absolute bottom-1.5 left-1.5 inline-flex h-6 w-6 items-center justify-center rounded-lg text-[#9fb2cc] transition hover:bg-[#fef1f3] hover:text-[#c62235]"
                    onClick={() => removeModule(moduleIndex)}
                    aria-label="Delete module"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </article>
              );
            })}
          </div>

          {!modules.length ? (
            <div className="rounded-2xl border border-dashed border-[#c9d7ec] bg-white/90 p-8 text-center text-sm font-semibold text-[var(--admin-text-muted)]">
              No modules yet. Use Add Module to start building the course structure.
            </div>
          ) : null}
        </section>
      ) : null}

      {tab === 'assessments' ? (
        <div className="teacher-class-workspace__panel">
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
              <RichTextEditor
                value={assessment.description ?? ''}
                onChange={(value) => updateAssessment(assessmentIndex, { description: value })}
                placeholder="Assessment description"
                minHeight={110}
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
                      <RichTextEditor
                        value={question.content}
                        onChange={(nextContent) => updateQuestion(assessmentIndex, questionIndex, { content: nextContent })}
                        className="font-medium"
                        minHeight={64}
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
            className="teacher-class-workspace__outline"
            variant="outline"
            onClick={addAssessment}
          >
            <Plus className="mr-1 h-4 w-4" />
            Add Assessment
          </Button>
          </div>
        </div>
      ) : null}

      {tab === 'announcements' ? (
        <div className="teacher-class-workspace__panel">
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
              <RichTextEditor
                value={announcement.content}
                onChange={(value) => {
                  const next = announcements.slice();
                  next[index] = { ...announcement, content: value };
                  setAnnouncements(next);
                }}
                placeholder="Announcement content"
                minHeight={140}
              />
            </div>
          ))}
          <Button className="teacher-class-workspace__outline" variant="outline" onClick={addAnnouncement}>
            <Plus className="mr-1 h-4 w-4" />
            Add Announcement
          </Button>
          <Button className="teacher-class-workspace__solid" onClick={openNewAnnouncementStudio}>
            <Plus className="mr-1 h-4 w-4" />
            Create In Studio
          </Button>
          </div>
        </div>
      ) : null}

      {tab === 'assessments' ? (
        <Button className="teacher-class-workspace__solid" onClick={openNewAssessmentStudio}>
          <Plus className="mr-1 h-4 w-4" />
          Create In Studio
        </Button>
      ) : null}
      </section>
    </div>
  );
}
