'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, Layers3, Pencil, RotateCcw, Search, Trash2, Archive, Users, UserPlus } from 'lucide-react';
import { sectionService } from '@/services/section-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import type { Section } from '@/types/section';

type StatusTab = 'active' | 'archived';

export default function SectionManagementPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [search, setSearch] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<Section | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<Section | null>(null);
  const [archiveConfirmText, setArchiveConfirmText] = useState('');
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const sectionsRes = await sectionService.getAll();
      setSections(sectionsRes.data || []);
    } catch {
      toast.error('Failed to load sections');
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
        if (!search) return true;

        const query = search.toLowerCase();
        return (
          section.name?.toLowerCase().includes(query) ||
          section.gradeLevel?.toString().includes(query) ||
          section.adviser?.firstName?.toLowerCase().includes(query) ||
          section.adviser?.lastName?.toLowerCase().includes(query)
        );
      }),
    [search, sections, tab],
  );

  const handleArchive = async () => {
    if (!archiveTarget) return;
    if (archiveConfirmText.trim() !== archiveTarget.name) {
      toast.error('Type the exact section name to archive');
      return;
    }

    try {
      await sectionService.archive(archiveTarget.id);
      toast.success('Section archived');
      setArchiveTarget(null);
      setArchiveConfirmText('');
      void fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to archive section'));
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
      void fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to purge section'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[32rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Sections"
      title="Sections"
      description="Manage school sections and rosters"
      icon={Layers3}
      actions={(
        <Button className="admin-button-solid rounded-[1rem] px-4 font-bold" onClick={() => router.push('/dashboard/admin/sections/new')}>
          <UserPlus className="h-4 w-4" />
          Create Section
        </Button>
      )}
    >
      <AdminSectionCard title="Section Directory" contentClassName="space-y-5">
        <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)}>
          <TabsList className="admin-tab-list h-auto w-fit justify-start">
            <TabsTrigger value="active" className="admin-tab">
              Active <span className="admin-segment-count">{activeCount}</span>
            </TabsTrigger>
            <TabsTrigger value="archived" className="admin-tab">
              Archived <span className="admin-segment-count">{archivedCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="admin-search-shell md:max-w-[20rem]">
          <Search className="h-4 w-4 text-[#8ea0bc]" />
          <Input
            placeholder="Search sections..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="admin-input"
          />
        </div>

        {filtered.length === 0 ? (
          <AdminEmptyState title="No sections found" description="Try another state or a different search query." />
        ) : (
          <div className="admin-table-shell">
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead>Section Name</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Adviser</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((section) => (
                  <TableRow key={section.id} className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]">
                    <TableCell>
                      <button
                        type="button"
                        className="font-semibold text-[var(--admin-text-strong)]"
                        onClick={() => router.push(`/dashboard/admin/sections/${section.id}/roster`)}
                      >
                        {section.name}
                      </button>
                    </TableCell>
                    <TableCell className="text-[#7083a4]">Grade {section.gradeLevel}</TableCell>
                    <TableCell className="text-[#9aaed0]">{section.schoolYear}</TableCell>
                    <TableCell className="text-[#7083a4]">
                      {section.adviser ? `${section.adviser.firstName} ${section.adviser.lastName}` : 'Unassigned'}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-2 text-[#7083a4]">
                        <Users className="h-4 w-4" />
                        {section.studentCount ?? 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={section.isActive ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived'}>
                        {section.isActive ? 'Active' : 'Archived'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => router.push(`/dashboard/admin/sections/${section.id}/roster`)}
                          title="View roster"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => router.push(`/dashboard/admin/sections/${section.id}/edit`)}
                          title="Edit section"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        {section.isActive ? (
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => { setArchiveTarget(section); setArchiveConfirmText(''); }}
                            title="Archive section"
                          >
                            <Archive className="h-4 w-4" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => handleRestore(section)}
                            title="Restore section"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        )}
                        {!section.isActive ? (
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => { setPurgeTarget(section); setPurgeConfirmText(''); }}
                            title="Purge section"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        ) : null}
                      </div>
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
