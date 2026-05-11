'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowUpCircle, Search, UsersRound, XCircle } from 'lucide-react';
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
  if (value === null || Number.isNaN(value)) return 'N/A';
  return value.toFixed(2);
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
  const [targetSchoolYear, setTargetSchoolYear] = useState('');
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
  const [confirmFailingPromotion, setConfirmFailingPromotion] = useState(false);

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

  const failingSelectedCount = useMemo(() => {
    if (!selectedSection) return 0;
    return selectedSection.students.filter(
      (student) => selectedStudentIds.has(student.id) && student.isFailing,
    ).length;
  }, [selectedSection, selectedStudentIds]);

  const fetchOverview = useCallback(async (mode: 'initial' | 'refresh') => {
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
      toast.error(getApiErrorMessage(error, 'Failed to load Access Students data'));
      setData([]);
      setTotalSections(0);
      setTotalStudents(0);
    } finally {
      if (mode === 'initial') setLoading(false);
      if (mode === 'refresh') setRefreshing(false);
    }
  }, [gradeLevelFilter, schoolYearFilter]);

  useEffect(() => {
    void fetchOverview('initial');
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

  const openTransferDialog = async (mode: TransferMode) => {
    if (!selectedSection) {
      toast.error('Select a section first.');
      return;
    }
    if (selectedStudentIds.size === 0) {
      toast.error('Select at least one student.');
      return;
    }

    setDialogMode(mode);
    setDialogOpen(true);
    setTargetLoading(true);
    setTargetSectionId('');
    setTargetSections([]);
    setTargetSchoolYear('');
    setConfirmFailingPromotion(false);

    try {
      const response = await sectionService.getAccessStudentsTargetSections({
        fromSectionId: selectedSection.id,
        mode,
      });
      const options = response.data.sections ?? [];
      setTargetSections(options);
      setTargetSchoolYear(response.data.targetSchoolYear ?? '');
      setTargetSectionId(options[0]?.id ?? '');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load target sections'));
      setDialogOpen(false);
    } finally {
      setTargetLoading(false);
    }
  };

  const submitTransfer = async () => {
    if (!selectedSection) return;
    if (!targetSectionId) {
      toast.error('Choose a target section.');
      return;
    }

    if (dialogMode === 'promote' && failingSelectedCount > 0 && !confirmFailingPromotion) {
      toast.error('Confirm failing-student promotion before continuing.');
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
          allowFailingPromotion: failingSelectedCount > 0,
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
              <p className="text-xs font-black uppercase tracking-[0.12em] text-[var(--admin-text-muted)]">
                Sections
              </p>
              <div className="max-h-[30rem] space-y-2 overflow-auto pr-1">
                {data.map((bucket) => (
                  <div key={bucket.gradeLevel} className="space-y-2">
                    <p className="px-2 text-xs font-black uppercase tracking-[0.1em] text-[var(--admin-text-muted)]">
                      Grade {bucket.gradeLevel}
                    </p>
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
                              ? 'border-[var(--admin-accent)] bg-white text-[var(--admin-text-strong)]'
                              : 'border-[var(--admin-outline)] bg-[var(--admin-surface)] text-[var(--admin-text-muted)] hover:border-[var(--admin-accent)]'
                          }`}
                        >
                          <p className="text-sm font-black">
                            {section.name}
                          </p>
                          <p className="text-xs">
                            SY {section.schoolYear} Â· Room {section.roomNumber ?? 'N/A'}
                          </p>
                          <p className="text-xs">
                            {section.studentCount} students Â· {section.finalizedClassRecordCount}/{section.classRecordCount} finalized records
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ))}
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
                        School Year {selectedSection.schoolYear} Â· Room {selectedSection.roomNumber ?? 'N/A'}
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
                        className="admin-button-solid rounded-xl font-black"
                        onClick={() => void openTransferDialog('promote')}
                        disabled={selectedStudentIds.size === 0}
                      >
                        <ArrowUpCircle className="mr-2 h-4 w-4" />
                        Move Up
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        className="rounded-xl"
                        onClick={() => void openTransferDialog('retain')}
                        disabled={selectedStudentIds.size === 0}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Fail / Retain
                      </Button>
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
                                <TableCell className="text-[#6f83a3]">
                                  {formatFinalGrade(student.finalGrade)}
                                </TableCell>
                                <TableCell>
                                  <span
                                    className={
                                      student.isFailing
                                        ? 'admin-status-pill admin-status-pill--suspended'
                                        : 'admin-status-pill admin-status-pill--active'
                                    }
                                  >
                                    {student.isFailing ? 'Below 75' : 'Passing'}
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
                <Input value={targetSchoolYear} readOnly className="admin-input" />
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

              {dialogMode === 'promote' && failingSelectedCount > 0 ? (
                <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                  <p>
                    {failingSelectedCount} selected student(s) have final grades below 75.
                    Confirm if you still want to move them up.
                  </p>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={confirmFailingPromotion}
                      onChange={(event) =>
                        setConfirmFailingPromotion(event.target.checked)
                      }
                    />
                    <span>I confirm moving up failing students.</span>
                  </label>
                </div>
              ) : null}
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
                (dialogMode === 'promote' &&
                  failingSelectedCount > 0 &&
                  !confirmFailingPromotion)
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
