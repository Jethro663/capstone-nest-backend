'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LESSON_COMPLETE_WAIT_SECONDS,
  StudentLessonReaderPanel,
} from '@/components/student/lesson/StudentLessonReaderPanel';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { moduleService } from '@/services/module-service';
import type { ClassItem } from '@/types/class';
import type { ContentBlock, Lesson } from '@/types/lesson';
import type { ClassModule, ModuleItem } from '@/types/module';
import { getLessonCheckpointGate, normalizeStructuredLessonBlock } from '@/features/lesson-blocks/structured-content';
import {
  type LessonCheckpointResults,
  type LessonCheckpointSelections,
} from '@/features/lesson-blocks/LessonBlockStudentRenderer';
import '../../classes/[id]/modules/[moduleId]/student-module-detail.css';

type LessonLoadStatus = 'loading' | 'ready' | 'not-found' | 'error';

function resolveModuleContext(modules: ClassModule[], lessonId: string) {
  for (const classModule of modules) {
    for (const section of classModule.sections) {
      const lessonItem = section.items.find(
        (item) => item.itemType === 'lesson' && item.lessonId === lessonId,
      );
      if (!lessonItem) continue;

      return {
        module: classModule,
        lessonItem,
        attachments: section.items.filter((item) => item.itemType === 'file' && item.fileId),
      };
    }
  }

  return {
    module: null,
    lessonItem: null,
    attachments: [] as ModuleItem[],
  };
}

function resolveReturnToPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith('/dashboard/student/')) return null;
  return value;
}

export default function StudentLessonViewPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const lessonId = params.id as string;
  const queryClassId = searchParams.get('classId');
  const queryModuleId = searchParams.get('moduleId');
  const returnTo = resolveReturnToPath(searchParams.get('returnTo'));

  const [loadStatus, setLoadStatus] = useState<LessonLoadStatus>('loading');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isCompleted, setIsCompleted] = useState(false);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [lessonModule, setLessonModule] = useState<ClassModule | null>(null);
  const [lessonItem, setLessonItem] = useState<ModuleItem | null>(null);
  const [lessonAttachments, setLessonAttachments] = useState<ModuleItem[]>([]);
  const [completing, setCompleting] = useState(false);
  const [bottomReachedAt, setBottomReachedAt] = useState<number | null>(null);
  const [countdownLeft, setCountdownLeft] = useState(LESSON_COMPLETE_WAIT_SECONDS);
  const [checkpointSelections, setCheckpointSelections] = useState<LessonCheckpointSelections>({});
  const [checkpointResults, setCheckpointResults] = useState<LessonCheckpointResults>({});

  const checkpointGate = getLessonCheckpointGate(blocks, checkpointResults);

  useEffect(() => {
    if (queryClassId && queryModuleId) {
      router.replace(
        `/dashboard/student/classes/${queryClassId}/modules/${queryModuleId}?lessonId=${lessonId}`,
      );
    }
  }, [lessonId, queryClassId, queryModuleId, router]);

  const fetchModuleContext = useCallback(async (classId: string, targetLessonId: string) => {
    const [classResponse, modulesResponse] = await Promise.all([
      classService.getById(classId),
      moduleService.getByClass(classId),
    ]);
    const resolved = resolveModuleContext(modulesResponse.data || [], targetLessonId);
    setClassItem(classResponse.data);
    setLessonModule(resolved.module);
    setLessonItem(resolved.lessonItem);
    setLessonAttachments(resolved.attachments);
  }, []);

  const fetchData = useCallback(async () => {
    if (!lessonId || (queryClassId && queryModuleId)) return;

    try {
      setLoadStatus('loading');
      const [lessonRes, statusRes] = await Promise.all([
        lessonService.getById(lessonId),
        lessonService.getCompletionStatus(lessonId).catch(() => ({ data: { completed: false } })),
      ]);

      const lessonData = lessonRes.data;
      if (!lessonData) {
        setLesson(null);
        setBlocks([]);
        setLoadStatus('not-found');
        return;
      }
      setLesson(lessonData);
      setBlocks(
        [...(lessonData.contentBlocks || [])]
          .sort((left, right) => left.order - right.order)
          .map((block) => normalizeStructuredLessonBlock(block)),
      );
      setIsCompleted(statusRes.data?.completed ?? false);
      setBottomReachedAt(null);
      setCountdownLeft(LESSON_COMPLETE_WAIT_SECONDS);
      setCheckpointSelections({});
      setCheckpointResults({});

      try {
        await fetchModuleContext(lessonData.classId, lessonData.id);
      } catch {
        setClassItem(null);
        setLessonModule(null);
        setLessonItem(null);
        setLessonAttachments([]);
      }
      setLoadStatus('ready');
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status ?? null;
      setLesson(null);
      setBlocks([]);
      setClassItem(null);
      setLessonModule(null);
      setLessonItem(null);
      setLessonAttachments([]);
      setLoadStatus(status === 404 ? 'not-found' : 'error');
    }
  }, [fetchModuleContext, lessonId, queryClassId, queryModuleId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (loadStatus !== 'ready' || isCompleted || !checkpointGate.ready) {
      setBottomReachedAt(null);
      return undefined;
    }

    const onScroll = () => {
      const viewportBottom = window.scrollY + window.innerHeight;
      const docBottom = document.documentElement.scrollHeight;
      if (docBottom - viewportBottom <= 16 && bottomReachedAt === null) {
        setBottomReachedAt(Date.now());
      }
    };

    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [bottomReachedAt, checkpointGate.ready, isCompleted, loadStatus]);

  useEffect(() => {
    if (bottomReachedAt === null || isCompleted || !checkpointGate.ready) {
      setCountdownLeft(LESSON_COMPLETE_WAIT_SECONDS);
      return;
    }

    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - bottomReachedAt) / 1000);
      const remaining = Math.max(0, LESSON_COMPLETE_WAIT_SECONDS - elapsed);
      setCountdownLeft(remaining);
    }, 250);

    return () => window.clearInterval(timer);
  }, [bottomReachedAt, checkpointGate.ready, isCompleted]);

  const refreshModuleContext = useCallback(async () => {
    if (!lesson?.classId) return;
    try {
      await fetchModuleContext(lesson.classId, lesson.id);
    } catch {
      // Keep the lesson open even if module context refresh fails after completion.
    }
  }, [fetchModuleContext, lesson]);

  const handleComplete = useCallback(async () => {
    if (!lessonId || completing || isCompleted) return;

    try {
      setCompleting(true);
      const response = await lessonService.complete(lessonId);
      setIsCompleted(Boolean(response.data?.completed));
      if (typeof response.data?.lessonPoints === 'number' && response.data.lessonPoints > 0) {
        toast.success(`Lesson completed. +${response.data.lessonPoints} pts`);
      } else {
        toast.success('Lesson marked as complete.');
      }
      await refreshModuleContext();
    } catch {
      toast.error('Failed to mark lesson as complete');
    } finally {
      setCompleting(false);
    }
  }, [completing, isCompleted, lessonId, refreshModuleContext]);

  useEffect(() => {
    if (
      lesson &&
      checkpointGate.ready &&
      bottomReachedAt !== null &&
      countdownLeft === 0 &&
      !isCompleted &&
      !completing
    ) {
      void handleComplete();
    }
  }, [
    bottomReachedAt,
    checkpointGate.ready,
    countdownLeft,
    completing,
    handleComplete,
    isCompleted,
    lesson,
  ]);

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
      if (!isCorrect) {
        setBottomReachedAt(null);
      }
    },
    [],
  );

  const handleDownloadAttachment = useCallback(async (item: ModuleItem) => {
    if (!item.fileId) return;
    try {
      const blob = await moduleService.downloadAttachedFile(item.id);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = item.file?.originalName || 'attachment';
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Unable to download attachment.');
    }
  }, []);

  const handleBackToLessonSource = useCallback(() => {
    if (returnTo) {
      router.push(returnTo);
      return;
    }
    if (lesson?.classId && lessonModule?.id) {
      router.push(`/dashboard/student/classes/${lesson.classId}/modules/${lessonModule.id}`);
      return;
    }
    if (lesson?.classId) {
      router.push(`/dashboard/student/classes/${lesson.classId}?view=modules`);
      return;
    }
    router.back();
  }, [lesson, lessonModule?.id, returnTo, router]);

  const stateBackHref = returnTo || '/dashboard/student/courses';
  const stateBackLabel = returnTo ? 'Back to Path' : 'Back to Courses';

  if (loadStatus === 'loading') {
    return (
      <div className="student-module-view__loading" aria-label="Loading lesson">
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  if (loadStatus === 'error') {
    return (
      <DashboardStatePanel
        kind="error"
        title="Lesson couldn't be loaded"
        description="Try again to load this lesson."
        primaryAction={{ label: 'Try again', onClick: () => void fetchData() }}
        secondaryAction={{ label: stateBackLabel, href: stateBackHref }}
      />
    );
  }

  if (loadStatus === 'not-found' || !lesson) {
    return (
      <DashboardStatePanel
        kind="empty"
        title="Lesson not found"
        description="This lesson may have been removed or is no longer available."
        primaryAction={{ label: stateBackLabel, href: stateBackHref }}
      />
    );
  }

  return (
    <StudentLessonReaderPanel
      classItem={classItem}
      module={lessonModule}
      lesson={lesson}
      lessonBlocks={blocks}
      lessonLoading={false}
      lessonCompleted={isCompleted}
      completingLesson={completing}
      bottomReachedAt={bottomReachedAt}
      countdownLeft={countdownLeft}
      checkpointGate={checkpointGate}
      checkpointSelections={checkpointSelections}
      checkpointResults={checkpointResults}
      lessonAttachments={lessonAttachments}
      lessonPoints={lessonItem?.lessonPoints ?? 0}
      backHref={returnTo || `/dashboard/student/classes/${lesson.classId}?view=modules`}
      backLabel="Back"
      inlineBackLabel={returnTo ? 'Back to Path' : 'Back to Module'}
      onInlineBack={handleBackToLessonSource}
      onCompleteLesson={handleComplete}
      onCheckpointAnswer={handleCheckpointAnswer}
      onDownloadAttachment={handleDownloadAttachment}
    />
  );
}
