'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { lxpService } from '@/services/lxp-service';

function resolveParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
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
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" onClick={() => router.push(returnHref)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Learners Path
        </Button>
        <Badge variant={isCompleted ? 'secondary' : 'outline'}>
          {isCompleted ? 'Completed' : 'Generated review step'}
        </Badge>
      </header>

      <section className="rounded-3xl border border-[#d9e3f0] bg-white p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#7b8aa5]">
              AI-guided remedial lesson
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#102744]">
              {generatedLesson.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-[#5f6b84]">
              {generatedLesson.summary || 'Simplified review generated from the recommended class lesson evidence.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(generatedLesson.weakConcepts ?? []).map((concept) => (
              <Badge key={concept} variant="outline">
                {concept}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <article className="rounded-3xl border border-[#d9e3f0] bg-white p-6">
          <div className="mb-4 flex items-center gap-2 text-[#102744]">
            <Sparkles className="h-4 w-4" />
            <strong>Simplified review</strong>
          </div>
          <pre className="whitespace-pre-wrap font-sans text-sm leading-7 text-[#30415d]">
            {generatedLesson.lessonBody}
          </pre>
        </article>

        <aside className="space-y-4">
          <article className="rounded-3xl border border-[#d9e3f0] bg-white p-5">
            <h2 className="text-base font-semibold text-[#102744]">Grounded on class materials</h2>
            <div className="mt-3 space-y-2 text-sm text-[#5f6b84]">
              {sourceTitles.length === 0 ? (
                <p>No source lesson titles were attached to this draft.</p>
              ) : (
                sourceTitles.map((title) => (
                  <div key={title} className="rounded-lg bg-[#f8fbff] px-3 py-2">
                    {title}
                  </div>
                ))
              )}
            </div>
          </article>

          <article className="rounded-3xl border border-[#f0d7df] bg-[#fff7f9] p-5 text-sm font-medium text-[#6a4f5b]">
            This generated lesson is part of your Learners Path only. It supports remediation and does not create an official class-record grade.
          </article>

          <Button
            className="w-full bg-[#e70012] text-white hover:bg-[#c90010]"
            onClick={() => void handleComplete()}
            disabled={completing}
          >
            {isCompleted ? (
              <>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Back to Path
              </>
            ) : (
              `${completing ? 'Saving...' : 'Mark review complete'}`
            )}
          </Button>
        </aside>
      </section>
    </div>
  );
}
