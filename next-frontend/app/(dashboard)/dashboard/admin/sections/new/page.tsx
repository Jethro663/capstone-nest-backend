'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import SectionForm, {
  createEmptySectionForm,
  type SectionFormValues,
} from '@/components/admin/SectionForm';
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
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-[460px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create Section</h1>
        <p className="text-muted-foreground">Define section details and assign an adviser.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Section Details</CardTitle>
        </CardHeader>
        <CardContent>
          <SectionForm
            initialValues={initialValues}
            teachers={teachers}
            schoolYears={schoolYears}
            saving={saving}
            submitLabel="Create"
            onSubmit={handleSubmit}
            onCancel={() => router.push('/dashboard/admin/sections')}
          />
        </CardContent>
      </Card>
    </div>
  );
}
