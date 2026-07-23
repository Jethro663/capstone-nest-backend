'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Bell,
  RefreshCcw,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { useNotifications } from '@/providers/NotificationProvider';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { schoolEventService } from '@/services/school-event-service';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import {
  TeacherPageShell,
  TeacherSectionCard,
  TeacherStatCard,
} from '@/components/teacher/TeacherPageShell';
import type { ClassItem } from '@/types/class';
import type { SchoolEvent } from '@/types/school-event';

interface PendingAssessment {
  assessmentId: string;
  title: string;
  classId: string;
  className: string;
  dueDate: string;
  dayLabel: string;
  monthLabel: string;
  isUrgent: boolean;
}

function formatEventDate(iso: string) {
  const d = new Date(iso);
  return {
    day: d.getDate(),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
    full: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}

function daysUntil(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export default function TeacherDashboardPage() {
  const { user } = useAuth();
  const { notifications, unreadCount } = useNotifications();
  const firstName = user?.firstName ?? 'Teacher';

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [allAssessments, setAllAssessments] = useState<PendingAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const unseenNotifications = useMemo(
    () => notifications.filter((n) => !n.isRead).slice(0, 6),
    [notifications],
  );

  const fetchDashboardData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [classesRes, eventsRes] = await Promise.all([
        classService.getByTeacher(user.id, 'active'),
        schoolEventService.getAll({ from: new Date().toISOString() }),
      ]);

      const classList = Array.isArray(classesRes.data) ? classesRes.data : [];
      setClasses(classList);

      const eventList = Array.isArray(eventsRes.data) ? eventsRes.data : [];
      setEvents(eventList);

      const now = new Date().toISOString();
      const pendingAssessments: PendingAssessment[] = [];

      await Promise.all(
        classList.map(async (cls) => {
          try {
            const res = await assessmentService.getByClass(cls.id, { status: 'all', limit: 50 });
            const items = Array.isArray(res.data) ? res.data : [];
            for (const a of items) {
              if (a.isPublished === false) continue;
              if (a.dueDate && a.dueDate > now) {
                const d = new Date(a.dueDate);
                pendingAssessments.push({
                  assessmentId: a.id,
                  title: a.title,
                  classId: cls.id,
                  className: cls.subjectName || cls.subjectCode,
                  dueDate: a.dueDate,
                  dayLabel: String(d.getDate()),
                  monthLabel: d.toLocaleDateString('en-US', { month: 'short' }),
                  isUrgent: daysUntil(a.dueDate) <= 3,
                });
              }
            }
          } catch {
            // skip failed class
          }
        }),
      );

      pendingAssessments.sort(
        (a, b) => Date.parse(a.dueDate) - Date.parse(b.dueDate),
      );
      setAllAssessments(pendingAssessments);
    } catch {
      // silently fail
    }
  }, [user]);

  const loadAll = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      await fetchDashboardData();
      setLoading(false);
      setRefreshing(false);
    },
    [fetchDashboardData],
  );

  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadAll(false);
  }, [loadAll]);

  const totalStudents = useMemo(
    () => classes.reduce((sum, c) => sum + (c.enrollments?.length ?? 0), 0),
    [classes],
  );

  return (
    <TeacherPageShell
      title={`Welcome back, ${firstName}`}
      description="Here's an overview of your classes and what needs your attention."
      actions={
        <Button
          variant="outline"
          size="sm"
          className="rounded-xl border-[var(--teacher-outline-strong)] bg-white text-[var(--teacher-text-strong)] hover:bg-[var(--teacher-surface-soft)]"
          onClick={() => void loadAll(true)}
          disabled={refreshing}
        >
          <RefreshCcw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
          Refresh
        </Button>
      }
      stats={
        <>
          <TeacherStatCard label="Active Classes" value={classes.length} accent="sky" caption="Currently teaching" />
          <TeacherStatCard label="Total Students" value={totalStudents} accent="teal" caption="Across all classes" />
          <TeacherStatCard label="Pending Tasks" value={allAssessments.length} accent="amber" caption="Awaiting due dates" />
          <TeacherStatCard label="Notifications" value={unreadCount} accent="rose" caption="Unread updates" />
        </>
      }
    >
      {/* Upcoming Events */}
      <TeacherSectionCard
        title="Upcoming Events"
        description="School events and holidays"
        action={
          <Link
            href="/dashboard/teacher/calendar"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--teacher-accent)] transition hover:bg-[var(--teacher-surface-soft)]"
          >
            View Calendar
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--teacher-outline)] px-5 py-8 text-center">
            <CalendarDays className="mx-auto mb-2 h-8 w-8 text-[var(--teacher-text-muted)]" />
            <p className="text-sm font-semibold text-[var(--teacher-text-strong)]">No upcoming events</p>
            <p className="mt-1 text-xs text-[var(--teacher-text-muted)]">
              School events and holidays will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {events.slice(0, 5).map((event) => {
              const date = formatEventDate(event.startsAt);
              const isHoliday = event.eventType === 'holiday_break';
              return (
                <div
                  key={event.id}
                  className={cn(
                    'flex items-center gap-3 rounded-xl border p-3 transition',
                    isHoliday
                      ? 'border-[#fde68a] bg-[#fffbeb]'
                      : 'border-[var(--teacher-outline)] bg-[var(--teacher-surface)]',
                  )}
                >
                  <div
                    className={cn(
                      'grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl border text-center',
                      isHoliday
                        ? 'border-[#fde68a] bg-[#fff7d6] text-[#b45309]'
                        : 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
                    )}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider">{date.month}</p>
                    <p className="text-lg font-bold leading-none">{date.day}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--teacher-text-strong)]">
                      {event.title}
                    </p>
                    <p className="truncate text-xs text-[var(--teacher-text-muted)]">
                      {date.weekday} &middot; {date.full}
                      {event.location ? ` \u00B7 ${event.location}` : ''}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </TeacherSectionCard>

      {/* Pending Assignments per Class */}
      <TeacherSectionCard
        title="Pending Assignments"
        description="Upcoming assessments across your classes"
        action={
          <Link
            href="/dashboard/teacher/assessments"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--teacher-accent)] transition hover:bg-[var(--teacher-surface-soft)]"
          >
            All Assessments
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : allAssessments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--teacher-outline)] px-5 py-8 text-center">
            <ClipboardList className="mx-auto mb-2 h-8 w-8 text-[var(--teacher-text-muted)]" />
            <p className="text-sm font-semibold text-[var(--teacher-text-strong)]">No pending assignments</p>
            <p className="mt-1 text-xs text-[var(--teacher-text-muted)]">
              Assessments with upcoming due dates will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {allAssessments.slice(0, 8).map((item) => (
              <Link
                key={item.assessmentId}
                href={`/dashboard/teacher/assessments/${item.assessmentId}`}
                className={cn(
                  'group flex items-center gap-3 rounded-xl border p-3 transition hover:-translate-y-0.5',
                  item.isUrgent
                    ? 'border-[#fecdd3] bg-[#fff1f5]'
                    : 'border-[var(--teacher-outline)] bg-[var(--teacher-surface)] hover:border-[var(--teacher-outline-strong)] hover:bg-white',
                )}
              >
                <div
                  className={cn(
                    'grid h-14 w-14 flex-shrink-0 place-items-center rounded-xl border text-center',
                    item.isUrgent
                      ? 'border-[#fecdd3] bg-[#fff1f5] text-[#be123c]'
                      : 'border-[var(--teacher-outline)] bg-white text-[var(--teacher-text-strong)]',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wider">{item.monthLabel}</p>
                  <p className="text-lg font-bold leading-none">{item.dayLabel}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--teacher-text-strong)]">
                    {item.title}
                  </p>
                  <p className="truncate text-xs text-[var(--teacher-text-muted)]">
                    {item.className}
                    {item.isUrgent ? ' \u00B7 Due soon' : ''}
                  </p>
                </div>
                {item.isUrgent ? (
                  <span className="shrink-0 rounded-full border border-[#fecdd3] bg-[#ffe4e6] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#be123c]">
                    Urgent
                  </span>
                ) : null}
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--teacher-text-muted)] transition group-hover:text-[var(--teacher-accent)]" />
              </Link>
            ))}
          </div>
        )}
      </TeacherSectionCard>

      {/* Unseen Notifications */}
      <TeacherSectionCard
        title="Notifications"
        description="Recent updates you haven't seen yet"
        action={
          <Link
            href="/dashboard/notifications"
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-[var(--teacher-accent)] transition hover:bg-[var(--teacher-surface-soft)]"
          >
            See All
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {unseenNotifications.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--teacher-outline)] px-5 py-8 text-center">
            <Bell className="mx-auto mb-2 h-8 w-8 text-[var(--teacher-text-muted)]" />
            <p className="text-sm font-semibold text-[var(--teacher-text-strong)]">All caught up</p>
            <p className="mt-1 text-xs text-[var(--teacher-text-muted)]">
              You have no unread notifications right now.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {unseenNotifications.map((notification) => (
              <Link
                key={notification.id}
                href="/dashboard/notifications"
                className="group flex items-center gap-3 rounded-xl border border-[var(--teacher-outline)] bg-[var(--teacher-surface)] p-3 transition hover:-translate-y-0.5 hover:border-[var(--teacher-outline-strong)] hover:bg-white"
              >
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--teacher-accent)]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--teacher-text-strong)]">
                    {notification.title}
                  </p>
                  <p className="truncate text-xs text-[var(--teacher-text-muted)]">
                    {notification.message || notification.body || ''}
                  </p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-[var(--teacher-text-muted)]">
                  {formatEventDate(notification.createdAt).weekday} {formatEventDate(notification.createdAt).day}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[var(--teacher-text-muted)] transition group-hover:text-[var(--teacher-accent)]" />
              </Link>
            ))}
          </div>
        )}
      </TeacherSectionCard>
    </TeacherPageShell>
  );
}
