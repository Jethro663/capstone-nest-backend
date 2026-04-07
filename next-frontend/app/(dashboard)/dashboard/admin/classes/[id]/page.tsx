'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpen, Megaphone, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [classRes, modulesRes, assessmentsRes, announcementsRes] = await Promise.all([
          classService.getById(classId),
          moduleService.getByClass(classId),
          assessmentService.getByClass(classId, { page: 1, limit: 100, status: 'all' }),
          announcementService.getByClass(classId, { limit: 50 }),
        ]);
        setClassItem(classRes.data || null);
        setModules(modulesRes.data || []);
        setAssessments(assessmentsRes.data || []);
        setAnnouncements(announcementsRes.data || []);
      } catch {
        toast.error('Failed to load class detail');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [classId]);

  if (loading) {
    return <p className="text-sm text-[var(--admin-text-muted)]">Loading class detail...</p>;
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
              Admin Class Workspace
            </p>
            <h1 className="mt-1 text-2xl font-black text-[var(--admin-text-strong)]">
              {classItem.subjectName} ({classItem.subjectCode})
            </h1>
            <p className="mt-1 text-sm text-[var(--admin-text-muted)]">
              Grade {classItem.subjectGradeLevel} • {classItem.schoolYear}
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
            <Link
              href={`/dashboard/admin/classes/${classItem.id}/edit`}
              className="admin-button-solid inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-black"
            >
              Edit Class
            </Link>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <BookOpen className="h-4 w-4" />
            Modules
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{modules.length}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Core-tagged: {modules.filter((module) => module.isCoreTemplateAsset).length}
          </p>
        </article>
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <ClipboardList className="h-4 w-4" />
            Assessments
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{assessments.length}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Core-tagged: {assessments.filter((assessment) => assessment.isCoreTemplateAsset).length}
          </p>
        </article>
        <article className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-black text-[var(--admin-text-strong)]">
            <Megaphone className="h-4 w-4" />
            Announcements
          </div>
          <p className="mt-2 text-2xl font-black text-[var(--admin-text-strong)]">{announcements.length}</p>
          <p className="text-xs text-[var(--admin-text-muted)]">
            Core-tagged: {announcements.filter((announcement) => announcement.isCoreTemplateAsset).length}
          </p>
        </article>
      </div>
    </div>
  );
}
