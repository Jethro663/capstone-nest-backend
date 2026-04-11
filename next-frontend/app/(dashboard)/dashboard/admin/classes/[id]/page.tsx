'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ClipboardList,
  Megaphone,
  Power,
  Settings2,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import type { ClassItem } from '@/types/class';
import type { ClassModule } from '@/types/module';
import type { Assessment } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';

export default function AdminClassDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = String(params?.id ?? '');

  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [modules, setModules] = useState<ClassModule[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [enrollmentCount, setEnrollmentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const [roomDraft, setRoomDraft] = useState('');
  const [schoolYearDraft, setSchoolYearDraft] = useState('');

  const loadAll = useCallback(async () => {
    if (!classId) return;

    try {
      setLoading(true);
      const [classRes, modulesRes, assessmentsRes, announcementsRes, enrollmentsRes] = await Promise.all([
        classService.getById(classId),
        moduleService.getByClass(classId),
        assessmentService.getByClass(classId, { page: 1, limit: 100, status: 'all' }),
        announcementService.getByClass(classId, { limit: 100 }),
        classService.getEnrollments(classId),
      ]);

      setClassItem(classRes.data || null);
      setModules(modulesRes.data || []);
      setAssessments(assessmentsRes.data || []);
      setAnnouncements(announcementsRes.data || []);
      setEnrollmentCount(enrollmentsRes.count || enrollmentsRes.data?.length || 0);

      setRoomDraft(classRes.data?.room || '');
      setSchoolYearDraft(classRes.data?.schoolYear || '');
    } catch {
      toast.error('Failed to load class detail');
      setClassItem(null);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const quickLinks = useMemo(() => {
    const links = [
      { href: `/dashboard/admin/classes/${classId}/edit`, label: 'Edit class meta' },
      { href: '/dashboard/admin/classes', label: 'Back to class list' },
    ];
    if (classItem?.sectionId) {
      links.push(
        {
          href: `/dashboard/admin/sections/${classItem.sectionId}/roster`,
          label: 'Manage section roster',
        },
        {
          href: `/dashboard/admin/sections/${classItem.sectionId}/students/add`,
          label: 'Add section students',
        },
      );
    }
    return links;
  }, [classId, classItem?.sectionId]);

  const handleSaveMeta = async () => {
    if (!classItem) return;
    try {
      setSavingMeta(true);
      await classService.update(classItem.id, {
        room: roomDraft.trim() || undefined,
        schoolYear: schoolYearDraft.trim() || classItem.schoolYear,
      });
      toast.success('Class meta updated');
      await loadAll();
    } catch {
      toast.error('Failed to update class metadata');
    } finally {
      setSavingMeta(false);
    }
  };

  const executeControlledAction = async (actionKey: string, action: () => Promise<void>) => {
    try {
      setBusyAction(actionKey);
      await action();
      await loadAll();
    } finally {
      setBusyAction(null);
    }
  };

  const toggleClassStatus = () => {
    if (!classItem) return;
    const label = classItem.isActive ? 'Archive class' : 'Restore class';
    setConfirmation({
      title: `${label}?`,
      description: classItem.isActive
        ? 'Archiving disables active use until restored.'
        : 'Restoring reopens the class for active operations.',
      confirmLabel: label,
      tone: classItem.isActive ? 'danger' : 'default',
      onConfirm: async () => {
        await executeControlledAction('status', async () => {
          await classService.toggleStatus(classItem.id);
          toast.success(classItem.isActive ? 'Class archived' : 'Class restored');
        });
      },
    });
  };

  const toggleClassHiddenState = () => {
    if (!classItem) return;
    const hide = !classItem.isHidden;
    setConfirmation({
      title: hide ? 'Hide class from dashboards?' : 'Unhide class?',
      description: hide
        ? 'Hidden classes remain configured but are removed from default views.'
        : 'This class will become visible again on dashboards.',
      confirmLabel: hide ? 'Hide class' : 'Unhide class',
      tone: hide ? 'danger' : 'default',
      onConfirm: async () => {
        await executeControlledAction('visibility', async () => {
          if (hide) {
            await classService.hide(classItem.id);
            toast.success('Class hidden');
          } else {
            await classService.unhide(classItem.id);
            toast.success('Class unhidden');
          }
        });
      },
    });
  };

  const toggleModuleVisibility = async (module: ClassModule) => {
    await executeControlledAction(`module-${module.id}`, async () => {
      await moduleService.update(module.id, { isVisible: !module.isVisible });
      toast.success(module.isVisible ? 'Module hidden' : 'Module visible');
    });
  };

  const toggleAssessmentPublication = async (assessment: Assessment) => {
    await executeControlledAction(`assessment-${assessment.id}`, async () => {
      await assessmentService.update(assessment.id, { isPublished: !assessment.isPublished });
      toast.success(assessment.isPublished ? 'Assessment moved to draft' : 'Assessment published');
    });
  };

  const toggleAnnouncementVisibility = async (announcement: Announcement) => {
    await executeControlledAction(`announcement-${announcement.id}`, async () => {
      await announcementService.releaseCore(classId, announcement.id, {
        isVisible: announcement.isVisible === false,
      });
      toast.success(announcement.isVisible === false ? 'Announcement visible' : 'Announcement hidden');
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  if (!classItem) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Class not found.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--admin-text-muted)]">
              Admin Master Control
            </p>
            <h1 className="mt-1 text-2xl font-black text-[var(--admin-text-strong)]">
              {classItem.subjectName} ({classItem.subjectCode})
            </h1>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Grade {classItem.subjectGradeLevel} • {classItem.schoolYear} • {classItem.section?.name}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="admin-button-outline rounded-xl font-black"
              onClick={() => router.push('/dashboard/admin/classes')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              className="admin-button-solid rounded-xl font-black"
              onClick={toggleClassStatus}
              disabled={busyAction === 'status'}
            >
              <Power className="h-4 w-4" />
              {classItem.isActive ? 'Archive' : 'Restore'}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <Users className="h-4 w-4" />
            Students
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{enrollmentCount}</p>
        </article>
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <BookOpen className="h-4 w-4" />
            Modules
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{modules.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <ClipboardList className="h-4 w-4" />
            Assessments
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{assessments.length}</p>
        </article>
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <Megaphone className="h-4 w-4" />
            Announcements
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{announcements.length}</p>
        </article>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <Settings2 className="h-4 w-4" />
              Class Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="room">Room</Label>
              <Input id="room" value={roomDraft} onChange={(event) => setRoomDraft(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="schoolYear">School Year</Label>
              <Input id="schoolYear" value={schoolYearDraft} onChange={(event) => setSchoolYearDraft(event.target.value)} />
            </div>
            <Button className="w-full" onClick={handleSaveMeta} disabled={savingMeta}>
              {savingMeta ? 'Saving...' : 'Save Metadata'}
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={toggleClassHiddenState}
              disabled={busyAction === 'visibility'}
            >
              {classItem.isHidden ? 'Unhide Class' : 'Hide Class'}
            </Button>

            <div className="rounded-lg border p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quick links</p>
              <div className="space-y-2">
                {quickLinks.map((link) => (
                  <Link key={link.href} href={link.href} className="block rounded-md border px-3 py-2 text-sm hover:bg-muted/40">
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base font-black">
              <ShieldCheck className="h-4 w-4" />
              Content Visibility Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <section className="space-y-2">
              <h3 className="text-sm font-black">Modules</h3>
              {modules.slice(0, 6).map((module) => (
                <div key={module.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-sm">{module.title}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleModuleVisibility(module)}
                    disabled={busyAction === `module-${module.id}`}
                  >
                    {module.isVisible ? 'Hide' : 'Show'}
                  </Button>
                </div>
              ))}
              {modules.length === 0 ? <p className="text-sm text-muted-foreground">No modules available.</p> : null}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-black">Assessments</h3>
              {assessments.slice(0, 6).map((assessment) => (
                <div key={assessment.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-sm">{assessment.title}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleAssessmentPublication(assessment)}
                    disabled={busyAction === `assessment-${assessment.id}`}
                  >
                    {assessment.isPublished ? 'Set Draft' : 'Publish'}
                  </Button>
                </div>
              ))}
              {assessments.length === 0 ? <p className="text-sm text-muted-foreground">No assessments available.</p> : null}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-black">Announcements</h3>
              {announcements.slice(0, 6).map((announcement) => (
                <div key={announcement.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <p className="text-sm">{announcement.title}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void toggleAnnouncementVisibility(announcement)}
                    disabled={busyAction === `announcement-${announcement.id}`}
                  >
                    {announcement.isVisible === false ? 'Show' : 'Hide'}
                  </Button>
                </div>
              ))}
              {announcements.length === 0 ? <p className="text-sm text-muted-foreground">No announcements available.</p> : null}
            </section>
          </CardContent>
        </Card>
      </div>

      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </div>
  );
}

