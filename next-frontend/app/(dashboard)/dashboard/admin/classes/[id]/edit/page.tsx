'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, CalendarRange, School2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ClassForm, { createEmptyClassForm, type ClassFormValues } from '@/components/admin/ClassForm';
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
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
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[38rem] rounded-[1.7rem]" />
      </div>
    );
  }

  if (!classItem) return null;

  return (
    <AdminPageShell
      badge="Admin Classes"
      title={`Edit ${classItem.subjectName}`}
      description="Refine subject, assignment, and schedule details from a more polished admin editing surface without changing the underlying class logic."
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
      stats={(
        <>
          <AdminStatCard label="Subject Code" value={classItem.subjectCode || '—'} caption="Current class identifier" icon={BookOpenCheck} accent="emerald" />
          <AdminStatCard label="Grade Level" value={`Grade ${classItem.subjectGradeLevel || '—'}`} caption="Assigned learning level" icon={School2} accent="sky" />
          <AdminStatCard label="School Year" value={classItem.schoolYear || '—'} caption="Academic cycle for this class" icon={CalendarRange} accent="amber" />
        </>
      )}
    >
      <AdminSectionCard
        title={`${classItem.subjectName} (${classItem.subjectCode})`}
        description="The edit form keeps the same fields and validation, now presented in a calmer and more engaging admin workspace."
      >
        <ClassForm
          initialValues={initialValues}
          sections={sections}
          teachers={teachers}
          schoolYears={schoolYears}
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
