'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpenText,
  CircleHelp,
  FileStack,
  ImageIcon,
  Minus,
  Paperclip,
  PencilLine,
  Plus,
  Rocket,
  Sparkles,
  Trash2,
  Video,
} from 'lucide-react';
import { lessonService } from '@/services/lesson-service';
import { useAuth } from '@/providers/AuthProvider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ConfirmationDialog, type ConfirmationDialogConfig } from '@/components/shared/ConfirmationDialog';
import { RichTextEditor } from '@/components/shared/rich-text/RichTextEditor';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { toast } from 'sonner';
import {
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import { plainTextToRichHtml } from '@/lib/rich-text';
import type { Lesson, ContentBlock, CreateContentBlockDto } from '@/types/lesson';

const BLOCK_TYPES = [
  {
    type: 'text',
    label: 'Text',
    hint: 'Use this for explanations, instructions, or summaries.',
    icon: PencilLine,
  },
  {
    type: 'image',
    label: 'Image',
    hint: 'Paste an image URL for diagrams or visual examples.',
    icon: ImageIcon,
  },
  {
    type: 'video',
    label: 'Video',
    hint: 'Drop in a video link for walkthroughs or demonstrations.',
    icon: Video,
  },
  {
    type: 'question',
    label: 'Question',
    hint: 'Add a reflection prompt or quick learner checkpoint.',
    icon: CircleHelp,
  },
  {
    type: 'file',
    label: 'File',
    hint: 'Link to a worksheet, PDF, or external supporting file.',
    icon: Paperclip,
  },
  {
    type: 'divider',
    label: 'Divider',
    hint: 'Break the lesson into clearer parts without extra text.',
    icon: Minus,
  },
] as const satisfies Array<{
  type: CreateContentBlockDto['type'];
  label: string;
  hint: string;
  icon: typeof PencilLine;
}>;

function getDefaultBlockContent(type: CreateContentBlockDto['type']): string {
  switch (type) {
    case 'text':
      return 'Start writing the core explanation for this lesson section.';
    case 'image':
      return 'https://';
    case 'video':
      return 'https://';
    case 'question':
      return 'Add a short checkpoint question for learners.';
    case 'file':
      return 'https://';
    case 'divider':
      return 'Section break';
    default:
      return 'New content block';
  }
}

function getBlockTextValue(content: ContentBlock['content']): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const maybeText = content.text;
    if (typeof maybeText === 'string') return maybeText;
    return JSON.stringify(content, null, 2);
  }
  return '';
}

function getBlockUrlValue(content: ContentBlock['content']): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const maybeUrl = content.url;
    if (typeof maybeUrl === 'string') return maybeUrl;
    const maybeText = content.text;
    if (typeof maybeText === 'string') return maybeText;
  }
  return '';
}

function normalizeRichValue(input?: string | null) {
  const text = (input || '').trim();
  if (!text) return '';
  if (/<[a-z][\s\S]*>/i.test(text)) return text;
  return plainTextToRichHtml(text);
}

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const { role } = useAuth();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [confirmation, setConfirmation] = useState<ConfirmationDialogConfig | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lessonService.getById(lessonId);
      setLesson(res.data);
      setTitle(res.data.title);
      setDescription(normalizeRichValue(res.data.description));
      setBlocks((res.data.contentBlocks || []).sort((a, b) => a.order - b.order));
    } catch {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveDetails = async () => {
    try {
      setSaving(true);
      await lessonService.update(lessonId, { title, description });
      toast.success('Lesson details saved');
    } catch {
      toast.error('Failed to save lesson details');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await lessonService.publish(lessonId);
      setLesson((prev) => (prev ? { ...prev, isDraft: false } : prev));
      toast.success('Lesson published');
    } catch {
      toast.error('Failed to publish lesson');
    }
  };

  const handleAddBlock = async (type: CreateContentBlockDto['type']) => {
    try {
      const dto: CreateContentBlockDto = {
        type,
        order: blocks.length + 1,
        content: getDefaultBlockContent(type),
      };
      const res = await lessonService.createBlock(lessonId, dto);
      setBlocks((prev) => [...prev, res.data]);
      setShowAddMenu(false);
      if (type !== 'divider') setEditingBlockId(res.data.id);
      toast.success('Block added');
    } catch {
      toast.error('Failed to add block');
    }
  };

  const handleUpdateBlock = async (blockId: string, content: string) => {
    try {
      await lessonService.updateBlock(blockId, { content });
      setBlocks((prev) => prev.map((block) => (
        block.id === blockId ? { ...block, content } : block
      )));
      setEditingBlockId(null);
      toast.success('Block updated');
    } catch {
      toast.error('Failed to update block');
    }
  };

  const handleDeleteBlock = (blockId: string) => {
    setConfirmation({
      title: 'Delete content block?',
      description: 'This removes the selected lesson block from the lesson permanently.',
      confirmLabel: 'Delete Block',
      tone: 'danger',
      onConfirm: async () => {
        try {
          await lessonService.deleteBlock(blockId);
          setBlocks((prev) => prev.filter((block) => block.id !== blockId));
          toast.success('Block deleted');
        } catch {
          toast.error('Failed to delete block');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 rounded-[1.9rem]" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-32 rounded-[1.5rem]" />)}
        </div>
        <Skeleton className="h-[34rem] rounded-[1.7rem]" />
      </div>
    );
  }

  if (!lesson) return <p className="text-muted-foreground">Lesson not found.</p>;

  return (
    <>
      <TeacherPageShell
        className={role === 'admin' ? 'theme-admin-bridge max-w-5xl mx-auto' : 'max-w-5xl mx-auto'}
        badge="Lesson Studio"
        title="Edit Lesson"
        description="Refine lesson details and build the content flow one block at a time from a cleaner editor."
        actions={(
          <>
            <Button variant="outline" size="sm" onClick={() => router.back()} className="teacher-button-outline rounded-xl font-black">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Button
              variant={lesson.isDraft ? 'teacher' : 'secondary'}
              onClick={handlePublish}
              disabled={!lesson.isDraft}
              className={lesson.isDraft ? 'rounded-xl font-black' : 'rounded-xl font-black border-emerald-200 bg-emerald-50 text-emerald-700'}
            >
              <Rocket className="h-4 w-4" />
              {lesson.isDraft ? 'Publish Lesson' : 'Published'}
            </Button>
          </>
        )}
        stats={(
          <>
            <TeacherStatCard label="Lesson Title" value={lesson.title} caption="Current lesson identity" icon={BookOpenText} accent="sky" />
            <TeacherStatCard label="Content Blocks" value={blocks.length} caption="Editable lesson sections" icon={FileStack} accent="teal" />
            <TeacherStatCard label="Status" value={lesson.isDraft ? 'Draft' : 'Published'} caption={lesson.isDraft ? 'Ready for review and publishing' : 'Visible to learners'} icon={Sparkles} accent="amber" />
          </>
        )}
      >
        <TeacherSectionCard
          title="Lesson Details"
          description="Keep the lesson title and overview clear before you work through the learning blocks."
        >
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} className="teacher-input h-12 rounded-2xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-black text-[var(--teacher-text-strong)]">Description</Label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                minHeight={190}
                placeholder="Write lesson context, goals, and what students should expect in this lesson."
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSaveDetails} disabled={saving} className="teacher-button-solid rounded-xl font-black">
                <PencilLine className="h-4 w-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </TeacherSectionCard>

        <TeacherSectionCard
          title={`Content Blocks (${blocks.length})`}
          description="Add the next section from the quick builder, then polish one block at a time."
          action={(
            <div className="relative">
              <Button size="sm" onClick={() => setShowAddMenu((prev) => !prev)} className="teacher-button-solid rounded-xl font-black">
                <Plus className="h-4 w-4" />
                Add Block
              </Button>
              {showAddMenu ? (
                <div className="absolute right-0 top-full z-10 mt-2 grid min-w-[320px] gap-2 rounded-3xl border border-white/35 bg-white/95 p-3 shadow-[0_28px_54px_-36px_rgba(15,23,42,0.3)] backdrop-blur">
                  {BLOCK_TYPES.map((blockType) => {
                    const Icon = blockType.icon;
                    return (
                      <button
                        key={blockType.type}
                        onClick={() => handleAddBlock(blockType.type)}
                        className="flex w-full items-start gap-3 rounded-2xl border border-slate-200/70 px-3 py-3 text-left transition hover:border-[var(--teacher-accent)]/35 hover:bg-emerald-50/60"
                      >
                        <span className="mt-0.5 rounded-xl bg-[var(--teacher-surface-soft)] p-2 text-[var(--teacher-accent-strong)]">
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="space-y-1">
                          <span className="block text-sm font-black text-slate-800">{blockType.label}</span>
                          <span className="block text-xs leading-5 text-slate-500">{blockType.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          )}
        >
          <div className="space-y-4">
            <div className="grid gap-3 lg:grid-cols-3">
              {BLOCK_TYPES.map((blockType) => {
                const Icon = blockType.icon;
                return (
                  <button
                    key={blockType.type}
                    type="button"
                    onClick={() => handleAddBlock(blockType.type)}
                    className="rounded-[1.4rem] border border-[var(--teacher-outline)] bg-[var(--teacher-surface-soft)] px-4 py-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--teacher-accent)]/35 hover:bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 rounded-xl bg-white p-2 text-[var(--teacher-accent-strong)] shadow-sm">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="text-sm font-black text-[var(--teacher-text-strong)]">{blockType.label}</p>
                        <p className="mt-1 text-xs leading-5 text-[var(--teacher-text-muted)]">{blockType.hint}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {blocks.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[var(--teacher-outline)] bg-white/55 px-6 py-12 text-center text-sm text-[var(--teacher-text-muted)]">
                No content blocks yet. Start with a text block, then add media or checkpoints as needed.
              </div>
            ) : (
              <div className="space-y-3">
                {blocks.map((block, index) => (
                  <Card
                    key={block.id}
                    className="overflow-hidden rounded-[1.45rem] border-white/35 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(248,250,252,0.84))] shadow-[0_24px_48px_-34px_rgba(15,23,42,0.26)]"
                  >
                    <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex flex-1 items-start gap-4">
                        <div className="flex min-w-[62px] flex-col items-center gap-2 rounded-2xl border border-white/60 bg-white/75 px-3 py-3 text-xs font-black text-[var(--teacher-text-muted)] shadow-sm">
                          <span className="text-sm">##</span>
                          <span>#{index + 1}</span>
                        </div>
                        <div className="flex-1 space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full border-emerald-200 bg-emerald-50/80 text-emerald-700">
                              {block.type}
                            </Badge>
                            <span className="text-xs font-semibold text-[var(--teacher-text-muted)]">
                              {editingBlockId === block.id ? 'Currently editing this block' : 'Ready to review'}
                            </span>
                          </div>
                          {editingBlockId === block.id ? (
                            <BlockEditor
                              block={block}
                              onSave={(content) => handleUpdateBlock(block.id, content)}
                              onCancel={() => setEditingBlockId(null)}
                            />
                          ) : (
                            <BlockPreview block={block} />
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {block.type !== 'divider' ? (
                          <Button variant="outline" size="sm" className="teacher-button-solid rounded-xl font-black" onClick={() => setEditingBlockId(block.id)}>
                            <PencilLine className="mr-1 h-3.5 w-3.5" />
                            Edit Block
                          </Button>
                        ) : null}
                        <Button variant="outline" size="sm" className="rounded-xl border-rose-200 bg-white/75 font-black text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteBlock(block.id)}>
                          <Trash2 className="mr-1 h-3.5 w-3.5" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TeacherSectionCard>
      </TeacherPageShell>
      <ConfirmationDialog config={confirmation} onClose={() => setConfirmation(null)} />
    </>
  );
}

function BlockEditor({
  block,
  onSave,
  onCancel,
}: {
  block: ContentBlock;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(
    block.type === 'text' || block.type === 'question'
      ? getBlockTextValue(block.content)
      : getBlockUrlValue(block.content),
  );

  return (
    <div className="space-y-3">
      {block.type === 'text' || block.type === 'question' ? (
        <RichTextEditor
          value={value}
          onChange={setValue}
          minHeight={200}
          placeholder={block.type === 'question' ? 'Write your prompt...' : 'Write lesson content...'}
        />
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Enter ${block.type} URL...`} className="teacher-input h-12 rounded-2xl" />
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(value)} className="teacher-button-solid rounded-xl font-black">Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel} className="teacher-button-outline rounded-xl font-black">Cancel</Button>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: ContentBlock }) {
  const baseClass = 'rounded-2xl border border-white/60 bg-white/70 px-4 py-4 text-sm text-slate-700';

  switch (block.type) {
    case 'text':
      return (
        <div className={baseClass}>
          {getBlockTextValue(block.content).trim() ? (
            <RichTextRenderer html={normalizeRichValue(getBlockTextValue(block.content))} />
          ) : (
            'Empty text block'
          )}
        </div>
      );
    case 'image':
      return <p className={baseClass}>Image URL: {getBlockUrlValue(block.content) || 'No URL yet'}</p>;
    case 'video':
      return <p className={baseClass}>Video URL: {getBlockUrlValue(block.content) || 'No URL yet'}</p>;
    case 'question':
      return (
        <div className={baseClass}>
          {getBlockTextValue(block.content).trim() ? (
            <RichTextRenderer html={normalizeRichValue(getBlockTextValue(block.content))} />
          ) : (
            'Empty question block'
          )}
        </div>
      );
    case 'file':
      return <p className={baseClass}>File link: {getBlockUrlValue(block.content) || 'No URL yet'}</p>;
    case 'divider':
      return (
        <div className="rounded-2xl border border-dashed border-[var(--teacher-outline)] bg-white/60 px-4 py-4">
          <hr className="border-[var(--teacher-outline)]" />
        </div>
      );
    default:
      return <p className={baseClass}>Unknown block type</p>;
  }
}
