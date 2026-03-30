'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, School2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ClassForm, { createEmptyClassForm, type ClassFormValues } from '@/components/admin/ClassForm';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';
import { toast } from 'sonner';

export default function CreateClassPage() {
  const router = useRouter();
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

  const initialValues = useMemo(
    () => createEmptyClassForm(schoolYears[0] || ''),
    [schoolYears],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [sectionsRes, teachersRes] = await Promise.all([
        sectionService.getAll(),
        userService.getAll({ role: 'teacher', limit: 200 }),
      ]);
      setSections(sectionsRes.data || []);
      setTeachers(teachersRes.users || []);
    } catch {
      toast.error('Failed to load class form data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (values: ClassFormValues) => {
    try {
      setSaving(true);
      await classService.create({
        subjectName: values.subjectName,
        subjectCode: values.subjectCode,
        subjectGradeLevel: values.subjectGradeLevel,
        sectionId: values.sectionId,
        teacherId: values.teacherId,
        schoolYear: values.schoolYear,
        room: values.room || undefined,
        schedules: values.schedules,
      });
      toast.success('Class created');
      router.push('/dashboard/admin/classes');
    } catch {
      toast.error('Failed to create class');
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

  return (
    <AdminPageShell
      badge="Admin Classes"
      title="Create Class"
      description="Create a class from a tighter setup flow with the assignment and schedule in one clear workspace."
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
            <span className="admin-compact-meta__label">Sections</span>
            {sections.length} available
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Teachers</span>
            {teachers.length} ready
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">School Year</span>
            {schoolYears[0] || '-'}
          </div>
        </>
      )}
    >
      <AdminSectionCard
        title="Class Details"
        description="Set the subject, assignment, and timetable without the oversized dashboard framing."
        density="compact"
      >
        <ClassForm
          initialValues={initialValues}
          sections={sections}
          teachers={teachers}
          schoolYears={schoolYears}
          saving={saving}
          submitLabel="Create Class"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/admin/classes')}
        />
      </AdminSectionCard>
    </AdminPageShell>
  );
}
