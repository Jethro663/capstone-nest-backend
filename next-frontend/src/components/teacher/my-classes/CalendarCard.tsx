'use client';

import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export type CalendarEventTag = 'assessment' | 'event' | 'holiday';

interface CalendarCardProps {
  month: Date;
  selectedDateKey: string;
  eventTagsByDate: Map<string, CalendarEventTag[]>;
  onSelectDate: (dateKey: string) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

interface CalendarCell {
  date: Date;
  dateKey: string;
  inMonth: boolean;
  isToday: boolean;
  tags: CalendarEventTag[];
}

const WEEKDAY_LABELS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const TAG_COLORS: Record<CalendarEventTag, string> = {
  assessment: 'bg-[#f43f5e]',
  event: 'bg-[#38bdf8]',
  holiday: 'bg-[#f59e0b]',
};

export function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildCalendarCells(
  month: Date,
  selectedDateKey: string,
  eventTagsByDate: Map<string, CalendarEventTag[]>,
) {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const startOffset = monthStart.getDay();
  const firstCell = new Date(monthStart);
  firstCell.setDate(monthStart.getDate() - startOffset);
  const todayKey = toDateKey(new Date());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    const dateKey = toDateKey(date);

    return {
      date,
      dateKey,
      inMonth: date >= monthStart && date <= monthEnd,
      isToday: dateKey === todayKey,
      isSelected: dateKey === selectedDateKey,
      tags: eventTagsByDate.get(dateKey) ?? [],
    };
  });
}

export function CalendarCard({
  month,
  selectedDateKey,
  eventTagsByDate,
  onSelectDate,
  onPrevMonth,
  onNextMonth,
}: CalendarCardProps) {
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
    <article className="rounded-[1.5rem] border border-[#142958] bg-[linear-gradient(145deg,#0b1736,#122752_55%,#1a3568)] p-4 text-white shadow-[0_22px_38px_-26px_rgba(11,23,54,0.9)]">
      <header className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight">{monthLabel}</h2>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            aria-label="Previous month"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15"
            onClick={onPrevMonth}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next month"
            className="grid h-8 w-8 place-items-center rounded-full border border-white/20 bg-white/5 text-white transition hover:bg-white/15"
            onClick={onNextMonth}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-7 gap-1.5 text-center">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label} className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/65">
            {label}
          </span>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-1.5">
        {cells.map((cell: CalendarCell & { isSelected: boolean }) => (
          <button
            key={cell.dateKey}
            type="button"
            onClick={() => onSelectDate(cell.dateKey)}
            className={cn(
              'group relative flex min-h-[2.35rem] flex-col items-center justify-center rounded-xl border text-xs font-semibold transition',
              cell.inMonth ? 'text-white' : 'text-white/35',
              cell.isSelected
                ? 'border-[#f43f5e] bg-[#f43f5e] text-white shadow-[0_12px_22px_-16px_rgba(244,63,94,0.8)]'
                : 'border-white/10 bg-white/5 hover:bg-white/12',
              !cell.isSelected && cell.isToday && 'border-[#fda4af]/80',
            )}
          >
            <span>{cell.date.getDate()}</span>
            <div className="mt-1 flex min-h-[0.3rem] items-center gap-1">
              {cell.tags.slice(0, 3).map((tag) => (
                <i
                  key={`${cell.dateKey}-${tag}`}
                  className={cn('inline-flex h-[0.28rem] w-[0.28rem] rounded-full', TAG_COLORS[tag])}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </article>
  );
}
