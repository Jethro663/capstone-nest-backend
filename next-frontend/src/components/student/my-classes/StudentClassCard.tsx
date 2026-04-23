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
  if (statusLabel === 'Completed') return 'border-[#bde9d3] bg-[#effcf4] text-[#047857]';
  if (statusLabel === 'In Progress') return 'border-[#fdd5e1] bg-[#fff1f6] text-[#be123c]';
  if (statusLabel === 'Archived') return 'border-[#d5deeb] bg-[#f4f8fd] text-[#4e6182]';
  return 'border-[#cbdaf8] bg-[#eff5ff] text-[#1d4ed8]';
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
        'group overflow-hidden rounded-[1.55rem] border border-[#e2dfeb] bg-white shadow-[0_22px_38px_-30px_rgba(17,25,47,0.55),inset_0_1px_0_rgba(255,255,255,0.9)] transition',
        'hover:-translate-y-1 hover:border-[#d2cddf] hover:shadow-[0_28px_42px_-30px_rgba(17,25,47,0.55)]',
      )}
    >
      <div
        className="relative min-h-[8.65rem] overflow-hidden px-5 pb-5 pt-4"
        style={heroStyle}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.16)_1px,transparent_0)] [background-size:16px_16px]" />
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
                'absolute right-0 top-[calc(100%+0.4rem)] z-20 grid min-w-[11rem] gap-1 rounded-xl border border-[#dcd8e8] bg-white p-1.5 shadow-[0_20px_36px_-26px_rgba(17,25,47,0.45)] transition',
                menuOpen
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-1 opacity-0',
              )}
            >
              <button
                type="button"
                className="rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#f3f0f9]"
                onClick={onOpenCustomize}
              >
                Customize class
              </button>
              <button
                type="button"
                disabled={toggling}
                className="rounded-lg px-2.5 py-2 text-left text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#f3f0f9] disabled:opacity-50"
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
        className="space-y-4 px-5 pb-5 pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d81b50]/40 focus-visible:ring-inset"
      >
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fc] px-2 py-2.5 text-center">
            <p className="text-2xl font-semibold leading-none text-[#11192f]">{studentsCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#727d97]">
              Students
            </p>
          </div>
          <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fc] px-2 py-2.5 text-center">
            <p className="text-2xl font-semibold leading-none text-[#11192f]">{course.totalLessons}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#727d97]">
              Lessons
            </p>
          </div>
          <div className="rounded-2xl border border-[#e8e4ef] bg-[#faf9fc] px-2 py-2.5 text-center">
            <p className="text-2xl font-semibold leading-none text-[#11192f]">{course.pendingCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.09em] text-[#727d97]">
              Pending
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[#e9e4ef] bg-[#fbf9fd] px-3 py-2.5">
          <div className="mb-2 flex items-center justify-between text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[#55617d]">
              <Sparkles className="h-3.5 w-3.5 text-[#d81b50]" />
              Learning progress
            </span>
            <span className="text-[#d81b50]">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2.5 bg-[#f2d7e1]"
            indicatorClassName="bg-gradient-to-r from-[#d81b50] to-[#ef476f]"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1 rounded-full bg-[#f2f0f8] px-2.5 py-1 text-xs font-semibold text-[#4b5875]">
            <BookOpen className="h-3.5 w-3.5" />
            {course.totalAssessments} tasks
          </div>

          <div className="inline-flex items-center gap-1 rounded-full bg-[#eef4ff] px-2.5 py-1 text-xs font-semibold text-[#31518a]">
            <Users className="h-3.5 w-3.5" />
            {sectionName}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href={viewAssignmentsHref}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#d9d6e7] bg-[#f2f0f9] text-sm font-semibold text-[#2f3f5d] transition hover:bg-[#ebe8f5]"
          >
            <ClipboardCheck className="h-4 w-4" />
            View Tasks
          </Link>

          <button
            type="button"
            onClick={openClass}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#d81b50] px-4 text-sm font-semibold text-white shadow-[0_14px_26px_-20px_rgba(216,27,80,0.95)] transition hover:bg-[#c51647]"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <Link
          href={viewScheduleHref}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[#e2dfeb] bg-white px-3 py-2.5 text-sm font-semibold text-[#44526f] transition hover:bg-[#f8f6fc]"
        >
          View Schedule
        </Link>
      </div>
    </article>
  );
}
