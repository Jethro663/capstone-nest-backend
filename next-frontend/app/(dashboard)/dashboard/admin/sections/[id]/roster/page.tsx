'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
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
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(
    null,
  );
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
        <p className="text-sm font-black text-[var(--student-text-strong)]">
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
          toast.error(
            getApiErrorMessage(
              error,
              'Failed to remove student',
            ),
          );
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

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-2"
        >
          Back
        </Button>
        <h1 className="text-2xl font-bold">{section?.name} - Roster</h1>
        <p className="text-muted-foreground">
          Grade {section?.gradeLevel} - {section?.schoolYear} - {dedupedRoster.length}{' '}
          students
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/edit`)}
        >
          Edit Section
        </Button>
        <Button
          size="sm"
          onClick={() =>
            router.push(`/dashboard/admin/sections/${sectionId}/students/add`)
          }
        >
          + Add Students
        </Button>
      </div>

      <SectionScheduleViewer sectionId={sectionId} />

      {dedupedRoster.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No students in this section yet.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Student</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>LRN</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dedupedRoster.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border">
                        {student.profilePicture ? (
                          <AvatarImage
                            src={student.profilePicture}
                            alt={`${student.firstName || ''} ${student.lastName || ''}`.trim()}
                          />
                        ) : null}
                        <AvatarFallback>
                          {getInitials(student.firstName, student.lastName)}
                        </AvatarFallback>
                      </Avatar>
                      <span>
                        {student.firstName} {student.lastName}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.email || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.lrn || 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {student.gradeLevel || 'N/A'}
                  </TableCell>
                  <TableCell className="space-x-1 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStudent(student)}
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => handleRemoveStudent(student)}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={!!selectedStudent}
        onOpenChange={(open) => !open && setSelectedStudent(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Student Info</DialogTitle>
            <DialogDescription>
              Quick profile summary for the selected student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm">
            <InfoRow
              label="Name"
              value={`${selectedStudent?.firstName || ''} ${
                selectedStudent?.lastName || ''
              }`.trim()}
            />
            <InfoRow label="Email" value={selectedStudent?.email} />
            <div className="grid grid-cols-2 gap-4">
              <InfoRow label="LRN" value={selectedStudent?.lrn} />
              <InfoRow
                label="Grade Level"
                value={selectedStudent?.gradeLevel}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>
              Close
            </Button>
            {selectedStudent ? (
              <Button
                onClick={() =>
                  router.push(`/dashboard/admin/users/${selectedStudent.id}`)
                }
              >
                Open Full Profile
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
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
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p>{value || 'N/A'}</p>
    </div>
  );
}
