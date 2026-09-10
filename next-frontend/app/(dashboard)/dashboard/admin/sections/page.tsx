'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Archive, ChevronDown, Layers3, Pencil, Search, Trash2, UserPlus, Users } from 'lucide-react';
import {
  type BulkSectionLifecycleAction,
  sectionService,
  type RosterStudent,
} from '@/services/section-service';
import { academicStateService } from '@/services/academic-state-service';
import { adminLifecycleService } from '@/services/admin-lifecycle-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { AdminLifecycleDialog } from '@/components/admin/AdminLifecycleDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import type { Section } from '@/types/section';
import type { AcademicPeriodKey, PreviewSectionLifecycleInput } from '@/types/admin-lifecycle';

type SectionStudentResolution =
  PreviewSectionLifecycleInput['studentResolutions'][number]['resolution'];

type StatusTab = 'active' | 'archived';

interface BulkActionOption {
  action: BulkSectionLifecycleAction;
  label: string;
  confirmLabel: string;
  title: string;
  description: string;
  tone: 'danger';
}

function getBulkActions(tab: StatusTab): BulkActionOption[] {
  if (tab === 'archived') {
    return [
      {
        action: 'purge',
        label: 'Purge selected',
        confirmLabel: 'Purge sections',
        title: 'Permanently delete selected sections?',
        description: 'Review each archived section before permanent deletion.',
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
      description: 'Review every learner outcome while preserving adviser and teacher history.',
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
  const [gradeFilter, setGradeFilter] = useState('all');
  const [schoolYearFilter, setSchoolYearFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedSectionIds, setSelectedSectionIds] = useState<string[]>([]);
  const [lifecycleTarget, setLifecycleTarget] = useState<Section | null>(null);
  const [lifecycleRoster, setLifecycleRoster] = useState<RosterStudent[]>([]);
  const [activePeriod, setActivePeriod] = useState<AcademicPeriodKey>('Q1');
  const [learnerOutcomes, setLearnerOutcomes] = useState<
    Record<string, { resolution?: SectionStudentResolution; destinationSectionId?: string }>
  >({});

  const fetchData = useCallback(async (mode: 'initial' | 'table') => {
    try {
      if (mode === 'initial') {
        setInitialLoading(true);
      } else {
        setTableLoading(true);
      }

      const [sectionsRes, academicStateRes] = await Promise.all([
        sectionService.getAll({ limit: 100 }),
        academicStateService.getCurrent(),
      ]);
      setSections(sectionsRes.data || []);
      setActivePeriod(academicStateRes.data.quarter as AcademicPeriodKey);
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
  const schoolYearOptions = useMemo(
    () =>
      Array.from(
        new Set(
          sections
            .map((section) => section.schoolYear)
            .filter((schoolYear): schoolYear is string => Boolean(schoolYear)),
        ),
      ).sort((left, right) => right.localeCompare(left)),
    [sections],
  );

  const filtered = useMemo(
    () =>
      sections.filter((section) => {
        if (tab === 'active' && !section.isActive) return false;
        if (tab === 'archived' && section.isActive) return false;
        if (gradeFilter !== 'all' && String(section.gradeLevel) !== gradeFilter) {
          return false;
        }
        if (schoolYearFilter !== 'all' && section.schoolYear !== schoolYearFilter) {
          return false;
        }
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
    [gradeFilter, schoolYearFilter, search, sections, tab],
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

  const openSingleActionConfirmation = async (section: Section) => {
    setLifecycleRoster([]);
    setLearnerOutcomes({});
    if (section.isActive) {
      try {
        const rosterResponse = await sectionService.getRoster(section.id);
        const unique = Array.from(
          new Map((rosterResponse.data || []).map((student) => [student.id, student])).values(),
        );
        setLifecycleRoster(unique);
        setLifecycleTarget(section);
      } catch {
        toast.error('Failed to load section roster for lifecycle review');
        setLifecycleTarget(null);
      }
    } else {
      setLifecycleTarget(section);
    }
  };

  const openBulkConfirmation = (option: BulkActionOption) => {
    const next = selectedSections[0];
    if (!next) return;
    toast.info(
      `${selectedSections.length} selected. Review begins with ${next.name}; failed or unreviewed sections stay selected.`,
    );
    void option;
    void openSingleActionConfirmation(next);
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
            setGradeFilter('all');
            setSchoolYearFilter('all');
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
              <div className="relative">
                <select
                  value={schoolYearFilter}
                  onChange={(event) => setSchoolYearFilter(event.target.value)}
                  className="admin-select min-w-[10rem] appearance-none pr-10 text-sm font-semibold text-[#6f83a3]"
                >
                  <option value="all">All School Years</option>
                  {schoolYearOptions.map((schoolYear) => (
                    <option key={schoolYear} value={schoolYear}>
                      {schoolYear}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
              </div>
              {gradeFilter !== 'all' ? (
                <span className="admin-filter-badge">Grade {gradeFilter}</span>
              ) : null}
              {schoolYearFilter !== 'all' ? (
                <span className="admin-filter-badge">SY {schoolYearFilter}</span>
              ) : null}
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
                              onClick={() => void openSingleActionConfirmation(section)}
                              title="Archive section"
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          ) : null}
                          {!section.isActive ? (
                            <button
                              type="button"
                              className="admin-icon-button"
                              onClick={() => {
                                void openSingleActionConfirmation(section);
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

      {lifecycleTarget ? (
        <AdminLifecycleDialog
          open
          onOpenChange={(open) => !open && setLifecycleTarget(null)}
          title={
            lifecycleTarget.isActive
              ? 'Resolve learners and close section'
              : 'Permanently delete archived section'
          }
          description={
            lifecycleTarget.isActive
              ? 'Choose an explicit outcome for every active learner. Linked classes close only when the whole plan is valid.'
              : 'Deletion is allowed only when no class, enrollment, lifecycle, or academic evidence remains.'
          }
          targetLabel={lifecycleTarget.name}
          permanent={!lifecycleTarget.isActive}
          intents={
            lifecycleTarget.isActive
              ? [
                  {
                    value: 'CLOSE',
                    label: 'Resolve learners and close section',
                    description: 'The preview validates every learner and every linked class as one atomic operation.',
                  },
                ]
              : [
                  {
                    value: 'PURGE',
                    label: 'Permanently delete empty record',
                    description: 'There is no evidence override.',
                  },
                ]
          }
          renderIntentFields={() =>
            lifecycleTarget.isActive ? (
              <div className="mt-4 space-y-3">
                {lifecycleRoster.length === 0 ? (
                  <p className="rounded-xl border border-[var(--admin-outline)] bg-[#fbfcfe] p-3 text-sm text-[var(--admin-text-muted)]">
                    No active learners are assigned to this section.
                  </p>
                ) : (
                  lifecycleRoster.map((student) => {
                    const outcome = learnerOutcomes[student.id] ?? {};
                    return (
                      <div key={student.id} className="rounded-xl border border-[var(--admin-outline)] bg-[#fbfcfe] p-3">
                        <p className="font-semibold text-[var(--admin-text-strong)]">
                          {student.firstName} {student.lastName}
                        </p>
                        <select
                          aria-label={`Outcome for ${student.firstName} ${student.lastName}`}
                          value={outcome.resolution ?? ''}
                          onChange={(event) => {
                            const resolution = event.target.value as SectionStudentResolution;
                            setLearnerOutcomes((current) => ({
                              ...current,
                              [student.id]: {
                                resolution,
                                destinationSectionId:
                                  resolution === 'TRANSFER_SECTION'
                                    ? current[student.id]?.destinationSectionId
                                    : undefined,
                              },
                            }));
                          }}
                          className="admin-select mt-2 w-full"
                        >
                          <option value="">Choose learner outcome</option>
                          <option value="WITHDRAW">Withdraw from school</option>
                          <option value="TRANSFER_SECTION">Transfer section</option>
                          <option value="COMPLETE">Complete through annual transition</option>
                        </select>
                        {outcome.resolution === 'TRANSFER_SECTION' ? (
                          <select
                            aria-label={`Destination for ${student.firstName} ${student.lastName}`}
                            value={outcome.destinationSectionId ?? ''}
                            onChange={(event) =>
                              setLearnerOutcomes((current) => ({
                                ...current,
                                [student.id]: {
                                  ...current[student.id],
                                  destinationSectionId: event.target.value,
                                },
                              }))
                            }
                            className="admin-select mt-2 w-full"
                          >
                            <option value="">Choose destination</option>
                            {sections
                              .filter(
                                (entry) =>
                                  entry.id !== lifecycleTarget.id &&
                                  entry.isActive &&
                                  entry.schoolYear === lifecycleTarget.schoolYear &&
                                  entry.gradeLevel === lifecycleTarget.gradeLevel,
                              )
                              .map((entry) => (
                                <option key={entry.id} value={entry.id}>
                                  {entry.name}
                                </option>
                              ))}
                          </select>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>
            ) : null
          }
          canPreview={() =>
            !lifecycleTarget.isActive ||
            lifecycleRoster.every((student) => {
              const outcome = learnerOutcomes[student.id];
              return Boolean(
                outcome?.resolution &&
                  (outcome.resolution !== 'TRANSFER_SECTION' || outcome.destinationSectionId),
              );
            })
          }
          preview={async () =>
            lifecycleTarget.isActive
              ? (
                  await adminLifecycleService.previewSection({
                    sectionId: lifecycleTarget.id,
                    effectivePeriod: activePeriod,
                    studentResolutions: lifecycleRoster.map((student) => ({
                      studentId: student.id,
                      resolution: learnerOutcomes[student.id].resolution as SectionStudentResolution,
                      destinationSectionId: learnerOutcomes[student.id].destinationSectionId,
                    })),
                  })
                ).data
              : (
                  await adminLifecycleService.previewPurge({
                    targetType: 'SECTION',
                    targetId: lifecycleTarget.id,
                  })
                ).data
          }
          execute={async (_intent, evidence) =>
            lifecycleTarget.isActive
              ? (
                  await adminLifecycleService.executeSection({
                    sectionId: lifecycleTarget.id,
                    effectivePeriod: activePeriod,
                    studentResolutions: lifecycleRoster.map((student) => ({
                      studentId: student.id,
                      resolution: learnerOutcomes[student.id].resolution as SectionStudentResolution,
                      destinationSectionId: learnerOutcomes[student.id].destinationSectionId,
                    })),
                    ...evidence,
                  })
                ).data
              : (
                  await adminLifecycleService.executePurge({
                    targetType: 'SECTION',
                    targetId: lifecycleTarget.id,
                    ...evidence,
                  })
                ).data
          }
          onCompleted={async () => {
            toast.success(
              lifecycleTarget.isActive ? 'Section archived' : 'Section permanently deleted',
            );
            setSelectedSectionIds((current) =>
              current.filter((id) => id !== lifecycleTarget.id),
            );
            await refreshTable();
          }}
        />
      ) : null}
    </AdminPageShell>
  );
}
