'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import ClassForm, { createEmptyClassForm, type ClassFormValues } from '@/components/admin/ClassForm';
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
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-[520px] rounded-lg" />
      </div>
    );
  }

  if (!classItem) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Edit Class</h1>
        <p className="text-muted-foreground">Update class details, assignment, and schedule.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            {classItem.subjectName} ({classItem.subjectCode})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ClassForm
            initialValues={initialValues}
            sections={sections}
            teachers={teachers}
            schoolYears={schoolYears}
            saving={saving}
            submitLabel="Update"
            onSubmit={handleSubmit}
            onCancel={() => router.push('/dashboard/admin/classes')}
            editingClassId={classId}
          />
        </CardContent>
      </Card>
    </div>
  );
}
