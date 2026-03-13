'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ScheduleCalendarCreator, type ScheduleSlot } from '@/components/admin/ScheduleCalendarCreator';
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
}: ClassFormProps) {
  const [form, setForm] = useState<ClassFormValues>(initialValues);

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
    }));
  };

  const filteredSections = form.subjectGradeLevel
    ? sections.filter((s) => s.gradeLevel === form.subjectGradeLevel)
    : [];

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
            onChange={(event) => setField('sectionId', event.target.value)}
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
