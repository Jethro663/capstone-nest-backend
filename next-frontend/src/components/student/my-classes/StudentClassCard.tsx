'use client';

import Link from 'next/link';
import { useCallback, type CSSProperties, type KeyboardEvent, type MouseEvent } from 'react';
import {
  ArrowRight,
  BookOpen,
  ClipboardCheck,
  MoreHorizontal,
  Sparkles,
  Users,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';
import { getTeacherName } from '@/utils/helpers';

interface StudentClassCardData {
  id: string;
  subjectName?: string;
  className?: string;
  name?: string;
  section?: { name: string; gradeLevel: string };
  subjectGradeLevel?: string;
  teacher?: { firstName?: string; lastName?: string };
  enrollments?: unknown[];
  classmatesCount: number;
  totalLessons: number;
  totalAssessments: number;
  pendingCount: number;
  progress: number;
  isActive: boolean;
  isHidden?: boolean;
}

interface StudentClassCardProps {
  course: StudentClassCardData;
  heroStyle: CSSProperties;
  buttonTint: string;
  menuOpen: boolean;
  toggling: boolean;
  viewAssignmentsHref: string;
  viewScheduleHref: string;
  onOpenClass: (classId: string) => void;
  onToggleMenu: () => void;
  onOpenCustomize: () => void;
  onToggleHidden: () => void;
}

function clamp(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getStatusLabel(course: StudentClassCardData) {
  if (!course.isActive) return 'Archived';
  if (course.progress >= 100) return 'Completed';
  if (course.progress > 0) return 'In Progress';
  return 'Ready';
}

function getStatusClass(statusLabel: string) {
  if (statusLabel === 'Completed') return 'border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]';
  if (statusLabel === 'In Progress') return 'border-[var(--student-danger-bg)] bg-[var(--student-danger-bg)] text-[var(--student-accent)]';
  if (statusLabel === 'Archived') return 'border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-navy-soft)]';
  return 'border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]';
}

function isInteractiveTarget(target: EventTarget | null) {
  return (
    target instanceof Element &&
    Boolean(target.closest('a, button, input, select, textarea, label, [role="button"], [data-class-card-menu]'))
  );
}

export function StudentClassCard({
  course,
  heroStyle,
  buttonTint,
  menuOpen,
  toggling,
  viewAssignmentsHref,
  viewScheduleHref,
  onOpenClass,
  onToggleMenu,
  onOpenCustomize,
  onToggleHidden,
}: StudentClassCardProps) {
  const progress = clamp(course.progress);
  const statusLabel = getStatusLabel(course);
  const subjectName = course.subjectName || course.className || course.name || 'Class';
  const teacherName = getTeacherName(course.teacher);
  const gradeLevel = course.section?.gradeLevel ?? course.subjectGradeLevel ?? 'TBA';
  const sectionName = course.section?.name ?? 'Section TBA';
  const studentsCount = Math.max(course.classmatesCount + 1, course.enrollments?.length ?? 0);
  const ctaLabel = course.pendingCount > 0 ? 'Continue Learning' : 'Open Class';

  const openClass = useCallback(() => onOpenClass(course.id), [course.id, onOpenClass]);

  const handleBodyClick = (event: MouseEvent<HTMLElement>) => {
    if (isInteractiveTarget(event.target)) return;
    openClass();
  };

  const handleBodyKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    if (isInteractiveTarget(event.target)) return;
    event.preventDefault();
    openClass();
  };

  return (
    <article
      className={cn(
        'group overflow-hidden rounded-[1.55rem] border border-[var(--student-outline)] bg-white shadow-[0_22px_38px_-30px_color-mix(in_srgb,var(--student-navy)_55%,transparent)] transition',
        'hover:border-[var(--student-outline-strong)] hover:shadow-[0_28px_42px_-30px_color-mix(in_srgb,var(--student-navy)_55%,transparent)]',
      )}
    >
      <div
        className="relative min-h-[8.65rem] overflow-hidden px-5 pb-5 pt-4"
        style={heroStyle}
      >
        <div className="relative flex items-start justify-between gap-3">
          <span
            className={cn(
              'inline-flex rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.09em]',
              getStatusClass(statusLabel),
            )}
          >
            {statusLabel}
          </span>

          <div className="relative" data-class-card-menu>
            <button
              type="button"
              aria-label="Class card menu"
              aria-expanded={menuOpen}
              onClick={onToggleMenu}
              className="grid h-8 w-8 place-items-center rounded-full border border-white/30 text-white transition hover:brightness-110"
              style={{ background: buttonTint }}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            <div
              data-open={menuOpen}
              className={cn(
                'absolute right-0 top-[calc(100%+0.4rem)] z-20 grid min-w-[11rem] gap-1 rounded-xl border border-[var(--student-outline)] bg-white p-1.5 shadow-[0_20px_36px_-26px_color-mix(in_srgb,var(--student-navy)_45%,transparent)] transition',
                menuOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-1 opacity-0',
              )}
            >
              <button
                type="button"
                className="rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[var(--student-navy-soft)] transition hover:bg-[var(--student-surface-soft)]"
                onClick={onOpenCustomize}
              >
                Customize class
              </button>
              <button
                type="button"
                disabled={toggling}
                className="rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[var(--student-navy-soft)] transition hover:bg-[var(--student-surface-soft)] disabled:opacity-50"
                onClick={onToggleHidden}
              >
                {course.isHidden ? 'Restore class' : 'Hide class'}
              </button>
            </div>
          </div>
        </div>

        <div className="relative mt-5 text-white">
          <h3 className="line-clamp-2 text-[2rem] font-semibold leading-[1.05] tracking-tight">
            {subjectName}
          </h3>
          <p className="mt-2 text-[0.92rem] font-medium text-white/92">
            Grade {gradeLevel} • {sectionName}
          </p>
          <p className="mt-0.5 text-sm text-white/80">with {teacherName}</p>
        </div>
      </div>

      <div
        role="link"
        tabIndex={0}
        aria-label={`Open ${subjectName}`}
        onClick={handleBodyClick}
        onKeyDown={handleBodyKeyDown}
        className="space-y-4 px-5 pb-5 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--student-accent)]/40 focus-visible:ring-inset"
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] px-2 py-2.5 text-center">
            <p className="text-2xl font-semibold leading-none text-[var(--student-navy)]">{studentsCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--student-text-muted)]">
              Students
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] px-2 py-2.5 text-center">
            <p className="text-2xl font-semibold leading-none text-[var(--student-navy)]">{course.totalLessons}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--student-text-muted)]">
              Lessons
            </p>
          </div>
          <div className="rounded-2xl border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] px-2 py-2.5 text-center">
            <p className="text-2xl font-semibold leading-none text-[var(--student-navy)]">{course.pendingCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[var(--student-text-muted)]">
              Pending
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[var(--student-navy-soft)]">
              <Sparkles className="h-3.5 w-3.5 text-[var(--student-accent)]" />
              Learning progress
            </span>
            <span className="text-[var(--student-accent)]">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2.5 bg-[var(--student-danger-border)]"
            indicatorClassName="bg-[var(--student-red)]"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-[var(--student-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--student-navy-soft)]">
            <BookOpen className="h-3.5 w-3.5" />
            {course.totalAssessments} tasks
          </div>

          <div className="inline-flex items-center gap-1 rounded-full bg-[var(--student-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--student-navy-soft)]">
            <Users className="h-3.5 w-3.5" />
            {sectionName}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={viewAssignmentsHref}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-sm font-semibold text-[var(--student-navy-soft)] transition hover:bg-[var(--student-surface-soft)]"
          >
            <ClipboardCheck className="h-4 w-4" />
            View Tasks
          </Link>

          <button
            type="button"
            onClick={openClass}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[var(--student-red)] px-4 text-sm font-semibold text-white transition hover:bg-[var(--student-red-hover)]"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <Link
          href={viewScheduleHref}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--student-outline)] bg-white px-3 py-2.5 text-sm font-semibold text-[var(--student-navy-soft)] transition hover:bg-[var(--student-surface-soft)]"
        >
          View Schedule
        </Link>
      </div>
    </article>
  );
}
