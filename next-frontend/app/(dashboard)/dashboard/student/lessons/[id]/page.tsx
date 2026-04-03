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
  const moduleId = searchParams.get('moduleId');

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
    if (classId && moduleId) {
      router.replace(
        `/dashboard/student/classes/${classId}/modules/${moduleId}?lessonId=${lessonId}`,
      );
      return;
    }
  }, [classId, lessonId, moduleId, router]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

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
      const response = await lessonService.complete(lessonId);
      setIsCompleted(Boolean(response.data?.completed));
      toast.success('Lesson marked as complete!');
    } catch {
      toast.error('Failed to mark lesson as complete');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lesson) {
    return <p className="text-[var(--student-text-muted)]">Lesson not found.</p>;
  }

  return (
    <div className="relative">
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-[var(--student-progress-track)]">
        <div className="h-full student-progress-fill transition-all" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-2 text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
          >
            Back
          </Button>
          <h1 className="text-2xl font-bold text-[var(--student-text-strong)]">{lesson.title}</h1>
          {lesson.description && (
            <p className="mt-1 text-[var(--student-text-muted)]">{lesson.description}</p>
          )}
        </div>

        <div className="space-y-6">
          {blocks.map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>

        {blocks.length === 0 && (
          <Card className="student-card">
            <CardContent className="p-6 text-center text-[var(--student-text-muted)]">
              No content available for this lesson.
            </CardContent>
          </Card>
        )}

        <div className="sticky bottom-0 flex items-center justify-between border-t border-[var(--student-outline)] bg-[var(--student-elevated)] py-4">
          <Button
            onClick={handleComplete}
            disabled={isCompleted || completing}
            className={
              isCompleted
                ? 'border border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]'
                : 'student-button-solid'
            }
          >
            {isCompleted ? 'Completed' : completing ? 'Marking...' : 'Mark Complete'}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              if (classId) {
                router.push(`/dashboard/student/classes/${classId}`);
                return;
              }
              router.back();
            }}
            className="student-button-outline"
          >
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
        <div
          className="prose max-w-none leading-relaxed text-[var(--student-text-strong)] [&_a]:text-[var(--student-accent)]"
          dangerouslySetInnerHTML={{ __html: getBlockTextValue(block.content) || '' }}
        />
      );
    case 'image': {
      const src = getBlockUrlValue(block.content) || (block.metadata as Record<string, string>)?.url;
      const caption = (block.metadata as Record<string, string>)?.caption;
      return (
        <figure>
          {src && <img src={src} alt={caption || 'Lesson image'} className="w-full rounded-lg" />}
          {caption && <figcaption className="mt-2 text-center text-sm text-[var(--student-text-muted)]">{caption}</figcaption>}
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
        <div className="aspect-video overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
    case 'question':
      return (
        <Card className="student-card border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]">
          <CardContent className="p-4">
            <Badge className="student-badge mb-2">Quiz Question</Badge>
            <p className="whitespace-pre-wrap font-medium text-[var(--student-text-strong)]">
              {getBlockTextValue(block.content)}
            </p>
          </CardContent>
        </Card>
      );
    case 'file': {
      const fileName = (block.metadata as Record<string, string>)?.fileName || getBlockTextValue(block.content) || 'File';
      const fileUrl = (block.metadata as Record<string, string>)?.url;
      return (
        <Card className="student-card">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="text-2xl">File</span>
            <div>
              <p className="font-medium text-[var(--student-text-strong)]">{fileName}</p>
              {fileUrl && (
                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--student-accent)] hover:underline">
                  Download
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    case 'divider':
      return <hr className="my-6 border-[var(--student-outline)]" />;
    default:
      return (
        <Card className="student-card">
          <CardContent className="p-4 text-[var(--student-text-muted)]">
            Unsupported content type: {block.type}
          </CardContent>
        </Card>
      );
  }
}
