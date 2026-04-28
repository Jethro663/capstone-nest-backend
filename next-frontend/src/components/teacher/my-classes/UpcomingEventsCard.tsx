'use client';

import Link from 'next/link';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { CalendarEventTag } from './CalendarCard';

export interface UpcomingEventItem {
  id: string;
  classId: string;
  title: string;
  tag: CalendarEventTag;
  dateKey: string;
  dayLabel: string;
  monthLabel: string;
  meta: string;
  href: string;
}

interface UpcomingEventsCardProps {
  events: UpcomingEventItem[];
  selectedDateKey: string;
}

const EVENT_CHIP_STYLES: Record<CalendarEventTag, string> = {
  assessment: 'border-[#fecdd8] bg-[#ffe8ef] text-[#be123c]',
  event: 'border-[#bfdbfe] bg-[#eaf2ff] text-[#1d4ed8]',
  holiday: 'border-[#fde68a] bg-[#fff6d9] text-[#b45309]',
};

const DATE_BADGE_STYLES: Record<CalendarEventTag, string> = {
  assessment: 'border-[#fecdd8] bg-[#fff1f5] text-[#be123c]',
  event: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
  holiday: 'border-[#fde68a] bg-[#fffbeb] text-[#b45309]',
};

export function UpcomingEventsCard({
  events,
  selectedDateKey,
}: UpcomingEventsCardProps) {
  const selectedDateEvents = events.filter((event) => event.dateKey === selectedDateKey);
  const visibleEvents = (selectedDateEvents.length > 0 ? selectedDateEvents : events).slice(0, 6);

  return (
    <article className="rounded-[1.5rem] border border-[#d9deea] bg-[#ffffff] p-4 shadow-[0_18px_36px_-28px_rgba(15,23,42,0.4)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#5c6b88]">Mission Alerts</p>
          <h2 className="text-xl font-semibold tracking-tight text-[#0b1736]">
            {selectedDateEvents.length > 0 ? 'Events on selected day' : 'Upcoming Events'}
          </h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[#dce3ef] bg-[#f8f9fd] text-[#223863]">
          <CalendarDays className="h-5 w-5" />
        </div>
      </header>

      {visibleEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#cfd8e9] bg-[#f9fbff] px-4 py-7 text-center">
          <p className="text-sm font-medium text-[#4a5c7c]">No upcoming events yet.</p>
          <p className="mt-1 text-xs text-[#7183a4]">When announcements are posted, they will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleEvents.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              className="group flex items-center gap-3 rounded-2xl border border-[#e3e8f4] bg-[#f8f9fd] p-3 transition hover:-translate-y-0.5 hover:border-[#cfd8eb] hover:bg-white"
            >
              <div
                className={cn(
                  'grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border text-center',
                  DATE_BADGE_STYLES[event.tag],
                )}
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em]">{event.monthLabel}</p>
                <p className="text-lg font-semibold leading-none">{event.dayLabel}</p>
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[#0f172a]">{event.title}</p>
                <p className="truncate text-xs text-[#617393]">{event.meta}</p>
                <span
                  className={cn(
                    'mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]',
                    EVENT_CHIP_STYLES[event.tag],
                  )}
                >
                  {event.tag}
                </span>
              </div>

              <ChevronRight className="h-4 w-4 flex-shrink-0 text-[#7082a6] transition group-hover:text-[#20355d]" />
            </Link>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/teacher/calendar"
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-[#d2dae9] bg-white text-sm font-semibold text-[#1f365f] transition hover:bg-[#f2f5fb]"
      >
        View Full Calendar
      </Link>
    </article>
  );
}
