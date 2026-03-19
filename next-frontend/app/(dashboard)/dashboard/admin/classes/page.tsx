'use client';

<<<<<<< Updated upstream
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
=======
import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Eye, LayoutGrid, Presentation, School2 } from 'lucide-react';
import { classService } from '@/services/class-service';
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
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
=======
  const formatSchedules = (schedules?: { days: string[]; startTime: string; endTime: string }[]) => {
    if (!schedules?.length) return 'N/A';
    return schedules.map((schedule) => `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`).join(', ');
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream
  const resetForm = () => setForm({ subjectName: '', subjectCode: '', subjectGradeLevel: '7', sectionId: '', teacherId: '', schoolYear: schoolYears[2] || '', room: '' });

  const filtered = classes.filter((c) => {
    if (gradeFilter !== 'all' && c.subjectGradeLevel !== gradeFilter) return false;
=======
  const activeCount = useMemo(() => classes.filter((classItem) => classItem.isActive).length, [classes]);
  const archivedCount = useMemo(() => classes.filter((classItem) => !classItem.isActive).length, [classes]);

  const filtered = classes.filter((classItem) => {
    if (tab === 'active' && !classItem.isActive) return false;
    if (tab === 'archived' && classItem.isActive) return false;
    if (gradeFilter !== 'all' && classItem.subjectGradeLevel !== gradeFilter) return false;
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
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
=======
      await classService.toggleStatus(archiveTarget.id);
      toast.success(archiveTarget.isActive ? 'Class archived' : 'Class restored');
      setArchiveTarget(null);
      fetchData();
    } catch {
      toast.error(archiveTarget.isActive ? 'Failed to archive class' : 'Failed to restore class');
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    const expected = `${purgeTarget.subjectName} (${purgeTarget.subjectCode})`;
    if (purgeConfirmText !== expected) {
      toast.error('Confirmation text does not match');
      return;
    }
>>>>>>> Stashed changes
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
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[32rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
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
=======
    <AdminPageShell
      badge="Admin Classes"
      title="Class Management"
      description="Classes now sit inside a stronger admin command surface, with clearer state tabs, more readable filters, and a better presentation for both table and grid views."
      actions={(
        <Button
          className="admin-button-solid rounded-2xl px-5 py-2.5 font-black shadow-[0_18px_45px_-24px_rgba(16,185,129,0.85)]"
          onClick={() => router.push('/dashboard/admin/classes/new')}
        >
          <BookOpen className="h-4 w-4" />
          Add Class
        </Button>
      )}
      stats={(
        <>
          <AdminStatCard label="Total Classes" value={classes.length} caption="Across every class record" icon={BookOpen} accent="emerald" />
          <AdminStatCard label="Active" value={activeCount} caption="Currently running classes" icon={School2} accent="sky" />
          <AdminStatCard label="Archived" value={archivedCount} caption="Restorable, inactive classes" icon={LayoutGrid} accent="amber" />
          <AdminStatCard label="Visible" value={filtered.length} caption={`In the ${tab} / ${viewMode} view`} icon={Presentation} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Class Views" description="Switch class states and view modes without the old flat utility row.">
        <Tabs value={tab} onValueChange={(value) => { setTab(value as StatusTab); setSearch(''); setGradeFilter('all'); }}>
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="active" className="admin-tab rounded-xl px-4 font-black">Active</TabsTrigger>
            <TabsTrigger value="archived" className="admin-tab rounded-xl px-4 font-black">Archived</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === 'archived' ? (
          <div className="mt-4 admin-filter-shell text-sm text-rose-700">
            Archived classes are inactive but restorable. Purge permanently removes the class and related records.
          </div>
        ) : null}

        <div className="mt-4 admin-filter-shell">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto_auto]">
            <Input placeholder="Search subject, section, teacher, room..." value={search} onChange={(event) => setSearch(event.target.value)} className="admin-input" />
            <div className="admin-controls">
              {['all', '7', '8', '9', '10'].map((grade) => (
                <Button key={grade} variant="outline" size="sm" className={gradeFilter === grade ? 'admin-button-solid rounded-xl font-black' : 'admin-button-outline rounded-xl font-black'} onClick={() => setGradeFilter(grade)}>
                  {grade === 'all' ? 'All' : `Grade ${grade}`}
                </Button>
              ))}
            </div>
            <div className="admin-controls">
              <Button variant="outline" size="sm" className={viewMode === 'table' ? 'admin-button-solid rounded-xl font-black' : 'admin-button-outline rounded-xl font-black'} onClick={() => setViewMode('table')}>Table</Button>
              <Button variant="outline" size="sm" className={viewMode === 'grid' ? 'admin-button-solid rounded-xl font-black' : 'admin-button-outline rounded-xl font-black'} onClick={() => setViewMode('grid')}>Grid</Button>
            </div>
          </div>
        </div>
      </AdminSectionCard>

      <AdminSectionCard title="Class Collection" description="The same class actions and routing are preserved, but the surfaces are now more deliberate and easier to scan.">
        {filtered.length === 0 ? (
          <AdminEmptyState title="No classes found" description="Try another state or search query. The admin class logic is unchanged." />
        ) : viewMode === 'table' ? (
          <div className="admin-table-shell">
            <Table>
              <TableHeader className="admin-table-head">
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
                {filtered.map((classItem) => (
                  <TableRow
                    key={classItem.id}
                    className="cursor-pointer transition-colors duration-200 hover:bg-emerald-50/50"
                    onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}
                  >
                    <TableCell className="font-medium">{classItem.subjectName} ({classItem.subjectCode})</TableCell>
                    <TableCell>{classItem.section?.name || 'N/A'}</TableCell>
                    <TableCell>Grade {classItem.subjectGradeLevel}</TableCell>
                    <TableCell>{classItem.teacher ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}` : 'N/A'}</TableCell>
                    <TableCell className="text-muted-foreground">{classItem.schoolYear}</TableCell>
                    <TableCell className="text-muted-foreground">{formatSchedules(classItem.schedules)}</TableCell>
                    <TableCell className="text-muted-foreground">{classItem.room || 'N/A'}</TableCell>
                    <TableCell><Badge variant={classItem.isActive ? 'default' : 'secondary'}>{classItem.isActive ? 'Active' : 'Archived'}</Badge></TableCell>
                    <TableCell className="space-x-1 text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}>
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View Details
                      </Button>
                      <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}/edit`)}>Edit</Button>
                      <Button variant="outline" size="sm" className={classItem.isActive ? 'rounded-xl border-amber-200 bg-white/70 font-black text-amber-700 hover:bg-amber-50' : 'admin-button-outline rounded-xl font-black'} onClick={() => setArchiveTarget(classItem)}>
                        {classItem.isActive ? 'Archive' : 'Restore'}
                      </Button>
                      {!classItem.isActive ? (
                        <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50" onClick={() => { setPurgeTarget(classItem); setPurgeConfirmText(''); }}>
                          Purge
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((classItem) => (
              <Card key={classItem.id} className="admin-grid-card cursor-pointer p-0" onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}>
                <div className="admin-grid-card__accent" />
                <div className="relative z-10 space-y-4 p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-[var(--admin-text-strong)]">{classItem.subjectName} ({classItem.subjectCode})</p>
                      <p className="text-sm text-[var(--admin-text-muted)]">Grade {classItem.subjectGradeLevel} • {classItem.schoolYear}</p>
                    </div>
                    <Badge variant={classItem.isActive ? 'default' : 'secondary'}>{classItem.isActive ? 'Active' : 'Archived'}</Badge>
                  </div>
                  <div className="space-y-1 text-sm text-[var(--admin-text-muted)]">
                    <p>Section: {classItem.section?.name || 'N/A'}</p>
                    <p>Teacher: {classItem.teacher ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}` : 'N/A'}</p>
                    <p>Room: {classItem.room || 'N/A'}</p>
                    <p className="line-clamp-2">Schedule: {formatSchedules(classItem.schedules)}</p>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1" onClick={(event) => event.stopPropagation()}>
                    <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}>
                      <Eye className="mr-1 h-3.5 w-3.5" />
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}/edit`)}>Edit</Button>
                    <Button variant="outline" size="sm" className={classItem.isActive ? 'rounded-xl border-amber-200 bg-white/70 font-black text-amber-700 hover:bg-amber-50' : 'admin-button-outline rounded-xl font-black'} onClick={() => setArchiveTarget(classItem)}>
                      {classItem.isActive ? 'Archive' : 'Restore'}
                    </Button>
                    {!classItem.isActive ? (
                      <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50" onClick={() => { setPurgeTarget(classItem); setPurgeConfirmText(''); }}>
                        Purge
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AdminSectionCard>

      <Dialog open={!!archiveTarget} onOpenChange={(open) => !open && setArchiveTarget(null)}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle>{archiveTarget?.isActive ? 'Archive Class' : 'Restore Class'}</DialogTitle>
            <DialogDescription>
              {archiveTarget?.isActive
                ? 'Archiving marks this class inactive while preserving lessons, schedules, and related history.'
                : 'Restoring marks this class active again and returns it to the main class list.'}
            </DialogDescription>
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.subjectName.trim() || !form.subjectCode.trim()}>
              {editClass ? 'Update' : 'Create'}
=======
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button className="admin-button-solid rounded-xl font-black" onClick={handleToggleArchive}>
              {archiveTarget?.isActive ? 'Archive' : 'Restore'}
>>>>>>> Stashed changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

<<<<<<< Updated upstream
      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Class</DialogTitle>
=======
      <Dialog open={!!purgeTarget} onOpenChange={() => setPurgeTarget(null)}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Permanently Delete Class</DialogTitle>
>>>>>>> Stashed changes
            <DialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.subjectName}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
<<<<<<< Updated upstream
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
=======
          <div className="space-y-3 text-sm">
            <p>Type this class label to confirm:</p>
            <p className="font-mono text-muted-foreground">{purgeTarget?.subjectName} ({purgeTarget?.subjectCode})</p>
            <Input value={purgeConfirmText} onChange={(event) => setPurgeConfirmText(event.target.value)} placeholder="Type class label here..." className="admin-input" />
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setPurgeTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-black" onClick={handlePurge} disabled={purgeConfirmText !== `${purgeTarget?.subjectName} (${purgeTarget?.subjectCode})`}>
              Permanently Delete
            </Button>
>>>>>>> Stashed changes
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
