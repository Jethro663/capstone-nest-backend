'use client';

import Link from 'next/link';
import { CalendarClock, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { StudentEventTag, StudentUpcomingEvent } from './types';

interface StudentUpcomingEventsCardProps {
  events: StudentUpcomingEvent[];
  selectedDateKey: string;
  seeAllHref?: string;
}

const TAG_ACCENT_CLASS: Record<StudentEventTag, string> = {
  assessment: 'bg-[#d81b50]',
  announcement: 'bg-[#f97316]',
  event: 'bg-[#0284c7]',
  holiday: 'bg-[#059669]',
};

const DATE_BADGE_CLASS: Record<StudentEventTag, string> = {
  assessment: 'border-[#f7bfd1] bg-[#fff2f7] text-[#b11140]',
  announcement: 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]',
  event: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
  holiday: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]',
};

function tagLabel(tag: StudentEventTag) {
  if (tag === 'assessment') return 'Assessment';
  if (tag === 'announcement') return 'Announcement';
  if (tag === 'holiday') return 'Holiday';
  return 'Event';
}

export function StudentUpcomingEventsCard({
  events,
  selectedDateKey,
  seeAllHref = '/dashboard/student/announcements',
}: StudentUpcomingEventsCardProps) {
  const selectedEvents = events.filter((event) => event.dateKey === selectedDateKey);
  const visibleEvents = (selectedEvents.length > 0 ? selectedEvents : events).slice(0, 6);

  return (
    <article className="rounded-[1.4rem] border border-[#e1deeb] bg-[#fbfafe] p-4 shadow-[0_20px_34px_-28px_rgba(22,32,58,0.45)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-start gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[#e2deeb] bg-white text-[#3b4561]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[#7d8399]">Upcoming</p>
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-[#11192f]">
              {selectedEvents.length > 0 ? 'Events on selected day' : 'Upcoming Events'}
            </h3>
          </div>
        </div>

        <Link
          href={seeAllHref}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-[#d81b50] transition hover:bg-[#ffeaf1]"
        >
          See All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </header>

      {visibleEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#d7d3e4] bg-white px-4 py-6 text-center">
          <p className="text-sm font-semibold text-[#27304a]">No events yet.</p>
          <p className="mt-1 text-xs text-[#7280a0]">Class updates and deadlines will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleEvents.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              className="group relative block overflow-hidden rounded-2xl border border-[#e2dfeb] bg-white p-3.5 transition hover:-translate-y-0.5 hover:border-[#d3cedf] hover:shadow-[0_18px_28px_-24px_rgba(22,32,58,0.5)]"
            >
              <i
                className={cn(
                  'absolute inset-y-0 left-0 w-1.5 rounded-l-2xl',
                  TAG_ACCENT_CLASS[event.tag],
                )}
              />

              <div className="ml-1.5 flex items-center gap-3">
                <div
                  className={cn(
                    'grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border text-center',
                    DATE_BADGE_CLASS[event.tag],
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em]">{event.monthLabel}</p>
                  <p className="text-lg font-semibold leading-none">{event.dayLabel}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.03rem] font-semibold text-[#11192f]">{event.title}</p>
                  <p className="mt-0.5 truncate text-sm text-[#5f6d8b]">{event.subtitle}</p>
                  <span className="mt-1.5 inline-flex rounded-full border border-[#e4e2ec] bg-[#f8f7fc] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[#5b6783]">
                    {tagLabel(event.tag)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </article>
  );
}
