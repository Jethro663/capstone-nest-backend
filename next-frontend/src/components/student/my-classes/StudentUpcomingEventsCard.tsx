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
  assessment: 'bg-[var(--student-accent)]',
  announcement: 'bg-[var(--student-warning-text)]',
  event: 'bg-[var(--student-navy-soft)]',
  holiday: 'bg-[var(--student-success-text)]',
};

const DATE_BADGE_CLASS: Record<StudentEventTag, string> = {
  assessment: 'border-[var(--student-danger-border)] bg-[var(--student-danger-bg)] text-[var(--student-accent)]',
  announcement: 'border-[var(--student-warning-border)] bg-[var(--student-warning-bg)] text-[var(--student-accent)]',
  event: 'border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]',
  holiday: 'border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]',
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
  seeAllHref = '/dashboard/student/calendar?view=upcoming',
}: StudentUpcomingEventsCardProps) {
  const selectedEvents = events.filter((event) => event.dateKey === selectedDateKey);
  const sourceEvents = selectedEvents.length > 0 ? selectedEvents : events;
  const visibleEvents = sourceEvents.slice(0, 5);
  const remainingCount = Math.max(sourceEvents.length - visibleEvents.length, 0);

  return (
    <article className="rounded-[1.4rem] border border-[var(--student-outline)] bg-[var(--student-surface-soft)] p-4 shadow-[0_20px_34px_-28px_color-mix(in_srgb,var(--student-navy)_45%,transparent)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-start gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-[var(--student-outline)] bg-white text-[var(--student-navy-soft)]">
            <CalendarClock className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-[var(--student-text-muted)]">Upcoming</p>
            <h3 className="text-[1.35rem] font-semibold tracking-tight text-[var(--student-navy)]">
              {selectedEvents.length > 0 ? 'Events on selected day' : 'Upcoming Events'}
            </h3>
          </div>
        </div>

        <Link
          href={seeAllHref}
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm font-semibold text-[var(--student-accent)] transition hover:bg-[var(--student-danger-bg)]"
        >
          See All{remainingCount > 0 ? ` (${remainingCount} more)` : ''}
          <ChevronRight className="h-4 w-4" />
        </Link>
      </header>

      {visibleEvents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--student-outline)] bg-white px-4 py-6 text-center">
          <p className="text-sm font-semibold text-[var(--student-navy-soft)]">No events yet.</p>
          <p className="mt-1 text-xs text-[var(--student-text-muted)]">Class updates and deadlines will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleEvents.map((event) => (
            <Link
              key={event.id}
              href={event.href}
              className="group relative block overflow-hidden rounded-2xl border border-[var(--student-outline)] bg-white p-3.5 transition hover:border-[var(--student-outline-strong)] hover:shadow-[0_18px_28px_-24px_color-mix(in_srgb,var(--student-navy)_50%,transparent)]"
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
                  <p className="truncate text-[1.03rem] font-semibold text-[var(--student-navy)]">{event.title}</p>
                  <p className="mt-0.5 truncate text-sm text-[var(--student-text-muted)]">{event.subtitle}</p>
                  <span className="mt-1.5 inline-flex rounded-full border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--student-navy-soft)]">
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
