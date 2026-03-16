'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { sectionService } from '@/services/section-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { getApiErrorMessage } from '@/lib/api-error';
import type { Section } from '@/types/section';

type StatusTab = 'active' | 'archived';

export default function SectionManagementPage() {
  const router = useRouter();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusTab>('active');
  const [gradeFilter, setGradeFilter] = useState('all');
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
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to load sections'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = useMemo(() => {
    return sections.filter((section) => {
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
    });
  }, [gradeFilter, search, sections, tab]);

  const activeCount = sections.filter((section) => section.isActive).length;
  const archivedCount = sections.filter((section) => !section.isActive).length;

  const handleArchive = async () => {
    if (!archiveTarget) return;

    if (archiveConfirmText.trim() !== archiveTarget.name) {
      toast.error('Type the exact section name to archive');
      return;
    }

    try {
      await sectionService.archive(archiveTarget.id);
      toast.success('Section archived and roster cleared');
      setArchiveTarget(null);
      setArchiveConfirmText('');
      fetchData();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to archive section'));
    }
  };

  const handleRestore = async (section: Section) => {
    try {
      await sectionService.restore(section.id);
      toast.success('Section restored');
      fetchData();
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
        <Button onClick={() => router.push('/dashboard/admin/sections/new')}>+ Add Section</Button>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as StatusTab)}>
        <TabsList>
          <TabsTrigger value="active">Active ({activeCount})</TabsTrigger>
          <TabsTrigger value="archived">Archived ({archivedCount})</TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === 'archived' ? (
        <Card className="border-red-200 bg-red-50/60">
          <CardContent className="p-3 text-sm text-red-700">
            Archived sections are inactive but restorable. Purge permanently removes the section from the database.
          </CardContent>
        </Card>
      ) : null}

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
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                  No sections found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((section) => (
                <TableRow
                  key={section.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => router.push(`/dashboard/admin/sections/${section.id}/roster`)}
                >
                  <TableCell className="font-medium">{section.name}</TableCell>
                  <TableCell>Grade {section.gradeLevel}</TableCell>
                  <TableCell>
                    <Badge variant={section.isActive ? 'default' : 'secondary'}>
                      {section.isActive ? 'Active' : 'Archived'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {section.adviser
                      ? `${section.adviser.firstName} ${section.adviser.lastName}`
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {section.studentCount ?? '—'} / {section.capacity || '—'}
                  </TableCell>
                  <TableCell>{section.roomNumber || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{section.schoolYear}</TableCell>
                  <TableCell className="space-x-1 text-right" onClick={(event) => event.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/dashboard/admin/sections/${section.id}/edit`)}
                    >
                      Edit
                    </Button>
                    {section.isActive ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-amber-700"
                        onClick={() => {
                          setArchiveTarget(section);
                          setArchiveConfirmText('');
                        }}
                      >
                        Archive
                      </Button>
                    ) : (
                      <>
                        <Button variant="ghost" size="sm" onClick={() => handleRestore(section)}>
                          Restore
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => {
                            setPurgeTarget(section);
                            setPurgeConfirmText('');
                          }}
                        >
                          Purge
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog
        open={!!archiveTarget}
        onOpenChange={(open) => {
          if (!open) {
            setArchiveTarget(null);
            setArchiveConfirmText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-amber-700">Archive Section</DialogTitle>
            <DialogDescription>
              Archiving will clear active enrollments from this section and mark the section as inactive.
              Type <strong>{archiveTarget?.name}</strong> to continue.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={archiveConfirmText}
            onChange={(event) => setArchiveConfirmText(event.target.value)}
            placeholder="Type section name to confirm"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={archiveConfirmText.trim() !== (archiveTarget?.name || '')}
              onClick={handleArchive}
            >
              Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!purgeTarget}
        onOpenChange={(open) => {
          if (!open) {
            setPurgeTarget(null);
            setPurgeConfirmText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Purge Section</DialogTitle>
            <DialogDescription>
              This permanently deletes <strong>{purgeTarget?.name}</strong> from the database.
              Type the section name exactly to proceed.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={purgeConfirmText}
            onChange={(event) => setPurgeConfirmText(event.target.value)}
            placeholder="Type section name to confirm purge"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setPurgeTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={purgeConfirmText.trim() !== (purgeTarget?.name || '')}
              onClick={handlePurge}
            >
              Purge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
