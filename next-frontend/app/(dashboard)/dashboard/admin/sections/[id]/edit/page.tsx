'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, School, UserPlus } from 'lucide-react';
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
import SectionForm, { type SectionFormValues } from '@/components/admin/SectionForm';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
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
  const availableSchoolYears = useMemo(() => {
    if (!section?.schoolYear || schoolYears.includes(section.schoolYear)) {
      return schoolYears;
    }

    return [section.schoolYear, ...schoolYears];
  }, [schoolYears, section?.schoolYear]);

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
        <Skeleton className="h-28 rounded-[1.25rem]" />
        <Skeleton className="h-[24rem] rounded-[1.35rem]" />
        <Skeleton className="h-[24rem] rounded-[1.35rem]" />
      </div>
    );
  }

  if (!section) {
    return null;
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title={`Edit ${section.name}`}
      description="Update section settings and manage the roster from a tighter admin workspace."
      icon={School}
      variant="compact-form"
      actions={(
        <>
          <Button
            variant="outline"
            className="admin-button-outline rounded-xl font-black"
            onClick={() => router.push('/dashboard/admin/sections')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sections
          </Button>
          <Button
            className="admin-button-solid rounded-xl font-black"
            onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/students/add`)}
          >
            <UserPlus className="h-4 w-4" />
            Add Students
          </Button>
        </>
      )}
      meta={(
        <>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Grade Level</span>
            Grade {section.gradeLevel}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Enrolled</span>
            {roster.length} / {section.capacity || '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Selected</span>
            {selectedStudentIds.length}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">School Year</span>
            {section.schoolYear || '-'}
          </div>
        </>
      )}
    >
      <AdminSectionCard
        title="Section Information"
        description="Adjust the section basics without the extra visual weight."
        density="compact"
      >
        <SectionForm
          initialValues={initialValues}
          teachers={teachers}
          schoolYears={availableSchoolYears}
          saving={saving}
          submitLabel="Save Changes"
          onSubmit={handleSave}
          onCancel={() => router.push('/dashboard/admin/sections')}
        />
      </AdminSectionCard>

      <AdminSectionCard
        title={`Students (${roster.length})`}
        description="Manage roster members and bulk actions from the same page."
        density="compact"
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={handleToggleAll}>
              {selectedStudentIds.length === roster.length ? 'Clear Selection' : 'Select All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50"
              disabled={selectedStudentIds.length === 0 || removing}
              onClick={handleRemoveSelected}
            >
              {removing ? 'Removing...' : `Remove Selected (${selectedStudentIds.length})`}
            </Button>
          </div>
        )}
      >
        {roster.length === 0 ? (
          <AdminEmptyState
            title="No students enrolled yet"
            description="This section is ready, but no roster entries have been assigned yet. Add students when you are ready to populate the class."
            action={(
              <Button
                className="admin-button-solid rounded-xl font-black"
                onClick={() => router.push(`/dashboard/admin/sections/${sectionId}/students/add`)}
              >
                <UserPlus className="h-4 w-4" />
                Add Students
              </Button>
            )}
          />
        ) : (
          <div className="admin-table-shell">
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead className="w-14">Select</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>LRN</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roster.map((student) => (
                  <TableRow key={student.id} className="transition-colors duration-200 hover:bg-emerald-50/45">
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={selectedStudentIds.includes(student.id)}
                        onChange={() => handleToggleOne(student.id)}
                        className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => router.push(`/dashboard/admin/users/${student.id}`)}
                        className="flex items-center gap-3 rounded-xl px-1 py-1 text-left transition-colors hover:bg-emerald-50/70"
                      >
                        <Avatar className="h-9 w-9 border border-white/70 shadow-sm">
                          <AvatarImage
                            src={(student as User).profilePicture as string | undefined}
                            alt={`${student.firstName || ''} ${student.lastName || ''}`.trim()}
                          />
                          <AvatarFallback>{getInitials(student.firstName, student.lastName)}</AvatarFallback>
                        </Avatar>
                        <span className="font-semibold text-[var(--admin-text-strong)]">
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
          </div>
        )}
      </AdminSectionCard>
    </AdminPageShell>
  );
}
