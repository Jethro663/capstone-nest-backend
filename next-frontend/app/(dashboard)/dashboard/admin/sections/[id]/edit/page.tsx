'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import SectionForm, {
  type SectionFormValues,
} from '@/components/admin/SectionForm';
import { sectionService, type RosterStudent } from '@/services/section-service';
import { userService } from '@/services/user-service';
import { getCurrentToFutureSchoolYears } from '@/lib/school-year';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';

function getInitials(firstName?: string, lastName?: string) {
  const firstInitial = firstName?.trim()?.charAt(0) || '';
  const lastInitial = lastName?.trim()?.charAt(0) || '';
  return `${firstInitial}${lastInitial}`.toUpperCase() || 'ST';
}

export default function EditSectionPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const sectionId = params?.id;

  const [section, setSection] = useState<Section | null>(null);
  const [roster, setRoster] = useState<RosterStudent[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  const schoolYears = useMemo(() => getCurrentToFutureSchoolYears(4), []);

  const initialValues = useMemo<SectionFormValues>(() => {
    return {
      name: section?.name || '',
      gradeLevel: (section?.gradeLevel as '7' | '8' | '9' | '10') || '7',
      schoolYear: section?.schoolYear || schoolYears[0] || '',
      capacity: section?.capacity || 40,
      roomNumber: section?.roomNumber || '',
      adviserId: section?.adviserId || '',
    };
  }, [schoolYears, section]);

  const fetchData = useCallback(async () => {
    if (!sectionId) return;

    try {
      setLoading(true);
      const [sectionRes, rosterRes, teachersRes] = await Promise.all([
        sectionService.getById(sectionId),
        sectionService.getRoster(sectionId),
        userService.getAll({ role: 'teacher', limit: 200 }),
      ]);

      setSection(sectionRes.data);
      setRoster(rosterRes.data || []);
      setTeachers(teachersRes.users || []);
      setSelectedStudentIds([]);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load section details'));
      router.push('/dashboard/admin/sections');
    } finally {
      setLoading(false);
    }
  }, [router, sectionId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSave = async (values: SectionFormValues) => {
    if (!sectionId) return;

    try {
      setSaving(true);
      await sectionService.update(sectionId, {
        name: values.name,
        gradeLevel: values.gradeLevel,
        schoolYear: values.schoolYear,
        capacity: values.capacity,
        roomNumber: values.roomNumber || undefined,
        adviserId: values.adviserId || undefined,
      });
      toast.success('Section updated');
      fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update section'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAll = () => {
    if (selectedStudentIds.length === roster.length) {
      setSelectedStudentIds([]);
      return;
    }

    setSelectedStudentIds(roster.map((student) => student.id));
  };

  const handleToggleOne = (studentId: string) => {
    setSelectedStudentIds((previous) =>
      previous.includes(studentId)
        ? previous.filter((id) => id !== studentId)
        : [...previous, studentId],
    );
  };

  const handleRemoveSelected = async () => {
    if (!sectionId || selectedStudentIds.length === 0) return;

    try {
      setRemoving(true);
      await Promise.all(
        selectedStudentIds.map((studentId) =>
          sectionService.removeStudent(sectionId, studentId),
        ),
      );
      toast.success(`Removed ${selectedStudentIds.length} student(s)`);
      fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to remove selected students'));
    } finally {
      setRemoving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-[430px] rounded-lg" />
        <Skeleton className="h-[360px] rounded-lg" />
      </div>
    );
  }

  if (!section) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Edit Section</h1>
          <p className="text-muted-foreground">
            Update section info and manage enrolled students.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/students/add`)}
        >
          Add Students
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Section Information</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionForm
            initialValues={initialValues}
            teachers={teachers}
            schoolYears={schoolYears}
            saving={saving}
            submitLabel="Update"
            onSubmit={handleSave}
            onCancel={() => router.push('/dashboard/admin/sections')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle>Students ({roster.length})</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleToggleAll}>
                {selectedStudentIds.length === roster.length ? 'Clear Selection' : 'Select All'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={selectedStudentIds.length === 0 || removing}
                onClick={handleRemoveSelected}
              >
                {removing
                  ? 'Removing...'
                  : `Remove Selected (${selectedStudentIds.length})`}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled in this section.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Select</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>LRN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => handleToggleOne(student.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/admin/users/${student.id}`)}
                        className="flex items-center gap-3 text-left hover:underline"
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage
                            src={(student as User).profilePicture as string | undefined}
                            alt={`${student.firstName || ''} ${student.lastName || ''}`.trim()}
                          />
                          <AvatarFallback>{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                        </Avatar>
                        <span>
                          {student.firstName} {student.lastName}
                        </span>
                      </button>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{student.email || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{student.gradeLevel || 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{student.lrn || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
