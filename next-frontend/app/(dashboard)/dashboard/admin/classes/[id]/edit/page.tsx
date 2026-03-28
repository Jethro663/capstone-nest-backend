'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, School2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ClassForm, { createEmptyClassForm, type ClassFormValues } from '@/components/admin/ClassForm';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
import type { ClassItem, ClassSchedule } from '@/types/class';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';
import type { ScheduleSlot } from '@/components/admin/ScheduleCalendarCreator';
import { toast } from 'sonner';

function mapSchedules(schedules?: ClassSchedule[]): ScheduleSlot[] {
  if (!schedules || schedules.length === 0) return [];
  return schedules.map((schedule) => ({
    days: [...schedule.days],
    startTime: schedule.startTime,
    endTime: schedule.endTime,
  }));
}

export default function EditClassPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const classId = params?.id;

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schoolYears = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const startYear = now.getMonth() >= 5 ? year : year - 1;
    return Array.from({ length: 4 }, (_, i) => `${startYear + i}-${startYear + i + 1}`);
  }, []);

  const defaultSchoolYear = schoolYears[0] || '';
  const availableSchoolYears = useMemo(() => {
    if (!classItem?.schoolYear || schoolYears.includes(classItem.schoolYear)) {
      return schoolYears;
    }

    return [classItem.schoolYear, ...schoolYears];
  }, [classItem?.schoolYear, schoolYears]);

  const initialValues = useMemo<ClassFormValues>(() => {
    if (!classItem) return createEmptyClassForm(defaultSchoolYear);

    return {
      subjectName: classItem.subjectName || '',
      subjectCode: classItem.subjectCode || '',
      subjectGradeLevel: classItem.subjectGradeLevel || '7',
      sectionId: classItem.sectionId || '',
      teacherId: classItem.teacherId || '',
      schoolYear: classItem.schoolYear || defaultSchoolYear,
      room: classItem.room || '',
      schedules: mapSchedules(classItem.schedules),
    };
  }, [classItem, defaultSchoolYear]);

  const fetchData = useCallback(async () => {
    if (!classId) return;

    try {
      setLoading(true);
      const [classRes, sectionsRes, teachersRes] = await Promise.all([
        classService.getById(classId),
        sectionService.getAll(),
        userService.getAll({ role: 'teacher', limit: 200 }),
      ]);

      setClassItem(classRes.data || null);
      setSections(sectionsRes.data || []);
      setTeachers(teachersRes.users || []);
    } catch {
      toast.error('Failed to load class');
      router.push('/dashboard/admin/classes');
    } finally {
      setLoading(false);
    }
  }, [classId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (values: ClassFormValues) => {
    if (!classId) return;

    try {
      setSaving(true);
      await classService.update(classId, {
        subjectName: values.subjectName,
        subjectCode: values.subjectCode,
        subjectGradeLevel: values.subjectGradeLevel,
        sectionId: values.sectionId,
        teacherId: values.teacherId,
        schoolYear: values.schoolYear,
        room: values.room || undefined,
        schedules: values.schedules,
      });
      toast.success('Class updated');
      router.push('/dashboard/admin/classes');
    } catch {
      toast.error('Failed to update class');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-[1.25rem]" />
        <Skeleton className="h-[34rem] rounded-[1.35rem]" />
      </div>
    );
  }

  if (!classItem) return null;

  return (
    <AdminPageShell
      badge="Admin Classes"
      title={`Edit ${classItem.subjectName}`}
      description="Update the class assignment and timetable from a simpler admin editing surface."
      icon={School2}
      variant="compact-form"
      actions={(
        <Button
          variant="outline"
          className="admin-button-outline rounded-xl font-black"
          onClick={() => router.push('/dashboard/admin/classes')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </Button>
      )}
      meta={(
        <>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Subject Code</span>
            {classItem.subjectCode || '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Grade Level</span>
            Grade {classItem.subjectGradeLevel || '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">School Year</span>
            {classItem.schoolYear || '-'}
          </div>
        </>
      )}
    >
      <AdminSectionCard
        title={`${classItem.subjectName} (${classItem.subjectCode})`}
        description="Keep the class details up to date without the oversized cards around the form."
        density="compact"
      >
        <ClassForm
          initialValues={initialValues}
          sections={sections}
          teachers={teachers}
          schoolYears={availableSchoolYears}
          saving={saving}
          submitLabel="Save Changes"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/admin/classes')}
          editingClassId={classId}
        />
      </AdminSectionCard>
    </AdminPageShell>
  );
}
