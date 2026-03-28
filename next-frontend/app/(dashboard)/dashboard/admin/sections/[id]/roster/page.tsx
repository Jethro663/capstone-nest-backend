'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, School, UserPlus } from 'lucide-react';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { SectionScheduleViewer } from '@/components/shared/SectionScheduleViewer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Section } from '@/types/section';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
} from '@/components/admin/AdminPageShell';

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || '';
  const lastInitial = lastName?.trim()?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

export default function AdminSectionRosterPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sectionRes, rosterRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getRoster(sectionId),
      ]);
      setSection(sectionRes.data);
      setRoster(rosterRes.data || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load roster'));
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveStudent = (student: RosterStudent) => {
    setConfirmation({
      title: 'Remove student from section?',
      description: 'This will remove the student from the current section roster.',
      confirmLabel: 'Remove Student',
      tone: 'danger',
      details: (
        <p className="text-sm font-black text-[var(--admin-text-strong)]">
          {student.firstName} {student.lastName}
        </p>
      ),
      onConfirm: async () => {
        try {
          await sectionService.removeStudent(sectionId, student.id);
          toast.success('Student removed');
          setRoster((prev) => prev.filter((entry) => entry.id !== student.id));
          if (selectedStudent?.id === student.id) {
            setSelectedStudent(null);
          }
        } catch (error) {
          toast.error(getApiErrorMessage(error, 'Failed to remove student'));
        }
      },
    });
  };

  const dedupedRoster = useMemo(() => {
    const unique = new Map<string, RosterStudent>();
    for (const student of roster) {
      if (!unique.has(student.id)) {
        unique.set(student.id, student);
      }
    }
    return Array.from(unique.values());
  }, [roster]);

  const adviserName = section?.adviser
    ? `${section.adviser.firstName || ''} ${section.adviser.lastName || ''}`.trim() || 'Assigned'
    : 'Unassigned';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-[1.25rem]" />
        <Skeleton className="h-[20rem] rounded-[1.35rem]" />
        <Skeleton className="h-[24rem] rounded-[1.35rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title={`${section?.name ?? 'Section'} Roster`}
      description="Review the section timetable and student roster in one calmer admin workspace."
      icon={School}
      variant="compact-form"
      actions={(
        <>
          <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => router.push('/dashboard/admin/sections')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Sections
          </Button>
          <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/edit`)}>
            Edit Section
          </Button>
          <Button className="admin-button-solid rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/students/add`)}>
            <UserPlus className="h-4 w-4" />
            Add Students
          </Button>
        </>
      )}
      meta={(
        <>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Grade Level</span>
            Grade {section?.gradeLevel ?? '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Students</span>
            {dedupedRoster.length} / {section?.capacity ?? '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">School Year</span>
            {section?.schoolYear ?? '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Adviser</span>
            {adviserName}
          </div>
        </>
      )}
    >
      <AdminSectionCard
        title="Weekly Schedule"
        description="See how this section is distributed across the week without the extra nested card chrome."
        density="compact"
      >
        <SectionScheduleViewer sectionId={sectionId} chrome="flat" />
      </AdminSectionCard>

      <AdminSectionCard
        title={`Students (${dedupedRoster.length})`}
        description="Browse the enrolled students and open or remove entries directly from the roster."
        density="compact"
      >
        {dedupedRoster.length === 0 ? (
          <AdminEmptyState
            title="No students in this section yet"
            description="This section is ready, but no roster entries have been assigned yet."
            action={(
              <Button className="admin-button-solid rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/students/add`)}>
                <UserPlus className="h-4 w-4" />
                Add Students
              </Button>
            )}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--admin-outline)] bg-[#fbfcfe] px-4 py-3">
              <p className="text-sm font-semibold text-[var(--admin-text-strong)]">
                {dedupedRoster.length} student{dedupedRoster.length === 1 ? '' : 's'} enrolled
              </p>
              <p className="text-xs uppercase tracking-[0.14em] text-[var(--admin-text-muted)]">
                Select a student name to open the full profile
              </p>
            </div>

            <div className="admin-table-shell">
              <Table>
                <TableHeader className="admin-table-head">
                  <TableRow className="hover:bg-transparent">
                    <TableHead>#</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>LRN</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-0">
                  {dedupedRoster.map((student, index) => (
                    <TableRow key={student.id} className="admin-table-row">
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => router.push(`/dashboard/admin/users/${student.id}`)}
                          className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-red-50/70"
                        >
                          <Avatar className="h-9 w-9 border border-[var(--admin-outline)]">
                            {student.profilePicture ? (
                              <AvatarImage src={student.profilePicture} alt={`${student.firstName || ''} ${student.lastName || ''}`.trim()} />
                            ) : null}
                            <AvatarFallback>{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                          </Avatar>
                          <span className="font-semibold text-[var(--admin-text-strong)]">
                            {student.firstName} {student.lastName}
                          </span>
                        </button>
                      </TableCell>
                      <TableCell className="text-[var(--admin-text-muted)]">{student.email || 'N/A'}</TableCell>
                      <TableCell className="text-[var(--admin-text-muted)]">{student.lrn || 'N/A'}</TableCell>
                      <TableCell className="text-[var(--admin-text-muted)]">{student.gradeLevel || 'N/A'}</TableCell>
                      <TableCell className="space-x-1 text-right">
                        <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setSelectedStudent(student)}>
                          View
                        </Button>
                        <Button variant="ghost" size="sm" className="rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => handleRemoveStudent(student)}>
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </AdminSectionCard>

      <Dialog open={!!selectedStudent} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent className="rounded-[1.6rem] border-[var(--admin-outline)] bg-white shadow-2xl">
          <DialogHeader>
            <DialogTitle>Student Info</DialogTitle>
            <DialogDescription>Quick profile summary for the selected student.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <InfoRow label="Name" value={`${selectedStudent?.firstName || ''} ${selectedStudent?.lastName || ''}`.trim()} />
            <InfoRow label="Email" value={selectedStudent?.email} />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="LRN" value={selectedStudent?.lrn} />
              <InfoRow label="Grade Level" value={selectedStudent?.gradeLevel} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setSelectedStudent(null)}>
              Close
            </Button>
            {selectedStudent ? (
              <Button className="admin-button-solid rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/users/${selectedStudent.id}`)}>
                Open Full Profile
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </AdminPageShell>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--admin-text-muted)]">
        {label}
      </p>
      <p className="text-[var(--admin-text-strong)]">{value || 'N/A'}</p>
    </div>
  );
}
