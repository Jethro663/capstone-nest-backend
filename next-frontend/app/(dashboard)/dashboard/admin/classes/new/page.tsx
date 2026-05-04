'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, School2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ClassForm, { createEmptyClassForm, type ClassFormValues } from '@/components/admin/ClassForm';
import { AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { classService } from '@/services/class-service';
import { academicStateService } from '@/services/academic-state-service';
import { classTemplateService } from '@/services/class-template-service';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
import {
  isTemplateCompatibleWithClass,
  matchesTemplateToSubject,
} from '@/lib/class-template-compat';
import type { Section } from '@/types/section';
import type { ClassTemplate } from '@/types/class-template';
import type { User } from '@/types/user';
import { toast } from 'sonner';

type TemplateSeed = {
  templateId: string;
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
};

export default function CreateClassPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSchoolYear, setActiveSchoolYear] = useState<string | null>(null);
  const templateSeed = useMemo<TemplateSeed>(() => ({
    templateId: searchParams.get('templateId')?.trim() ?? '',
    subjectName: searchParams.get('subjectName')?.trim() ?? '',
    subjectCode: searchParams.get('subjectCode')?.trim() ?? '',
    subjectGradeLevel: searchParams.get('subjectGradeLevel')?.trim() ?? '',
  }), [searchParams]);

  const schoolYears = useMemo(() => {
    const resolved = activeSchoolYear?.match(/^(\d{4})-(\d{4})$/);
    const startYear = resolved
      ? Number(resolved[1])
      : (() => {
          const now = new Date();
          const year = now.getFullYear();
          return now.getMonth() >= 5 ? year : year - 1;
        })();
    return Array.from({ length: 4 }, (_, i) => `${startYear + i}-${startYear + i + 1}`);
  }, [activeSchoolYear]);

  const initialValues = useMemo(
    () => ({
      ...createEmptyClassForm(schoolYears[0] || ''),
      subjectName: templateSeed.subjectName || '',
      subjectCode: templateSeed.subjectCode || '',
      subjectGradeLevel: templateSeed.subjectGradeLevel || '7',
    }),
    [schoolYears, templateSeed.subjectCode, templateSeed.subjectGradeLevel, templateSeed.subjectName],
  );

  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [formValues, setFormValues] = useState<ClassFormValues>(initialValues);
  const [compatibleTemplates, setCompatibleTemplates] = useState<ClassTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');

  const templateSelectionReady = useMemo(
    () => Boolean(formValues.subjectName.trim() && formValues.subjectGradeLevel),
    [formValues.subjectGradeLevel, formValues.subjectName],
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
      try {
        const academicState = await academicStateService.getCurrent();
        setActiveSchoolYear(academicState.data.schoolYear);
      } catch {
        setActiveSchoolYear(null);
      }
    } catch {
      toast.error('Failed to load class form data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setFormValues(initialValues);
  }, [initialValues]);

  useEffect(() => {
    if (!templateSelectionReady) {
      setCompatibleTemplates([]);
      setSelectedTemplateId('');
      return;
    }

    let mounted = true;

    const loadCompatibleTemplates = async () => {
      try {
        setTemplatesLoading(true);
        const response = await classTemplateService.getAll({
          subjectGradeLevel: formValues.subjectGradeLevel,
        });
        if (!mounted) return;
        const filtered = (response.data || []).filter(
          (template) =>
            template.status === 'published' &&
            template.subjectGradeLevel === formValues.subjectGradeLevel &&
            matchesTemplateToSubject(
              template,
              formValues.subjectName,
              formValues.subjectCode,
            ),
        );

        setCompatibleTemplates(filtered);
      } catch {
        if (mounted) {
          setCompatibleTemplates([]);
          toast.error('Failed to load compatible templates');
        }
      } finally {
        if (mounted) {
          setTemplatesLoading(false);
        }
      }
    };

    void loadCompatibleTemplates();

    return () => {
      mounted = false;
    };
  }, [
    formValues.subjectCode,
    formValues.subjectGradeLevel,
    formValues.subjectName,
    templateSelectionReady,
  ]);

  useEffect(() => {
    if (!selectedTemplateId) return;
    if (templatesLoading) return;
    const selectedStillCompatible = compatibleTemplates.some((template) => template.id === selectedTemplateId);
    if (!selectedStillCompatible) {
      setSelectedTemplateId('');
    }
  }, [compatibleTemplates, selectedTemplateId, templatesLoading]);

  useEffect(() => {
    if (!templateSeed.templateId || templatesLoading) {
      return;
    }

    const importedTemplateStillCompatible = compatibleTemplates.some(
      (template) => template.id === templateSeed.templateId,
    );

    if (importedTemplateStillCompatible) {
      setSelectedTemplateId((current) => current || templateSeed.templateId);
    }
  }, [compatibleTemplates, templateSeed.templateId, templatesLoading]);

  const handleSubmit = async (values: ClassFormValues) => {
    try {
      setSaving(true);
      let validatedTemplateId: string | undefined;

      if (selectedTemplateId) {
        const selectedTemplateResponse = await classTemplateService.getById(selectedTemplateId);
        const selectedTemplate = selectedTemplateResponse.data;
        const isValidTemplateSelection =
          selectedTemplate &&
          isTemplateCompatibleWithClass(selectedTemplate, {
            subjectName: values.subjectName,
            subjectCode: values.subjectCode,
            subjectGradeLevel: values.subjectGradeLevel,
          });

        if (!isValidTemplateSelection) {
          toast.error(
            'Selected template is no longer compatible or unpublished. Publish a compatible template before creating this class.',
          );
          return;
        }

        validatedTemplateId = selectedTemplate.id;
      }

      await classService.create({
        subjectName: values.subjectName,
        subjectCode: values.subjectCode,
        subjectGradeLevel: values.subjectGradeLevel,
        gradingProfile: values.gradingProfile,
        sectionId: values.sectionId,
        teacherId: values.teacherId,
        schoolYear: values.schoolYear,
        room: values.room.trim(),
        templateId: validatedTemplateId,
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
          templateOptions={compatibleTemplates}
          selectedTemplateId={selectedTemplateId}
          templatesLoading={templatesLoading}
          onTemplateChange={setSelectedTemplateId}
          onValuesChange={setFormValues}
          showGradingProfile
          submitLabel="Create Class"
          onSubmit={handleSubmit}
          onCancel={() => router.push('/dashboard/admin/classes')}
        />
      </AdminSectionCard>
    </AdminPageShell>
  );
}
