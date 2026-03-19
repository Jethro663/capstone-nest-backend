'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, School, UserPlus, Users } from 'lucide-react';
import { sectionService } from '@/services/section-service';
<<<<<<< Updated upstream
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
import {
  AdminEmptyState,
  AdminPageShell,
  AdminSectionCard,
  AdminStatCard,
} from '@/components/admin/AdminPageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream

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
=======
  const [archiveTarget, setArchiveTarget] = useState<Section | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<Section | null>(null);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
=======
  const filtered = useMemo(
    () =>
      sections.filter((section) => {
        if (tab === 'active' && !section.isActive) return false;
        if (tab === 'archived' && section.isActive) return false;
        if (gradeFilter !== 'all' && section.gradeLevel !== gradeFilter) return false;
        if (search) {
          const query = search.toLowerCase();
          return (
            section.name?.toLowerCase().includes(query) ||
            section.gradeLevel?.toString().includes(query) ||
            section.adviser?.firstName?.toLowerCase().includes(query) ||
            section.adviser?.lastName?.toLowerCase().includes(query)
          );
        }
        return true;
      }),
    [gradeFilter, search, sections, tab],
  );

  const activeCount = sections.filter((section) => section.isActive).length;
  const archivedCount = sections.filter((section) => !section.isActive).length;

  const handleArchive = async () => {
    if (!archiveTarget) return;
    if (archiveConfirmText.trim() !== archiveTarget.name) {
      toast.error('Type the exact section name to archive');
      return;
    }
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    } catch {
      toast.error('Failed to delete section');
=======
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to restore section'));
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    if (purgeConfirmText.trim() !== purgeTarget.name) {
      toast.error('Type the exact section name to purge');
      return;
    }
    try {
      await sectionService.permanentDelete(purgeTarget.id);
      toast.success('Section purged from database');
      setPurgeTarget(null);
      setPurgeConfirmText('');
      fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to purge section'));
>>>>>>> Stashed changes
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[30rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
<<<<<<< Updated upstream
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
=======
    <AdminPageShell
      badge="Admin Sections"
      title="Section Management"
      description="Sections now sit inside a more polished admin workspace, with clearer state tabs, better filter framing, and a stronger table shell."
      actions={(
        <Button className="admin-button-solid rounded-xl px-4 font-black" onClick={() => router.push('/dashboard/admin/sections/new')}>
          <UserPlus className="h-4 w-4" />
          Add Section
        </Button>
      )}
      stats={(
        <>
          <AdminStatCard label="Total Sections" value={sections.length} caption="Across the current school year data" icon={FolderOpen} accent="emerald" />
          <AdminStatCard label="Active" value={activeCount} caption="Currently operational sections" icon={School} accent="sky" />
          <AdminStatCard label="Archived" value={archivedCount} caption="Inactive but restorable" icon={FolderOpen} accent="amber" />
          <AdminStatCard label="Visible Rows" value={filtered.length} caption={`In the ${tab} view`} icon={Users} accent="rose" />
        </>
      )}
    >
      <AdminSectionCard title="Section Views" description="Switch section states and narrow down the table without the old flat control row.">
        <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)}>
          <TabsList className="admin-tab-list h-auto flex-wrap justify-start">
            <TabsTrigger value="active" className="admin-tab rounded-xl px-4 font-black">Active ({activeCount})</TabsTrigger>
            <TabsTrigger value="archived" className="admin-tab rounded-xl px-4 font-black">Archived ({archivedCount})</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 admin-filter-shell">
          <div className="grid gap-4 xl:grid-cols-[1fr_auto]">
            <Input placeholder="Search section, grade, adviser..." value={search} onChange={(e) => setSearch(e.target.value)} className="admin-input" />
            <div className="admin-controls">
              {['all', '7', '8', '9', '10'].map((grade) => (
                <Button
                  key={grade}
                  variant="outline"
                  size="sm"
                  className={gradeFilter === grade ? 'admin-button-solid rounded-xl font-black' : 'admin-button-outline rounded-xl font-black'}
                  onClick={() => setGradeFilter(grade)}
                >
                  {grade === 'all' ? 'All' : `Grade ${grade}`}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {tab === 'archived' ? (
          <div className="mt-4 admin-filter-shell text-sm text-rose-700">
            Archived sections are inactive but restorable. Purge permanently removes the section from the database.
          </div>
        ) : null}
      </AdminSectionCard>

      <AdminSectionCard title="Section Table" description="The same section actions, now wrapped in a calmer and more scan-friendly admin table surface.">
        {filtered.length === 0 ? (
          <AdminEmptyState title="No sections found" description="Try another state or grade filter. The underlying section data and actions are unchanged." />
        ) : (
          <div className="admin-table-shell">
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Adviser</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((section) => (
                  <TableRow key={section.id} className="cursor-pointer hover:bg-emerald-50/40" onClick={() => router.push(`/dashboard/admin/sections/${section.id}/roster`)}>
                    <TableCell className="font-medium">{section.name}</TableCell>
                    <TableCell>Grade {section.gradeLevel}</TableCell>
                    <TableCell><Badge variant={section.isActive ? 'default' : 'secondary'}>{section.isActive ? 'Active' : 'Archived'}</Badge></TableCell>
                    <TableCell>{section.adviser ? `${section.adviser.firstName} ${section.adviser.lastName}` : '—'}</TableCell>
                    <TableCell>{section.studentCount ?? '—'} / {section.capacity || '—'}</TableCell>
                    <TableCell>{section.roomNumber || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{section.schoolYear}</TableCell>
                    <TableCell className="space-x-1 text-right" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/sections/${section.id}/edit`)}>Edit</Button>
                      {section.isActive ? (
                        <Button variant="outline" size="sm" className="rounded-xl border-amber-200 bg-white/70 font-black text-amber-700 hover:bg-amber-50" onClick={() => { setArchiveTarget(section); setArchiveConfirmText(''); }}>
                          Archive
                        </Button>
                      ) : (
                        <>
                          <Button variant="outline" size="sm" className="admin-button-outline rounded-xl font-black" onClick={() => handleRestore(section)}>Restore</Button>
                          <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/70 font-black text-rose-600 hover:bg-rose-50" onClick={() => { setPurgeTarget(section); setPurgeConfirmText(''); }}>
                            Purge
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </AdminSectionCard>

      <Dialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) { setArchiveTarget(null); setArchiveConfirmText(''); } }}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-amber-700">Archive Section</DialogTitle>
            <DialogDescription>
              Archiving will clear active enrollments from this section and mark the section as inactive. Type <strong>{archiveTarget?.name}</strong> to continue.
            </DialogDescription>
          </DialogHeader>
          <Input value={archiveConfirmText} onChange={(event) => setArchiveConfirmText(event.target.value)} placeholder="Type section name to confirm" className="admin-input" />
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setArchiveTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-black" disabled={archiveConfirmText.trim() !== (archiveTarget?.name || '')} onClick={handleArchive}>Archive</Button>
>>>>>>> Stashed changes
          </DialogFooter>
        </DialogContent>
      </Dialog>

<<<<<<< Updated upstream
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
=======
      <Dialog open={!!purgeTarget} onOpenChange={(open) => { if (!open) { setPurgeTarget(null); setPurgeConfirmText(''); } }}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Purge Section</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{purgeTarget?.name}</strong> from the database. Type the section name exactly to proceed.
            </DialogDescription>
          </DialogHeader>
          <Input value={purgeConfirmText} onChange={(event) => setPurgeConfirmText(event.target.value)} placeholder="Type section name to confirm purge" className="admin-input" />
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setPurgeTarget(null)}>Cancel</Button>
            <Button variant="destructive" className="rounded-xl font-black" disabled={purgeConfirmText.trim() !== (purgeTarget?.name || '')} onClick={handlePurge}>Purge</Button>
>>>>>>> Stashed changes
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
