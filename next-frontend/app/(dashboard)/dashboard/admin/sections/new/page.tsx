'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, School } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SectionForm, {
  createEmptySectionForm,
  type SectionFormValues,
} from '@/components/admin/SectionForm';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
import { getCurrentToFutureSchoolYears } from '@/lib/school-year';
import type { User } from '@/types/user';
import { toast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api-error';

export default function CreateSectionPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const schoolYears = useMemo(() => getCurrentToFutureSchoolYears(4), []);
  const initialValues = useMemo(
    () => createEmptySectionForm(schoolYears[0] || ''),
    [schoolYears],
  );

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const teachersRes = await userService.getAll({ role: 'teacher', limit: 200 });
      setTeachers(teachersRes.users || []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load section form data'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmit = async (values: SectionFormValues) => {
    try {
      setSaving(true);
      await sectionService.create({
        name: values.name,
        gradeLevel: values.gradeLevel,
        schoolYear: values.schoolYear,
        capacity: values.capacity,
        roomNumber: values.roomNumber || undefined,
        adviserId: values.adviserId || undefined,
      });
      toast.success('Section created');
      router.push('/dashboard/admin/sections');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create section'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-28 rounded-[1.25rem]" />
        <Skeleton className="h-[32rem] rounded-[1.35rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title="Create Section"
      description="Set up a section from a simpler admin form where the key details are visible right away."
      icon={School}
      variant="compact-form"
      actions={(
        <Button
          variant="outline"
          className="admin-button-outline rounded-xl font-black"
          onClick={() => router.push('/dashboard/admin/sections')}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sections
        </Button>
      )}
      meta={(
        <>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Advisers</span>
            {teachers.length}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">School Year</span>
            {schoolYears[0] || '-'}
          </div>
          <div className="admin-compact-meta__item">
            <span className="admin-compact-meta__label">Capacity</span>
            {initialValues.capacity} seats
          </div>
        </>
      )}
    >
      <AdminSectionCard
        title="Section Details"
        description="Enter the section basics and save when everything looks right."
        density="compact"
      >
        <SectionForm
          initialValues={initialValues}
          teachers={teachers}
          schoolYears={schoolYears}
          saving={saving}
          submitLabel="Create Section"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/admin/sections')}
        />
      </AdminSectionCard>
    </AdminPageShell>
  );
}
