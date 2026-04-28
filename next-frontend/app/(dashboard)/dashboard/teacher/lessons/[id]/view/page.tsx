'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, BookOpenText, Compass, LockKeyhole } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import { lessonService } from '@/services/lesson-service';
import type { ContentBlock, Lesson } from '@/types/lesson';
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

export default function TeacherLessonViewPage() {
  const params = useParams();
  const router = useRouter();
  const lessonId = Array.isArray(params.id) ? params.id[0] : params.id;

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkpointSelections, setCheckpointSelections] =
    useState<LessonCheckpointSelections>({});
  const [checkpointResults, setCheckpointResults] =
    useState<LessonCheckpointResults>({});

  const fetchLesson = useCallback(async () => {
    if (!lessonId) return;
    try {
      setLoading(true);
      const response = await lessonService.getById(lessonId);
      const lessonData = response.data;
      setLesson(lessonData);
      setBlocks(
        (lessonData.contentBlocks || [])
          .slice()
          .sort((left, right) => left.order - right.order)
          .map((block) => normalizeStructuredLessonBlock(block)),
      );
      setCheckpointSelections({});
      setCheckpointResults({});
    } catch {
      toast.error('Failed to load lesson');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    void fetchLesson();
  }, [fetchLesson]);

  const checkpointGate = getLessonCheckpointGate(blocks, checkpointResults);

  const handleCheckpointAnswer = useCallback(
    (blockId: string, selectedChoiceIds: string[], isCorrect: boolean) => {
      setCheckpointSelections((current) => ({
        ...current,
        [blockId]: selectedChoiceIds,
      }));
      setCheckpointResults((current) => ({
        ...current,
        [blockId]: isCorrect,
      }));
    },
    [],
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-32 w-full rounded-[2rem]" />
        <Skeleton className="h-48 w-full rounded-[2rem]" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <p className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
          Lesson not found.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 pb-10 pt-4">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="mb-3 text-[#ef233c] hover:bg-rose-50 hover:text-[#b91c1c]"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Button>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="bg-slate-900 text-white">
            <LockKeyhole className="mr-1 h-3.5 w-3.5" />
            Teacher read-only
          </Badge>
          <Badge variant="outline">
            <BookOpenText className="mr-1 h-3.5 w-3.5" />
            {blocks.length} sections
          </Badge>
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950">
          {lesson.title}
        </h1>
        {lesson.description ? (
          <RichTextRenderer
            html={lesson.description}
            className="mt-3 text-slate-600"
          />
        ) : null}
      </section>

      {blocks.some((block) => Boolean(getStructuredLessonBlockHeading(block))) ? (
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              <Compass className="h-3.5 w-3.5" />
              Lesson outline
            </p>
            <div className="flex flex-wrap gap-2">
              {blocks
                .map((block) => ({
                  id: block.id,
                  heading: getStructuredLessonBlockHeading(block),
                }))
                .filter((entry) => entry.heading)
                .map((entry) => (
                  <a
                    key={entry.id}
                    href={`#lesson-block-${entry.id}`}
                    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm text-slate-700 transition hover:border-[#ef233c] hover:text-[#b91c1c]"
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
          <LessonBlockStudentRenderer
            key={block.id}
            block={block}
            checkpointSelections={checkpointSelections}
            checkpointResults={checkpointResults}
            onCheckpointAnswer={handleCheckpointAnswer}
          />
        ))}
      </div>

      {blocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500">
          No lesson content available.
        </div>
      ) : null}

      {checkpointGate.total > 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          Checkpoints answered: {checkpointGate.correct}/{checkpointGate.total}
        </div>
      ) : null}
    </div>
  );
}
