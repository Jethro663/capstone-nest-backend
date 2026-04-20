'use client';

import Link from 'next/link';
import { AlarmClockCheck, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

export type DeadlineTag = 'assessment' | 'announcement' | 'event';

export interface UpcomingDeadlineItem {
  id: string;
  classId: string;
  title: string;
  tag: DeadlineTag;
  dateKey: string;
  dayLabel: string;
  monthLabel: string;
  meta: string;
  href: string;
  isUrgent: boolean;
}

interface UpcomingDeadlinesCardProps {
  deadlines: UpcomingDeadlineItem[];
  seeAllHref?: string;
}

const TAG_STRIP_CLASS: Record<DeadlineTag, string> = {
  assessment: 'bg-[#f43f5e]',
  announcement: 'bg-[#38bdf8]',
  event: 'bg-[#f59e0b]',
};

const TAG_LABEL: Record<DeadlineTag, string> = {
  assessment: 'Assessment',
  announcement: 'Announcement',
  event: 'Event',
};

export function UpcomingDeadlinesCard({
  deadlines,
  seeAllHref = '/dashboard/teacher/calendar',
}: UpcomingDeadlinesCardProps) {
  const visibleDeadlines = deadlines.slice(0, 6);

  return (
    <article className="rounded-[1.5rem] border border-[#1f2b4f] bg-[linear-gradient(155deg,#11192f_0%,#162544_58%,#1d3054_100%)] p-4 text-white shadow-[0_24px_42px_-30px_rgba(10,20,45,0.95)]">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="inline-flex items-start gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/20 bg-white/10 text-[#fda4af]">
            <AlarmClockCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.09em] text-white/65">Stay Ready</p>
            <h2 className="text-[1.35rem] font-semibold tracking-tight">Upcoming Deadlines</h2>
          </div>
        </div>

        <Link
          href={seeAllHref}
          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-white/12"
        >
          View All
          <ChevronRight className="h-4 w-4" />
        </Link>
      </header>

      {visibleDeadlines.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-6 text-center">
          <p className="text-sm font-semibold text-white">No upcoming deadlines yet.</p>
          <p className="mt-1 text-xs text-white/70">Published tasks with due dates will appear here.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {visibleDeadlines.map((deadline) => (
            <Link
              key={deadline.id}
              href={deadline.href}
              className="group relative block overflow-hidden rounded-2xl border border-white/15 bg-white/5 p-3.5 transition hover:-translate-y-0.5 hover:border-white/30 hover:bg-white/[0.09]"
            >
              <i
                className={cn(
                  'absolute inset-y-0 left-0 w-1.5 rounded-l-2xl',
                  deadline.isUrgent ? 'bg-[#fb7185]' : TAG_STRIP_CLASS[deadline.tag],
                )}
              />

              <div className="ml-1.5 flex items-center gap-3">
                <div
                  className={cn(
                    'grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl border text-center',
                    deadline.isUrgent
                      ? 'border-[#fda4af]/70 bg-[#4a1224] text-[#fecdd3]'
                      : 'border-white/25 bg-[#0f1f3d] text-white',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.09em]">{deadline.monthLabel}</p>
                  <p className="text-lg font-semibold leading-none">{deadline.dayLabel}</p>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1.02rem] font-semibold text-white">{deadline.title}</p>
                  <p className="mt-0.5 truncate text-sm text-white/75">{deadline.meta}</p>
                  <span
                    className={cn(
                      'mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.09em]',
                      deadline.isUrgent
                        ? 'border-[#fb7185]/50 bg-[#fb7185]/15 text-[#fecdd3]'
                        : 'border-white/25 bg-white/10 text-white/85',
                    )}
                  >
                    {deadline.isUrgent ? 'Urgent' : TAG_LABEL[deadline.tag]}
                  </span>
                </div>

                <ChevronRight className="h-4 w-4 flex-shrink-0 text-white/65 transition group-hover:text-white" />
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        href={seeAllHref}
        className="mt-4 inline-flex h-10 w-full items-center justify-center rounded-xl border border-white/20 bg-white/10 text-sm font-semibold text-white transition hover:bg-white/15"
      >
        Open Class Calendar
      </Link>
    </article>
  );
}
