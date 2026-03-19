'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { User } from '@/types/user';

const SELECT_CLS =
  'admin-select flex h-12 w-full rounded-2xl px-4 py-3 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50';

export type SectionFormValues = {
  name: string;
  gradeLevel: '7' | '8' | '9' | '10';
  schoolYear: string;
  capacity: number;
  roomNumber: string;
  adviserId: string;
};

export function createEmptySectionForm(defaultSchoolYear: string): SectionFormValues {
  return {
    name: '',
    gradeLevel: '7',
    schoolYear: defaultSchoolYear,
    capacity: 40,
    roomNumber: '',
    adviserId: '',
  };
}

type SectionFormProps = {
  initialValues: SectionFormValues;
  teachers: User[];
  schoolYears: string[];
  saving?: boolean;
  onSubmit: (values: SectionFormValues) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
};

export default function SectionForm({
  initialValues,
  teachers,
  schoolYears,
  saving = false,
  onSubmit,
  onCancel,
  submitLabel,
}: SectionFormProps) {
  const [form, setForm] = useState<SectionFormValues>(initialValues);

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    await onSubmit({
      ...form,
      name: form.name.trim(),
      roomNumber: form.roomNumber.trim(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="admin-filter-shell space-y-2 rounded-[1.35rem] px-4 py-4">
        <p className="text-[11px] font-black uppercase tracking-[0.24em] text-[var(--admin-text-muted)]">
          Section Setup
        </p>
        <p className="text-sm leading-6 text-[var(--admin-text-muted)]">
          Keep the essentials together so admins can create or update sections quickly without losing context.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Section Name</Label>
        <Input
          value={form.name}
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="e.g. Kamia"
          className="admin-input h-12 rounded-2xl"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grade Level</Label>
          <select
            value={form.gradeLevel}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                gradeLevel: event.target.value as SectionFormValues['gradeLevel'],
              }))
            }
            className={SELECT_CLS}
          >
            {['7', '8', '9', '10'].map((grade) => (
              <option key={grade} value={grade}>
                Grade {grade}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">School Year</Label>
          <select
            value={form.schoolYear}
            onChange={(event) => setForm((current) => ({ ...current, schoolYear: event.target.value }))}
            className={SELECT_CLS}
          >
            <option value="">Select school year</option>
            {schoolYears.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Capacity</Label>
          <Input
            type="number"
            value={form.capacity}
            min={1}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                capacity: Number(event.target.value) || 0,
              }))
            }
            className="admin-input h-12 rounded-2xl"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Room</Label>
          <Input
            value={form.roomNumber}
            onChange={(event) => setForm((current) => ({ ...current, roomNumber: event.target.value }))}
            placeholder="e.g. 201"
            className="admin-input h-12 rounded-2xl"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adviser (Optional)</Label>
        <select
          value={form.adviserId}
          onChange={(event) => setForm((current) => ({ ...current, adviserId: event.target.value }))}
          className={SELECT_CLS}
        >
          <option value="">No adviser</option>
          {teachers.map((teacher) => (
            <option key={teacher.id} value={teacher.id}>
              {teacher.firstName} {teacher.lastName}
            </option>
          ))}
        </select>
      </div>

      <div className="admin-filter-shell flex flex-col gap-3 rounded-[1.35rem] border-t-0 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-black text-[var(--admin-text-strong)]">Ready to save?</p>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Review the section name, year, adviser, and capacity before confirming.
          </p>
        </div>
        <div className="flex items-center justify-end gap-2">
        <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="admin-button-solid rounded-xl font-black"
          onClick={handleSubmit}
          disabled={saving || !form.name.trim() || !form.schoolYear || form.capacity < 1}
        >
          {saving ? 'Saving...' : submitLabel}
        </Button>
        </div>
      </div>
    </div>
  );
}
