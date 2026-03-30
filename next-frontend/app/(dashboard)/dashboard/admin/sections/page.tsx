'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, Layers3, Pencil, RotateCcw, Search, Trash2, UserPlus, Users } from 'lucide-react';
import {
  type BulkSectionLifecycleAction,
  sectionService,
} from '@/services/section-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog, type ConfirmationDialogConfig, type ConfirmationTone } from '@/components/shared/ConfirmationDialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { Section } from '@/types/section';

type StatusTab = 'active' | 'archived';

interface BulkActionOption {
  action: BulkSectionLifecycleAction;
  label: string;
  confirmLabel: string;
  title: string;
  description: string;
  tone: ConfirmationTone;
}

function getBulkActions(tab: StatusTab): BulkActionOption[] {
  if (tab === 'archived') {
    return [
      {
        action: 'restore',
        label: 'Restore selected',
        confirmLabel: 'Restore sections',
        title: 'Restore selected sections?',
        description: 'Selected archived sections will return to the active list.',
        tone: 'default',
      },
      {
        action: 'purge',
        label: 'Purge selected',
        confirmLabel: 'Purge sections',
        title: 'Permanently delete selected sections?',
        description: 'This permanently removes the selected archived sections from the system.',
        tone: 'danger',
      },
    ];
  }

  return [
    {
      action: 'archive',
      label: 'Archive selected',
      confirmLabel: 'Archive sections',
      title: 'Archive selected sections?',
      description: 'Selected active sections will move to the archived list.',
      tone: 'danger',
    },
  ];
}

export default function SectionManagementPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [tableLoading, setTableLoading] = useState(false);
  const [tab, setTab] = useState<StatusTab>('active');
  const [search, setSearch] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [purgeTarget, setPurgeTarget] = useState<Section | null>(null);
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

      const sectionsRes = await sectionService.getAll();
      setSections(sectionsRes.data || []);
    } catch {
      toast.error('Failed to load sections');
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
    () => sections.filter((section) => section.isActive).length,
    [sections],
  );
  const archivedCount = useMemo(
    () => sections.filter((section) => !section.isActive).length,
    [sections],
  );

  const filtered = useMemo(
    () =>
      sections.filter((section) => {
        if (tab === 'active' && !section.isActive) return false;
        if (tab === 'archived' && section.isActive) return false;
        if (!search) return true;

        const query = search.toLowerCase();
        return (
          section.name?.toLowerCase().includes(query) ||
          section.gradeLevel?.toString().includes(query) ||
          section.schoolYear?.toLowerCase().includes(query) ||
          section.adviser?.firstName?.toLowerCase().includes(query) ||
          section.adviser?.lastName?.toLowerCase().includes(query)
        );
      }),
    [search, sections, tab],
  );

  const selectableVisibleIds = useMemo(
    () => filtered.map((section) => section.id),
    [filtered],
  );

  useEffect(() => {
    const visibleSet = new Set(selectableVisibleIds);
    setSelectedSectionIds((current) =>
      current.filter((id) => visibleSet.has(id)),
    );
  }, [selectableVisibleIds]);

  const allVisibleSelected =
    selectableVisibleIds.length > 0 &&
    selectableVisibleIds.every((id) => selectedSectionIds.includes(id));

  const bulkActions = useMemo(() => getBulkActions(tab), [tab]);
  const selectedSections = useMemo(
    () => filtered.filter((section) => selectedSectionIds.includes(section.id)),
    [filtered, selectedSectionIds],
  );

  const refreshTable = useCallback(async () => {
    await fetchData('table');
  }, [fetchData]);

  const toggleSectionSelection = (sectionId: string) => {
    setSelectedSectionIds((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  };

  const handleSelectAllVisible = () => {
    setSelectedSectionIds(allVisibleSelected ? [] : selectableVisibleIds);
  };

  const runBulkLifecycle = async (
    action: BulkSectionLifecycleAction,
    sectionIds: string[],
  ) => {
    const result = await sectionService.bulkLifecycle({ action, sectionIds });
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
          'Some selected sections could not be updated.',
      );
    }

    setSelectedSectionIds([]);
    await refreshTable();
  };

  const openSingleActionConfirmation = (
    section: Section,
    option: BulkActionOption,
  ) => {
    setConfirmation({
      title: option.title,
      description: option.description,
      confirmLabel: option.confirmLabel.replace('sections', 'section'),
      tone: option.tone,
      details: (
        <p className="text-sm font-black text-[var(--student-text-strong)]">
          {section.name}
        </p>
      ),
      onConfirm: async () => {
        await runBulkLifecycle(option.action, [section.id]);
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
          <p className="font-black">{selectedSectionIds.length} selected</p>
          <p className="text-[var(--student-text-muted)]">
            {selectedSections
              .slice(0, 3)
              .map((section) => section.name)
              .join(', ')}
            {selectedSections.length > 3
              ? ` and ${selectedSections.length - 3} more`
              : ''}
          </p>
        </div>
      ),
      onConfirm: async () => {
        await runBulkLifecycle(option.action, selectedSectionIds);
      },
    });
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    if (purgeConfirmText.trim() !== purgeTarget.name) {
      toast.error('Type the exact section name to purge');
      return;
    }

    try {
      await runBulkLifecycle('purge', [purgeTarget.id]);
      setPurgeTarget(null);
      setPurgeConfirmText('');
    } catch {
      toast.error('Failed to purge section');
    }
  };

  if (initialLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[32rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title="Sections"
      description="Manage school sections and rosters"
      icon={Layers3}
      actions={(
        <Button
          className="admin-button-solid rounded-[1rem] px-4 font-bold"
          onClick={() => router.push('/dashboard/admin/sections/new')}
        >
          <UserPlus className="h-4 w-4" />
          Create Section
        </Button>
      )}
    >
      <AdminSectionCard title="Section Directory" contentClassName="space-y-5">
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as StatusTab);
            setSearch('');
            setSelectedSectionIds([]);
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
                placeholder="Search sections..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="admin-input"
              />
            </div>
          </div>
        </Tabs>

        {filtered.length > 0 ? (
          <div className="admin-bulk-bar">
            <div className="admin-controls">
              <span className="admin-pill">{selectedSectionIds.length} selected</span>
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
                  disabled={selectedSectionIds.length === 0}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {filtered.length === 0 ? (
          <AdminEmptyState
            title="No sections found"
            description="Try another state or a different search query."
          />
        ) : (
          <div className={`admin-table-shell${tableLoading ? ' admin-table-shell--loading' : ''}`}>
            {tableLoading ? (
              <div className="admin-table-loading">Refreshing sections...</div>
            ) : null}
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead className="w-[6rem]">Select</TableHead>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Adviser</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((section) => {
                  const isSelected = selectedSectionIds.includes(section.id);
                  const rosterPath = `/dashboard/admin/sections/${section.id}/roster`;
                  const archiveOption = bulkActions.find(
                    (option) => option.action === 'archive',
                  );
                  const restoreOption = bulkActions.find(
                    (option) => option.action === 'restore',
                  );

                  return (
                    <TableRow
                      key={section.id}
                      className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]"
                    >
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          role="checkbox"
                          aria-label={`Select section ${section.name}`}
                          className="admin-row-checkbox"
                          checked={isSelected}
                          onChange={() => toggleSectionSelection(section.id)}
                        />
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link font-semibold text-[var(--admin-text-strong)]"
                        onClick={() => router.push(rosterPath)}
                      >
                        {section.name}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(rosterPath)}
                      >
                        Grade {section.gradeLevel}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#9aaed0]"
                        onClick={() => router.push(rosterPath)}
                      >
                        {section.schoolYear}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link text-[#7083a4]"
                        onClick={() => router.push(rosterPath)}
                      >
                        {section.adviser
                          ? `${section.adviser.firstName} ${section.adviser.lastName}`
                          : 'Unassigned'}
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link"
                        onClick={() => router.push(rosterPath)}
                      >
                        <span className="inline-flex items-center gap-2 text-[#7083a4]">
                          <Users className="h-4 w-4" />
                          {section.studentCount ?? 0}
                        </span>
                      </TableCell>
                      <TableCell
                        className="admin-table-row-link"
                        onClick={() => router.push(rosterPath)}
                      >
                        <span
                          className={
                            section.isActive
                              ? 'admin-status-pill admin-status-pill--active'
                              : 'admin-status-pill admin-status-pill--archived'
                          }
                        >
                          {section.isActive ? 'Active' : 'Archived'}
                        </span>
                      </TableCell>
                      <TableCell onClick={(event) => event.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => router.push(rosterPath)}
                            title="View roster"
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() =>
                              router.push(`/dashboard/admin/sections/${section.id}/edit`)
                            }
                            title="Edit section"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {section.isActive && archiveOption ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() =>
                                openSingleActionConfirmation(section, archiveOption)
                              }
                              title="Archive section"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!section.isActive && restoreOption ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() =>
                                openSingleActionConfirmation(section, restoreOption)
                              }
                              title="Restore section"
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!section.isActive ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() => {
                                setPurgeTarget(section);
                                setPurgeConfirmText('');
                              }}
                              title="Purge section"
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
            <DialogTitle className="text-rose-600">Purge Section</DialogTitle>
            <DialogDescription>
              This permanently deletes{' '}
              <strong>{purgeTarget?.name}</strong> from the database. Type the
              section name exactly to proceed.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={purgeConfirmText}
            onChange={(event) => setPurgeConfirmText(event.target.value)}
            placeholder="Type section name to confirm purge"
            className="admin-input"
          />
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
              disabled={purgeConfirmText.trim() !== (purgeTarget?.name || '')}
              onClick={handlePurge}
            >
              Purge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
