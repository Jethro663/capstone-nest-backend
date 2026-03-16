'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';
import { SectionScheduleViewer } from '@/components/shared/SectionScheduleViewer';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Section } from '@/types/section';

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || '';
  const lastInitial = lastName?.trim()?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

export default function SectionRosterPage() {
  const params = useParams();
  const router = useRouter();
  const sectionId = params.id as string;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [loading, setLoading] = useState(true);

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
      toast.error(getApiErrorMessage(error, 'Failed to load section roster'));
    } finally {
      setLoading(false);
    }
  }, [sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRemoveStudent = async (studentId: string) => {
    if (!confirm('Remove this student from the section?')) return;

    try {
      await sectionService.removeStudent(sectionId, studentId);
      toast.success('Student removed');
      setRoster((previous) => previous.filter((student) => student.id !== studentId));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove student'));
    }
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
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
        <h1 className="text-2xl font-bold">{section?.name} — Roster</h1>
        <p className="text-muted-foreground">
          Grade {section?.gradeLevel} • {section?.schoolYear} • {dedupedRoster.length} students
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/dashboard/teacher/sections/${sectionId}/students/add`)}
        >
          + Add Students
        </Button>
      </div>

      <SectionScheduleViewer sectionId={sectionId} />

      {dedupedRoster.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">No students in this section.</CardContent>
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
                <TableRow
                  key={student.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    router.push(
                      `/dashboard/teacher/sections/${sectionId}/students/${student.id}`,
                    )
                  }
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3 text-left">
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
                  <TableCell className="text-muted-foreground">{student.email || 'N/A'}</TableCell>
                  <TableCell className="text-muted-foreground">{student.lrn || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{student.gradeLevel || '—'}</TableCell>
                  <TableCell
                    className="text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
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
    </div>
  );
}
