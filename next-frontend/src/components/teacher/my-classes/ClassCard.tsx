'use client';

import { type KeyboardEvent } from 'react';
import {
  Atom,
  BookOpen,
  Calculator,
  FlaskConical,
  Globe2,
  Languages,
  Landmark,
  Music2,
  PenSquare,
  Sparkles,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ClassItem } from '@/types/class';
import { getTeacherName } from '@/utils/helpers';
import { cn } from '@/utils/cn';

export interface ClassCardMetrics {
  lessonsCount: number;
  assessmentsCount: number;
  pendingCount: number;
  progressPercent: number;
}

interface ClassCardProps {
  classItem: ClassItem;
  metrics: ClassCardMetrics;
  accentIndex: number;
  onOpenClass: (classId: string) => void;
  onViewLessons?: (classId: string) => void;
}

const CARD_ACCENTS = [
  {
    hero: 'from-[#f43f5e] via-[#ef476f] to-[#dd2954]',
    chip: 'bg-[#ffe7ee] text-[#be123c] border-[#fecdd8]',
    icon: 'bg-white/20 text-white',
    button: 'bg-[#f43f5e] text-white hover:bg-[#e11d48]',
  },
  {
    hero: 'from-[#0b1736] via-[#1b2d5f] to-[#253d78]',
    chip: 'bg-[#e8efff] text-[#1d4ed8] border-[#bfdbfe]',
    icon: 'bg-white/15 text-white',
    button: 'bg-[#0b1736] text-white hover:bg-[#121f47]',
  },
  {
    hero: 'from-[#be123c] via-[#9f1239] to-[#701a75]',
    chip: 'bg-[#ffe8ef] text-[#9f1239] border-[#fbcfe8]',
    icon: 'bg-white/20 text-white',
    button: 'bg-[#be123c] text-white hover:bg-[#9f1239]',
  },
] as const;

type SubjectIconKey =
  | 'calculator'
  | 'science'
  | 'history'
  | 'language'
  | 'music'
  | 'geography'
  | 'research'
  | 'writing'
  | 'default';

const SUBJECT_ICON_RULES: Array<{ test: RegExp; icon: SubjectIconKey }> = [
  { test: /math|algebra|geometry|statistics|calculus/i, icon: 'calculator' },
  { test: /science|biology|chem|physics|earth/i, icon: 'science' },
  { test: /history|social|civics|politics/i, icon: 'history' },
  { test: /english|language|reading|literature/i, icon: 'language' },
  { test: /music|arts|perform/i, icon: 'music' },
  { test: /geography|world|map/i, icon: 'geography' },
  { test: /research|capstone|project/i, icon: 'research' },
];

function resolveSubjectIcon(subjectName: string) {
  const match = SUBJECT_ICON_RULES.find((entry) => entry.test.test(subjectName));
  if (match) return match.icon;
  return subjectName.toLowerCase().includes('writing') ? 'writing' : 'default';
}

function renderSubjectIcon(iconKey: SubjectIconKey) {
  switch (iconKey) {
    case 'calculator':
      return <Calculator className="h-5 w-5" />;
    case 'science':
      return <FlaskConical className="h-5 w-5" />;
    case 'history':
      return <Landmark className="h-5 w-5" />;
    case 'language':
      return <Languages className="h-5 w-5" />;
    case 'music':
      return <Music2 className="h-5 w-5" />;
    case 'geography':
      return <Globe2 className="h-5 w-5" />;
    case 'research':
      return <Atom className="h-5 w-5" />;
    case 'writing':
      return <PenSquare className="h-5 w-5" />;
    default:
      return <BookOpen className="h-5 w-5" />;
  }
}

function formatSchedule(classItem: ClassItem) {
  const schedule = classItem.schedules?.[0];
  if (!schedule) return 'Schedule to be announced';
  return `${schedule.days.join('/')} | ${schedule.startTime} - ${schedule.endTime}`;
}

function clampProgress(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function ClassCard({
  classItem,
  metrics,
  accentIndex,
  onOpenClass,
  onViewLessons,
}: ClassCardProps) {
  const accent = CARD_ACCENTS[accentIndex % CARD_ACCENTS.length];
  const progress = clampProgress(metrics.progressPercent);
  const subjectName = classItem.subjectName || classItem.className || classItem.name || 'Class';
  const sectionName = classItem.section?.name ?? 'Section TBA';
  const gradeLevel = classItem.section?.gradeLevel ?? classItem.subjectGradeLevel ?? 'TBA';
  const teacherName = getTeacherName(classItem.teacher);
  const iconKey = resolveSubjectIcon(subjectName);
  const ctaLabel = metrics.pendingCount > 0 ? 'Continue Learning' : 'Open Class';

  const openClass = () => onOpenClass(classItem.id);
  const openLessons = () => onViewLessons?.(classItem.id);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    openClass();
  };

  return (
    <article
      role="button"
      tabIndex={0}
      aria-label={`Open ${subjectName}`}
      onClick={openClass}
      onKeyDown={handleKeyDown}
      className={cn(
        'group flex min-h-[22rem] cursor-pointer flex-col overflow-hidden rounded-[1.35rem] border border-[#dde3f0] bg-white shadow-[0_16px_35px_-26px_rgba(11,23,54,0.45),inset_0_1px_0_rgba(255,255,255,0.9)] transition-all duration-200 ease-out',
        'hover:-translate-y-1 hover:border-[#c7d2e8] hover:shadow-[0_26px_42px_-26px_rgba(11,23,54,0.48),inset_0_1px_0_rgba(255,255,255,0.9)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f43f5e]/45 focus-visible:ring-offset-2',
      )}
    >
      <div className={cn('relative overflow-hidden bg-gradient-to-br px-5 pb-5 pt-4 text-white', accent.hero)}>
        <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.5)_1px,transparent_0)] [background-size:14px_14px]" />
        <div className="relative flex items-start justify-between gap-3">
          <Badge className="border border-white/35 bg-white/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
            Grade {gradeLevel}
          </Badge>
          <div className={cn('grid h-11 w-11 place-items-center rounded-2xl border border-white/25', accent.icon)}>
            {renderSubjectIcon(iconKey)}
          </div>
        </div>

        <div className="relative mt-5 space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-white/85">{classItem.subjectCode || 'Subject'}</p>
          <h3 className="text-[1.55rem] font-semibold leading-tight tracking-tight text-white">{subjectName}</h3>
          <p className="max-w-[92%] text-sm text-white/88">
            {sectionName} | {teacherName}
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 px-5 py-4">
        <p className="rounded-xl border border-[#e4e9f4] bg-[#f7f9fe] px-3 py-2 text-xs font-medium text-[#3c4a67]">
          {formatSchedule(classItem)}
        </p>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className={cn('rounded-xl border px-2 py-2.5', accent.chip)}>
            <p className="text-lg font-semibold leading-none">{metrics.lessonsCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]">Lessons</p>
          </div>
          <div className={cn('rounded-xl border px-2 py-2.5', accent.chip)}>
            <p className="text-lg font-semibold leading-none">{metrics.assessmentsCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]">Assessments</p>
          </div>
          <div className={cn('rounded-xl border px-2 py-2.5', accent.chip)}>
            <p className="text-lg font-semibold leading-none">{metrics.pendingCount}</p>
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em]">Pending</p>
          </div>
        </div>

        <div className="space-y-2 rounded-2xl border border-[#e4e9f4] bg-[#f9fbff] p-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#425374]">
            <span>Class readiness</span>
            <span className="text-[#f43f5e]">{progress}%</span>
          </div>
          <Progress
            value={progress}
            className="h-2.5 bg-[#f0d8df]"
            indicatorClassName="bg-gradient-to-r from-[#f43f5e] to-[#fb7185]"
          />
        </div>

        <div className="mt-auto space-y-2.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-[#eef3ff] px-2.5 py-1 text-[11px] font-semibold text-[#344f87]">
            <Sparkles className="h-3.5 w-3.5" />
            Next: {metrics.pendingCount > 0 ? `${metrics.pendingCount} items` : 'Open class'}
          </span>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-xl border-[#d5deef] bg-[#f5f8ff] px-3 text-sm font-semibold text-[#2f466f] hover:bg-[#ebf0fb]"
              onClick={(event) => {
                event.stopPropagation();
                openLessons();
              }}
            >
              View Lessons
            </Button>
            <Button
              type="button"
              className={cn(
                'h-10 rounded-xl px-4 text-sm font-semibold shadow-[0_10px_20px_-16px_rgba(11,23,54,0.6)] transition',
                accent.button,
              )}
              onClick={(event) => {
                event.stopPropagation();
                openClass();
              }}
            >
              {ctaLabel}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
