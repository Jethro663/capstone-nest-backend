'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, BookOpenText, Compass, Sparkles } from 'lucide-react';
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
import './lesson-view.css';

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
      <div className="lxp-lesson-loading mx-auto max-w-3xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!lesson) {
    return <p className="lxp-lesson-not-found text-[var(--student-text-muted)]">Lesson not found.</p>;
  }

  return (
    <div className="relative lxp-lesson-shell">
      <div className="lxp-lesson-progress-track fixed left-0 right-0 top-0 z-50 h-1 bg-[var(--student-progress-track)]">
        <div
          className="lxp-lesson-progress-fill h-full student-progress-fill transition-all"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="lxp-lesson-container mx-auto max-w-4xl space-y-6 px-4 pb-10 pt-4">
        <section className="lxp-lesson-hero overflow-hidden rounded-[2rem] border border-[var(--student-outline)] bg-[linear-gradient(135deg,var(--student-elevated),white)] p-6 shadow-sm">
          <div className="lxp-lesson-kicker">
            <Sparkles className="h-3.5 w-3.5" />
            LXP Lesson Mission
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="lxp-lesson-nav-button mb-2 text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
          <h1 className="lxp-lesson-title text-2xl font-bold text-[var(--student-text-strong)]">
            {lesson.title}
          </h1>
          {lesson.description && (
            <RichTextRenderer
              html={lesson.description}
              className="lxp-lesson-description mt-1 text-[var(--student-text-muted)]"
            />
          )}
          <div className="lxp-lesson-meta mt-4 flex flex-wrap items-center gap-2">
            <Badge className="student-badge lxp-lesson-badge">
              {isCompleted ? 'Completed' : 'In progress'}
            </Badge>
            <Badge
              variant="outline"
              className="lxp-lesson-badge lxp-lesson-badge--ghost border-[var(--student-outline)] bg-white/70 text-[var(--student-text-muted)]"
            >
              {blocks.length} sections
            </Badge>
            <Badge
              variant="outline"
              className="lxp-lesson-badge lxp-lesson-badge--ghost border-[var(--student-outline)] bg-white/70 text-[var(--student-text-muted)]"
            >
              <BookOpenText className="mr-1 h-3.5 w-3.5" />
              Stay curious
            </Badge>
          </div>
        </section>

        {blocks.some((block) => Boolean(getStructuredLessonBlockHeading(block))) ? (
          <Card className="student-card lxp-lesson-outline">
            <CardContent className="p-5">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                <Compass className="h-3.5 w-3.5" />
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
                      className="lxp-lesson-outline-link rounded-full border border-[var(--student-outline)] bg-white px-3 py-1 text-sm text-[var(--student-text-strong)] transition hover:border-[var(--student-accent)] hover:text-[var(--student-accent)]"
                    >
                      {entry.heading}
                    </a>
                  ))}
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="lxp-lesson-blocks space-y-5">
          {blocks.map((block) => (
            <ContentBlockRenderer key={block.id} block={block} />
          ))}
        </div>

        {blocks.length === 0 && (
          <Card className="student-card lxp-lesson-empty">
            <CardContent className="p-6 text-center text-[var(--student-text-muted)]">
              No content available for this lesson.
            </CardContent>
          </Card>
        )}

        <div className="lxp-lesson-footer sticky bottom-0 flex items-center justify-between border-t border-[var(--student-outline)] bg-[var(--student-elevated)] py-4">
          <Button
            onClick={handleComplete}
            disabled={isCompleted || completing}
            className={
              isCompleted
                ? 'lxp-lesson-action lxp-lesson-action--done border border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]'
                : 'lxp-lesson-action lxp-lesson-action--primary student-button-solid'
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
            className="lxp-lesson-action lxp-lesson-action--ghost student-button-outline"
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
          ? 'lxp-lesson-block--objectives'
          : variant === 'key_points'
            ? 'lxp-lesson-block--key-points'
            : variant === 'example'
              ? 'lxp-lesson-block--example'
              : variant === 'recap'
                ? 'lxp-lesson-block--recap'
                : variant === 'reflection'
                  ? 'lxp-lesson-block--reflection'
                  : 'lxp-lesson-block--body';
      return (
        <Card
          id={`lesson-block-${block.id}`}
          className={`student-card lxp-lesson-block lxp-lesson-block--text ${surfaceClass}`}
        >
          <CardContent className="space-y-3 p-5">
            {heading ? (
              <div>
                <p className="lxp-lesson-block-heading text-xs font-semibold uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                  {heading}
                </p>
              </div>
            ) : null}
            <div className="lxp-lesson-rich prose max-w-none leading-relaxed text-[var(--student-text-strong)] [&_a]:text-[var(--student-accent)]">
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
        <Card id={`lesson-block-${block.id}`} className="student-card lxp-lesson-block lxp-lesson-block--media">
          <CardContent className="p-4">
            <figure className="lxp-lesson-figure">
              {src && (
                <Image
                  src={src}
                  alt={caption || 'Lesson image'}
                  width={1200}
                  height={675}
                  unoptimized
                  className="h-auto w-full rounded-2xl"
                />
              )}
              {caption ? (
                <figcaption className="mt-3 text-center text-sm text-[var(--student-text-muted)]">
                  {caption}
                </figcaption>
              ) : null}
            </figure>
          </CardContent>
        </Card>
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
        <Card id={`lesson-block-${block.id}`} className="student-card lxp-lesson-block lxp-lesson-block--media">
          <CardContent className="p-4">
            <div className="lxp-lesson-video aspect-video overflow-hidden rounded-2xl">
              <iframe
                src={embedUrl}
                className="h-full w-full"
                allowFullScreen
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </CardContent>
        </Card>
      );
    }
    case 'question': {
      const model = getStructuredLessonQuestionModel(block);
      return (
        <Card
          id={`lesson-block-${block.id}`}
          className="student-card lxp-lesson-block lxp-lesson-block--question"
        >
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="student-badge lxp-lesson-badge">Checkpoint</Badge>
              {model.points > 0 ? (
                <Badge
                  variant="outline"
                  className="lxp-lesson-badge lxp-lesson-badge--ghost border-[var(--student-outline)] bg-white/70 text-[var(--student-text-muted)]"
                >
                  {model.points} pts
                </Badge>
              ) : null}
            </div>
            <RichTextRenderer
              className="lxp-lesson-question-prompt text-base font-semibold text-[var(--student-text-strong)]"
              html={model.prompt || '<p>Empty question prompt.</p>'}
            />
            {model.choices.length > 0 ? (
              <div className="space-y-2.5">
                {model.choices.map((choice) => (
                  <div
                    key={choice}
                    className="lxp-lesson-choice rounded-2xl border border-[var(--student-outline)] bg-white/80 px-4 py-3 text-sm text-[var(--student-text-strong)]"
                  >
                    {choice}
                  </div>
                ))}
              </div>
            ) : (
              <div className="lxp-lesson-choice lxp-lesson-choice--fallback rounded-2xl border border-dashed border-[var(--student-outline)] bg-white/60 px-4 py-3 text-sm text-[var(--student-text-muted)]">
                Answer in your own words.
              </div>
            )}
            {model.explanation ? (
              <div className="lxp-lesson-explanation rounded-2xl border border-[var(--student-outline)] bg-white/60 px-4 py-3 text-sm text-[var(--student-text-muted)]">
                <RichTextRenderer html={model.explanation} />
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
        <Card id={`lesson-block-${block.id}`} className="student-card lxp-lesson-block lxp-lesson-block--file">
          <CardContent className="flex items-center gap-3 p-4">
            <span className="lxp-lesson-file-icon text-2xl">File</span>
            <div>
              <p className="font-medium text-[var(--student-text-strong)]">{fileName}</p>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="lxp-lesson-file-link text-sm text-[var(--student-accent)] hover:underline"
                >
                  Download
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }
    case 'divider':
      return <hr id={`lesson-block-${block.id}`} className="lxp-lesson-divider my-6 border-[var(--student-outline)]" />;
    default:
      return (
        <Card id={`lesson-block-${block.id}`} className="student-card lxp-lesson-block">
          <CardContent className="p-4 text-[var(--student-text-muted)]">
            Unsupported content type: {block.type}
          </CardContent>
        </Card>
      );
  }
}
