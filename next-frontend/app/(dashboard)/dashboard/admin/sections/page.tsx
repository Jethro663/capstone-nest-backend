'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
import type { Section } from '@/types/section';
import type { User } from '@/types/user';

export default function SectionManagementPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modal state
  const [showCreate, setShowCreate] = useState(false);
  const [editSection, setEditSection] = useState<Section | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Section | null>(null);

  // Form state
  const [form, setForm] = useState({
    name: '',
    gradeLevel: '7',
    schoolYear: '',
    capacity: 40,
    roomNumber: '',
    adviserId: '',
  });

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
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const currentYear = new Date().getFullYear();
  const schoolYears = Array.from({ length: 5 }, (_, i) => `${currentYear - 2 + i}-${currentYear - 1 + i}`);

  const resetForm = () => setForm({ name: '', gradeLevel: '7', schoolYear: schoolYears[2] || '', capacity: 40, roomNumber: '', adviserId: '' });

  const filtered = sections.filter((s) => {
    if (gradeFilter !== 'all' && s.gradeLevel !== gradeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        s.name?.toLowerCase().includes(q) ||
        s.gradeLevel?.toString().includes(q) ||
        s.adviser?.firstName?.toLowerCase().includes(q) ||
        s.adviser?.lastName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleOpenCreate = () => {
    resetForm();
    setEditSection(null);
    setShowCreate(true);
  };

  const handleOpenEdit = (s: Section) => {
    setEditSection(s);
    setForm({
      name: s.name,
      gradeLevel: s.gradeLevel || '7',
      schoolYear: s.schoolYear || '',
      capacity: s.capacity || 40,
      roomNumber: s.roomNumber || '',
      adviserId: s.adviserId || '',
    });
    setShowCreate(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editSection) {
        await sectionService.update(editSection.id, {
          name: form.name,
          gradeLevel: form.gradeLevel,
          schoolYear: form.schoolYear,
          capacity: form.capacity,
          roomNumber: form.roomNumber || undefined,
          adviserId: form.adviserId || undefined,
        });
        toast.success('Section updated');
      } else {
        await sectionService.create({
          name: form.name,
          gradeLevel: form.gradeLevel as '7' | '8' | '9' | '10',
          schoolYear: form.schoolYear,
          capacity: form.capacity,
          roomNumber: form.roomNumber || undefined,
          adviserId: form.adviserId || undefined,
        });
        toast.success('Section created');
      }
      setShowCreate(false);
      fetchData();
    } catch {
      toast.error('Failed to save section');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await sectionService.delete(deleteTarget.id);
      toast.success('Section deleted');
      setDeleteTarget(null);
      fetchData();
    } catch {
      toast.error('Failed to delete section');
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
          <h1 className="text-2xl font-bold">Section Management</h1>
          <p className="text-muted-foreground">{sections.length} sections total</p>
        </div>
        <Button onClick={handleOpenCreate}>+ Add Section</Button>
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
              <TableHead>Section Name</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Adviser</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Room</TableHead>
              <TableHead>Year</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No sections found.</TableCell></TableRow>
            ) : filtered.map((s) => (
              <TableRow
                key={s.id}
                className="cursor-pointer hover:bg-gray-50"
                onClick={() => router.push(`/dashboard/admin/sections/${s.id}/roster`)}
              >
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>Grade {s.gradeLevel}</TableCell>
                <TableCell>{s.adviser ? `${s.adviser.firstName} ${s.adviser.lastName}` : '—'}</TableCell>
                <TableCell>{s.studentCount ?? '—'} / {s.capacity || '—'}</TableCell>
                <TableCell>{s.roomNumber || '—'}</TableCell>
                <TableCell className="text-muted-foreground">{s.schoolYear}</TableCell>
                <TableCell className="text-right space-x-1" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(s)}>Edit</Button>
                  <Button variant="ghost" size="sm" className="text-red-600" onClick={() => setDeleteTarget(s)}>Delete</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editSection ? 'Edit Section' : 'Create Section'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Section Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kamia" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Grade Level</Label>
                <select value={form.gradeLevel} onChange={(e) => setForm({ ...form, gradeLevel: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
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
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Capacity</Label><Input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} /></div>
              <div><Label>Room</Label><Input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="e.g. 201" /></div>
            </div>
            <div>
              <Label>Adviser (optional)</Label>
              <select value={form.adviserId} onChange={(e) => setForm({ ...form, adviserId: e.target.value })} className="w-full rounded-md border px-3 py-2 text-sm">
                <option value="">No adviser</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>)}
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>{editSection ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Section</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This cannot be undone.
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
