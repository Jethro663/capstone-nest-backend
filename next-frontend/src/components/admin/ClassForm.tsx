'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import {
  ScheduleCalendarCreator,
  type ScheduleSlot,
  type ExistingScheduleSlot,
} from '@/components/admin/ScheduleCalendarCreator';
import type { ClassItem } from '@/types/class';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';

const SUBJECTS = [
  'Science',
  'Araling Panlipunan',
  'Mathematics',
  'English',
  'Fili',
  'TLE',
  'Values',
  'MAPEH',
] as const;

const SELECT_CLS =
  'flex h-10 w-full rounded-md border-2 border-zinc-300 dark:border-zinc-600 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 shadow-sm disabled:cursor-not-allowed disabled:opacity-50';

export type ClassFormValues = {
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
  sectionId: string;
  teacherId: string;
  schoolYear: string;
  room: string;
  schedules: ScheduleSlot[];
};

export function createEmptyClassForm(defaultSchoolYear: string): ClassFormValues {
  return {
    subjectName: '',
    subjectCode: '',
    subjectGradeLevel: '7',
    sectionId: '',
    teacherId: '',
    schoolYear: defaultSchoolYear,
    room: '',
    schedules: [],
  };
}

type ClassFormProps = {
  initialValues: ClassFormValues;
  sections: Section[];
  teachers: User[];
  schoolYears: string[];
  saving?: boolean;
  onSubmit: (values: ClassFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  /** When editing, pass the class ID so we exclude it from existing section slots */
  editingClassId?: string;
};

export default function ClassForm({
  initialValues,
  sections,
  teachers,
  schoolYears,
  saving = false,
  onSubmit,
  onCancel,
  submitLabel,
  editingClassId,
}: ClassFormProps) {
  const [form, setForm] = useState<ClassFormValues>(initialValues);
  const [existingSlots, setExistingSlots] = useState<ExistingScheduleSlot[]>([]);
  const [loadingSection, setLoadingSection] = useState(false);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const setField = (field: keyof ClassFormValues, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleGradeLevelChange = (value: string) => {
    setForm((current) => ({
      ...current,
      subjectGradeLevel: value,
      sectionId:
        sections.find((s) => s.id === current.sectionId)?.gradeLevel === value
          ? current.sectionId
          : '',
      // Clear schedules when grade level changes (section will clear)
      schedules: [],
    }));
    setExistingSlots([]);
  };

  const handleSectionChange = (sectionId: string) => {
    setForm((current) => ({
      ...current,
      sectionId,
      // Clear user schedules when section changes
      schedules: [],
    }));
    // Existing slots will be fetched by the effect below
  };

  const filteredSections = form.subjectGradeLevel
    ? sections.filter((s) => s.gradeLevel === form.subjectGradeLevel)
    : [];

  // ─── Schedule readiness ─────────────────────────────────────────────────────
  const isScheduleReady = Boolean(
    form.subjectName &&
    form.subjectCode.trim() &&
    form.subjectGradeLevel &&
    form.sectionId &&
    form.schoolYear,
  );

  // ─── Fetch existing section schedules when prerequisites are met ────────────
  const fetchSectionSchedules = useCallback(
    async (sectionId: string) => {
      try {
        setLoadingSection(true);
        const res = await classService.getBySection(sectionId);
        const sectionClasses: ClassItem[] = res.data || [];

        // Flatten all class schedules into ExistingScheduleSlots,
        // excluding the class being edited (if applicable)
        const slots: ExistingScheduleSlot[] = [];
        for (const cls of sectionClasses) {
          if (editingClassId && cls.id === editingClassId) continue;
          if (!cls.schedules?.length) continue;
          for (const sched of cls.schedules) {
            slots.push({
              days: [...sched.days],
              startTime: sched.startTime,
              endTime: sched.endTime,
              subjectName: cls.subjectName,
              subjectCode: cls.subjectCode,
              teacherName: cls.teacher
                ? `${cls.teacher.firstName || ''} ${cls.teacher.lastName || ''}`.trim()
                : undefined,
              room: cls.room || undefined,
            });
          }
        }
        setExistingSlots(slots);
      } catch {
        // Non-fatal: schedule creator still works, just without existing blocks
        setExistingSlots([]);
      } finally {
        setLoadingSection(false);
      }
    },
    [editingClassId],
  );

  useEffect(() => {
    if (isScheduleReady && form.sectionId) {
      fetchSectionSchedules(form.sectionId);
    } else {
      setExistingSlots([]);
    }
  }, [isScheduleReady, form.sectionId, fetchSectionSchedules]);

  // ─── Submission ─────────────────────────────────────────────────────────────

  const normalizedSchedules = (): ScheduleSlot[] => {
    return form.schedules
      .filter((slot) => slot.days.length > 0 && slot.startTime && slot.endTime)
      .map((slot) => ({
        days: slot.days,
        startTime: slot.startTime,
        endTime: slot.endTime,
      }));
  };

  const handleSubmit = async () => {
    if (!form.subjectName || !form.subjectCode.trim()) {
      toast.error('Subject name and code are required');
      return;
    }
    if (!form.subjectGradeLevel) {
      toast.error('Please select a grade level');
      return;
    }
    if (!form.sectionId || !form.teacherId) {
      toast.error('Section and teacher are required');
      return;
    }

    await onSubmit({
      ...form,
      schedules: normalizedSchedules(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Subject Name">
          <select
            value={form.subjectName}
            onChange={(event) => setField('subjectName', event.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select subject</option>
            {SUBJECTS.map((subject) => (
              <option key={subject} value={subject}>
                {subject}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Subject Code">
          <Input
            value={form.subjectCode}
            onChange={(event) => setField('subjectCode', event.target.value)}
            placeholder="e.g. MATH-7"
            className="border-2 border-zinc-300 dark:border-zinc-600 shadow-sm focus-visible:ring-2"
          />
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Grade Level">
          <select
            value={form.subjectGradeLevel}
            onChange={(event) => handleGradeLevelChange(event.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select grade level</option>
            {['7', '8', '9', '10'].map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </Field>

        <Field label="School Year">
          <select
            value={form.schoolYear}
            onChange={(event) => setField('schoolYear', event.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select year</option>
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Section">
          <select
            value={form.sectionId}
            onChange={(event) => handleSectionChange(event.target.value)}
            disabled={!form.subjectGradeLevel}
            className={SELECT_CLS}
          >
            <option value="">
              {form.subjectGradeLevel
                ? `Select section (Grade ${form.subjectGradeLevel})`
                : 'Select a grade level first'}
            </option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Teacher">
          <select
            value={form.teacherId}
            onChange={(event) => setField('teacherId', event.target.value)}
            className={SELECT_CLS}
          >
            <option value="">Select teacher</option>
            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.firstName} {teacher.lastName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Room">
        <Input
          value={form.room}
          onChange={(event) => setField('room', event.target.value)}
          placeholder="e.g. Room 201"
          className="border-2 border-zinc-300 dark:border-zinc-600 shadow-sm focus-visible:ring-2"
        />
      </Field>

      <ScheduleCalendarCreator
        value={form.schedules}
        onChange={(schedules) =>
          setForm((current) => ({ ...current, schedules }))
        }
        existingSlots={existingSlots}
        disabled={!isScheduleReady || loadingSection}
      />

      <div className="flex items-center justify-end gap-2 border-t pt-4">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={saving || !form.subjectName || !form.subjectCode.trim() || !form.subjectGradeLevel}
        >
          {saving ? 'Saving...' : submitLabel}
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
