'use client';

import { useEffect, useState, useCallback } from 'react';
import { classService } from '@/services/class-service';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { ClassItem } from '@/types/class';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';

export default function ClassManagementPage() {
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal states
  const [showCreate, setShowCreate] = useState(false);
  const [editClass, setEditClass] = useState<ClassItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClassItem | null>(null);

  // Form state
  const [form, setForm] = useState({
    subjectName: '',
    subjectCode: '',
    subjectGradeLevel: '7',
    sectionId: '',
    teacherId: '',
    schoolYear: '',
    room: '',
  });

  const formatSchedules = (schedules?: { days: string[]; startTime: string; endTime: string }[]) => {
    if (!schedules?.length) return '—';
    return schedules.map((s) => `${s.days.join('/')} ${s.startTime}-${s.endTime}`).join(', ');
  };

  const currentYear = new Date().getFullYear();
  const schoolYears = Array.from({ length: 5 }, (_, i) => `${currentYear - 2 + i}-${currentYear - 1 + i}`);

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

  const resetForm = () => setForm({ subjectName: '', subjectCode: '', subjectGradeLevel: '7', sectionId: '', teacherId: '', schoolYear: schoolYears[2] || '', room: '' });

  const filtered = classes.filter((c) => {
    if (gradeFilter !== 'all' && c.subjectGradeLevel !== gradeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.subjectName?.toLowerCase().includes(q) ||
        c.subjectCode?.toLowerCase().includes(q) ||
        c.section?.name?.toLowerCase().includes(q) ||
        c.teacher?.firstName?.toLowerCase().includes(q) ||
        c.teacher?.lastName?.toLowerCase().includes(q) ||
        c.room?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    resetForm();
    setEditClass(null);
    setShowCreate(true);
  };

  const handleOpenEdit = (c: ClassItem) => {
    setEditClass(c);
    setForm({
      subjectName: c.subjectName || '',
      subjectCode: c.subjectCode || '',
      subjectGradeLevel: c.subjectGradeLevel || '7',
      sectionId: c.sectionId || '',
      teacherId: c.teacherId || '',
      schoolYear: c.schoolYear || '',
      room: c.room || '',
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.subjectName.trim() || !form.subjectCode.trim()) return;
    try {
      if (editClass) {
        await classService.update(editClass.id, {
          subjectName: form.subjectName,
          subjectCode: form.subjectCode,
          subjectGradeLevel: form.subjectGradeLevel,
          sectionId: form.sectionId || undefined,
          teacherId: form.teacherId || undefined,
          schoolYear: form.schoolYear,
          room: form.room || undefined,
        });
        toast.success('Class updated');
      } else {
        if (!form.sectionId || !form.teacherId) {
          toast.error('Section and Teacher are required');
          return;
        }
        await classService.create({
          subjectName: form.subjectName,
          subjectCode: form.subjectCode,
          subjectGradeLevel: form.subjectGradeLevel,
          sectionId: form.sectionId,
          teacherId: form.teacherId,
          schoolYear: form.schoolYear,
          room: form.room || undefined,
        });
        toast.success('Class created');
      }
      setShowCreate(false);
      fetchData();
    } catch {
      toast.error('Failed to save class');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await classService.delete(deleteTarget.id);
      toast.success('Class deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete class');
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

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-sm" />
        <div className="flex gap-2">
          {['all', '7', '8', '9', '10'].map((g) => (
            <Button key={g} variant={gradeFilter === g ? 'default' : 'outline'} size="sm" onClick={() => setGradeFilter(g)}>
              {g === 'all' ? 'All' : `Grade ${g}`}
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
              <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No classes found.</TableCell></TableRow>
            ) : filtered.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.subjectName} ({c.subjectCode})</TableCell>
                <TableCell>{c.section?.name || '—'}</TableCell>
                <TableCell>Grade {c.subjectGradeLevel}</TableCell>
                <TableCell>{c.teacher ? `${c.teacher.firstName} ${c.teacher.lastName}` : '—'}</TableCell>
                <TableCell className="text-muted-foreground">{c.schoolYear}</TableCell>
                <TableCell className="text-muted-foreground">{formatSchedules(c.schedules)}</TableCell>
                <TableCell className="text-muted-foreground">{c.room || '—'}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? 'default' : 'secondary'}>{c.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(c)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(c)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editClass ? 'Edit Class' : 'Create Class'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Subject Name</Label><Input value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} placeholder="e.g. Mathematics" /></div>
              <div><Label>Subject Code</Label><Input value={form.subjectCode} onChange={(e) => setForm({ ...form, subjectCode: e.target.value })} placeholder="e.g. MATH7" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grade Level</Label>
                <select value={form.subjectGradeLevel} onChange={(e) => setForm({ ...form, subjectGradeLevel: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                  {['7', '8', '9', '10'].map((g) => <option key={g} value={g}>Grade {g}</option>)}
                </select>
              </div>
              <div>
                <Label>School Year</Label>
                <select value={form.schoolYear} onChange={(e) => setForm({ ...form, schoolYear: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                  <option value="">Select year</option>
                  {schoolYears.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
            <div>
              <Label>Section</Label>
              <select value={form.sectionId} onChange={(e) => setForm({ ...form, sectionId: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select section</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name} (Grade {s.gradeLevel})</option>)}
              </select>
            </div>
            <div>
              <Label>Teacher</Label>
              <select value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">Select teacher</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Room</Label><Input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 201" /></div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.subjectName.trim() || !form.subjectCode.trim()}>
              {editClass ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.subjectName}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
