'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { lessonService } from '@/services/lesson-service';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { toast } from 'sonner';
import type { Lesson, ContentBlock } from '@/types/lesson';
import {
  getStructuredLessonBlockHeading,
  getStructuredLessonBlockHtml,
  getStructuredLessonQuestionModel,
  normalizeStructuredLessonBlock,
} from '@/features/lesson-blocks/structured-content';

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
      setBlocks(
        lessonRes.data?.contentBlocks
          ?.sort((a, b) => a.order - b.order)
          .map((block) => normalizeStructuredLessonBlock(block)) || [],
      );
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

      <div className="mx-auto max-w-4xl space-y-6 px-4 pb-10 pt-4">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--student-outline)] bg-[linear-gradient(135deg,var(--student-elevated),white)] p-6 shadow-sm">
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
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge className="student-badge">{isCompleted ? 'Completed' : 'In progress'}</Badge>
            <Badge variant="outline" className="border-[var(--student-outline)] bg-white/70 text-[var(--student-text-muted)]">
              {blocks.length} sections
            </Badge>
          </div>
        </section>

        {blocks.some((block) => Boolean(getStructuredLessonBlockHeading(block))) ? (
          <Card className="student-card">
            <CardContent className="p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                Lesson outline
              </p>
              <div className="flex flex-wrap gap-2">
                {blocks
                  .map((block) => ({ id: block.id, heading: getStructuredLessonBlockHeading(block) }))
                  .filter((entry) => entry.heading)
                  .map((entry) => (
                    <a
                      key={entry.id}
                      href={`#lesson-block-${entry.id}`}
                      className="rounded-full border border-[var(--student-outline)] bg-white px-3 py-1 text-sm text-[var(--student-text-strong)] transition hover:border-[var(--student-accent)] hover:text-[var(--student-accent)]"
                    >
                      {entry.heading}
                    </a>
                  ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="space-y-5">
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
  const heading = getStructuredLessonBlockHeading(block);
  switch (block.type) {
    case 'text': {
      const html = getStructuredLessonBlockHtml(block);
      const variant = typeof block.metadata?.variant === 'string' ? block.metadata.variant : 'body';
      const surfaceClass =
        variant === 'objectives'
          ? 'border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]'
          : variant === 'key_points'
            ? 'border-[var(--student-success-border)] bg-[var(--student-success-bg)]'
            : variant === 'example'
              ? 'border-amber-200 bg-amber-50'
              : variant === 'recap'
                ? 'border-sky-200 bg-sky-50'
                : variant === 'reflection'
                  ? 'border-fuchsia-200 bg-fuchsia-50'
                  : 'border-[var(--student-outline)] bg-white';
      return (
        <Card id={`lesson-block-${block.id}`} className={`student-card ${surfaceClass}`}>
          <CardContent className="space-y-3 p-5">
            {heading ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                  {heading}
                </p>
              </div>
            ) : null}
            <div className="prose max-w-none leading-relaxed text-[var(--student-text-strong)] [&_a]:text-[var(--student-accent)]">
              <RichTextRenderer html={html} />
            </div>
          </CardContent>
        </Card>
      );
    }
    case 'image': {
      const src = getBlockUrlValue(block.content) || (block.metadata as Record<string, string>)?.url;
      const caption = (block.metadata as Record<string, string>)?.caption;
      return (
        <figure id={`lesson-block-${block.id}`}>
          {src && (
            <Image
              src={src}
              alt={caption || 'Lesson image'}
              width={1200}
              height={675}
              unoptimized
              className="h-auto w-full rounded-lg"
            />
          )}
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
        <div id={`lesson-block-${block.id}`} className="aspect-video overflow-hidden rounded-lg">
          <iframe
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }
    case 'question': {
      const model = getStructuredLessonQuestionModel(block);
      return (
        <Card id={`lesson-block-${block.id}`} className="student-card border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="student-badge">Checkpoint</Badge>
              {model.points > 0 ? (
                <Badge variant="outline" className="border-[var(--student-outline)] bg-white/70 text-[var(--student-text-muted)]">
                  {model.points} pts
                </Badge>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-base font-semibold text-[var(--student-text-strong)]">
              {model.prompt}
            </p>
            {model.choices.length > 0 ? (
              <div className="space-y-2">
                {model.choices.map((choice) => (
                  <div
                    key={choice}
                    className="rounded-2xl border border-[var(--student-outline)] bg-white/80 px-4 py-3 text-sm text-[var(--student-text-strong)]"
                  >
                    {choice}
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--student-outline)] bg-white/60 px-4 py-3 text-sm text-[var(--student-text-muted)]">
                Answer in your own words.
              </div>
            )}
            {model.explanation ? (
              <div className="rounded-2xl border border-[var(--student-outline)] bg-white/60 px-4 py-3 text-sm text-[var(--student-text-muted)]">
                {model.explanation}
              </div>
            ) : null}
          </CardContent>
        </Card>
      );
    }
    case 'file': {
      const fileName = (block.metadata as Record<string, string>)?.fileName || getBlockTextValue(block.content) || 'File';
      const fileUrl = (block.metadata as Record<string, string>)?.url;
      return (
        <Card id={`lesson-block-${block.id}`} className="student-card">
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
      return <hr id={`lesson-block-${block.id}`} className="my-6 border-[var(--student-outline)]" />;
    default:
      return (
        <Card id={`lesson-block-${block.id}`} className="student-card">
          <CardContent className="p-4 text-[var(--student-text-muted)]">
            Unsupported content type: {block.type}
          </CardContent>
        </Card>
      );
  }
}
