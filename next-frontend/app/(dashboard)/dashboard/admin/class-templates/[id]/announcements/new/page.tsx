'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import {
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import {
  clearTemplateEditorDraft,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import { sanitizeRichTextHtml } from '@/lib/rich-text';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
} from '@/types/class-template';

export default function AdminTemplateAnnouncementCreatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('New Announcement');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const workspace = await loadTemplateWorkspace(templateId);
        const cached = readTemplateEditorDraft(templateId);

        if (!mounted) return;

        setTemplate(workspace.template);
        setModules(cached?.modules ?? workspace.state.modules);
        setAssessments(cached?.assessments ?? workspace.state.assessments);
        setAnnouncements(cached?.announcements ?? workspace.state.announcements);
      } catch {
        toast.error('Failed to load announcement studio');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, [templateId]);

  useEffect(() => {
    if (!templateId || loading) return;
    const handle = window.setTimeout(() => {
      writeTemplateEditorDraft(templateId, { modules, assessments, announcements });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [templateId, loading, modules, assessments, announcements]);

  const handleSave = async () => {
    const safeTitle = title.trim() || 'Untitled Announcement';
    const safeContent = sanitizeRichTextHtml(content).trim();

    if (!safeContent) {
      toast.error('Announcement content is required');
      return;
    }

    const nextAnnouncements = [...announcements, {
      title: safeTitle,
      content: safeContent,
      isPinned,
      order: announcements.length + 1,
    }];

    try {
      setSaving(true);
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules,
        assessments,
        announcements: nextAnnouncements,
      });

      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      toast.success('Announcement saved');
      router.push(`/dashboard/admin/class-templates/${templateId}`);
    } catch {
      toast.error('Failed to save announcement');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  return (
    <TeacherPageShell
      className="theme-admin-bridge mx-auto max-w-5xl"
      badge="Template Announcement Studio"
      title="Create Announcement"
      description="Compose reusable announcement copy with the same teacher-side writing flow."
      actions={(
        <>
          <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Button>
          <Button className="teacher-button-solid rounded-xl font-black" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Announcement'}
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard label="Template" value={template?.name ?? 'Class Template'} accent="sky" />
          <TeacherStatCard label="Announcements" value={`${announcements.length + 1}`} accent="teal" />
          <TeacherStatCard label="Pinned" value={isPinned ? 'Yes' : 'No'} accent="amber" />
          <TeacherStatCard label="Status" value="Draft" accent="rose" />
        </>
      )}
    >
      <TeacherSectionCard title="Announcement Details" description="Draft class-wide updates that will be copied when a class uses this template.">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Title</p>
            <Input data-testid="announcement-title-input" value={title} onChange={(event) => setTitle(event.target.value)} />
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-bold text-[var(--admin-text-strong)]">
            <input type="checkbox" checked={isPinned} onChange={(event) => setIsPinned(event.target.checked)} />
            Pin this announcement in generated classes
          </label>

          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Content</p>
            <RichTextEditor value={content} onChange={setContent} minHeight={220} />
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard title="Preview" description="Rendered output preview for the announcement body.">
        <div className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <h3 className="text-base font-black text-[var(--admin-text-strong)]">{title || 'Untitled Announcement'}</h3>
          <div className="mt-3 text-sm text-[var(--admin-text-strong)]">
            <RichTextRenderer html={content} />
          </div>
        </div>
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
