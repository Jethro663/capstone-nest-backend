'use client';

import { useMemo } from 'react';
import { CalendarDays, Megaphone } from 'lucide-react';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';

interface TeacherContextRailProps {
  announcements: Announcement[];
  classes?: ClassItem[];
  title?: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getMonthGrid(baseDate: Date) {
  const monthStart = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const monthEnd = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
  const firstWeekday = monthStart.getDay();
  const daysInMonth = monthEnd.getDate();
  const totalSlots = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalSlots }, (_entry, index) => {
    const day = index - firstWeekday + 1;
    if (day < 1 || day > daysInMonth) return null;
    return day;
  });
}

function formatScheduleRow(classItem: ClassItem) {
  if (!classItem.schedules || classItem.schedules.length === 0) return 'Schedule TBA';
  const schedule = classItem.schedules[0];
  return `${schedule.days.join('/')} ${schedule.startTime}-${schedule.endTime}`;
}

export function TeacherContextRail({
  announcements,
  classes = [],
  title = 'Today',
}: TeacherContextRailProps) {
  const now = useMemo(() => new Date(), []);
  const monthLabel = useMemo(
    () =>
      now.toLocaleString('en-US', {
        month: 'long',
        year: 'numeric',
      }),
    [now],
  );
  const monthGrid = useMemo(() => getMonthGrid(now), [now]);
  const today = now.getDate();

  const upcomingClasses = useMemo(
    () => classes.filter((entry) => (entry.schedules?.length ?? 0) > 0).slice(0, 4),
    [classes],
  );

  return (
    <aside className="teacher-context-rail">
      <section className="teacher-context-card">
        <div className="teacher-context-card__header">
          <div>
            <p className="teacher-context-card__eyebrow">{title}</p>
            <h3>{monthLabel}</h3>
          </div>
          <CalendarDays className="h-4 w-4" />
        </div>

        <div className="teacher-context-calendar">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label}>{label}</span>
          ))}
          {monthGrid.map((day, index) => (
            <span
              key={`day-${index}`}
              data-state={day === today ? 'today' : day ? 'active' : 'empty'}
            >
              {day ?? ''}
            </span>
          ))}
        </div>
      </section>

      <section className="teacher-context-card">
        <div className="teacher-context-card__header">
          <div>
            <p className="teacher-context-card__eyebrow">Upcoming</p>
            <h3>Class Schedule</h3>
          </div>
        </div>
        <div className="teacher-context-list">
          {upcomingClasses.length === 0 ? (
            <p className="teacher-context-empty">No scheduled classes yet.</p>
          ) : (
            upcomingClasses.map((classItem) => (
              <article key={classItem.id} className="teacher-context-list__item">
                <p className="teacher-context-list__title">{classItem.subjectName}</p>
                <p>{classItem.section?.name ?? 'Section not set'}</p>
                <p>{formatScheduleRow(classItem)}</p>
              </article>
            ))
          )}
        </div>
      </section>

      <section className="teacher-context-card">
        <div className="teacher-context-card__header">
          <div>
            <p className="teacher-context-card__eyebrow">Notices</p>
            <h3>Announcements</h3>
          </div>
          <Megaphone className="h-4 w-4" />
        </div>
        <div className="teacher-context-list">
          {announcements.length === 0 ? (
            <p className="teacher-context-empty">No announcements yet.</p>
          ) : (
            announcements.slice(0, 5).map((announcement) => (
              <article key={announcement.id} className="teacher-context-list__item">
                <p className="teacher-context-list__title">{announcement.title}</p>
                <p>{announcement.content}</p>
              </article>
            ))
          )}
        </div>
      </section>
    </aside>
  );
}
