'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookTemplate, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { classTemplateService } from '@/services/class-template-service';
import type { ClassTemplate } from '@/types/class-template';

const SUBJECTS = [
  { code: 'MATH-7', label: 'Mathematics' },
  { code: 'SCI-7', label: 'Science' },
  { code: 'ENG-8', label: 'English' },
  { code: 'FIL-8', label: 'Filipino' },
  { code: 'AP-9', label: 'Araling Panlipunan' },
  { code: 'TLE-9', label: 'TLE' },
  { code: 'MAPEH-10', label: 'MAPEH' },
  { code: 'ESP-10', label: 'ESP' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'draft', label: 'Draft only' },
  { value: 'published', label: 'Published only' },
] as const;

const SORT_OPTIONS = [
  { value: 'created-desc', label: 'Created (Newest first)' },
  { value: 'created-asc', label: 'Created (Oldest first)' },
  { value: 'updated-desc', label: 'Updated (Newest first)' },
  { value: 'updated-asc', label: 'Updated (Oldest first)' },
  { value: 'name-asc', label: 'Name (A-Z)' },
  { value: 'name-desc', label: 'Name (Z-A)' },
] as const;

const PAGE_SIZE_OPTIONS = [6, 9, 12, 24] as const;

type TemplateStatusFilter = (typeof STATUS_OPTIONS)[number]['value'];
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

export default function ClassTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ClassTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [name, setName] = useState('');
  const [subjectCode, setSubjectCode] = useState('MATH-7');
  const [subjectGradeLevel, setSubjectGradeLevel] = useState('7');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<TemplateStatusFilter>('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [sortBy, setSortBy] = useState<TemplateSort>('created-desc');
  const [pageSize, setPageSize] = useState<number>(9);
  const [page, setPage] = useState(1);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);

  const fetchTemplates = useCallback(async () => {
    try {
      setLoading(true);
      const response = await classTemplateService.getAll();
      setTemplates(response.data ?? []);
    } catch {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTemplates();
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

      return (
        template.name.toLowerCase().includes(query) ||
        template.subjectCode.toLowerCase().includes(query) ||
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
        case 'updated-desc':
          return toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt);
        case 'name-desc':
          return right.name.localeCompare(left.name);
        case 'name-asc':
        default:
          return left.name.localeCompare(right.name);
      }
    });
    return sorted;
  }, [filteredTemplates, sortBy]);

  const totalPages = Math.max(1, Math.ceil(sortedTemplates.length / pageSize));

  useEffect(() => {
    setPage((current) => Math.min(current, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, subjectFilter, gradeFilter, sortBy, pageSize]);

  const paginatedTemplates = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedTemplates.slice(start, start + pageSize);
  }, [page, pageSize, sortedTemplates]);

  useEffect(() => {
    const visibleIds = new Set(sortedTemplates.map((template) => template.id));
    setSelectedTemplateIds((current) => current.filter((id) => visibleIds.has(id)));
  }, [sortedTemplates]);

  const visiblePageIds = paginatedTemplates.map((template) => template.id);
  const allVisibleSelected =
    visiblePageIds.length > 0 && visiblePageIds.every((id) => selectedTemplateIds.includes(id));

  const toggleTemplateSelection = (templateId: string) => {
    setSelectedTemplateIds((current) =>
      current.includes(templateId)
        ? current.filter((id) => id !== templateId)
        : [...current, templateId],
    );
  };

  const handleSelectVisible = () => {
    setSelectedTemplateIds((current) => {
      if (allVisibleSelected) {
        return current.filter((id) => !visiblePageIds.includes(id));
      }

      return [...new Set([...current, ...visiblePageIds])];
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedTemplateIds.length === 0) {
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedTemplateIds.length} selected template${selectedTemplateIds.length === 1 ? '' : 's'}? This action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    const idsToDelete = selectedTemplateIds.slice();

    try {
      setBulkDeleting(true);
      const results = await Promise.allSettled(
        idsToDelete.map((templateId) => classTemplateService.remove(templateId)),
      );

      const deletedIds = results.flatMap((result, index) =>
        result.status === 'fulfilled' ? [idsToDelete[index]] : [],
      );

      const successCount = deletedIds.length;
      const failureCount = idsToDelete.length - successCount;

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
        await fetchTemplates();
      }

      setSelectedTemplateIds((current) =>
        current.filter((id) => !deletedIds.includes(id)),
      );
    } catch {
      toast.error('Failed to delete selected templates');
    } finally {
      setBulkDeleting(false);
    }
  };

  const startRow = sortedTemplates.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, sortedTemplates.length);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--admin-text-muted)]">
              Template Classes
            </p>
            <h1 className="mt-1 text-2xl font-black text-[var(--admin-text-strong)]">
              Subject Template Board
            </h1>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Build immutable core modules, assessments, and announcements per subject.
            </p>
          </div>
          <Button
            variant="outline"
            className="admin-button-outline rounded-xl font-black"
            onClick={() => router.push('/dashboard/admin/classes')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Classes
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[14rem] flex-1">
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Template Name
            </label>
            <Input
              data-testid="create-template-name-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Subject
            </label>
            <select
              className="admin-select h-10 min-w-[13rem] rounded-xl px-3"
              value={subjectCode}
              onChange={(event) => setSubjectCode(event.target.value)}
            >
              {SUBJECTS.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label} ({item.code})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Grade
            </label>
            <select
              className="admin-select h-10 min-w-[7rem] rounded-xl px-3"
              value={subjectGradeLevel}
              onChange={(event) => setSubjectGradeLevel(event.target.value)}
            >
              {['7', '8', '9', '10'].map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>
          <Button
            data-testid="create-template-button"
            onClick={() => void handleCreate()}
            disabled={creating}
            className="admin-button-solid rounded-xl font-black"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Template'}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <div className="xl:col-span-2">
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Search
            </label>
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Status
            </label>
            <select
              className="admin-select h-10 w-full rounded-xl px-3"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as TemplateStatusFilter)}
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Subject
            </label>
            <select
              className="admin-select h-10 w-full rounded-xl px-3"
              value={subjectFilter}
              onChange={(event) => setSubjectFilter(event.target.value)}
            >
              <option value="all">All subjects</option>
              {SUBJECTS.map((subject) => (
                <option key={subject.code} value={subject.code}>
                  {subject.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Grade
            </label>
            <select
              className="admin-select h-10 w-full rounded-xl px-3"
              value={gradeFilter}
              onChange={(event) => setGradeFilter(event.target.value)}
            >
              <option value="all">All grades</option>
              {['7', '8', '9', '10'].map((grade) => (
                <option key={grade} value={grade}>
                  Grade {grade}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-[var(--admin-text-muted)]">
              Sort
            </label>
            <select
              className="admin-select h-10 w-full rounded-xl px-3"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as TemplateSort)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--admin-outline)] pt-4">
          <p className="text-sm text-[var(--admin-text-muted)]">
            Showing {startRow}-{endRow} of {sortedTemplates.length} template
            {sortedTemplates.length === 1 ? '' : 's'}.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
              Per page
            </label>
            <select
              className="admin-select h-10 rounded-xl px-3"
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={handleSelectVisible}
              disabled={visiblePageIds.length === 0}
            >
              {allVisibleSelected ? 'Unselect Page' : 'Select Page'}
            </Button>
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={() => setSelectedTemplateIds([])}
              disabled={selectedTemplateIds.length === 0}
            >
              Clear Selection
            </Button>
            <Button
              variant="outline"
              className="rounded-xl border-red-200 text-red-700 hover:bg-red-50"
              onClick={() => void handleDeleteSelected()}
              disabled={selectedTemplateIds.length === 0 || bulkDeleting}
            >
              <Trash2 className="h-4 w-4" />
              {bulkDeleting ? 'Deleting...' : `Quick Delete (${selectedTemplateIds.length})`}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <p className="text-sm text-[var(--admin-text-muted)]">Loading templates...</p> : null}
        {!loading && sortedTemplates.length === 0 ? (
          <p className="text-sm text-[var(--admin-text-muted)]">No templates yet.</p>
        ) : null}
        {paginatedTemplates.map((template) => (
          <button
            key={template.id}
            type="button"
            onClick={() => router.push(`/dashboard/admin/class-templates/${template.id}`)}
            className="rounded-2xl border border-[var(--admin-outline)] bg-white p-4 text-left shadow-sm transition hover:-translate-y-[1px]"
          >
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-3 py-1 text-xs font-bold text-[#304a72]">
                <BookTemplate className="h-3 w-3" />
                {template.subjectCode}
              </span>
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold uppercase text-[var(--admin-text-muted)]">
                  {template.status}
                </span>
                <label
                  className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--admin-outline)] px-2 py-1 text-xs font-bold text-[var(--admin-text-muted)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5"
                    checked={selectedTemplateIds.includes(template.id)}
                    onChange={() => toggleTemplateSelection(template.id)}
                  />
                  Select
                </label>
              </div>
            </div>
            <h3 className="mt-3 text-lg font-black text-[var(--admin-text-strong)]">{template.name}</h3>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              {(SUBJECTS.find((item) => item.code === template.subjectCode)?.label ??
                template.subjectCode)}{' '}
              • Grade {template.subjectGradeLevel}
            </p>
            <p className="mt-2 text-xs text-[var(--admin-text-muted)]">
              Created: {formatDate(template.createdAt)} • Updated: {formatDate(template.updatedAt)}
            </p>
          </button>
        ))}
      </div>

      {!loading && sortedTemplates.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-outline)] bg-white p-4">
          <p className="text-sm text-[var(--admin-text-muted)]">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
