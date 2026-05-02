'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookTemplate,
  ChevronDown,
  Eye,
  FileCheck2,
  FileUp,
  Filter,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
} from '@/components/admin/AdminPageShell';
import {
  ConfirmationDialog,
  type ConfirmationDialogConfig,
} from '@/components/shared/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { classTemplateService } from '@/services/class-template-service';
import type {
  ClassTemplate,
  EngineImportValidationResult,
  ClassTemplateStatus,
} from '@/types/class-template';

const SUBJECTS = [
  { code: 'MATH-7', label: 'Mathematics' },
  { code: 'SCI-7', label: 'Science' },
  { code: 'ENG-8', label: 'English' },
  { code: 'FIL-8', label: 'Filipino' },
  { code: 'AP-9', label: 'Araling Panlipunan' },
  { code: 'TLE-9', label: 'TLE' },
  { code: 'MAPEH-10', label: 'MAPEH' },
  { code: 'ESP-10', label: 'ESP' },
] as const;

const SORT_OPTIONS = [
  { value: 'updated-desc', label: 'Recently updated' },
  { value: 'updated-asc', label: 'Least recently updated' },
  { value: 'created-desc', label: 'Newest created' },
  { value: 'created-asc', label: 'Oldest created' },
  { value: 'name-asc', label: 'Name A-Z' },
  { value: 'name-desc', label: 'Name Z-A' },
] as const;

type TemplateStatusFilter = 'all' | ClassTemplateStatus;
type TemplateSort = (typeof SORT_OPTIONS)[number]['value'];

function toTimestamp(value?: string) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function formatDate(value?: string) {
  if (!value) return 'Unknown';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toISOString().slice(0, 10);
}

function getSubjectLabel(subjectCode: string) {
  return SUBJECTS.find((subject) => subject.code === subjectCode)?.label ?? subjectCode;
}

function getStatusTone(status: ClassTemplateStatus) {
  return status === 'published'
    ? 'admin-status-pill admin-status-pill--active'
    : 'admin-status-pill admin-status-pill--pending';
}

function getStatusLabel(status: ClassTemplateStatus) {
  return status === 'published' ? 'Published' : 'Draft';
}

function getSortLabel(sortBy: TemplateSort) {
  return SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? 'Recently updated';
}

function deriveSubjectNameFromCode(subjectCode: string) {
  const normalized = subjectCode.trim().toUpperCase();

  if (normalized.startsWith('MATH')) return 'Mathematics';
  if (normalized.startsWith('SCI')) return 'Science';
  if (normalized.startsWith('ENG')) return 'English';
  if (normalized.startsWith('FIL')) return 'Fili';
  if (normalized.startsWith('AP')) return 'Araling Panlipunan';
  if (normalized.startsWith('TLE')) return 'TLE';
  if (normalized.startsWith('MAPEH')) return 'MAPEH';
  if (normalized.startsWith('ESP')) return 'Values';

  return normalized || 'Mathematics';
}

function buildImportedTemplateClassHref(template: Pick<ClassTemplate, 'id' | 'subjectCode' | 'subjectGradeLevel'>) {
  const params = new URLSearchParams({
    templateId: template.id,
    subjectName: deriveSubjectNameFromCode(template.subjectCode),
    subjectCode: template.subjectCode,
    subjectGradeLevel: template.subjectGradeLevel,
  });

  return `/dashboard/admin/classes/new?${params.toString()}`;
}

export default function ClassTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);
  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('MATH-7');
  const [subjectGradeLevel, setSubjectGradeLevel] = useState('7');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatusFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<TemplateSort>('updated-desc');
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [engineManifest, setEngineManifest] = useState('');
  const [engineValidation, setEngineValidation] = useState<EngineImportValidationResult | null>(null);
  const [validatingEngine, setValidatingEngine] = useState(false);
  const [importingEngine, setImportingEngine] = useState(false);
  const manifestFileRef = useRef<HTMLInputElement | null>(null);

  const fetchTemplates = useCallback(async (mode: 'initial' | 'table') => {
    try {
      if (mode === 'initial') {
        setInitialLoading(true);
      } else {
        setTableLoading(true);
      }

      const response = await classTemplateService.getAll();
      setTemplates(response.data ?? []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      if (mode === 'initial') {
        setInitialLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchTemplates('initial');
  }, [fetchTemplates]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error('Template name is required');
      return;
    }

    try {
      setCreating(true);
      const response = await classTemplateService.create({
        name: name.trim(),
        subjectCode,
        subjectGradeLevel,
      });
      toast.success('Template created');
      router.push(`/dashboard/admin/class-templates/${response.data.id}`);
    } catch {
      toast.error('Failed to create template');
    } finally {
      setCreating(false);
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
      toast.success('Template imported. Continue class setup.');
      router.push(buildImportedTemplateClassHref(response.data.template));
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

  const filteredTemplates = useMemo(() => {
    const query = search.trim().toLowerCase();

    return templates.filter((template) => {
      if (statusFilter !== 'all' && template.status !== statusFilter) {
        return false;
      }

      if (subjectFilter !== 'all' && template.subjectCode !== subjectFilter) {
        return false;
      }

      if (gradeFilter !== 'all' && template.subjectGradeLevel !== gradeFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const subjectLabel = getSubjectLabel(template.subjectCode).toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.subjectCode.toLowerCase().includes(query) ||
        subjectLabel.includes(query) ||
        template.subjectGradeLevel.toLowerCase().includes(query) ||
        template.status.toLowerCase().includes(query)
      );
    });
  }, [gradeFilter, search, statusFilter, subjectFilter, templates]);

  const sortedTemplates = useMemo(() => {
    const sorted = filteredTemplates.slice();

    sorted.sort((left, right) => {
      switch (sortBy) {
        case 'created-asc':
          return toTimestamp(left.createdAt) - toTimestamp(right.createdAt);
        case 'created-desc':
          return toTimestamp(right.createdAt) - toTimestamp(left.createdAt);
        case 'updated-asc':
          return toTimestamp(left.updatedAt) - toTimestamp(right.updatedAt);
        case 'name-desc':
          return right.name.localeCompare(left.name);
        case 'name-asc':
          return left.name.localeCompare(right.name);
        case 'updated-desc':
        default:
          return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
      }
    });

    return sorted;
  }, [filteredTemplates, sortBy]);

  const draftCount = useMemo(
    () => templates.filter((template) => template.status === 'draft').length,
    [templates],
  );
  const publishedCount = useMemo(
    () => templates.filter((template) => template.status === 'published').length,
    [templates],
  );

  const selectableVisibleIds = useMemo(
    () => sortedTemplates.map((template) => template.id),
    [sortedTemplates],
  );

  useEffect(() => {
    const visibleSet = new Set(selectableVisibleIds);
    setSelectedTemplateIds((current) => current.filter((id) => visibleSet.has(id)));
  }, [selectableVisibleIds]);

  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedTemplateIds.includes(id));

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== 'all' ||
    subjectFilter !== 'all' ||
    gradeFilter !== 'all' ||
    sortBy !== 'updated-desc';

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setSubjectFilter('all');
    setGradeFilter('all');
    setSortBy('updated-desc');
    setSelectedTemplateIds([]);
  };

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  };

  const handleSelectAllVisible = () => {
    setSelectedTemplateIds(allVisibleSelected ? [] : selectableVisibleIds);
  };

  const deleteTemplates = useCallback(
    async (templateIds: string[]) => {
      if (templateIds.length === 0) {
        return;
      }

      const results = await Promise.allSettled(
        templateIds.map((templateId) => classTemplateService.remove(templateId)),
      );

      const deletedIds = results.flatMap((result, index) =>
        result.status === 'fulfilled' ? [templateIds[index]] : [],
      );
      const successCount = deletedIds.length;
      const failureCount = templateIds.length - successCount;

      if (successCount > 0) {
        toast.success(
          `Deleted ${successCount} template${successCount === 1 ? '' : 's'} successfully.`,
        );
      }

      if (failureCount > 0) {
        toast.error(
          `${failureCount} template${failureCount === 1 ? '' : 's'} could not be deleted.`,
        );
      }

      if (successCount > 0) {
        await fetchTemplates('table');
      }

      setSelectedTemplateIds((current) => current.filter((id) => !deletedIds.includes(id)));
    },
    [fetchTemplates],
  );

  const openDeleteConfirmation = (template: ClassTemplate) => {
    setConfirmation({
      title: 'Delete template?',
      description:
        'This removes the template and its saved workspace content. This action cannot be undone.',
      confirmLabel: 'Delete template',
      tone: 'danger',
      details: (
        <div className="space-y-2 text-sm text-[var(--student-text-strong)]">
          <p className="font-black">{template.name}</p>
          <p className="text-[var(--student-text-muted)]">
            {getSubjectLabel(template.subjectCode)} ({template.subjectCode}) | Grade{' '}
            {template.subjectGradeLevel}
          </p>
        </div>
      ),
      onConfirm: async () => {
        await deleteTemplates([template.id]);
      },
    });
  };

  const openBulkDeleteConfirmation = () => {
    if (selectedTemplateIds.length === 0) {
      return;
    }

    const selectedTemplates = sortedTemplates.filter((template) =>
      selectedTemplateIds.includes(template.id),
    );

    setConfirmation({
      title: 'Delete selected templates?',
      description:
        'This removes the selected templates and their saved workspace content. This action cannot be undone.',
      confirmLabel: 'Delete templates',
      tone: 'danger',
      details: (
        <div className="space-y-2 text-sm text-[var(--student-text-strong)]">
          <p className="font-black">{selectedTemplateIds.length} selected</p>
          <p className="text-[var(--student-text-muted)]">
            {selectedTemplates
              .slice(0, 3)
              .map((template) => template.name)
              .join(', ')}
            {selectedTemplates.length > 3
              ? ` and ${selectedTemplates.length - 3} more`
              : ''}
          </p>
        </div>
      ),
      onConfirm: async () => {
        await deleteTemplates(selectedTemplateIds);
      },
    });
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[12rem] rounded-[1.7rem]" />
        <Skeleton className="h-[36rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Templates"
      title="Class Templates"
      description="Manage reusable subject templates before turning them into live classes."
      icon={BookTemplate}
      actions={(
        <Button
          variant="outline"
          className="admin-button-outline rounded-[1rem] px-4 font-bold"
          onClick={() => router.push('/dashboard/admin/classes')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Button>
      )}
    >
      <AdminSectionCard
        title="Create Template"
        description="Create a new subject template or import a template manifest and continue straight into class setup."
        density="compact"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[15rem] flex-1">
              <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
                Template Name
              </label>
              <Input
                data-testid="create-template-name-input"
                className="admin-input"
                placeholder="Quarter 1 Mathematics Template"
                value={name}
                onChange={(event) => setName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void handleCreate();
                  }
                }}
              />
            </div>

            <div className="relative min-w-[13rem]">
              <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
                Subject
              </label>
              <select
                className="admin-select min-w-[13rem] appearance-none rounded-[1rem] py-2 pl-3 pr-10 text-sm font-semibold text-[#6f83a3]"
                value={subjectCode}
                onChange={(event) => setSubjectCode(event.target.value)}
              >
                {SUBJECTS.map((subject) => (
                  <option key={subject.code} value={subject.code}>
                    {subject.label} ({subject.code})
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-[2.45rem] h-4 w-4 text-[#8ea0bc]" />
            </div>

            <div className="relative min-w-[9rem]">
              <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
                Grade
              </label>
              <select
                className="admin-select min-w-[9rem] appearance-none rounded-[1rem] py-2 pl-3 pr-10 text-sm font-semibold text-[#6f83a3]"
                value={subjectGradeLevel}
                onChange={(event) => setSubjectGradeLevel(event.target.value)}
              >
                {['7', '8', '9', '10'].map((grade) => (
                  <option key={grade} value={grade}>
                    Grade {grade}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-[2.45rem] h-4 w-4 text-[#8ea0bc]" />
            </div>

            <Button
              data-testid="create-template-button"
              className="admin-button-solid rounded-[1rem] px-4 font-bold"
              disabled={creating}
              onClick={() => void handleCreate()}
            >
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create Template'}
            </Button>
          </div>

          <div className="space-y-3 rounded-[1.2rem] border border-[var(--admin-outline)] bg-[#fbfcff] p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="admin-button-outline h-10 rounded-[1rem] px-4 font-bold"
                onClick={() => manifestFileRef.current?.click()}
              >
                <FileUp className="h-4 w-4" />
                Load YAML File
              </Button>
              <Button
                type="button"
                variant="outline"
                className="admin-button-outline h-10 rounded-[1rem] px-4 font-bold"
                onClick={() => void handleValidateEngine()}
                disabled={validatingEngine}
              >
                <FileCheck2 className="h-4 w-4" />
                {validatingEngine ? 'Validating...' : 'Validate Import'}
              </Button>
              <Button
                type="button"
                className="h-10 rounded-[1rem] bg-[#f20d1b] px-4 font-bold text-white hover:bg-[#d70b17]"
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
              onChange={(event) => {
                setEngineManifest(event.target.value);
                if (engineValidation) {
                  setEngineValidation(null);
                }
              }}
              placeholder="Paste template YAML manifest here..."
              className="min-h-[180px] w-full rounded-[1rem] border border-[var(--admin-outline)] bg-white p-3 text-xs leading-6 text-[var(--admin-text-strong)] outline-none transition focus:border-[#6e7cc8]"
            />
            {engineValidation ? (
              <div className="space-y-1 text-xs">
                <p className="font-bold text-[var(--admin-text-strong)]">
                  Validation: {engineValidation.valid ? 'Valid' : 'Invalid'}
                </p>
                <p className="text-[var(--admin-text-muted)]">
                  Modules {engineValidation.summary.modules} | Lessons {engineValidation.summary.lessons} | Assessments{' '}
                  {engineValidation.summary.assessments} | Chunks {engineValidation.summary.chunks}
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
      </AdminSectionCard>

      <AdminSectionCard
        title="Template Directory"
        description="Use the table to scan subjects faster, keep the list scrollable, and manage templates with bulk actions."
        contentClassName="space-y-5"
      >
        <Tabs
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as TemplateStatusFilter);
            setSelectedTemplateIds([]);
          }}
          className="space-y-5"
        >
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="all" className="admin-tab">
              All <span className="admin-segment-count">{templates.length}</span>
            </TabsTrigger>
            <TabsTrigger value="draft" className="admin-tab">
              Draft <span className="admin-segment-count">{draftCount}</span>
            </TabsTrigger>
            <TabsTrigger value="published" className="admin-tab">
              Published <span className="admin-segment-count">{publishedCount}</span>
            </TabsTrigger>
          </TabsList>

          <div className="admin-filter-row">
            <div className="admin-search-shell min-w-[18rem] flex-1 md:max-w-[22rem]">
              <Search className="h-4 w-4 text-[#8ea0bc]" />
              <Input
                placeholder="Search templates..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-controls">
              <div className="relative">
                <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
                <select
                  aria-label="Filter templates by subject"
                  value={subjectFilter}
                  onChange={(event) => setSubjectFilter(event.target.value)}
                  className="admin-select min-w-[12rem] appearance-none rounded-[1rem] py-2 pl-9 pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  <option value="all">All subjects</option>
                  {SUBJECTS.map((subject) => (
                    <option key={subject.code} value={subject.code}>
                      {subject.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>

              <div className="relative">
                <select
                  aria-label="Filter templates by grade"
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                  className="admin-select min-w-[9rem] appearance-none rounded-[1rem] py-2 pl-3 pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  <option value="all">All grades</option>
                  {['7', '8', '9', '10'].map((grade) => (
                    <option key={grade} value={grade}>
                      Grade {grade}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>

              <div className="relative">
                <select
                  aria-label="Sort templates"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as TemplateSort)}
                  className="admin-select min-w-[13rem] appearance-none rounded-[1rem] py-2 pl-3 pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>
            </div>
          </div>
        </Tabs>

        {sortedTemplates.length > 0 ? (
          <div className="admin-bulk-bar">
            <div className="admin-controls">
              <span className="admin-pill">{selectedTemplateIds.length} selected</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="admin-button-outline rounded-[1rem] px-4 font-bold"
                onClick={handleSelectAllVisible}
                disabled={selectableVisibleIds.length === 0}
              >
                {allVisibleSelected ? 'Clear visible selection' : 'Select all visible'}
              </Button>
              {subjectFilter !== 'all' ? (
                <span className="admin-filter-badge">{getSubjectLabel(subjectFilter)}</span>
              ) : null}
              {gradeFilter !== 'all' ? (
                <span className="admin-filter-badge">Grade {gradeFilter}</span>
              ) : null}
              {sortBy !== 'updated-desc' ? (
                <span className="admin-filter-badge">{getSortLabel(sortBy)}</span>
              ) : null}
            </div>

            <div className="admin-controls">
              {hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="admin-button-outline rounded-[1rem] px-4 font-bold"
                  onClick={resetFilters}
                >
                  Reset filters
                </Button>
              ) : null}
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="rounded-[1rem] px-4 font-bold"
                onClick={openBulkDeleteConfirmation}
                disabled={selectedTemplateIds.length === 0}
              >
                Delete selected
              </Button>
            </div>
          </div>
        ) : null}

        {sortedTemplates.length === 0 ? (
          <AdminEmptyState
            title="No templates found"
            description="Try another search term or clear the current filters."
            action={
              hasActiveFilters ? (
                <Button
                  type="button"
                  variant="outline"
                  className="admin-button-outline rounded-[1rem] px-4 font-bold"
                  onClick={resetFilters}
                >
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className={`admin-table-shell${tableLoading ? ' admin-table-shell--loading' : ''}`}>
            {tableLoading ? (
              <div className="admin-table-loading">Refreshing templates...</div>
            ) : null}
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead className="w-[6rem]">Select</TableHead>
                  <TableHead>Template Name</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTemplates.map((template) => {
                  const isSelected = selectedTemplateIds.includes(template.id);
                  const workspacePath = `/dashboard/admin/class-templates/${template.id}`;

                  return (
                    <TableRow
                      key={template.id}
                      className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]"
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          role="checkbox"
                          aria-label={`Select template ${template.name}`}
                          className="admin-row-checkbox"
                          checked={isSelected}
                          onChange={() => toggleTemplateSelection(template.id)}
                        />
                      </TableCell>
                      <TableCell className="text-left">
                        <Link href={workspacePath} className="admin-table-row-link block">
                          <span className="block font-semibold text-[var(--admin-text-strong)]">
                            {template.name}
                          </span>
                          <span className="block text-xs text-[#9aaed0]">Open workspace</span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-left">
                        <Link href={workspacePath} className="admin-table-row-link block text-[#7083a4]">
                          <span className="block font-medium text-[var(--admin-text-strong)]">
                            {getSubjectLabel(template.subjectCode)}
                          </span>
                          <span className="block text-xs text-[#9aaed0]">{template.subjectCode}</span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={workspacePath} className="admin-table-row-link inline-flex">
                          <span className="admin-role-pill admin-role-pill--teacher">
                            Grade {template.subjectGradeLevel}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={workspacePath} className="admin-table-row-link inline-flex">
                          <span className={getStatusTone(template.status)}>
                            {getStatusLabel(template.status)}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#9aaed0]">
                        <Link href={workspacePath} className="admin-table-row-link block">
                          {formatDate(template.createdAt)}
                        </Link>
                      </TableCell>
                      <TableCell className="text-[#9aaed0]">
                        <Link href={workspacePath} className="admin-table-row-link block">
                          {formatDate(template.updatedAt)}
                        </Link>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={workspacePath}
                            className="admin-icon-button"
                            title="Open template workspace"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => openDeleteConfirmation(template)}
                            title="Delete template"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSectionCard>

      <ConfirmationDialog
        config={confirmation}
        onClose={() => setConfirmation(null)}
      />
    </AdminPageShell>
  );
}
