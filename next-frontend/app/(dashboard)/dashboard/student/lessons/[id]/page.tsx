'use client';

import { useEffect, useState, useCallback } from 'react';
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
  getLessonCheckpointGate,
  getStructuredLessonBlockHeading,
  normalizeStructuredLessonBlock,
} from '@/features/lesson-blocks/structured-content';
import {
  LessonBlockStudentRenderer,
  type LessonCheckpointResults,
  type LessonCheckpointSelections,
} from '@/features/lesson-blocks/LessonBlockStudentRenderer';
import './lesson-view.css';

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
  const [checkpointSelections, setCheckpointSelections] = useState<LessonCheckpointSelections>({});
  const [checkpointResults, setCheckpointResults] = useState<LessonCheckpointResults>({});

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
      setCheckpointSelections({});
      setCheckpointResults({});
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

  const checkpointGate = getLessonCheckpointGate(blocks, checkpointResults);

  const handleCheckpointAnswer = useCallback((
    blockId: string,
    selectedChoiceIds: string[],
    isCorrect: boolean,
  ) => {
    setCheckpointSelections((current) => ({
      ...current,
      [blockId]: selectedChoiceIds,
    }));
    setCheckpointResults((current) => ({
      ...current,
      [blockId]: isCorrect,
    }));
  }, []);

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
            <LessonBlockStudentRenderer
              key={block.id}
              block={block}
              checkpointSelections={checkpointSelections}
              checkpointResults={checkpointResults}
              onCheckpointAnswer={handleCheckpointAnswer}
            />
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
            disabled={isCompleted || completing || !checkpointGate.ready}
            className={
              isCompleted
                ? 'lxp-lesson-action lxp-lesson-action--done border border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]'
                : 'lxp-lesson-action lxp-lesson-action--primary student-button-solid'
            }
          >
            {isCompleted
              ? 'Completed'
              : completing
                ? 'Marking...'
                : checkpointGate.ready
                  ? 'Mark Complete'
                  : `Answer checkpoints ${checkpointGate.correct}/${checkpointGate.total}`}
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
