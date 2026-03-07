'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { lessonService } from '@/services/lesson-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Lesson, ContentBlock } from '@/types/lesson';

function getBlockTextValue(content: ContentBlock['content']): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const maybeText = content.text;
    if (typeof maybeText === 'string') return maybeText;
    return '';
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

export default function StudentLessonViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = params.id as string;
  const classId = searchParams.get('classId');

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [lessonRes, statusRes] = await Promise.all([
        lessonService.getById(lessonId),
        lessonService.getCompletionStatus(lessonId).catch(() => ({ data: { completed: false } })),
      ]);
      setLesson(lessonRes.data);
      setBlocks(lessonRes.data?.contentBlocks?.sort((a, b) => a.order - b.order) || []);
      setIsCompleted(statusRes.data?.completed ?? false);
    } catch {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Scroll progress tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleComplete = async () => {
    try {
      setCompleting(true);
      await lessonService.complete(lessonId);
      setIsCompleted(true);
      toast.success('Lesson marked as complete!');
    } catch {
      toast.error('Failed to mark lesson as complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lesson) {
    return <p className="text-muted-foreground">Lesson not found.</p>;
  }

  return (
    <div className="relative">
      {/* Reading progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-gray-200 z-50">
        <div className="h-full bg-red-500 transition-all" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <Button variant="ghost" size="sm" onClick={() => router.back()} className="mb-2">
            ← Back
          </Button>
          <h1 className="text-2xl font-bold">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-1 text-muted-foreground">{lesson.description}</p>
          )}
        </div>

        {/* Content blocks */}
        <div className="space-y-6">
          {blocks.map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>

        {blocks.length === 0 && (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No content available for this lesson.
            </CardContent>
          </Card>
        )}

        {/* Completion & Navigation */}
        <div className="sticky bottom-0 bg-white border-t py-4 flex items-center justify-between">
          <Button
            onClick={handleComplete}
            disabled={isCompleted || completing}
            variant={isCompleted ? 'secondary' : 'default'}
            className={isCompleted ? 'bg-green-100 text-green-700' : ''}
          >
            {isCompleted ? '✓ Completed' : completing ? 'Marking...' : 'Mark Complete'}
          </Button>
          <Button variant="outline" onClick={() => router.back()}>
            Back to Class
          </Button>
        </div>
      </div>
    </div>
  );
}

function ContentBlockRenderer({ block }: { block: ContentBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <div className="prose max-w-none leading-relaxed" dangerouslySetInnerHTML={{ __html: getBlockTextValue(block.content) || '' }} />
      );
    case 'image': {
      const src = getBlockUrlValue(block.content) || (block.metadata as Record<string, string>)?.url;
      const caption = (block.metadata as Record<string, string>)?.caption;
      return (
        <figure>
          {src && <img src={src} alt={caption || 'Lesson image'} className="rounded-lg w-full" />}
          {caption && <figcaption className="text-center text-sm text-muted-foreground mt-2">{caption}</figcaption>}
        </figure>
      );
    }
    case 'video': {
      const url = getBlockUrlValue(block.content) || (block.metadata as Record<string, string>)?.url;
      if (!url) return null;
      const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
      const embedUrl = isYouTube
        ? url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')
        : url;
      return (
        <div className="aspect-video rounded-lg overflow-hidden">
          <iframe src={embedUrl} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />
        </div>
      );
    }
    case 'question':
      return (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <Badge variant="secondary" className="mb-2">Quiz Question</Badge>
            <p className="font-medium whitespace-pre-wrap">{getBlockTextValue(block.content)}</p>
          </CardContent>
        </Card>
      );
    case 'file': {
      const fileName = (block.metadata as Record<string, string>)?.fileName || getBlockTextValue(block.content) || 'File';
      const fileUrl = (block.metadata as Record<string, string>)?.url;
      return (
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="text-2xl">📎</span>
            <div>
              <p className="font-medium">{fileName}</p>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">
                  Download
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    case 'divider':
      return <hr className="my-6 border-gray-200" />;
    default:
      return (
        <Card>
          <CardContent className="p-4 text-muted-foreground">
            Unsupported content type: {block.type}
          </CardContent>
        </Card>
      );
  }
}
