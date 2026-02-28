'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { lessonService } from '@/services/lesson-service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Lesson, ContentBlock, CreateContentBlockDto } from '@/types/lesson';

const BLOCK_TYPES = [
  { type: 'text', label: '📝 Text' },
  { type: 'image', label: '🖼️ Image' },
  { type: 'video', label: '🎥 Video' },
  { type: 'question', label: '❓ Question' },
  { type: 'file', label: '📎 File' },
  { type: 'divider', label: '➖ Divider' },
] as const;

export default function LessonEditorPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = params.id as string;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [showAddMenu, setShowAddMenu] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lessonService.getById(lessonId);
      setLesson(res.data);
      setTitle(res.data.title);
      setDescription(res.data.description || '');
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
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    try {
      await lessonService.publish(lessonId);
      setLesson((prev) => prev ? { ...prev, isDraft: false } : prev);
      toast.success('Lesson published');
    } catch {
      toast.error('Failed to publish');
    }
  };

  const handleAddBlock = async (type: string) => {
    try {
      const dto: CreateContentBlockDto = {
        type: type as CreateContentBlockDto['type'],
        order: blocks.length + 1,
        content: type === 'divider' ? '' : '',
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
      setBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, content } : b)));
      setEditingBlockId(null);
    } catch {
      toast.error('Failed to update block');
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm('Delete this content block?')) return;
    try {
      await lessonService.deleteBlock(blockId);
      setBlocks((prev) => prev.filter((b) => b.id !== blockId));
      toast.success('Block deleted');
    } catch {
      toast.error('Failed to delete block');
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-60 rounded-lg" />
      </div>
    );
  }

  if (!lesson) return <p className="text-muted-foreground">Lesson not found.</p>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">← Back</Button>
          <h1 className="text-2xl font-bold">Edit Lesson</h1>
          <p className="text-muted-foreground">{lesson.title}</p>
        </div>
        <Button
          variant={lesson.isDraft ? 'default' : 'secondary'}
          onClick={handlePublish}
          disabled={!lesson.isDraft}
        >
          {lesson.isDraft ? 'Publish' : '✓ Published'}
        </Button>
      </div>

      {/* Details Card */}
      <Card>
        <CardHeader><CardTitle className="text-base">Lesson Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
          <Button onClick={handleSaveDetails} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </Card>

      {/* Content Blocks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Content Blocks ({blocks.length})</CardTitle>
            <div className="relative">
              <Button size="sm" onClick={() => setShowAddMenu(!showAddMenu)}>+ Add Block</Button>
              {showAddMenu && (
                <div className="absolute right-0 top-full mt-1 z-10 bg-white border rounded-lg shadow-lg p-2 space-y-1 min-w-[150px]">
                  {BLOCK_TYPES.map((bt) => (
                    <button
                      key={bt.type}
                      onClick={() => handleAddBlock(bt.type)}
                      className="w-full text-left px-3 py-2 rounded hover:bg-gray-50 text-sm"
                    >
                      {bt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {blocks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No content blocks yet. Click &quot;Add Block&quot; to start.</p>
          ) : (
            <div className="space-y-3">
              {blocks.map((block, i) => (
                <div key={block.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="flex flex-col items-center gap-1 text-xs text-muted-foreground pt-1">
                    <span>⋮⋮</span>
                    <span>#{i + 1}</span>
                  </div>
                  <div className="flex-1">
                    <Badge variant="outline" className="mb-2">{block.type}</Badge>
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
                  <div className="flex gap-1">
                    {block.type !== 'divider' && (
                      <Button variant="ghost" size="sm" onClick={() => setEditingBlockId(block.id)}>Edit</Button>
                    )}
                    <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDeleteBlock(block.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BlockEditor({ block, onSave, onCancel }: { block: ContentBlock; onSave: (content: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState(block.content || '');

  return (
    <div className="space-y-2">
      {block.type === 'text' || block.type === 'question' ? (
        <Textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} />
      ) : (
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={`Enter ${block.type} URL...`} />
      )}
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(value)}>Save</Button>
        <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

function BlockPreview({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return <p className="text-sm whitespace-pre-wrap">{block.content || 'Empty text block'}</p>;
    case 'image':
      return <p className="text-sm text-muted-foreground">🖼️ Image: {block.content || 'No URL'}</p>;
    case 'video':
      return <p className="text-sm text-muted-foreground">🎥 Video: {block.content || 'No URL'}</p>;
    case 'question':
      return <p className="text-sm">{block.content || 'Empty question'}</p>;
    case 'file':
      return <p className="text-sm text-muted-foreground">📎 File: {block.content || 'No URL'}</p>;
    case 'divider':
      return <hr className="my-2" />;
    default:
      return <p className="text-sm text-muted-foreground">Unknown block type</p>;
  }
}
