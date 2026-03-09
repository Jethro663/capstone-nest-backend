'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import type { Section } from '@/types/section';

interface Candidate {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  gradeLevel?: string;
}

export default function AdminSectionRosterPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddStudents, setShowAddStudents] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<RosterStudent | null>(
    null,
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [candidateSearch, setCandidateSearch] = useState('');

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

  const handleOpenAddStudents = async () => {
    try {
      const res = await sectionService.getCandidates(sectionId);
      setCandidates(res.data || []);
      setSelectedIds([]);
      setCandidateSearch('');
      setShowAddStudents(true);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load candidates'));
    }
  };

  const handleAddStudents = async () => {
    if (selectedIds.length === 0) return;
    try {
      await sectionService.addStudents(sectionId, selectedIds);
      toast.success(`Added ${selectedIds.length} student(s)`);
      setShowAddStudents(false);
      fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to add students'));
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the section?')) return;
    try {
      await sectionService.removeStudent(sectionId, studentId);
      toast.success('Student removed');
      setRoster((prev) => prev.filter((student) => student.id !== studentId));
      if (selectedStudent?.id === studentId) {
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
  };

  const filteredCandidates = candidates.filter((candidate) => {
    if (!candidateSearch) return true;
    const query = candidateSearch.toLowerCase();
    return (
      candidate.firstName?.toLowerCase().includes(query) ||
      candidate.lastName?.toLowerCase().includes(query) ||
      candidate.email?.toLowerCase().includes(query)
    );
  });

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
          Grade {section?.gradeLevel} - {section?.schoolYear} - {roster.length}{' '}
          students
        </p>
      </div>

      <div className="flex items-center justify-end">
        <Button size="sm" onClick={handleOpenAddStudents}>
          + Add Students
        </Button>
      </div>

      {roster.length === 0 ? (
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
              {roster.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    {student.firstName} {student.lastName}
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
                      onClick={() => handleRemoveStudent(student.id)}
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

      <Dialog open={showAddStudents} onOpenChange={setShowAddStudents}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Students to {section?.name}</DialogTitle>
            <DialogDescription>
              Select students who are not yet enrolled in this section.
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Search students..."
            value={candidateSearch}
            onChange={(event) => setCandidateSearch(event.target.value)}
          />
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {filteredCandidates.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No candidates available.
              </p>
            ) : (
              filteredCandidates.map((candidate) => (
                <label
                  key={candidate.id}
                  className="flex cursor-pointer items-center gap-3 rounded p-2 hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(candidate.id)}
                    onChange={() =>
                      setSelectedIds((prev) =>
                        prev.includes(candidate.id)
                          ? prev.filter((id) => id !== candidate.id)
                          : [...prev, candidate.id],
                      )
                    }
                  />
                  <span className="text-sm">
                    {candidate.firstName} {candidate.lastName} -{' '}
                    {candidate.email}
                  </span>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddStudents(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddStudents}
              disabled={selectedIds.length === 0}
            >
              Add {selectedIds.length} Student(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
