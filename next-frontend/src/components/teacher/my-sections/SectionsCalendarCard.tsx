'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { SectionEventTag } from './types';
import { toDateKey } from './types';

interface SectionsCalendarCardProps {
  month: Date;
  selectedDateKey: string;
  eventTagsByDate: Map<string, SectionEventTag[]>;
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
  tags: SectionEventTag[];
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const TAG_COLOR: Record<SectionEventTag, string> = {
  assessment: 'bg-[#fb7185]',
  announcement: 'bg-[#f59e0b]',
  event: 'bg-[#38bdf8]',
  holiday: 'bg-[#34d399]',
};

function buildCalendarCells(
  month: Date,
  selectedDateKey: string,
  eventTagsByDate: Map<string, SectionEventTag[]>,
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

export function SectionsCalendarCard({
  month,
  selectedDateKey,
  eventTagsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: SectionsCalendarCardProps) {
  const monthLabel = useMemo(
    () =>
      month.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [month],
  );

  const cells = useMemo(
    () => buildCalendarCells(month, selectedDateKey, eventTagsByDate),
    [month, selectedDateKey, eventTagsByDate],
  );

  return (
    <article className="rounded-[1.4rem] border border-[#20315e] bg-[linear-gradient(160deg,#111a30_0%,#18284b_58%,#1f355f_100%)] p-4 text-white shadow-[0_26px_40px_-28px_rgba(10,16,32,0.9)]">
      <header className="flex items-center justify-between">
        <h2 className="text-[1.45rem] font-semibold tracking-tight text-white">{monthLabel}</h2>
        <div className="inline-flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            onClick={onPrevMonth}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            onClick={onNextMonth}
            className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_LABELS.map((label, index) => (
          <span
            key={`${label}-${index}`}
            className="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/65"
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
              'relative grid min-h-[2.4rem] place-items-center rounded-xl border text-sm font-semibold transition',
              cell.isSelected
                ? 'border-[#d81b50] bg-[#d81b50] text-white shadow-[0_16px_24px_-20px_rgba(216,27,80,0.95)]'
                : 'border-white/12 bg-white/8 text-white hover:border-white/25 hover:bg-white/15',
              !cell.inCurrentMonth && !cell.isSelected && 'text-white/35',
              cell.isToday && !cell.isSelected && 'border-[#fb7185]/80',
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
