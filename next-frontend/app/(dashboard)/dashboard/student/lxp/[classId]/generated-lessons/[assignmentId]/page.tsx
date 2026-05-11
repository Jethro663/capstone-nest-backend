'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LessonBlockStudentRenderer } from '@/features/lesson-blocks/LessonBlockStudentRenderer';
import { lxpService } from '@/services/lxp-service';
import type { ContentBlock } from '@/types/lesson';
import type { GeneratedLessonContent } from '@/types/lxp';

function resolveParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

function closeList(activeList: 'ul' | 'ol' | null, parts: string[]) {
  if (activeList) {
    parts.push(`</${activeList}>`);
  }
  return null;
}

function lessonBodyToHtml(value: string) {
  const lines = value.replace(/\r\n/g, '\n').split('\n');
  const parts: string[] = [];
  let activeList: 'ul' | 'ol' | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      activeList = closeList(activeList, parts);
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      activeList = closeList(activeList, parts);
      const level = Math.min(headingMatch[1].length, 4);
      parts.push(`<h${level}>${formatInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      if (activeList !== 'ul') {
        activeList = closeList(activeList, parts);
        activeList = 'ul';
        parts.push('<ul>');
      }
      parts.push(`<li>${formatInlineMarkdown(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      if (activeList !== 'ol') {
        activeList = closeList(activeList, parts);
        activeList = 'ol';
        parts.push('<ol>');
      }
      parts.push(`<li>${formatInlineMarkdown(orderedMatch[1])}</li>`);
      continue;
    }

    activeList = closeList(activeList, parts);
    parts.push(`<p>${formatInlineMarkdown(line)}</p>`);
  }

  closeList(activeList, parts);
  return parts.join('');
}

function generatedLessonToBlocks(lesson: GeneratedLessonContent): ContentBlock[] {
  const blocks: ContentBlock[] = [];
  if (lesson.summary?.trim()) {
    blocks.push({
      id: `${lesson.id}-summary`,
      lessonId: lesson.id,
      type: 'text',
      order: 1,
      metadata: { variant: 'recap' },
      content: {
        heading: 'Before you start',
        takeawayHtml: `<p>${formatInlineMarkdown(lesson.summary)}</p>`,
      },
    });
  }

  blocks.push({
    id: `${lesson.id}-body`,
    lessonId: lesson.id,
    type: 'text',
    order: 2,
    metadata: { variant: 'body' },
    content: {
      heading: '',
      html: lessonBodyToHtml(lesson.lessonBody || '<p>No remedial lesson content was generated.</p>'),
    },
  });

  return blocks;
}

export default function StudentGeneratedLessonPage() {
  const params = useParams();
  const router = useRouter();
  const classId = resolveParam(params.classId);
  const assignmentId = resolveParam(params.assignmentId);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lessonPayload, setLessonPayload] = useState<Awaited<
    ReturnType<typeof lxpService.getGeneratedLesson>
  >['data'] | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  const returnHref = `/dashboard/student/lxp/${encodeURIComponent(classId)}`;

  const fetchData = useCallback(async () => {
    if (!classId || !assignmentId) return;
    try {
      setLoading(true);
      setError(null);
      const [lessonRes, playlistRes] = await Promise.all([
        lxpService.getGeneratedLesson(classId, assignmentId),
        lxpService.getPlaylist(classId),
      ]);
      setLessonPayload(lessonRes.data);
      const checkpoint = playlistRes.data.checkpoints.find((item) => item.id === assignmentId);
      setIsCompleted(Boolean(checkpoint?.isCompleted));
    } catch (err) {
      console.error('Failed to load generated remedial lesson', err);
      setError('The generated remedial lesson could not be loaded right now.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId, classId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const generatedLesson = lessonPayload?.generatedLesson;
  const generatedLessonBlocks = useMemo(
    () => (generatedLesson ? generatedLessonToBlocks(generatedLesson) : []),
    [generatedLesson],
  );
  const sourceTitles = useMemo(
    () =>
      (generatedLesson?.sourceReferences ?? [])
        .map((entry) => {
          if (entry && typeof entry === 'object' && 'title' in entry && typeof entry.title === 'string') {
            return entry.title;
          }
          return null;
        })
        .filter((entry): entry is string => Boolean(entry)),
    [generatedLesson?.sourceReferences],
  );

  const handleComplete = async () => {
    if (isCompleted) {
      router.push(returnHref);
      return;
    }
    try {
      setCompleting(true);
      await lxpService.completeCheckpoint(classId, assignmentId);
      router.push(returnHref);
    } catch (err) {
      console.error('Failed to complete generated lesson checkpoint', err);
      setError('This remedial lesson could not be marked complete right now.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  if (error || !generatedLesson) {
    return (
      <section className="teacher-class-workspace__not-found">
        <p>{error || 'Generated remedial lesson not found.'}</p>
        <Link href={returnHref}>Back to Learners Path</Link>
      </section>
    );
  }

  return (
    <div className="student-module-view">
      <header className="student-module-view__hero">
        <button
          type="button"
          className="student-module-view__back"
          onClick={() => router.push(returnHref)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learners Path
        </button>

        <div className="student-module-view__hero-row">
          <span className="student-module-view__pill">LXP</span>
          <div className="student-module-view__hero-copy">
            <h1>
              {generatedLesson.title}
            </h1>
            <p>
              {generatedLesson.summary || 'Simplified review generated from the recommended class lesson evidence.'}
            </p>
            <div className="student-module-view__meta">
              <span>
                <Sparkles className="h-3.5 w-3.5" />
                AI-guided review
              </span>
              <span>{isCompleted ? 'Completed' : 'Remedial step'}</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(generatedLesson.weakConcepts ?? []).map((concept) => (
              <Badge key={concept} variant="outline">
                {concept}
              </Badge>
            ))}
          </div>
        </div>
      </header>

      <section className="student-module-view__body">
        <div className="student-module-view__lesson">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(returnHref)}
            className="student-module-view__back-inline w-fit text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
          >
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Learners Path
          </Button>

          <article className="student-module-view__reader">
            <div className="space-y-6">
              {generatedLessonBlocks.map((block) => (
                <LessonBlockStudentRenderer key={block.id} block={block} />
              ))}
            </div>
          </article>

          {sourceTitles.length > 0 ? (
            <article className="student-module-view__attachments">
              <h2 className="text-lg font-semibold text-[var(--student-text-strong)]">Grounded on class materials</h2>
              {sourceTitles.map((title) => (
                <div key={title} className="student-module-view__attachment-row">
                  <div>
                    <p className="font-medium text-[var(--student-text-strong)]">{title}</p>
                    <p className="text-xs text-[var(--student-text-muted)]">Source lesson reference</p>
                  </div>
                </div>
              ))}
            </article>
          ) : null}

          <footer className="student-module-view__lesson-footer">
            <div className="student-module-view__lesson-progress">
              <p>
                This generated lesson supports Learners Path remediation only and does not create an official class-record grade.
              </p>
            </div>
            <Button
              className="student-button-solid student-module-view__complete-button"
              onClick={() => void handleComplete()}
              disabled={completing}
            >
              {isCompleted ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Back to Path
                </>
              ) : (
                `${completing ? 'Saving...' : 'Mark Complete'}`
              )}
            </Button>
          </footer>
        </div>
      </section>
    </div>
  );
}
