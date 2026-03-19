'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[38rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Classes"
      title="Create Class"
      description="Launch a new class from a more polished setup flow that keeps assignment, scheduling, and school-year details easy to review."
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
          <AdminStatCard label="Sections Ready" value={sections.length} caption="Available section assignments" icon={School2} accent="emerald" />
          <AdminStatCard label="Teachers Ready" value={teachers.length} caption="Eligible teacher assignments" icon={BookOpenCheck} accent="sky" />
          <AdminStatCard label="School Year" value={schoolYears[0] || '—'} caption="Default academic cycle for this class" icon={CalendarRange} accent="amber" />
        </>
      )}
    >
      <AdminSectionCard
        title="Class Details"
        description="The create flow keeps the same logic, now presented inside a stronger admin workspace shell."
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
