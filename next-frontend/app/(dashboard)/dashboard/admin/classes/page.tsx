'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { classService } from '@/services/class-service';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { ClassItem } from '@/types/class';

type StatusTab = 'active' | 'archived';
type ViewMode = 'table' | 'grid';

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
      const classesRes = await classService.getAll();
      setClasses(classesRes.data?.data || []);
    } catch {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const activeCount = useMemo(
    () => classes.filter((classItem) => classItem.isActive).length,
    [classes],
  );

  const archivedCount = useMemo(
    () => classes.filter((classItem) => !classItem.isActive).length,
    [classes],
  );

  const filtered = classes.filter((classItem) => {
    if (tab === 'active' && !classItem.isActive) return false;
    if (tab === 'archived' && classItem.isActive) return false;

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
      fetchData();
    } catch {
      toast.error('Failed to purge class');
    }
  };

  const renderTable = () => (
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
                className="py-10 text-center text-muted-foreground"
              >
                No classes found.
              </TableCell>
            </TableRow>
          ) : (
            filtered.map((classItem) => (
              <TableRow
                key={classItem.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() =>
                  router.push(`/dashboard/admin/classes/${classItem.id}`)
                }
              >
                <TableCell className="py-4 font-medium">
                  {classItem.subjectName} ({classItem.subjectCode})
                </TableCell>
                <TableCell className="py-4">{classItem.section?.name || 'N/A'}</TableCell>
                <TableCell className="py-4">Grade {classItem.subjectGradeLevel}</TableCell>
                <TableCell className="py-4">
                  {classItem.teacher
                    ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                    : 'N/A'}
                </TableCell>
                <TableCell className="py-4 text-muted-foreground">
                  {classItem.schoolYear}
                </TableCell>
                <TableCell className="py-4 text-muted-foreground">
                  {formatSchedules(classItem.schedules)}
                </TableCell>
                <TableCell className="py-4 text-muted-foreground">
                  {classItem.room || 'N/A'}
                </TableCell>
                <TableCell className="py-4">
                  <Badge
                    variant={classItem.isActive ? 'default' : 'secondary'}
                  >
                    {classItem.isActive ? 'Active' : 'Archived'}
                  </Badge>
                </TableCell>
                <TableCell
                  className="space-x-1 py-4 text-right"
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
                    onClick={() =>
                      router.push(`/dashboard/admin/classes/${classItem.id}/edit`)
                    }
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
                  {!classItem.isActive && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600"
                      onClick={() => {
                        setPurgeTarget(classItem);
                        setPurgeConfirmText('');
                      }}
                    >
                      Purge
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );

  const renderGrid = () => (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filtered.length === 0 ? (
        <Card className="col-span-full p-8 text-center text-muted-foreground">
          No classes found.
        </Card>
      ) : (
        filtered.map((classItem) => (
          <Card
            key={classItem.id}
            className="cursor-pointer p-4 transition-colors hover:bg-muted/50"
            onClick={() => router.push(`/dashboard/admin/classes/${classItem.id}`)}
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">
                    {classItem.subjectName} ({classItem.subjectCode})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Grade {classItem.subjectGradeLevel} • {classItem.schoolYear}
                  </p>
                </div>
                <Badge variant={classItem.isActive ? 'default' : 'secondary'}>
                  {classItem.isActive ? 'Active' : 'Archived'}
                </Badge>
              </div>

              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Section: {classItem.section?.name || 'N/A'}</p>
                <p>
                  Teacher:{' '}
                  {classItem.teacher
                    ? `${classItem.teacher.firstName} ${classItem.teacher.lastName}`
                    : 'N/A'}
                </p>
                <p>Room: {classItem.room || 'N/A'}</p>
                <p className="line-clamp-2">Schedule: {formatSchedules(classItem.schedules)}</p>
              </div>

              <div
                className="flex flex-wrap gap-1 pt-1"
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
                  onClick={() =>
                    router.push(`/dashboard/admin/classes/${classItem.id}/edit`)
                  }
                >
                  Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={classItem.isActive ? 'text-red-600' : 'text-green-600'}
                  onClick={() => setArchiveTarget(classItem)}
                >
                  {classItem.isActive ? 'Archive' : 'Restore'}
                </Button>
                {!classItem.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600"
                    onClick={() => {
                      setPurgeTarget(classItem);
                      setPurgeConfirmText('');
                    }}
                  >
                    Purge
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))
      )}
    </div>
  );

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
          <p className="text-muted-foreground">
            {activeCount} active • {archivedCount} archived
          </p>
        </div>
        <Button onClick={() => router.push('/dashboard/admin/classes/new')}>
          + Add Class
        </Button>
      </div>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value as StatusTab);
          setSearch('');
          setGradeFilter('all');
        }}
      >
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="archived">Archived</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'archived' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Archived classes are inactive but restorable. Purge permanently removes the class and all related records.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search subject, section, teacher, room..."
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
        <div className="ml-auto flex gap-2">
          <Button
            variant={viewMode === 'table' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            Table
          </Button>
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
        </div>
      </div>

      {viewMode === 'table' ? renderTable() : renderGrid()}

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

      <Dialog open={!!purgeTarget} onOpenChange={() => setPurgeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">
              Permanently Delete Class
            </DialogTitle>
            <DialogDescription>
              This action is irreversible. The archived class and all related records will be permanently removed.
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
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handlePurge}
              disabled={
                purgeConfirmText !==
                `${purgeTarget?.subjectName} (${purgeTarget?.subjectCode})`
              }
            >
              Permanently Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
