'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { StudentEventTag } from './types';
import { toDateKey } from './types';

interface StudentCalendarCardProps {
  month: Date;
  selectedDateKey: string;
  eventTagsByDate: Map<string, StudentEventTag[]>;
  onSelectDate: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

interface CalendarCell {
  date: Date;
  dateKey: string;
  inCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  tags: StudentEventTag[];
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TAG_COLOR: Record<StudentEventTag, string> = {
  assessment: 'bg-[#d81b50]',
  announcement: 'bg-[#f97316]',
  event: 'bg-[#0284c7]',
  holiday: 'bg-[#059669]',
};

function createCalendarCells(
  month: Date,
  selectedDateKey: string,
  eventTagsByDate: Map<string, StudentEventTag[]>,
) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = monthStart.getDay();
  const mondayOffset = (firstWeekday + 6) % 7;
  const firstCellDate = new Date(monthStart);
  firstCellDate.setDate(monthStart.getDate() - mondayOffset);
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCellDate);
    date.setDate(firstCellDate.getDate() + index);
    const dateKey = toDateKey(date);
    return {
      date,
      dateKey,
      inCurrentMonth: date.getMonth() === month.getMonth(),
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey,
      tags: eventTagsByDate.get(dateKey) ?? [],
    } satisfies CalendarCell;
  });
}

export function StudentCalendarCard({
  month,
  selectedDateKey,
  eventTagsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: StudentCalendarCardProps) {
  const monthLabel = useMemo(
    () =>
      month.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [month],
  );

  const cells = useMemo(
    () => createCalendarCells(month, selectedDateKey, eventTagsByDate),
    [month, selectedDateKey, eventTagsByDate],
  );

  return (
    <article className="rounded-[1.4rem] border border-[#e1deeb] bg-[linear-gradient(180deg,#f3f0fa_0%,#f7f4fb_100%)] p-4 shadow-[0_20px_34px_-28px_rgba(22,32,58,0.45)]">
      <header className="flex items-center justify-between">
        <h2 className="text-[1.55rem] font-semibold tracking-tight text-[#11192f]">
          {monthLabel}
        </h2>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrevMonth}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d4e6] bg-white text-[#58617a] transition hover:bg-[#f5f1fb]"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={onNextMonth}
            className="grid h-8 w-8 place-items-center rounded-full border border-[#d8d4e6] bg-white text-[#58617a] transition hover:bg-[#f5f1fb]"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-[11px] font-semibold uppercase tracking-[0.09em] text-[#7a8095]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell) => (
          <button
            key={cell.dateKey}
            type="button"
            onClick={() => onSelectDate(cell.dateKey)}
            className={cn(
              'group relative grid min-h-[2.45rem] place-items-center rounded-xl border text-sm font-semibold transition',
              cell.isSelected
                ? 'border-[#d81b50] bg-[#d81b50] text-white shadow-[0_16px_24px_-20px_rgba(216,27,80,0.95)]'
                : 'border-[#e3dfed] bg-white text-[#16203a] hover:border-[#d5d0e3] hover:bg-[#fbfaff]',
              !cell.inCurrentMonth && !cell.isSelected && 'text-[#b5b2c1]',
              cell.isToday && !cell.isSelected && 'border-[#f4a0b8]',
            )}
          >
            <span>{cell.date.getDate()}</span>
            <div className="absolute bottom-1 left-1/2 inline-flex -translate-x-1/2 items-center gap-0.5">
              {cell.tags.slice(0, 2).map((tag) => (
                <i key={`${cell.dateKey}-${tag}`} className={cn('h-1 w-1 rounded-full', TAG_COLOR[tag])} />
              ))}
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}
