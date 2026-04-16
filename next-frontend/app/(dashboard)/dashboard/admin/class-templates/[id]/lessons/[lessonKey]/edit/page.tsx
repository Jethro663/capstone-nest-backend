'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, ChevronDown, ChevronUp, Plus, Save, Trash2 } from 'lucide-react';
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
  findLessonItemContext,
  loadTemplateWorkspace,
  readTemplateEditorDraft,
  resolveAndSaveTemplateContent,
  updateLessonMetadataByKey,
  writeTemplateEditorDraft,
} from '@/lib/class-template-editor';
import { sanitizeRichTextHtml } from '@/lib/rich-text';
import type {
  ClassTemplate,
  ClassTemplateAnnouncement,
  ClassTemplateAssessment,
  ClassTemplateModule,
} from '@/types/class-template';
import type { ContentBlock } from '@/types/lesson';
import { CONTENT_BLOCK_TYPES, type ContentBlockType } from '@/utils/constants';

const BLOCK_LABELS: Record<ContentBlockType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  question: 'Question',
  file: 'File',
  divider: 'Divider',
};

function getDefaultBlockContent(type: ContentBlockType): string {
  switch (type) {
    case 'text':
      return '<p>Start writing lesson content.</p>';
    case 'question':
      return '<p>Add a learner checkpoint question.</p>';
    case 'image':
    case 'video':
    case 'file':
      return 'https://';
    case 'divider':
      return 'Section break';
    default:
      return '';
  }
}

function createDraftBlock(type: ContentBlockType, order: number, lessonKey: string): ContentBlock {
  return {
    id: `draft-${lessonKey}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    lessonId: lessonKey,
    type,
    order,
    content: getDefaultBlockContent(type),
  };
}

function parseLessonBlocks(raw: unknown, lessonKey: string): ContentBlock[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((entry): entry is Partial<ContentBlock> => Boolean(entry) && typeof entry === 'object')
    .map((entry, index) => {
      const type = CONTENT_BLOCK_TYPES.includes(entry.type as ContentBlockType)
        ? (entry.type as ContentBlockType)
        : 'text';

      return {
        id: entry.id || `draft-${lessonKey}-${index}`,
        lessonId: entry.lessonId || lessonKey,
        type,
        order: typeof entry.order === 'number' ? entry.order : index + 1,
        content:
          typeof entry.content === 'string' ||
          (entry.content && typeof entry.content === 'object')
            ? entry.content
            : getDefaultBlockContent(type),
        metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : undefined,
      };
    })
    .sort((left, right) => left.order - right.order)
    .map((entry, index) => ({
      ...entry,
      order: index + 1,
    }));
}

export default function AdminTemplateLessonEditorPage() {
  const params = useParams<{ id: string; lessonKey: string }>();
  const router = useRouter();
  const templateId = String(params?.id ?? '');
  const lessonKey = String(params?.lessonKey ?? '');

  const [template, setTemplate] = useState<ClassTemplate | null>(null);
  const [modules, setModules] = useState<ClassTemplateModule[]>([]);
  const [assessments, setAssessments] = useState<ClassTemplateAssessment[]>([]);
  const [announcements, setAnnouncements] = useState<ClassTemplateAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSummary, setLessonSummary] = useState('');
  const [lessonBlocks, setLessonBlocks] = useState<ContentBlock[]>([]);
  const [newBlockType, setNewBlockType] = useState<ContentBlockType>('text');

  const lessonContext = useMemo(
    () => findLessonItemContext(modules, lessonKey),
    [modules, lessonKey],
  );

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
        toast.error('Failed to load lesson studio');
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
    if (!lessonContext) return;
    const metadata = lessonContext.item.metadata ?? {};
    setLessonTitle((metadata.lessonTitle as string | undefined) ?? 'Untitled Lesson');
    setLessonSummary((metadata.lessonSummary as string | undefined) ?? '');
    setLessonBlocks(
      parseLessonBlocks(
        (metadata.lessonBlocks as unknown) ?? (metadata.contentBlocks as unknown),
        lessonKey,
      ),
    );
  }, [lessonContext, lessonKey]);

  const addLessonBlock = () => {
    setLessonBlocks((current) => [
      ...current,
      createDraftBlock(newBlockType, current.length + 1, lessonKey),
    ]);
  };

  const updateLessonBlock = (blockIndex: number, patch: Partial<ContentBlock>) => {
    setLessonBlocks((current) => {
      const next = current.slice();
      if (!next[blockIndex]) return current;
      next[blockIndex] = { ...next[blockIndex], ...patch };
      return next;
    });
  };

  const removeLessonBlock = (blockIndex: number) => {
    setLessonBlocks((current) =>
      current
        .filter((_, index) => index !== blockIndex)
        .map((entry, index) => ({
          ...entry,
          order: index + 1,
        })),
    );
  };

  const moveLessonBlock = (blockIndex: number, direction: -1 | 1) => {
    setLessonBlocks((current) => {
      const targetIndex = blockIndex + direction;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = current.slice();
      const [moved] = next.splice(blockIndex, 1);
      next.splice(targetIndex, 0, moved);

      return next.map((entry, index) => ({
        ...entry,
        order: index + 1,
      }));
    });
  };

  useEffect(() => {
    if (!templateId || loading) return;
    const handle = window.setTimeout(() => {
      writeTemplateEditorDraft(templateId, { modules, assessments, announcements });
    }, 400);

    return () => window.clearTimeout(handle);
  }, [templateId, loading, modules, assessments, announcements]);

  const handleSave = async () => {
    if (!lessonContext) {
      toast.error('Lesson context is missing');
      return;
    }

    const safeTitle = lessonTitle.trim() || 'Untitled Lesson';
    const safeSummary = sanitizeRichTextHtml(lessonSummary).trim();
    const normalizedBlocks = lessonBlocks.map((block, index) => ({
      ...block,
      lessonId: lessonKey,
      order: index + 1,
      content:
        typeof block.content === 'string'
          ? block.content
          : JSON.parse(JSON.stringify(block.content ?? {})),
    }));

    const nextModules = updateLessonMetadataByKey(modules, lessonKey, {
      lessonTitle: safeTitle,
      lessonSummary: safeSummary,
      lessonBlocks: normalizedBlocks,
    });

    try {
      setSaving(true);
      const saved = await resolveAndSaveTemplateContent(templateId, {
        modules: nextModules,
        assessments,
        announcements,
      });

      setModules(saved.modules);
      setAssessments(saved.assessments);
      setAnnouncements(saved.announcements);
      clearTemplateEditorDraft(templateId);
      toast.success('Lesson block saved');
    } catch {
      toast.error('Failed to save lesson block');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-36 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!lessonContext) {
    return (
      <div className="rounded-2xl border border-[var(--admin-outline)] bg-white p-5 text-sm text-[var(--admin-text-muted)]">
        Lesson block not found. Save the template workspace first, then reopen this lesson studio.
        <div className="mt-4">
          <Button variant="outline" onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Template Workspace
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TeacherPageShell
      className="theme-admin-bridge mx-auto max-w-5xl"
      badge="Template Lesson Studio"
      title="Edit Lesson Block"
      description="Use the same lesson authoring rhythm as teacher-side editing while keeping content inside the class template workspace."
      actions={(
        <>
          <Button variant="outline" className="teacher-button-outline rounded-xl font-black" onClick={() => router.push(`/dashboard/admin/class-templates/${templateId}`)}>
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Button>
          <Button className="teacher-button-solid rounded-xl font-black" onClick={handleSave} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Lesson Block'}
          </Button>
        </>
      )}
      stats={(
        <>
          <TeacherStatCard label="Template" value={template?.name ?? 'Class Template'} accent="sky" />
          <TeacherStatCard label="Module" value={lessonContext.module.title} accent="teal" />
          <TeacherStatCard label="Section" value={lessonContext.section.title} accent="amber" />
          <TeacherStatCard label="Block Order" value={`${lessonContext.itemIndex + 1}`} accent="rose" />
        </>
      )}
    >
      <TeacherSectionCard title="Lesson Details" description="Keep lesson copy clear and short so teachers can quickly reuse this block in a real class.">
        <div className="space-y-3">
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Lesson Title</p>
            <Input
              data-testid="lesson-title-input"
              value={lessonTitle}
              onChange={(event) => setLessonTitle(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--admin-text-muted)]">Lesson Summary</p>
            <RichTextEditor value={lessonSummary} onChange={setLessonSummary} minHeight={220} />
          </div>
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard
        title="Lesson Blocks"
        description="Build richer lesson flow with multiple content blocks, similar to teacher-side authoring."
        action={(
          <div className="flex flex-wrap items-center gap-2">
            <select
              className="admin-select h-10 rounded-xl px-3 text-sm"
              value={newBlockType}
              onChange={(event) => setNewBlockType(event.target.value as ContentBlockType)}
            >
              {CONTENT_BLOCK_TYPES.map((type) => (
                <option key={type} value={type}>
                  {BLOCK_LABELS[type]}
                </option>
              ))}
            </select>
            <Button variant="outline" className="admin-button-outline rounded-xl" onClick={addLessonBlock}>
              <Plus className="h-4 w-4" />
              Add Block
            </Button>
          </div>
        )}
      >
        <div className="space-y-3">
          {lessonBlocks.length === 0 ? (
            <p className="text-sm text-[var(--admin-text-muted)]">No lesson blocks yet. Add one to start building.</p>
          ) : null}

          {lessonBlocks.map((block, blockIndex) => (
            <article key={block.id} className="space-y-3 rounded-xl border border-[var(--admin-outline)] bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="inline-flex rounded-full bg-[#eef4ff] px-2 py-1 text-xs font-bold text-[#304a72]">
                    #{blockIndex + 1}
                  </span>
                  <select
                    className="admin-select h-9 rounded-lg px-2 text-sm"
                    value={block.type}
                    onChange={(event) => {
                      const nextType = event.target.value as ContentBlockType;
                      updateLessonBlock(blockIndex, {
                        type: nextType,
                        content: getDefaultBlockContent(nextType),
                      });
                    }}
                  >
                    {CONTENT_BLOCK_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {BLOCK_LABELS[type]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveLessonBlock(blockIndex, -1)}
                    disabled={blockIndex === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => moveLessonBlock(blockIndex, 1)}
                    disabled={blockIndex === lessonBlocks.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => removeLessonBlock(blockIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {block.type === 'text' || block.type === 'question' ? (
                <RichTextEditor
                  value={typeof block.content === 'string' ? block.content : ''}
                  onChange={(value) => updateLessonBlock(blockIndex, { content: value })}
                  minHeight={180}
                />
              ) : (
                <Input
                  value={typeof block.content === 'string' ? block.content : ''}
                  onChange={(event) => updateLessonBlock(blockIndex, { content: event.target.value })}
                  placeholder={
                    block.type === 'divider'
                      ? 'Divider label (optional)'
                      : block.type === 'file'
                        ? 'File link or path'
                        : 'URL (https://...)'
                  }
                />
              )}
            </article>
          ))}
        </div>
      </TeacherSectionCard>

      <TeacherSectionCard title="Preview" description="This is how the lesson summary content will be rendered when attached to a class from this template.">
        <div className="rounded-xl border border-[var(--admin-outline)] bg-white p-4">
          <h3 className="text-base font-black text-[var(--admin-text-strong)]">{lessonTitle || 'Untitled Lesson'}</h3>
          <div className="mt-3 text-sm text-[var(--admin-text-strong)]">
            <RichTextRenderer html={lessonSummary} />
          </div>
          {lessonBlocks.length > 0 ? <div className="my-3 h-px bg-[var(--admin-outline)]" /> : null}
          <div className="space-y-3 text-sm text-[var(--admin-text-strong)]">
            {lessonBlocks.map((block) => (
              <div key={`preview-${block.id}`} className="rounded-lg border border-[var(--admin-outline)] px-3 py-2">
                <p className="mb-1 text-xs font-bold uppercase tracking-[0.16em] text-[var(--admin-text-muted)]">
                  {BLOCK_LABELS[block.type]}
                </p>
                {block.type === 'text' || block.type === 'question' ? (
                  <RichTextRenderer html={typeof block.content === 'string' ? block.content : ''} />
                ) : (
                  <p>{typeof block.content === 'string' ? block.content : ''}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
