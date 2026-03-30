'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, BookOpen, ChevronDown, Eye, Pencil, RotateCcw, Search, Trash2 } from 'lucide-react';
import {
  type BulkClassLifecycleAction,
  classService,
} from '@/services/class-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog, type ConfirmationDialogConfig, type ConfirmationTone } from '@/components/shared/ConfirmationDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { ClassItem } from '@/types/class';

type StatusTab = 'active' | 'archived';

interface BulkActionOption {
  action: BulkClassLifecycleAction;
  label: string;
  confirmLabel: string;
  title: string;
  description: string;
  tone: ConfirmationTone;
}

function formatSchedules(
  schedules?: { days: string[]; startTime: string; endTime: string }[],
) {
  if (!schedules?.length) return 'N/A';
  return schedules
    .map(
      (schedule) =>
        `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`,
    )
    .join(', ');
}

function getBulkActions(tab: StatusTab): BulkActionOption[] {
  if (tab === 'archived') {
    return [
      {
        action: 'restore',
        label: 'Restore selected',
        confirmLabel: 'Restore classes',
        title: 'Restore selected classes?',
        description: 'Selected archived classes will return to the active list.',
        tone: 'default',
      },
      {
        action: 'purge',
        label: 'Purge selected',
        confirmLabel: 'Purge classes',
        title: 'Permanently delete selected classes?',
        description:
          'This permanently removes the selected archived classes from the system.',
        tone: 'danger',
      },
    ];
  }

  return [
    {
      action: 'archive',
      label: 'Archive selected',
      confirmLabel: 'Archive classes',
      title: 'Archive selected classes?',
      description: 'Selected active classes will move to the archived list.',
      tone: 'danger',
    },
  ];
}

export default function ClassManagementPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tab, setTab] = useState<StatusTab>('active');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [purgeTarget, setPurgeTarget] = useState<ClassItem | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [confirmation, setConfirmation] =
    useState<ConfirmationDialogConfig | null>(null);

  const fetchData = useCallback(async (mode: 'initial' | 'table') => {
    try {
      if (mode === 'initial') {
        setInitialLoading(true);
      } else {
        setTableLoading(true);
      }

      const classesRes = await classService.getAll();
      setClasses(classesRes.data?.data || []);
    } catch {
      toast.error('Failed to load classes');
    } finally {
      if (mode === 'initial') {
        setInitialLoading(false);
      } else {
        setTableLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void fetchData('initial');
  }, [fetchData]);

  const activeCount = useMemo(
    () => classes.filter((classItem) => classItem.isActive).length,
    [classes],
  );
  const archivedCount = useMemo(
    () => classes.filter((classItem) => !classItem.isActive).length,
    [classes],
  );

  const filtered = useMemo(
    () =>
      classes.filter((classItem) => {
        if (tab === 'active' && !classItem.isActive) return false;
        if (tab === 'archived' && classItem.isActive) return false;
        if (gradeFilter !== 'all' && classItem.subjectGradeLevel !== gradeFilter) {
          return false;
        }
        if (!search) return true;

        const query = search.toLowerCase();
        return (
          classItem.subjectName?.toLowerCase().includes(query) ||
          classItem.subjectCode?.toLowerCase().includes(query) ||
          classItem.section?.name?.toLowerCase().includes(query) ||
          classItem.teacher?.firstName?.toLowerCase().includes(query) ||
          classItem.teacher?.lastName?.toLowerCase().includes(query) ||
          classItem.room?.toLowerCase().includes(query)
        );
      }),
    [classes, gradeFilter, search, tab],
  );

  const selectableVisibleIds = useMemo(
    () => filtered.map((classItem) => classItem.id),
    [filtered],
  );

  useEffect(() => {
    const visibleSet = new Set(selectableVisibleIds);
    setSelectedClassIds((current) => current.filter((id) => visibleSet.has(id)));
  }, [selectableVisibleIds]);

  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedClassIds.includes(id));

  const bulkActions = useMemo(() => getBulkActions(tab), [tab]);
  const selectedClasses = useMemo(
    () => filtered.filter((classItem) => selectedClassIds.includes(classItem.id)),
    [filtered, selectedClassIds],
  );

  const refreshTable = useCallback(async () => {
    await fetchData('table');
  }, [fetchData]);

  const toggleClassSelection = (classId: string) => {
    setSelectedClassIds((current) =>
      current.includes(classId)
        ? current.filter((id) => id !== classId)
        : [...current, classId],
    );
  };

  const handleSelectAllVisible = () => {
    setSelectedClassIds(allVisibleSelected ? [] : selectableVisibleIds);
  };

  const runBulkLifecycle = async (
    action: BulkClassLifecycleAction,
    classIds: string[],
  ) => {
    const result = await classService.bulkLifecycle({ action, classIds });
    const successCount = result.data.succeeded.length;
    const failureCount = result.data.failed.length;

    if (successCount > 0) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }

    if (failureCount > 0) {
      toast.error(
        result.data.failed[0]?.reason ??
          'Some selected classes could not be updated.',
      );
    }

    setSelectedClassIds([]);
    await refreshTable();
  };

  const openSingleActionConfirmation = (
    classItem: ClassItem,
    option: BulkActionOption,
  ) => {
    setConfirmation({
      title: option.title,
      description: option.description,
      confirmLabel: option.confirmLabel.replace('classes', 'class'),
      tone: option.tone,
      details: (
        <p className="text-sm font-black text-[var(--student-text-strong)]">
          {classItem.subjectName} ({classItem.subjectCode})
        </p>
      ),
      onConfirm: async () => {
        await runBulkLifecycle(option.action, [classItem.id]);
      },
    });
  };

  const openBulkConfirmation = (option: BulkActionOption) => {
    setConfirmation({
      title: option.title,
      description: option.description,
      confirmLabel: option.confirmLabel,
      tone: option.tone,
      details: (
        <div className="space-y-2 text-sm text-[var(--student-text-strong)]">
          <p className="font-black">{selectedClassIds.length} selected</p>
          <p className="text-[var(--student-text-muted)]">
            {selectedClasses
              .slice(0, 3)
              .map((classItem) => `${classItem.subjectName} (${classItem.subjectCode})`)
              .join(', ')}
            {selectedClasses.length > 3
              ? ` and ${selectedClasses.length - 3} more`
              : ''}
          </p>
        </div>
      ),
      onConfirm: async () => {
        await runBulkLifecycle(option.action, selectedClassIds);
      },
    });
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    const expected = `${purgeTarget.subjectName} (${purgeTarget.subjectCode})`;

    if (purgeConfirmText.trim() !== expected) {
      toast.error('Confirmation text does not match');
      return;
    }

    try {
      await runBulkLifecycle('purge', [purgeTarget.id]);
      setPurgeTarget(null);
      setPurgeConfirmText('');
    } catch {
      toast.error('Failed to delete class');
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[34rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Classes"
      title="Classes"
      description="Manage all classes across grades"
      icon={BookOpen}
      actions={(
        <Button
          className="admin-button-solid rounded-[1rem] px-4 font-bold"
          onClick={() => router.push('/dashboard/admin/classes/new')}
        >
          <BookOpen className="h-4 w-4" />
          Create Class
        </Button>
      )}
    >
      <AdminSectionCard title="Class Directory" contentClassName="space-y-5">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as StatusTab);
            setSearch('');
            setGradeFilter('all');
            setSelectedClassIds([]);
          }}
          className="space-y-5"
        >
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="active" className="admin-tab">
              Active <span className="admin-segment-count">{activeCount}</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="admin-tab">
              Archived{' '}
              <span className="admin-segment-count">{archivedCount}</span>
            </TabsTrigger>
          </TabsList>

          <div className="admin-filter-row">
            <div className="admin-search-shell min-w-[18rem] flex-1 md:max-w-[20rem]">
              <Search className="h-4 w-4 text-[#8ea0bc]" />
              <Input
                placeholder="Search classes..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input"
              />
            </div>

            <div className="admin-controls">
              <div className="relative">
                <select
                  value={gradeFilter}
                  onChange={(event) => setGradeFilter(event.target.value)}
                  className="admin-select min-w-[9rem] appearance-none pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  <option value="all">All Grades</option>
                  <option value="7">Grade 7</option>
                  <option value="8">Grade 8</option>
                  <option value="9">Grade 9</option>
                  <option value="10">Grade 10</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>
              {gradeFilter !== 'all' ? (
                <span className="admin-filter-badge">Filtered by Grade {gradeFilter}</span>
              ) : null}
            </div>
          </div>
        </Tabs>

        {filtered.length > 0 ? (
          <div className="admin-bulk-bar">
            <div className="admin-controls">
              <span className="admin-pill">{selectedClassIds.length} selected</span>
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
            </div>
            <div className="admin-controls">
              {bulkActions.map((option) => (
                <Button
                  key={option.action}
                  type="button"
                  variant={option.tone === 'danger' ? 'destructive' : 'outline'}
                  size="sm"
                  className={
                    option.tone === 'danger'
                      ? 'rounded-[1rem] px-4 font-bold'
                      : 'admin-button-outline rounded-[1rem] px-4 font-bold'
                  }
                  onClick={() => openBulkConfirmation(option)}
                  disabled={selectedClassIds.length === 0}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <AdminEmptyState
            title="No classes found"
            description="Try another state or a different search query."
          />
        ) : (
          <div className={`admin-table-shell${tableLoading ? ' admin-table-shell--loading' : ''}`}>
            {tableLoading ? (
              <div className="admin-table-loading">Refreshing classes...</div>
            ) : null}
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead className="w-[6rem]">Select</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((classItem) => {
                  const isSelected = selectedClassIds.includes(classItem.id);
                  const classPath = `/dashboard/admin/classes/${classItem.id}`;
                  const archiveOption = bulkActions.find(
                    (option) => option.action === 'archive',
                  );
                  const restoreOption = bulkActions.find(
                    (option) => option.action === 'restore',
                  );

                  return (
                    <TableRow
                      key={classItem.id}
                      className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]"
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          role="checkbox"
                          aria-label={`Select class ${classItem.subjectName}`}
                          className="admin-row-checkbox"
                          checked={isSelected}
                          onChange={() => toggleClassSelection(classItem.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link font-semibold text-[var(--admin-text-strong)]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.subjectName}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.section?.name || 'N/A'}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link"
                        onClick={() => router.push(classPath)}
                      >
                        <span className="admin-role-pill admin-role-pill--teacher">
                          Grade {classItem.subjectGradeLevel}
                        </span>
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.teacher
                          ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                          : 'Unassigned'}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#9aaed0]"
                        onClick={() => router.push(classPath)}
                      >
                        {formatSchedules(classItem.schedules)}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(classPath)}
                      >
                        {classItem.room || 'N/A'}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link"
                        onClick={() => router.push(classPath)}
                      >
                        <span
                          className={
                            classItem.isActive
                              ? 'admin-status-pill admin-status-pill--active'
                              : 'admin-status-pill admin-status-pill--archived'
                          }
                        >
                          {classItem.isActive ? 'Active' : 'Archived'}
                        </span>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => router.push(classPath)}
                            title="View class"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() =>
                              router.push(`/dashboard/admin/classes/${classItem.id}/edit`)
                            }
                            title="Edit class"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {classItem.isActive && archiveOption ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() =>
                                openSingleActionConfirmation(classItem, archiveOption)
                              }
                              title="Archive class"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!classItem.isActive && restoreOption ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() =>
                                openSingleActionConfirmation(classItem, restoreOption)
                              }
                              title="Restore class"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!classItem.isActive ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() => {
                                setPurgeTarget(classItem);
                                setPurgeConfirmText('');
                              }}
                              title="Purge class"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : null}
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

      <Dialog
        open={!!purgeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeTarget(null);
            setPurgeConfirmText('');
          }
        }}
      >
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600">
              Permanently Delete Class
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <strong>{purgeTarget?.subjectName}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Type this class label to confirm:</p>
            <p className="font-mono text-muted-foreground">
              {purgeTarget?.subjectName} ({purgeTarget?.subjectCode})
            </p>
            <Input
              value={purgeConfirmText}
              onChange={(event) => setPurgeConfirmText(event.target.value)}
              placeholder="Type class label here..."
              className="admin-input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={() => {
                setPurgeTarget(null);
                setPurgeConfirmText('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black"
              onClick={handlePurge}
              disabled={
                purgeConfirmText !==
                `${purgeTarget?.subjectName} (${purgeTarget?.subjectCode})`
              }
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
