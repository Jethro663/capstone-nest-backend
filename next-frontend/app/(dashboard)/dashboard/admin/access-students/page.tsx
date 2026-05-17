'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, ChevronDown, ClipboardCheck, Search, UsersRound, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  sectionService,
  type AccessStudentsOverviewGradeBucket,
  type AccessStudentsOverviewSection,
} from '@/services/section-service';

type TransferMode = 'promote' | 'retain';

function sortSchoolYears(years: string[]) {
  return Array.from(new Set(years.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function formatStudentName(student: {
  firstName: string | null;
  middleName: string | null;
  lastName: string | null;
}) {
  return [student.lastName, student.firstName, student.middleName]
    .filter((value) => Boolean(value && value.trim().length > 0))
    .join(', ');
}

function formatFinalGrade(value: number | null): string {
  if (value === null || Number.isNaN(value)) return 'Not finalized';
  return `${value.toFixed(3)}%`;
}

function getGradeStatusLabel(student: { gradeStatus?: string; isFinalized?: boolean; isPassing?: boolean; isFailing?: boolean }) {
  if (!student.isFinalized || student.gradeStatus === 'pending') return 'Needs Finalization';
  if (student.isPassing || student.gradeStatus === 'passing') return 'Passing';
  if (student.isFailing || student.gradeStatus === 'failing') return 'Failing';
  return 'Needs Finalization';
}

function getGradeStatusClass(student: { gradeStatus?: string; isFinalized?: boolean; isPassing?: boolean; isFailing?: boolean }) {
  if (!student.isFinalized || student.gradeStatus === 'pending') {
    return 'admin-status-pill bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  }
  if (student.isPassing || student.gradeStatus === 'passing') {
    return 'admin-status-pill admin-status-pill--active';
  }
  return 'admin-status-pill admin-status-pill--suspended';
}

function getFinalGradeIndicator(student: { gradeStatus?: string; isFinalized?: boolean; isPassing?: boolean; isFailing?: boolean }) {
  if (!student.isFinalized || student.gradeStatus === 'pending') {
    return {
      label: 'Syncing class records',
      className: 'border-amber-200 bg-amber-50 text-amber-700',
    };
  }
  if (student.isPassing || student.gradeStatus === 'passing') {
    return {
      label: 'Passing grade',
      className: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    };
  }
  return {
    label: 'Failing grade',
    className: 'border-rose-200 bg-rose-50 text-rose-700',
  };
}

export default function AdminAccessStudentsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AccessStudentsOverviewGradeBucket[]>([]);
  const [totalSections, setTotalSections] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);

  const [schoolYearFilter, setSchoolYearFilter] = useState<string>('all');
  const [gradeLevelFilter, setGradeLevelFilter] = useState<string>('all');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set(),
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<TransferMode>('promote');
  const [targetLoading, setTargetLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [targetSchoolYear, setTargetSchoolYear] = useState('');
  const [targetSchoolYearOptions, setTargetSchoolYearOptions] = useState<string[]>([]);
  const [targetSections, setTargetSections] = useState<
    Array<{
      id: string;
      name: string;
      gradeLevel: string;
      schoolYear: string;
      roomNumber: string | null;
    }>
  >([]);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [expandedGradeLevels, setExpandedGradeLevels] = useState<Set<string>>(
    new Set(),
  );

  const flatSections = useMemo(
    () => data.flatMap((bucket) => bucket.sections),
    [data],
  );

  const schoolYearOptions = useMemo(() => {
    const years = Array.from(new Set(flatSections.map((section) => section.schoolYear)));
    return years.sort((a, b) => a.localeCompare(b));
  }, [flatSections]);

  const selectedSection: AccessStudentsOverviewSection | undefined = useMemo(
    () => flatSections.find((section) => section.id === selectedSectionId),
    [flatSections, selectedSectionId],
  );

  const visibleStudents = useMemo(() => {
    if (!selectedSection) return [];
    const normalizedSearch = studentSearch.trim().toLowerCase();

    return selectedSection.students.filter((student) => {
      if (!normalizedSearch) return true;
      const searchable = [
        student.firstName,
        student.middleName,
        student.lastName,
        student.email,
        student.lrn,
      ]
        .filter((value) => Boolean(value))
        .join(' ')
        .toLowerCase();
      return searchable.includes(normalizedSearch);
    });
  }, [selectedSection, studentSearch]);

  const selectedStudents = useMemo(() => {
    if (!selectedSection) return [];
    return selectedSection.students.filter((student) =>
      selectedStudentIds.has(student.id),
    );
  }, [selectedSection, selectedStudentIds]);

  const unfinalizedSelectedCount = useMemo(
    () => selectedStudents.filter((student) => !student.isFinalized).length,
    [selectedStudents],
  );

  const passingSelectedCount = useMemo(
    () => selectedStudents.filter((student) => student.isPassing).length,
    [selectedStudents],
  );

  const failingSelectedCount = useMemo(
    () => selectedStudents.filter((student) => student.isFailing).length,
    [selectedStudents],
  );

  const canMoveUpSelected =
    selectedStudents.length > 0 &&
    unfinalizedSelectedCount === 0 &&
    passingSelectedCount === selectedStudents.length;

  const canRetainSelected =
    selectedStudents.length > 0 &&
    unfinalizedSelectedCount === 0 &&
    failingSelectedCount === selectedStudents.length;

  const selectedValidationMessage = useMemo(() => {
    if (selectedStudents.length === 0) return 'Select at least one student to finalize, move up, or retain.';
    if (unfinalizedSelectedCount > 0) {
      return `${unfinalizedSelectedCount} selected student(s) need finalized grades before move up or retain is available.`;
    }
    if (passingSelectedCount > 0 && failingSelectedCount > 0) {
      return 'Selected students are mixed passing and failing. Process passing and failing students separately.';
    }
    if (passingSelectedCount === selectedStudents.length) {
      return 'Selected student(s) are finalized and passing, ready to move up.';
    }
    if (failingSelectedCount === selectedStudents.length) {
      return 'Selected student(s) are finalized and failing, ready to retain.';
    }
    return 'Finalize grades first, then process students based on passing or failing status.';
  }, [failingSelectedCount, passingSelectedCount, selectedStudents.length, unfinalizedSelectedCount]);

  const fetchOverview = useCallback(async (mode: 'initial' | 'refresh' | 'sync') => {
    try {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);

      const response = await sectionService.getAccessStudentsOverview({
        schoolYear: schoolYearFilter === 'all' ? undefined : schoolYearFilter,
        gradeLevel:
          gradeLevelFilter === 'all'
            ? undefined
            : (gradeLevelFilter as '7' | '8' | '9' | '10'),
      });

      setData(response.data ?? []);
      setTotalSections(response.totalSections ?? 0);
      setTotalStudents(response.totalStudents ?? 0);
    } catch (error) {
      if (mode !== 'sync') {
        toast.error(getApiErrorMessage(error, 'Failed to load Access Students data'));
        setData([]);
        setTotalSections(0);
        setTotalStudents(0);
      }
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  }, [gradeLevelFilter, schoolYearFilter]);

  useEffect(() => {
    void fetchOverview('initial');
  }, [fetchOverview]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void fetchOverview('sync');
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [fetchOverview]);

  useEffect(() => {
    if (!flatSections.length) {
      setSelectedSectionId('');
      setSelectedStudentIds(new Set());
      return;
    }

    if (!selectedSectionId || !flatSections.some((section) => section.id === selectedSectionId)) {
      setSelectedSectionId(flatSections[0].id);
      setSelectedStudentIds(new Set());
      return;
    }
  }, [flatSections, selectedSectionId]);

  useEffect(() => {
    if (data.length === 0) {
      setExpandedGradeLevels(new Set());
      return;
    }

    setExpandedGradeLevels((current) => {
      if (current.size > 0) return current;
      return new Set([data[0].gradeLevel]);
    });
  }, [data]);

  useEffect(() => {
    if (!selectedSection) return;
    setExpandedGradeLevels((current) => {
      if (current.has(selectedSection.gradeLevel)) return current;
      const next = new Set(current);
      next.add(selectedSection.gradeLevel);
      return next;
    });
  }, [selectedSection]);

  const toggleGradeLevel = (gradeLevel: string) => {
    setExpandedGradeLevels((current) => {
      const next = new Set(current);
      if (next.has(gradeLevel)) next.delete(gradeLevel);
      else next.add(gradeLevel);
      return next;
    });
  };
  const toggleStudent = (studentId: string) => {
    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const selectAllVisible = () => {
    const allVisibleSelected =
      visibleStudents.length > 0 &&
      visibleStudents.every((student) => selectedStudentIds.has(student.id));

    setSelectedStudentIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const student of visibleStudents) {
          next.delete(student.id);
        }
      } else {
        for (const student of visibleStudents) {
          next.add(student.id);
        }
      }
      return next;
    });
  };

  const loadTargetSections = async (mode: TransferMode, schoolYear?: string) => {
    if (!selectedSection) return false;

    setTargetLoading(true);
    setTargetSectionId('');
    setTargetSections([]);

    try {
      const response = await sectionService.getAccessStudentsTargetSections({
        fromSectionId: selectedSection.id,
        mode,
        schoolYear,
      });
      const options = response.data.sections ?? [];
      const selectedYear = response.data.targetSchoolYear ?? schoolYear ?? '';
      const yearOptions = sortSchoolYears([
        selectedYear,
        ...(response.data.availableSchoolYears ?? []),
      ]);

      setTargetSections(options);
      setTargetSchoolYear(selectedYear);
      setTargetSchoolYearOptions(yearOptions);
      setTargetSectionId(options[0]?.id ?? '');
      return true;
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load target sections'));
      return false;
    } finally {
      setTargetLoading(false);
    }
  };

  const openTransferDialog = async (mode: TransferMode) => {
    if (!selectedSection) {
      toast.error('Select a section first.');
      return;
    }
    if (selectedStudentIds.size === 0) {
      toast.error('Select at least one student.');
      return;
    }
    if (mode === 'promote' && !canMoveUpSelected) {
      toast.error(selectedValidationMessage);
      return;
    }
    if (mode === 'retain' && !canRetainSelected) {
      toast.error(selectedValidationMessage);
      return;
    }

    setDialogMode(mode);
    setDialogOpen(true);
    setTargetSchoolYear('');
    setTargetSchoolYearOptions([]);

    const loaded = await loadTargetSections(mode);
    if (!loaded) setDialogOpen(false);
  };

  const submitTransfer = async () => {
    if (!selectedSection) return;
    if (!targetSectionId) {
      toast.error('Choose a target section.');
      return;
    }

    if (dialogMode === 'promote' && !canMoveUpSelected) {
      toast.error(selectedValidationMessage);
      return;
    }
    if (dialogMode === 'retain' && !canRetainSelected) {
      toast.error(selectedValidationMessage);
      return;
    }

    const studentIds = Array.from(selectedStudentIds);

    try {
      setSubmitting(true);
      if (dialogMode === 'promote') {
        const response = await sectionService.moveUpStudents({
          fromSectionId: selectedSection.id,
          targetSectionId,
          studentIds,
        });
        toast.success(response.message || 'Students moved up successfully.');
      } else {
        const response = await sectionService.failStudents({
          fromSectionId: selectedSection.id,
          targetSectionId,
          studentIds,
        });
        toast.success(response.message || 'Students retained successfully.');
      }

      setDialogOpen(false);
      setSelectedStudentIds(new Set());
      await fetchOverview('refresh');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update students'));
    } finally {
      setSubmitting(false);
    }
  };

  const finalizeSelectedGrades = async () => {
    if (!selectedSection) {
      toast.error('Select a section first.');
      return;
    }
    if (selectedStudentIds.size === 0) {
      toast.error('Select at least one student to finalize.');
      return;
    }

    try {
      setFinalizing(true);
      const response = await sectionService.finalizeAccessStudentGrades({
        sectionId: selectedSection.id,
        studentIds: Array.from(selectedStudentIds),
      });
      toast.success(response.message || 'Selected student grades were finalized.');
      await fetchOverview('refresh');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to finalize selected grades'));
    } finally {
      setFinalizing(false);
    }
  };
  const selectedVisibleCount = visibleStudents.filter((student) =>
    selectedStudentIds.has(student.id),
  ).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[1.25rem]" />
        <Skeleton className="h-[35rem] rounded-[1.25rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="School Setup"
      title="Access Students"
      description="Review section rosters by grade level and process student promotion or retention in bulk."
      icon={UsersRound}
      stats={(
        <>
          <AdminStatCard
            label="Visible Sections"
            value={String(totalSections)}
            caption="Based on current filters"
            icon={UsersRound}
            accent="sky"
          />
          <AdminStatCard
            label="Visible Students"
            value={String(totalStudents)}
            caption="Roster entries loaded"
            icon={Search}
            accent="emerald"
          />
        </>
      )}
    >
      <AdminSectionCard title="Section Filters" contentClassName="space-y-4">
        <div className="admin-filter-row">
          <div className="admin-controls">
            <select
              value={schoolYearFilter}
              onChange={(event) => setSchoolYearFilter(event.target.value)}
              className="admin-select min-w-[12rem] rounded-[1rem] px-3 py-2 text-sm font-bold text-[#6f83a3]"
            >
              <option value="all">All School Years</option>
              {schoolYearOptions.map((schoolYear) => (
                <option key={schoolYear} value={schoolYear}>
                  {schoolYear}
                </option>
              ))}
            </select>
            <select
              value={gradeLevelFilter}
              onChange={(event) => setGradeLevelFilter(event.target.value)}
              className="admin-select min-w-[10rem] rounded-[1rem] px-3 py-2 text-sm font-bold text-[#6f83a3]"
            >
              <option value="all">All Grades</option>
              <option value="7">Grade 7</option>
              <option value="8">Grade 8</option>
              <option value="9">Grade 9</option>
              <option value="10">Grade 10</option>
            </select>
            <Button
              type="button"
              className="admin-button-solid rounded-xl font-black"
              disabled={refreshing}
              onClick={() => void fetchOverview('refresh')}
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Section and Student Access" contentClassName="space-y-5">
        {flatSections.length === 0 ? (
          <AdminEmptyState
            title="No sections found"
            description="Adjust the school year or grade filter and try again."
          />
        ) : (
          <div className="grid gap-5 lg:grid-cols-[20rem_minmax(0,1fr)]">
            <div className="space-y-3 rounded-2xl border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] p-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                  Grade & Section Dropdowns
                </p>
                <span className="rounded-full bg-white px-2 py-1 text-[0.65rem] font-black text-[var(--admin-text-muted)] ring-1 ring-[var(--admin-outline)]">
                  {flatSections.length} sections
                </span>
              </div>
              <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">
                {data.map((bucket) => {
                  const expanded = expandedGradeLevels.has(bucket.gradeLevel);
                  const studentCount = bucket.sections.reduce(
                    (total, section) => total + section.studentCount,
                    0,
                  );

                  return (
                    <div key={bucket.gradeLevel} className="overflow-hidden rounded-2xl border border-[var(--admin-outline)] bg-white">
                      <button
                        type="button"
                        onClick={() => toggleGradeLevel(bucket.gradeLevel)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-[var(--admin-surface-soft)]"
                        aria-expanded={expanded}
                      >
                        <span>
                          <span className="block text-sm font-black text-[var(--admin-text-strong)]">
                            Grade {bucket.gradeLevel}
                          </span>
                          <span className="text-xs text-[var(--admin-text-muted)]">
                            {bucket.sections.length} section(s) - {studentCount} student(s)
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-[var(--admin-text-muted)] transition ${expanded ? 'rotate-180' : ''}`}
                        />
                      </button>

                      {expanded ? (
                        <div className="space-y-2 border-t border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] p-2">
                          {bucket.sections.map((section) => {
                            const active = section.id === selectedSectionId;
                            return (
                              <button
                                key={section.id}
                                type="button"
                                onClick={() => {
                                  setSelectedSectionId(section.id);
                                  setSelectedStudentIds(new Set());
                                }}
                                className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                                  active
                                    ? 'border-[var(--admin-accent)] bg-white text-[var(--admin-text-strong)] shadow-sm'
                                    : 'border-[var(--admin-outline)] bg-white/70 text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)] hover:bg-white'
                                }`}
                              >
                                <p className="text-sm font-black">{section.name}</p>
                                <p className="text-xs">
                                  SY {section.schoolYear} - Room {section.roomNumber ?? 'N/A'}
                                </p>
                                <p className="text-xs">
                                  {section.studentCount} students - {section.finalizedClassRecordCount}/{section.classRecordCount} finalized records
                                </p>
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              {selectedSection ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] p-4">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-[var(--admin-text-strong)]">
                        Grade {selectedSection.gradeLevel} - {selectedSection.name}
                      </p>
                      <p className="text-xs text-[var(--admin-text-muted)]">
                        School Year {selectedSection.schoolYear} - Room {selectedSection.roomNumber ?? 'N/A'}
                      </p>
                      <p className="text-xs text-[var(--admin-text-muted)]">
                        Adviser: {selectedSection.adviser ? `${selectedSection.adviser.firstName ?? ''} ${selectedSection.adviser.lastName ?? ''}`.trim() || selectedSection.adviser.email : 'Unassigned'}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl"
                        onClick={selectAllVisible}
                        disabled={visibleStudents.length === 0}
                      >
                        Select All Visible ({selectedVisibleCount}/{visibleStudents.length})
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl border-emerald-200 bg-emerald-50 font-black text-emerald-700 hover:bg-emerald-100"
                        onClick={() => void finalizeSelectedGrades()}
                        disabled={selectedStudentIds.size === 0 || finalizing}
                      >
                        <ClipboardCheck className="mr-2 h-4 w-4" />
                        {finalizing ? 'Finalizing...' : 'Finalize Selected Grades'}
                      </Button>
                      <Button
                        type="button"
                        className="admin-button-solid rounded-xl font-black disabled:opacity-50"
                        onClick={() => void openTransferDialog('promote')}
                        disabled={!canMoveUpSelected}
                      >
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Move Up
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-xl disabled:opacity-50"
                        onClick={() => void openTransferDialog('retain')}
                        disabled={!canRetainSelected}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Fail / Retain
                      </Button>
                    </div>
                    <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${
                      selectedStudents.length > 0 && unfinalizedSelectedCount === 0
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                      {selectedValidationMessage}
                    </div>
                  </div>

                  <div className="admin-search-shell min-w-[18rem]">
                    <Search className="h-4 w-4 text-[#8ea0bc]" />
                    <Input
                      placeholder="Search student by name, email, or LRN..."
                      value={studentSearch}
                      onChange={(event) => setStudentSearch(event.target.value)}
                      className="admin-input"
                    />
                  </div>

                  {visibleStudents.length === 0 ? (
                    <AdminEmptyState
                      title="No students found"
                      description="Try a different search query or choose another section."
                    />
                  ) : (
                    <div className="admin-table-shell">
                      <Table>
                        <TableHeader className="admin-table-head">
                          <TableRow>
                            <TableHead className="w-14">Select</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>LRN</TableHead>
                            <TableHead>Final Grade</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {visibleStudents.map((student) => {
                            const checked = selectedStudentIds.has(student.id);
                            const finalGradeIndicator = getFinalGradeIndicator(student);
                            return (
                              <TableRow key={student.id} className="border-t border-[var(--admin-outline)]">
                                <TableCell>
                                  <input
                                    aria-label={`Select ${student.email}`}
                                    type="checkbox"
                                    checked={checked}
                                    onChange={() => toggleStudent(student.id)}
                                  />
                                </TableCell>
                                <TableCell className="font-semibold text-[var(--admin-text-strong)]">
                                  {formatStudentName(student) || student.email}
                                </TableCell>
                                <TableCell className="text-[#6f83a3]">{student.email}</TableCell>
                                <TableCell className="text-[#6f83a3]">{student.lrn ?? 'N/A'}</TableCell>
                                <TableCell className="font-black text-[#334b6d]">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span>{formatFinalGrade(student.finalGradePercentage ?? student.finalGrade)}</span>
                                    <span
                                      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.08em] ${finalGradeIndicator.className}`}
                                    >
                                      {finalGradeIndicator.label}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-[0.68rem] font-semibold text-[#8ea0bc]">
                                    {student.finalizationLabel}
                                  </p>
                                </TableCell>
                                <TableCell>
                                  <span className={getGradeStatusClass(student)}>
                                    {getGradeStatusLabel(student)}
                                  </span>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </>
              ) : (
                <AdminEmptyState
                  title="Select a section"
                  description="Choose a section from the left panel to view students."
                />
              )}
            </div>
          </div>
        )}
      </AdminSectionCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === 'promote' ? 'Move Up Students' : 'Retain Students'}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === 'promote'
                ? 'Choose the target section for selected students in the next grade level.'
                : 'Choose the target section for selected students in the same grade level next school year.'}
            </DialogDescription>
          </DialogHeader>

          {targetLoading ? (
            <p className="text-sm text-[var(--admin-text-muted)]">Loading target sections...</p>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="font-black">Target School Year</Label>
                <select
                  value={targetSchoolYear}
                  onChange={(event) => {
                    const nextSchoolYear = event.target.value;
                    setTargetSchoolYear(nextSchoolYear);
                    void loadTargetSections(dialogMode, nextSchoolYear);
                  }}
                  className="admin-select h-11 w-full rounded-xl px-3 text-sm font-semibold text-[#24364f]"
                >
                  {targetSchoolYearOptions.map((schoolYear) => (
                    <option key={schoolYear} value={schoolYear}>
                      {schoolYear}
                    </option>
                  ))}
                </select>
                <p className="text-xs font-semibold text-[var(--admin-text-muted)]">
                  Sections below update based on the selected school year.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="font-black">Target Section</Label>
                <select
                  value={targetSectionId}
                  onChange={(event) => setTargetSectionId(event.target.value)}
                  className="admin-select h-11 w-full rounded-xl px-3 text-sm font-semibold text-[#6f83a3]"
                >
                  {targetSections.length === 0 ? (
                    <option value="">No available sections</option>
                  ) : null}
                  {targetSections.map((section) => (
                    <option key={section.id} value={section.id}>
                      Grade {section.gradeLevel} - {section.name} ({section.schoolYear})
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-xl border border-[var(--admin-outline)] bg-[var(--admin-surface-soft)] p-3 text-sm text-[var(--admin-text-muted)]">
                {selectedValidationMessage}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-red-600 font-black text-white hover:bg-red-700"
              disabled={
                targetLoading ||
                submitting ||
                !targetSectionId ||
                (dialogMode === 'promote' && !canMoveUpSelected) ||
                (dialogMode === 'retain' && !canRetainSelected)
              }
              onClick={() => void submitTransfer()}
            >
              {submitting ? 'Applying...' : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
