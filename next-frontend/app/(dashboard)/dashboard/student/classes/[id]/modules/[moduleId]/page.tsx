'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  ClipboardCheck,
  FileText,
  Lock,
  ScrollText,
} from 'lucide-react';
import { toast } from 'sonner';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { fileService } from '@/services/file-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getTeacherName } from '@/utils/helpers';
import {
  getStudentAssessmentAvailability,
  mapAssessmentStartError,
} from '@/utils/student-assessment-availability';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { ContentBlock, Lesson } from '@/types/lesson';
import type { ClassModule, ModuleItem } from '@/types/module';
import './student-module-detail.css';

const LESSON_COMPLETE_WAIT_SECONDS = 30;

function toParamValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || '';
  return value || '';
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatClassLine(classItem: ClassItem | null) {
  const gradeLevel = classItem?.section?.gradeLevel || classItem?.subjectGradeLevel || '--';
  const sectionName = classItem?.section?.name || 'Section';
  const teacherName = getTeacherName(classItem?.teacher);
  return `Grade ${gradeLevel} - ${sectionName} - ${teacherName}`;
}

function getSubmittedAttempts(attempts: AssessmentAttempt[]) {
  return attempts.filter((attempt) => attempt.isSubmitted);
}

function getBlockTextValue(content: ContentBlock['content']): string {
  if (typeof content === 'string') return content;
  if (content && typeof content === 'object') {
    const maybeText = content.text;
    if (typeof maybeText === 'string') return maybeText;
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
      const src =
        getBlockUrlValue(block.content) ||
        (block.metadata as Record<string, string>)?.url;
      const caption = (block.metadata as Record<string, string>)?.caption;
      return (
        <figure>
          {src ? <img src={src} alt={caption || 'Lesson image'} className="w-full rounded-lg" /> : null}
          {caption ? (
            <figcaption className="mt-2 text-center text-sm text-[var(--student-text-muted)]">
              {caption}
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case 'video': {
      const url =
        getBlockUrlValue(block.content) ||
        (block.metadata as Record<string, string>)?.url;
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
        <div className="rounded-2xl border border-[var(--student-accent-soft-strong)] bg-[var(--student-accent-soft)] p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--student-accent)]">
            Quiz Question
          </p>
          <p className="whitespace-pre-wrap font-medium text-[var(--student-text-strong)]">
            {getBlockTextValue(block.content)}
          </p>
        </div>
      );
    case 'file': {
      const fileName =
        (block.metadata as Record<string, string>)?.fileName ||
        getBlockTextValue(block.content) ||
        'Attachment';
      const fileUrl = (block.metadata as Record<string, string>)?.url;
      return (
        <div className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4">
          <p className="font-semibold text-[var(--student-text-strong)]">{fileName}</p>
          {fileUrl ? (
            <a
              href={fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm text-[var(--student-accent)] hover:underline"
            >
              Download
            </a>
          ) : null}
        </div>
      );
    }
    case 'divider':
      return <hr className="my-6 border-[var(--student-outline)]" />;
    default:
      return (
        <div className="rounded-2xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4 text-[var(--student-text-muted)]">
          Unsupported content type: {block.type}
        </div>
      );
  }
}

export default function StudentModuleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const classId = toParamValue(params.id);
  const moduleId = toParamValue(params.moduleId);
  const selectedLessonId = searchParams.get('lessonId');
  const selectedAssessmentId = searchParams.get('assessmentId');

  const [loading, setLoading] = useState(true);
  const [classItem, setClassItem] = useState<ClassItem | null>(null);
  const [module, setModule] = useState<ClassModule | null>(null);

  const [lessonLoading, setLessonLoading] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [lessonBlocks, setLessonBlocks] = useState<ContentBlock[]>([]);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [completingLesson, setCompletingLesson] = useState(false);
  const [bottomReachedAt, setBottomReachedAt] = useState<number | null>(null);
  const [countdownLeft, setCountdownLeft] = useState(LESSON_COMPLETE_WAIT_SECONDS);

  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [assessmentAttempts, setAssessmentAttempts] = useState<AssessmentAttempt[]>([]);
  const [startingAttempt, setStartingAttempt] = useState(false);

  const flatItems = useMemo(
    () => module?.sections.flatMap((section) => section.items) ?? [],
    [module],
  );

  const selectedLessonItem = useMemo(
    () =>
      flatItems.find(
        (item) => item.itemType === 'lesson' && item.lessonId === selectedLessonId,
      ) ?? null,
    [flatItems, selectedLessonId],
  );

  const selectedAssessmentItem = useMemo(
    () =>
      flatItems.find(
        (item) =>
          item.itemType === 'assessment' && item.assessmentId === selectedAssessmentId,
      ) ?? null,
    [flatItems, selectedAssessmentId],
  );

  const lessonAttachments = useMemo(() => {
    if (!module || !selectedLessonItem) return [];
    const section = module.sections.find((entry) =>
      entry.items.some((item) => item.id === selectedLessonItem.id),
    );
    if (!section) return [];
    return section.items.filter((item) => item.itemType === 'file' && item.fileId);
  }, [module, selectedLessonItem]);

  const submittedAttempts = useMemo(
    () => getSubmittedAttempts(assessmentAttempts),
    [assessmentAttempts],
  );
  const assessmentAvailability = useMemo(
    () =>
      getStudentAssessmentAvailability({
        assessment,
        item: selectedAssessmentItem,
        submittedAttemptCount: submittedAttempts.length,
      }),
    [assessment, selectedAssessmentItem, submittedAttempts.length],
  );

  const currentMode = selectedLessonId
    ? 'lesson'
    : selectedAssessmentId
      ? 'assessment'
      : 'overview';

  const refreshModule = useCallback(async () => {
    if (!classId || !moduleId) return;
    const moduleResponse = await moduleService.getByClassAndModule(classId, moduleId);
    setModule(moduleResponse.data);
  }, [classId, moduleId]);

  const fetchBase = useCallback(async () => {
    if (!classId || !moduleId) {
      setClassItem(null);
      setModule(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const [classResponse, moduleResponse] = await Promise.all([
        classService.getById(classId),
        moduleService.getByClassAndModule(classId, moduleId),
      ]);
      setClassItem(classResponse.data);
      setModule(moduleResponse.data);
    } catch {
      setClassItem(null);
      setModule(null);
    } finally {
      setLoading(false);
    }
  }, [classId, moduleId]);

  useEffect(() => {
    void fetchBase();
  }, [fetchBase]);

  useEffect(() => {
    if (!selectedLessonId) {
      setLesson(null);
      setLessonBlocks([]);
      setLessonCompleted(false);
      setBottomReachedAt(null);
      setCountdownLeft(LESSON_COMPLETE_WAIT_SECONDS);
      return;
    }
    if (!selectedLessonItem?.lessonId) {
      router.replace(`/dashboard/student/classes/${classId}/modules/${moduleId}`);
      return;
    }

    const run = async () => {
      try {
        setLessonLoading(true);
        const [lessonResponse, completionStatus] = await Promise.all([
          lessonService.getById(selectedLessonItem.lessonId as string),
          lessonService
            .getCompletionStatus(selectedLessonItem.lessonId as string)
            .catch(() => ({ data: { completed: false } })),
        ]);
        const lessonData = lessonResponse.data;
        setLesson(lessonData);
        setLessonBlocks(
          [...(lessonData.contentBlocks || [])].sort((left, right) => left.order - right.order),
        );
        setLessonCompleted(Boolean(completionStatus.data?.completed));
        setBottomReachedAt(null);
        setCountdownLeft(LESSON_COMPLETE_WAIT_SECONDS);
      } catch {
        toast.error('Failed to load lesson content.');
      } finally {
        setLessonLoading(false);
      }
    };

    void run();
  }, [classId, moduleId, router, selectedLessonId, selectedLessonItem?.lessonId]);

  useEffect(() => {
    if (!selectedAssessmentId) {
      setAssessment(null);
      setAssessmentAttempts([]);
      return;
    }
    if (!selectedAssessmentItem?.assessmentId) {
      router.replace(`/dashboard/student/classes/${classId}/modules/${moduleId}`);
      return;
    }
    const run = async () => {
      try {
        setAssessmentLoading(true);
        const [assessmentResponse, attemptsResponse] = await Promise.all([
          assessmentService.getById(selectedAssessmentItem.assessmentId as string),
          assessmentService.getStudentAttempts(selectedAssessmentItem.assessmentId as string),
        ]);
        setAssessment(assessmentResponse.data);
        setAssessmentAttempts(attemptsResponse.data || []);
      } catch {
        toast.error('Failed to load assessment state.');
      } finally {
        setAssessmentLoading(false);
      }
    };
    void run();
  }, [classId, moduleId, router, selectedAssessmentId, selectedAssessmentItem?.assessmentId]);

  useEffect(() => {
    if (currentMode !== 'lesson' || lessonCompleted) return undefined;
    const onScroll = () => {
      const viewportBottom = window.scrollY + window.innerHeight;
      const docBottom = document.documentElement.scrollHeight;
      if (docBottom - viewportBottom <= 16 && bottomReachedAt === null) {
        setBottomReachedAt(Date.now());
      }
    };
    window.addEventListener('scroll', onScroll);
    onScroll();
    return () => {
      window.removeEventListener('scroll', onScroll);
    };
  }, [bottomReachedAt, currentMode, lessonCompleted]);

  useEffect(() => {
    if (bottomReachedAt === null || lessonCompleted) {
      setCountdownLeft(LESSON_COMPLETE_WAIT_SECONDS);
      return;
    }
    const timer = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - bottomReachedAt) / 1000);
      const remaining = Math.max(0, LESSON_COMPLETE_WAIT_SECONDS - elapsed);
      setCountdownLeft(remaining);
    }, 250);
    return () => window.clearInterval(timer);
  }, [bottomReachedAt, lessonCompleted]);

  const completeLesson = useCallback(async () => {
    if (!selectedLessonItem?.lessonId || completingLesson || lessonCompleted) return;
    try {
      setCompletingLesson(true);
      const response = await lessonService.complete(selectedLessonItem.lessonId);
      setLessonCompleted(Boolean(response.data?.completed));
      if (typeof response.data?.lessonPoints === 'number' && response.data.lessonPoints > 0) {
        toast.success(`Lesson completed. +${response.data.lessonPoints} pts`);
      } else {
        toast.success('Lesson marked as complete.');
      }
      await refreshModule();
    } catch {
      toast.error('Unable to complete lesson.');
    } finally {
      setCompletingLesson(false);
    }
  }, [completingLesson, lessonCompleted, refreshModule, selectedLessonItem?.lessonId]);

  useEffect(() => {
    if (
      currentMode === 'lesson' &&
      selectedLessonItem?.lessonId &&
      bottomReachedAt !== null &&
      countdownLeft === 0 &&
      !lessonCompleted &&
      !completingLesson
    ) {
      void completeLesson();
    }
  }, [
    bottomReachedAt,
    completeLesson,
    completingLesson,
    countdownLeft,
    currentMode,
    lessonCompleted,
    selectedLessonItem?.lessonId,
  ]);

  const openOverview = useCallback(() => {
    router.push(`/dashboard/student/classes/${classId}/modules/${moduleId}`);
  }, [classId, moduleId, router]);

  const openLesson = useCallback(
    (item: ModuleItem) => {
      if (!item.lessonId) return;
      router.push(
        `/dashboard/student/classes/${classId}/modules/${moduleId}?lessonId=${item.lessonId}`,
      );
    },
    [classId, moduleId, router],
  );

  const openAssessment = useCallback(
    (item: ModuleItem) => {
      if (!item.assessmentId) return;
      router.push(
        `/dashboard/student/classes/${classId}/modules/${moduleId}?assessmentId=${item.assessmentId}`,
      );
    },
    [classId, moduleId, router],
  );

  const handleDownloadAttachment = useCallback(async (item: ModuleItem) => {
    if (!item.fileId) return;
    try {
      const blob = await fileService.download(item.fileId);
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

  const triggerItemAction = useCallback(
    (item: ModuleItem) => {
      if (item.itemType === 'lesson') {
        openLesson(item);
        return;
      }
      if (item.itemType === 'assessment') {
        openAssessment(item);
        return;
      }
      void handleDownloadAttachment(item);
    },
    [handleDownloadAttachment, openAssessment, openLesson],
  );

  const handleItemCardClick = useCallback(
    (event: ReactMouseEvent<HTMLElement>, item: ModuleItem) => {
      if (!(event.target instanceof Element)) return;
      const interactiveAncestor = event.target.closest('button, a, [role="button"]');
      if (interactiveAncestor && interactiveAncestor !== event.currentTarget) return;
      triggerItemAction(item);
    },
    [triggerItemAction],
  );

  const handleItemCardKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLElement>, item: ModuleItem) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      if (!(event.target instanceof Element)) return;
      const interactiveAncestor = event.target.closest('button, a, [role="button"]');
      if (interactiveAncestor && interactiveAncestor !== event.currentTarget) {
        return;
      }
      event.preventDefault();
      triggerItemAction(item);
    },
    [triggerItemAction],
  );

  const handleStartAttempt = useCallback(async () => {
    if (!assessment?.id || startingAttempt || !assessmentAvailability.canStart) return;
    try {
      setStartingAttempt(true);
      const response = await assessmentService.startAttempt(assessment.id);
      const attempt = response.data.attempt;
      const timeLimit = response.data.timeLimitMinutes;
      let href = `/dashboard/student/assessments/${assessment.id}/take?attemptId=${attempt.id}`;
      if (timeLimit) {
        href += `&timeLimit=${timeLimit}`;
      }
      router.push(href);
    } catch (error) {
      toast.error(mapAssessmentStartError(error));
    } finally {
      setStartingAttempt(false);
    }
  }, [assessment?.id, assessmentAvailability.canStart, router, startingAttempt]);

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-20 rounded-2xl" />
      </div>
    );
  }

  if (!module || !classItem) {
    return <p className="text-sm text-slate-500">Module not found.</p>;
  }

  const lessonCount = flatItems.filter((item) => item.itemType === 'lesson').length;
  const assessmentCount = flatItems.filter((item) => item.itemType === 'assessment').length;

  return (
    <div className="student-module-view">
      <header className="student-module-view__hero">
        <Link
          href={`/dashboard/student/classes/${classId}?view=modules`}
          className="student-module-view__back"
        >
          <ArrowLeft className="h-4 w-4" />
          {currentMode === 'overview' ? classItem.subjectName || 'Back to Class' : 'Back'}
        </Link>

        <div className="student-module-view__hero-row">
          <span className="student-module-view__pill">M{module.order}</span>
          <div className="student-module-view__hero-copy">
            <h1>
              {currentMode === 'lesson'
                ? lesson?.title || module.title
                : currentMode === 'assessment'
                  ? assessment?.title || module.title
                  : module.title}
            </h1>
            <p>
              {currentMode === 'overview'
                ? module.description || 'Explore lessons, assessments, and required checkpoints.'
                : formatClassLine(classItem)}
            </p>
            <div className="student-module-view__meta">
              <span>
                <BookOpen className="h-3.5 w-3.5" />
                {lessonCount} lessons
              </span>
              <span>
                <ScrollText className="h-3.5 w-3.5" />
                {assessmentCount} assessments
              </span>
              <span>
                <ClipboardCheck className="h-3.5 w-3.5" />
                {module.requiredCompletedCount ?? 0}/{module.requiredVisibleCount ?? 0} required
              </span>
              <span>{module.progressPercent ?? 0}% progress</span>
            </div>
          </div>
        </div>
      </header>

      <section className="student-module-view__body">
        {module.isLocked ? (
          <div className="student-module-view__locked">
            <p className="mb-2 inline-flex items-center gap-2 font-semibold">
              <Lock className="h-4 w-4" />
              This module is currently locked.
            </p>
            <p>Overview is available, but lessons and assessments will appear once your teacher unlocks it.</p>
          </div>
        ) : null}

        {currentMode === 'overview' && !module.isLocked ? (
          module.sections.length === 0 ? (
            <div className="student-module-view__locked">
              No content blocks have been published in this module yet.
            </div>
          ) : (
            module.sections.map((section) => (
              <div key={section.id}>
                <p className="student-module-view__section-label">{section.title}</p>
                <div className="space-y-3">
                  {section.items.map((item) => {
                    const isAssessment = item.itemType === 'assessment';
                    const isDraft =
                      item.itemType === 'lesson'
                        ? Boolean(item.lesson?.isDraft)
                        : item.itemType === 'assessment'
                          ? !item.assessment?.isPublished
                          : false;
                    const title =
                      item.itemType === 'lesson'
                        ? item.lesson?.title || 'Untitled lesson'
                        : item.itemType === 'assessment'
                          ? item.assessment?.title || 'Untitled assessment'
                          : item.file?.originalName || 'Attachment';
                    const Icon = isAssessment ? ScrollText : item.itemType === 'file' ? FileText : BookOpen;
                    return (
                      <article
                        key={item.id}
                        className="student-module-view__item"
                        data-kind={item.itemType}
                        role="button"
                        tabIndex={0}
                        onClick={(event) => handleItemCardClick(event, item)}
                        onKeyDown={(event) => handleItemCardKeyDown(event, item)}
                      >
                        <div className="student-module-view__item-main">
                          <span className="student-module-view__item-icon">
                            <Icon className="h-5 w-5" />
                          </span>
                          <div>
                            <div className="student-module-view__chips">
                              {item.isRequired ? (
                                <span className="student-module-view__chip student-module-view__chip--required">
                                  Required
                                </span>
                              ) : null}
                              {item.completed ? (
                                <span className="student-module-view__chip student-module-view__chip--completed">
                                  Completed
                                </span>
                              ) : null}
                              <span
                                className={`student-module-view__chip ${isDraft ? 'student-module-view__chip--state-draft' : 'student-module-view__chip--state'}`}
                              >
                                {isDraft ? 'Draft' : 'Published'}
                              </span>
                            </div>
                            <h3 className="student-module-view__item-title">{title}</h3>
                            <p className="student-module-view__item-meta">
                              {item.itemType === 'assessment'
                                ? `Due ${formatDate(item.assessment?.dueDate)} - ${item.assessment?.totalPoints ?? 0} pts`
                                : item.itemType === 'lesson'
                                  ? `${item.lessonPoints ?? 0} pts`
                                  : 'Attachment'}
                            </p>
                          </div>
                        </div>
                        {item.itemType === 'lesson' ? (
                          <button
                            type="button"
                            className="student-module-view__open"
                            onClick={() => openLesson(item)}
                          >
                            Open
                          </button>
                        ) : item.itemType === 'assessment' ? (
                          <button
                            type="button"
                            className="student-module-view__open"
                            onClick={() => openAssessment(item)}
                          >
                            Take
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="student-module-view__open"
                            onClick={() => void handleDownloadAttachment(item)}
                          >
                            Download
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </div>
            ))
          )
        ) : null}

        {currentMode === 'lesson' && !module.isLocked ? (
          <div className="student-module-view__lesson">
            {lessonLoading ? (
              <>
                <Skeleton className="h-44 rounded-2xl" />
                <Skeleton className="h-44 rounded-2xl" />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openOverview}
                  className="w-fit text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Module
                </Button>
                <article className="student-module-view__reader">
                  {lessonBlocks.length === 0 ? (
                    <p className="text-sm text-[var(--student-text-muted)]">No lesson content available.</p>
                  ) : (
                    <div className="space-y-6">
                      {lessonBlocks.map((block) => (
                        <ContentBlockRenderer key={block.id} block={block} />
                      ))}
                    </div>
                  )}
                </article>

                {lessonAttachments.length > 0 ? (
                  <article className="student-module-view__attachments">
                    <h2 className="text-lg font-semibold text-[var(--student-text-strong)]">Attachments</h2>
                    {lessonAttachments.map((item) => (
                      <div key={item.id} className="student-module-view__attachment-row">
                        <div>
                          <p className="font-medium text-[var(--student-text-strong)]">
                            {item.file?.originalName || 'Attachment'}
                          </p>
                          <p className="text-xs text-[var(--student-text-muted)]">{item.file?.mimeType || 'File'}</p>
                        </div>
                        <button type="button" onClick={() => void handleDownloadAttachment(item)}>
                          Download
                        </button>
                      </div>
                    ))}
                  </article>
                ) : null}

                <footer className="student-module-view__lesson-footer">
                  <div className="student-module-view__lesson-progress">
                    {lessonCompleted ? (
                      <p>Completed - +{selectedLessonItem?.lessonPoints ?? 0} pts awarded</p>
                    ) : bottomReachedAt === null ? (
                      <p>Scroll to the bottom to start the completion timer.</p>
                    ) : (
                      <p>
                        Stay on this lesson for <strong>{countdownLeft}s</strong> to mark as complete.
                      </p>
                    )}
                  </div>
                  <Button
                    className="student-button-solid"
                    disabled={!lessonCompleted && (bottomReachedAt === null || countdownLeft > 0 || completingLesson)}
                    onClick={() => void completeLesson()}
                  >
                    {lessonCompleted ? 'Completed' : completingLesson ? 'Completing...' : 'Mark Complete'}
                  </Button>
                </footer>
              </>
            )}
          </div>
        ) : null}

        {currentMode === 'assessment' && !module.isLocked ? (
          <div className="student-module-view__assessment">
            {assessmentLoading ? (
              <>
                <Skeleton className="h-44 rounded-2xl" />
                <Skeleton className="h-32 rounded-2xl" />
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={openOverview}
                  className="w-fit text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to Module
                </Button>

                <article className="student-module-view__assessment-card">
                  <h2 className="text-lg font-semibold text-[var(--student-text-strong)]">Assessment Snapshot</h2>
                  <div className="student-module-view__assessment-grid">
                    <article>
                      <span>Questions</span>
                      <strong>{assessment?.questions?.length ?? 0}</strong>
                    </article>
                    <article>
                      <span>Total Points</span>
                      <strong>{assessment?.totalPoints ?? 0}</strong>
                    </article>
                    <article>
                      <span>Attempts</span>
                      <strong>{submittedAttempts.length}/{assessment?.maxAttempts ?? 1}</strong>
                    </article>
                    <article>
                      <span>Due Date</span>
                      <strong>{formatDate(assessment?.dueDate)}</strong>
                    </article>
                  </div>
                  {!assessmentAvailability.canStart ? (
                    <div className="student-module-view__assessment-warning" role="status" aria-live="polite">
                      {assessmentAvailability.blockedReason}
                    </div>
                  ) : null}
                </article>

                <article className="student-module-view__assessment-card">
                  <h2 className="text-lg font-semibold text-[var(--student-text-strong)]">Attempts</h2>
                  <div className="mt-3 space-y-2">
                    {submittedAttempts.length === 0 ? (
                      <p className="text-sm text-[var(--student-text-muted)]">No submitted attempts yet.</p>
                    ) : (
                      submittedAttempts.map((attempt) => (
                        <div key={attempt.id} className="student-module-view__attempt">
                          <div>
                            <p className="font-semibold text-[var(--student-text-strong)]">
                              Attempt {attempt.attemptNumber || 1}
                            </p>
                            <p className="text-xs text-[var(--student-text-muted)]">
                              {formatDate(attempt.submittedAt || attempt.createdAt)}
                            </p>
                          </div>
                          <div className="student-module-view__attempt-actions">
                            <span className="text-sm font-semibold text-[var(--student-success-text)]">
                              {typeof attempt.score === 'number' ? `${attempt.score}/${attempt.totalPoints ?? '--'}` : 'Pending'}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                router.push(`/dashboard/student/assessments/${assessment?.id}/results/${attempt.id}`)
                              }
                            >
                              View
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="student-module-view__attempt-actions mt-4">
                    <button
                      type="button"
                      data-variant="primary"
                      disabled={startingAttempt || !assessmentAvailability.canStart}
                      onClick={() => void handleStartAttempt()}
                    >
                      {startingAttempt
                        ? 'Starting...'
                        : assessmentAvailability.isPastDue
                          ? 'Closed'
                          : assessmentAvailability.hasAttemptsRemaining
                            ? 'Start New Attempt'
                            : 'Attempt Limit Reached'}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push(`/dashboard/student/assessments/${assessment?.id}`)}
                    >
                      Results
                    </button>
                  </div>
                </article>
              </>
            )}
          </div>
        ) : null}
      </section>
    </div>
  );
}
