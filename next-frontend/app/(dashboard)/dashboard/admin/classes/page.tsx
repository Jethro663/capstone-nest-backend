'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { ScheduleCalendarCreator, type ScheduleSlot } from '@/components/admin/ScheduleCalendarCreator';
import type { ClassItem, ClassSchedule } from '@/types/class';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';

type ClassFormState = {
  subjectName: string;
  subjectCode: string;
  subjectGradeLevel: string;
  sectionId: string;
  teacherId: string;
  schoolYear: string;
  room: string;
  schedules: ScheduleSlot[];
};

function createEmptyForm(defaultSchoolYear: string): ClassFormState {
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

/** Convert backend ClassSchedule (has id, daysExpanded, etc.) to clean ScheduleSlot */
function mapSchedules(schedules?: ClassSchedule[]): ScheduleSlot[] {
  if (!schedules || schedules.length === 0) return [];
  return schedules.map((s) => ({
    days: [...s.days],
    startTime: s.startTime,
    endTime: s.endTime,
  }));
}

export default function ClassManagementPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const currentYear = new Date().getFullYear();
  const schoolYears = useMemo(
    () =>
      Array.from(
        { length: 5 },
        (_, index) => `${currentYear - 2 + index}-${currentYear - 1 + index}`,
      ),
    [currentYear],
  );

  const defaultSchoolYear = schoolYears[2] || '';

  const [showCreate, setShowCreate] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<ClassItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClassFormState>(() =>
    createEmptyForm(defaultSchoolYear),
  );

  const formatSchedules = (
    schedules?: { days: string[]; startTime: string; endTime: string }[],
  ) => {
    if (!schedules?.length) return 'N/A';
    return schedules
      .map((schedule) =>
        `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`,
      )
      .join(', ');
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [classesRes, sectionsRes, teachersRes] = await Promise.all([
        classService.getAll(),
        sectionService.getAll(),
        userService.getAll({ role: 'teacher', limit: 200 }),
      ]);
      setClasses(classesRes.data?.data || []);
      setSections(sectionsRes.data || []);
      setTeachers(teachersRes.users || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const resetForm = () => {
    setForm(createEmptyForm(defaultSchoolYear));
  };

  const filtered = classes.filter((classItem) => {
    if (
      gradeFilter !== 'all' &&
      classItem.subjectGradeLevel !== gradeFilter
    ) {
      return false;
    }

    if (search) {
      const query = search.toLowerCase();
      return (
        classItem.subjectName?.toLowerCase().includes(query) ||
        classItem.subjectCode?.toLowerCase().includes(query) ||
        classItem.section?.name?.toLowerCase().includes(query) ||
        classItem.teacher?.firstName?.toLowerCase().includes(query) ||
        classItem.teacher?.lastName?.toLowerCase().includes(query) ||
        classItem.room?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const handleOpenCreate = () => {
    resetForm();
    setEditClass(null);
    setShowCreate(true);
  };

  const handleOpenEdit = (classItem: ClassItem) => {
    setEditClass(classItem);
    setForm({
      subjectName: classItem.subjectName || '',
      subjectCode: classItem.subjectCode || '',
      subjectGradeLevel: classItem.subjectGradeLevel || '7',
      sectionId: classItem.sectionId || '',
      teacherId: classItem.teacherId || '',
      schoolYear: classItem.schoolYear || defaultSchoolYear,
      room: classItem.room || '',
      schedules: mapSchedules(classItem.schedules),
    });
    setShowCreate(true);
  };

  const setField = (field: keyof ClassFormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  /** The ScheduleCalendarCreator guarantees valid output, so normalization is trivial */
  const normalizedSchedules = (): ScheduleSlot[] => {
    return form.schedules.filter(
      (s) => s.days.length > 0 && s.startTime && s.endTime,
    ).map((s) => ({
      days: s.days,
      startTime: s.startTime,
      endTime: s.endTime,
    }));
  };

  const handleSave = async () => {
    if (!form.subjectName.trim() || !form.subjectCode.trim()) return;
    if (!form.sectionId || !form.teacherId) {
      toast.error('Section and teacher are required');
      return;
    }

    const schedules = normalizedSchedules();

    try {
      setSaving(true);
      if (editClass) {
        await classService.update(editClass.id, {
          subjectName: form.subjectName,
          subjectCode: form.subjectCode,
          subjectGradeLevel: form.subjectGradeLevel,
          sectionId: form.sectionId,
          teacherId: form.teacherId,
          schoolYear: form.schoolYear,
          room: form.room || undefined,
          schedules,
        });
        toast.success('Class updated');
      } else {
        await classService.create({
          subjectName: form.subjectName,
          subjectCode: form.subjectCode,
          subjectGradeLevel: form.subjectGradeLevel,
          sectionId: form.sectionId,
          teacherId: form.teacherId,
          schoolYear: form.schoolYear,
          room: form.room || undefined,
          schedules,
        });
        toast.success('Class created');
      }

      setShowCreate(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('Failed to save class');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await classService.toggleStatus(archiveTarget.id);
      toast.success(
        archiveTarget.isActive ? 'Class archived' : 'Class restored',
      );
      setArchiveTarget(null);
      fetchData();
    } catch {
      toast.error(
        archiveTarget.isActive
          ? 'Failed to archive class'
          : 'Failed to restore class',
      );
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Class Management</h1>
          <p className="text-muted-foreground">{classes.length} classes total</p>
        </div>
        <Button onClick={handleOpenCreate}>+ Add Class</Button>
      </div>

      <div className="flex items-center gap-4">
        <Input
          placeholder="Search..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          {['all', '7', '8', '9', '10'].map((grade) => (
            <Button
              key={grade}
              variant={gradeFilter === grade ? 'default' : 'outline'}
              size="sm"
              onClick={() => setGradeFilter(grade)}
            >
              {grade === 'all' ? 'All' : `Grade ${grade}`}
            </Button>
          ))}
        </div>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Teacher</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Schedule</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="py-8 text-center text-muted-foreground"
                >
                  No classes found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((classItem) => (
                <TableRow
                  key={classItem.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() =>
                    router.push(`/dashboard/admin/classes/${classItem.id}`)
                  }
                >
                  <TableCell className="font-medium">
                    {classItem.subjectName} ({classItem.subjectCode})
                  </TableCell>
                  <TableCell>{classItem.section?.name || 'N/A'}</TableCell>
                  <TableCell>Grade {classItem.subjectGradeLevel}</TableCell>
                  <TableCell>
                    {classItem.teacher
                      ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {classItem.schoolYear}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatSchedules(classItem.schedules)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {classItem.room || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={classItem.isActive ? 'default' : 'secondary'}
                    >
                      {classItem.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className="space-x-1 text-right"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        router.push(`/dashboard/admin/classes/${classItem.id}`)
                      }
                    >
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(classItem)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={
                        classItem.isActive ? 'text-red-600' : 'text-green-600'
                      }
                      onClick={() => setArchiveTarget(classItem)}
                    >
                      {classItem.isActive ? 'Archive' : 'Restore'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editClass ? 'Edit Class' : 'Create Class'}</DialogTitle>
            <DialogDescription>
              Build the class schedule with weekday chips and time ranges so the
              admin view matches the existing backend schedule model.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Subject Name">
                <Input
                  value={form.subjectName}
                  onChange={(event) =>
                    setField('subjectName', event.target.value)
                  }
                  placeholder="e.g. Mathematics 7"
                />
              </Field>
              <Field label="Subject Code">
                <Input
                  value={form.subjectCode}
                  onChange={(event) =>
                    setField('subjectCode', event.target.value)
                  }
                  placeholder="e.g. MATH-7"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Grade Level">
                <select
                  value={form.subjectGradeLevel}
                  onChange={(event) =>
                    setField('subjectGradeLevel', event.target.value)
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Select section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name} (Grade {section.gradeLevel})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Teacher">
                <select
                  value={form.teacherId}
                  onChange={(event) => setField('teacherId', event.target.value)}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              />
            </Field>

            <ScheduleCalendarCreator
              value={form.schedules}
              onChange={(schedules) =>
                setForm((current) => ({ ...current, schedules }))
              }
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving || !form.subjectName.trim() || !form.subjectCode.trim()}
            >
              {saving ? 'Saving...' : editClass ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!archiveTarget}
        onOpenChange={(open) => !open && setArchiveTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {archiveTarget?.isActive ? 'Archive Class' : 'Restore Class'}
            </DialogTitle>
            <DialogDescription>
              {archiveTarget?.isActive
                ? 'Archiving will mark this class inactive while preserving lessons, schedules, and related history for backtracking.'
                : 'Restoring will mark this class active again and return it to the main class list.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleToggleArchive}>
              {archiveTarget?.isActive ? 'Archive' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
