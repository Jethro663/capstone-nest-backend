'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenCheck, School, Sparkles } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SectionForm, {
  createEmptySectionForm,
  type SectionFormValues,
} from '@/components/admin/SectionForm';
import {
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
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
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[36rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title="Create Section"
      description="Set up a new section with a clearer, more welcoming admin flow so the important details are easy to review before launch."
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
      stats={(
        <>
          <AdminStatCard label="Advisers Ready" value={teachers.length} caption="Teachers available for assignment" icon={School} accent="emerald" />
          <AdminStatCard label="School Year" value={schoolYears[0] || '—'} caption="Default year for the new section" icon={BookOpenCheck} accent="sky" />
          <AdminStatCard label="Default Capacity" value={initialValues.capacity} caption="Starting seat count before adjustment" icon={Sparkles} accent="amber" />
        </>
      )}
    >
      <AdminSectionCard
        title="Section Details"
        description="The setup stays the same logically, but the layout now gives the core details a calmer, more guided surface."
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
