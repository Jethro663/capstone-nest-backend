'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { FolderOpen, School, UserPlus, Users } from 'lucide-react';
import { sectionService } from '@/services/section-service';
import { userService } from '@/services/user-service';
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
import { getApiErrorMessage } from '@/lib/api-error';
 
import { toast } from 'sonner';
import type { Section } from '@/types/section';
import type { User } from '@/types/user';

type StatusTab = 'active' | 'archived';

export default function SectionManagementPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [archiveTarget, setArchiveTarget] = useState<Section | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<Section | null>(null);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');
  const [editSection, setEditSection] = useState<Section | null>(null);
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

  const activeCount = useMemo(() => sections.filter((section) => section.isActive).length, [sections]);
  const archivedCount = useMemo(() => sections.filter((section) => !section.isActive).length, [sections]);

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
  const handleArchive = async () => {
    if (!archiveTarget) return;
    if (archiveConfirmText.trim() !== archiveTarget.name) {
      toast.error('Type the exact section name to archive');
      return;
    }
 
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

  const handleRestore = async (section: Section) => {
    try {
      await sectionService.restore(section.id);
      toast.success('Section restored');
      void fetchData();
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
                    <TableCell>{section.adviser ? `${section.adviser.firstName} ${section.adviser.lastName}` : 'â€”'}</TableCell>
                    <TableCell>{section.studentCount ?? 'â€”'} / {section.capacity || 'â€”'}</TableCell>
                    <TableCell>{section.roomNumber || 'â€”'}</TableCell>
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
 
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
 
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}

