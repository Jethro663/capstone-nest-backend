'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookOpen,
  ChevronDown,
  Eye,
  LayoutGrid,
  List,
  Pencil,
  RotateCcw,
  Search,
  Trash2,
  Archive,
} from 'lucide-react';
import { classService } from '@/services/class-service';
import { AdminEmptyState, AdminPageShell, AdminSectionCard } from '@/components/admin/AdminPageShell';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api-error';
import { toast } from 'sonner';
import type { ClassItem } from '@/types/class';

type StatusTab = 'active' | 'archived';
type ViewMode = 'table' | 'grid';

function formatSchedules(schedules?: { days: string[]; startTime: string; endTime: string }[]) {
  if (!schedules?.length) return 'N/A';
  return schedules
    .map((schedule) => `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`)
    .join(', ');
}

export default function ClassManagementPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [gradeFilter, setGradeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [archiveTarget, setArchiveTarget] = useState<ClassItem | null>(null);
  const [purgeTarget, setPurgeTarget] = useState<ClassItem | null>(null);
  const [purgeConfirmText, setPurgeConfirmText] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const classesRes = await classService.getAll();
      setClasses(classesRes.data?.data || []);
    } catch {
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeCount = useMemo(() => classes.filter((classItem) => classItem.isActive).length, [classes]);
  const archivedCount = useMemo(() => classes.filter((classItem) => !classItem.isActive).length, [classes]);

  const filtered = useMemo(() => {
    return classes.filter((classItem) => {
      if (tab === 'active' && !classItem.isActive) return false;
      if (tab === 'archived' && classItem.isActive) return false;
      if (gradeFilter !== 'all' && classItem.subjectGradeLevel !== gradeFilter) return false;
      if (!search) return true;

      const query = search.toLowerCase();
      return (
        classItem.subjectName?.toLowerCase().includes(query) ||
        classItem.subjectCode?.toLowerCase().includes(query) ||
        classItem.section?.name?.toLowerCase().includes(query) ||
        classItem.teacher?.firstName?.toLowerCase().includes(query) ||
        classItem.teacher?.lastName?.toLowerCase().includes(query) ||
        classItem.room?.toLowerCase().includes(query)
      );
    });
  }, [classes, gradeFilter, search, tab]);

  const handleToggleArchive = async () => {
    if (!archiveTarget) return;
    try {
      await classService.toggleStatus(archiveTarget.id);
      toast.success(archiveTarget.isActive ? 'Class archived' : 'Class restored');
      setArchiveTarget(null);
      void fetchData();
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          archiveTarget.isActive ? 'Failed to archive class' : 'Failed to restore class',
        ),
      );
    }
  };

  const handlePurge = async () => {
    if (!purgeTarget) return;
    const expected = `${purgeTarget.subjectName} (${purgeTarget.subjectCode})`;
    if (purgeConfirmText !== expected) {
      toast.error('Confirmation text does not match');
      return;
    }

    try {
      await classService.purge(purgeTarget.id);
      toast.success('Class permanently deleted');
      setPurgeTarget(null);
      setPurgeConfirmText('');
      void fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to delete class'));
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-none" />
        <Skeleton className="h-[34rem] rounded-[1.7rem]" />
      </div>
    );
  }

  return (
    <AdminPageShell
      badge="Admin Classes"
      title="Classes"
      description="Manage all classes across grades"
      icon={BookOpen}
      actions={(
        <Button
          className="admin-button-solid rounded-[1rem] px-4 font-bold"
          onClick={() => router.push('/dashboard/admin/classes/new')}
        >
          <BookOpen className="h-4 w-4" />
          Create Class
        </Button>
      )}
    >
      <AdminSectionCard title="Class Directory" contentClassName="space-y-5">
        <div className="admin-filter-row">
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as StatusTab);
              setSearch('');
              setGradeFilter('all');
            }}
          >
            <TabsList className="admin-tab-list h-auto w-fit justify-start">
              <TabsTrigger value="active" className="admin-tab">
                Active <span className="admin-segment-count">{activeCount}</span>
              </TabsTrigger>
              <TabsTrigger value="archived" className="admin-tab">
                Archived <span className="admin-segment-count">{archivedCount}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="admin-filter-row">
          <div className="admin-search-shell min-w-[18rem] flex-1 md:max-w-[20rem]">
            <Search className="h-4 w-4 text-[#8ea0bc]" />
            <Input
              placeholder="Search classes..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="admin-input"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <select
                value={gradeFilter}
                onChange={(event) => setGradeFilter(event.target.value)}
                className="admin-select min-w-[9rem] appearance-none pr-10 text-sm font-semibold text-[#6f83a3]"
              >
                <option value="all">All Grades</option>
                <option value="7">Grade 7</option>
                <option value="8">Grade 8</option>
                <option value="9">Grade 9</option>
                <option value="10">Grade 10</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8ea0bc]" />
            </div>

            <div className="admin-view-toggle">
              <button
                type="button"
                className="admin-icon-button"
                data-active={viewMode === 'table'}
                onClick={() => setViewMode('table')}
                title="Table view"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="admin-icon-button"
                data-active={viewMode === 'grid'}
                onClick={() => setViewMode('grid')}
                title="Grid view"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <AdminEmptyState title="No classes found" description="Try another state or a different search query." />
        ) : viewMode === 'table' ? (
          <div className="admin-table-shell">
            <Table>
              <TableHeader className="admin-table-head">
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((classItem) => (
                  <TableRow key={classItem.id} className="border-t border-[var(--admin-outline)] hover:bg-[#fbfcfe]">
                    <TableCell>
                      <button
                        type="button"
                        className="font-semibold text-[var(--admin-text-strong)]"
                        onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}
                      >
                        {classItem.subjectName}
                      </button>
                    </TableCell>
                    <TableCell className="text-[#7083a4]">{classItem.section?.name || 'N/A'}</TableCell>
                    <TableCell>
                      <span className="admin-role-pill admin-role-pill--teacher">Grade {classItem.subjectGradeLevel}</span>
                    </TableCell>
                    <TableCell className="text-[#7083a4]">
                      {classItem.teacher
                        ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                        : 'Unassigned'}
                    </TableCell>
                    <TableCell className="text-[#9aaed0]">{formatSchedules(classItem.schedules)}</TableCell>
                    <TableCell className="text-[#7083a4]">{classItem.room || 'N/A'}</TableCell>
                    <TableCell>
                      <span className={classItem.isActive ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived'}>
                        {classItem.isActive ? 'Active' : 'Archived'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}
                          title="View class"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}/edit`)}
                          title="Edit class"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          className="admin-icon-button"
                          onClick={() => setArchiveTarget(classItem)}
                          title={classItem.isActive ? 'Archive class' : 'Restore class'}
                        >
                          {classItem.isActive ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        </button>
                        {!classItem.isActive ? (
                          <button
                            type="button"
                            className="admin-icon-button"
                            onClick={() => {
                              setPurgeTarget(classItem);
                              setPurgeConfirmText('');
                            }}
                            title="Purge class"
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
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((classItem) => (
              <Card key={classItem.id} className="admin-grid-card cursor-pointer border-[var(--admin-outline)] p-0 shadow-none" onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}>
                <div className="admin-grid-card__accent" />
                <div className="relative z-10 space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black text-[var(--admin-text-strong)]">{classItem.subjectName}</p>
                      <p className="text-sm text-[#8da0bf]">{classItem.section?.name || 'N/A'}</p>
                    </div>
                    <span className={classItem.isActive ? 'admin-status-pill admin-status-pill--active' : 'admin-status-pill admin-status-pill--archived'}>
                      {classItem.isActive ? 'Active' : 'Archived'}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-[#7083a4]">
                    <p>Grade: {classItem.subjectGradeLevel}</p>
                    <p>
                      Teacher:{' '}
                      {classItem.teacher
                        ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                        : 'Unassigned'}
                    </p>
                    <p>Schedule: {formatSchedules(classItem.schedules)}</p>
                    <p>Room: {classItem.room || 'N/A'}</p>
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
          </DialogHeader>
          <div className="space-y-3 rounded-2xl border border-[var(--admin-outline)] bg-white/75 p-4 text-sm">
            <p className="font-semibold text-[var(--admin-text-strong)]">
              {archiveTarget?.subjectName} ({archiveTarget?.subjectCode})
            </p>
            <p className="text-[var(--admin-text-muted)]">
              {archiveTarget?.isActive
                ? 'This class will move to the archived list and can still be restored later.'
                : 'This class will move back to the active list and become available again.'}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button className="admin-button-solid rounded-xl font-black" onClick={handleToggleArchive}>
              {archiveTarget?.isActive ? 'Archive' : 'Restore'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!purgeTarget} onOpenChange={() => setPurgeTarget(null)}>
        <DialogContent className="rounded-[1.6rem] border-white/40 bg-[linear-gradient(180deg,rgba(255,255,255,0.97),rgba(236,253,245,0.92))] shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-rose-600">Permanently Delete Class</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{purgeTarget?.subjectName}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p>Type this class label to confirm:</p>
            <p className="font-mono text-muted-foreground">
              {purgeTarget?.subjectName} ({purgeTarget?.subjectCode})
            </p>
            <Input
              value={purgeConfirmText}
              onChange={(event) => setPurgeConfirmText(event.target.value)}
              placeholder="Type class label here..."
              className="admin-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" className="admin-button-outline rounded-xl font-black" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl font-black"
              onClick={handlePurge}
              disabled={purgeConfirmText !== `${purgeTarget?.subjectName} (${purgeTarget?.subjectCode})`}
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminPageShell>
  );
}
