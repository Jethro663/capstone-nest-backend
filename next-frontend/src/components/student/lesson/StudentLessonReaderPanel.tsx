'use client';

import { ArrowLeft, BookOpen, ClipboardCheck, ScrollText } from 'lucide-react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextRenderer } from '@/components/shared/rich-text/RichTextRenderer';
import type { ClassItem } from '@/types/class';
import type { ContentBlock, Lesson } from '@/types/lesson';
import type { ClassModule, ModuleItem } from '@/types/module';
import {
  LessonBlockStudentRenderer,
  type LessonCheckpointResults,
  type LessonCheckpointSelections,
} from '@/features/lesson-blocks/LessonBlockStudentRenderer';

const LESSON_COMPLETE_WAIT_SECONDS = 30;

function getTeacherName(classItem: ClassItem | null) {
  const teacher = classItem?.teacher;
  if (!teacher) return 'Teacher';
  const fullName = [teacher.firstName, teacher.lastName].filter(Boolean).join(' ').trim();
  return fullName || 'Teacher';
}

function formatClassLine(classItem: ClassItem | null) {
  const gradeLevel = classItem?.section?.gradeLevel || classItem?.subjectGradeLevel || '--';
  const sectionName = classItem?.section?.name || 'Section';
  const teacherName = getTeacherName(classItem);
  return `Grade ${gradeLevel} - ${sectionName} - ${teacherName}`;
}

interface StudentLessonReaderPanelProps {
  classItem: ClassItem | null;
  module: ClassModule | null;
  lesson: Lesson | null;
  lessonBlocks: ContentBlock[];
  lessonLoading: boolean;
  lessonCompleted: boolean;
  completingLesson: boolean;
  bottomReachedAt: number | null;
  countdownLeft: number;
  checkpointGate: {
    ready: boolean;
    correct: number;
    total: number;
  };
  checkpointSelections: LessonCheckpointSelections;
  checkpointResults: LessonCheckpointResults;
  lessonAttachments: ModuleItem[];
  lessonPoints?: number;
  backHref: string;
  backLabel: string;
  inlineBackLabel: string;
  onInlineBack: () => void;
  onCompleteLesson: () => void | Promise<void>;
  onCheckpointAnswer: (
    blockId: string,
    selectedChoiceIds: string[],
    isCorrect: boolean,
  ) => void;
  onDownloadAttachment: (item: ModuleItem) => void | Promise<void>;
}

export function StudentLessonReaderPanel({
  classItem,
  module,
  lesson,
  lessonBlocks,
  lessonLoading,
  lessonCompleted,
  completingLesson,
  bottomReachedAt,
  countdownLeft,
  checkpointGate,
  checkpointSelections,
  checkpointResults,
  lessonAttachments,
  lessonPoints = 0,
  backHref,
  backLabel,
  inlineBackLabel,
  onInlineBack,
  onCompleteLesson,
  onCheckpointAnswer,
  onDownloadAttachment,
}: StudentLessonReaderPanelProps) {
  const lessonCount = module?.sections.flatMap((section) => section.items).filter((item) => item.itemType === 'lesson').length ?? 0;
  const assessmentCount = module?.sections.flatMap((section) => section.items).filter((item) => item.itemType === 'assessment').length ?? 0;
  const pillLabel = module ? `M${module.order}` : 'Lesson';
  const title = lesson?.title || module?.title || 'Lesson';
  const heroCopy: ReactNode = <p>{formatClassLine(classItem)}</p>;

  return (
    <div className="student-module-view">
      <header className="student-module-view__hero">
        <Link href={backHref} className="student-module-view__back">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        <div className="student-module-view__hero-row">
          <span className="student-module-view__pill">{pillLabel}</span>
          <div className="student-module-view__hero-copy">
            <h1>{title}</h1>
            {heroCopy}
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
                {module?.requiredCompletedCount ?? 0}/{module?.requiredVisibleCount ?? 0} required
              </span>
              <span>{module?.progressPercent ?? 0}% progress</span>
            </div>
          </div>
        </div>
      </header>

      <section className="student-module-view__body">
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
                onClick={onInlineBack}
                className="student-module-view__back-inline w-fit text-[var(--student-accent)] hover:bg-[var(--student-accent-soft)]"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {inlineBackLabel}
              </Button>

              <article className="student-module-view__reader">
                {lesson?.description ? (
                  <RichTextRenderer
                    html={lesson.description}
                    className="student-module-view__lesson-description"
                  />
                ) : null}
                {lessonBlocks.length === 0 && !lesson?.description ? (
                  <p className="text-sm text-[var(--student-text-muted)]">No lesson content available.</p>
                ) : lessonBlocks.length > 0 ? (
                  <div className="space-y-6">
                    {lessonBlocks.map((block) => (
                      <LessonBlockStudentRenderer
                        key={block.id}
                        block={block}
                        checkpointSelections={checkpointSelections}
                        checkpointResults={checkpointResults}
                        onCheckpointAnswer={onCheckpointAnswer}
                      />
                    ))}
                  </div>
                ) : null}
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
                        <p className="text-xs text-[var(--student-text-muted)]">
                          {item.file?.mimeType || 'File'}
                        </p>
                      </div>
                      <button type="button" onClick={() => void onDownloadAttachment(item)}>
                        Download
                      </button>
                    </div>
                  ))}
                </article>
              ) : null}

              <footer className="student-module-view__lesson-footer">
                <div className="student-module-view__lesson-progress">
                  {lessonCompleted ? (
                    <p>Completed - +{lessonPoints} pts awarded</p>
                  ) : !checkpointGate.ready ? (
                    <p>
                      Answer all checkpoints correctly to unlock the timer{' '}
                      <strong>{checkpointGate.correct}/{checkpointGate.total}</strong>.
                    </p>
                  ) : bottomReachedAt === null ? (
                    <p>Scroll to the bottom to start the completion timer.</p>
                  ) : (
                    <p>
                      Stay on this lesson for <strong>{countdownLeft}s</strong> to mark as complete.
                    </p>
                  )}
                </div>
                <Button
                  className="student-button-solid student-module-view__complete-button"
                  disabled={
                    !lessonCompleted &&
                    (!checkpointGate.ready ||
                      bottomReachedAt === null ||
                      countdownLeft > 0 ||
                      completingLesson)
                  }
                  onClick={() => void onCompleteLesson()}
                >
                  {lessonCompleted
                    ? 'Completed'
                    : completingLesson
                      ? 'Completing...'
                      : 'Mark Complete'}
                </Button>
              </footer>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export { LESSON_COMPLETE_WAIT_SECONDS };
