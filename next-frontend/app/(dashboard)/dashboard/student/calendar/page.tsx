'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { SchoolEvent } from '@/types/school-event';
import {
  buildCalendarDayIndex,
  buildMonthCells,
  buildSchoolYearList,
  CALENDAR_KIND_LABEL,
  formatMonthLabel,
  getCurrentSchoolYearReference,
  getMarkerKindsForDay,
  normalizeCalendarFeed,
  shiftMonth,
  toDateKey,
  type CalendarFeedItem,
  type CalendarFeedKind,
} from '@/utils/calendar-feed';
import type { StudentEventTag } from '@/components/student/my-classes/types';
import { cn } from '@/utils/cn';
import { buildStudentUpcomingEvents } from '@/utils/student-upcoming-events';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const SCHOOL_EVENTS_FEED_KEY_PREFIX = 'school-events:';
const UPCOMING_PAGE_SIZE = 10;

type StudentPageStatus = 'loading' | 'ready' | 'error' | 'partial';

type CalendarFeedPayload =
  | { kind: 'assessment'; classId: string; data: Assessment[] }
  | { kind: 'announcement'; classId: string; data: Announcement[] }
  | { kind: 'school-events'; schoolYear: string; data: SchoolEvent[] };

const DETAIL_KIND_ACCENT: Record<CalendarFeedKind, string> = {
  assessment: 'border-[var(--student-danger-border)] bg-[var(--student-danger-bg)] text-[var(--student-accent)]',
  announcement: 'border-[var(--student-warning-border)] bg-[var(--student-warning-bg)] text-[var(--student-accent)]',
  school_event: 'border-[var(--student-outline)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]',
  holiday_break: 'border-[var(--student-success-border)] bg-[var(--student-success-bg)] text-[var(--student-success-text)]',
  class_schedule: 'border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]',
};

const MARKER_DOT_CLASS: Record<StudentEventTag, string> = {
  assessment: 'bg-[var(--student-accent)]',
  announcement: 'bg-[var(--student-warning-text)]',
  event: 'bg-[var(--student-navy-soft)]',
  holiday: 'bg-[var(--student-success-text)]',
};

function stripHtml(raw?: string | null) {
  if (!raw) return '';
  return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatDateLabel(dateKey: string) {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return 'Selected day';

  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTimeWindow(item: CalendarFeedItem) {
  if (item.allDay) return 'All day';

  const startsAt = new Date(item.startsAt);
  const endsAt = new Date(item.endsAt);

  if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    return 'Time unavailable';
  }

  return `${startsAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${endsAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

function getFeedItemHref(item: CalendarFeedItem) {
  if (!item.classId) return null;
  if (item.kind === 'announcement') {
    return `/dashboard/student/classes/${item.classId}?view=announcements`;
  }
  if (item.kind === 'class_schedule') {
    return `/dashboard/student/classes/${item.classId}?view=calendar`;
  }
  return `/dashboard/student/classes/${item.classId}`;
}

function toStudentEventTag(kind: CalendarFeedKind): StudentEventTag | null {
  if (kind === 'assessment') return 'assessment';
  if (kind === 'announcement') return 'announcement';
  if (kind === 'school_event') return 'event';
  if (kind === 'holiday_break') return 'holiday';
  return null;
}

function getSupportingCopy(item: CalendarFeedItem) {
  if (item.kind === 'class_schedule') {
    return item.description || 'Scheduled class meeting';
  }

  const text = stripHtml(item.description);
  if (text) return text;
  if (item.kind === 'assessment') return 'Assessment deadline';
  if (item.kind === 'announcement') return 'Class update';
  if (item.kind === 'holiday_break') return 'School holiday or break';
  return 'School event';
}

export default function StudentCalendarPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const searchParams = useSearchParams();
  const isUpcomingView = searchParams.get('view') === 'upcoming';
  const requestedDateParam = searchParams.get('date');

  const [classStatus, setClassStatus] = useState<StudentPageStatus>('loading');
  const [feedStatus, setFeedStatus] = useState<StudentPageStatus>('loading');
  const [failedFeedKeys, setFailedFeedKeys] = useState<string[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [assessmentsByClass, setAssessmentsByClass] = useState<Record<string, Assessment[]>>({});
  const [announcementsByClass, setAnnouncementsByClass] = useState<Record<string, Announcement[]>>(
    {},
  );
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => {
    return requestedDateParam && /^\d{4}-\d{2}-\d{2}$/.test(requestedDateParam)
      ? requestedDateParam
      : toDateKey(new Date());
  });
  const classRequestIdRef = useRef(0);
  const feedRequestIdRef = useRef(0);
  const feedHasFulfilledSourceRef = useRef(false);

  const fetchClasses = useCallback(() => {
    if (!userId) {
      void Promise.resolve().then(() => setClassStatus('error'));
      return;
    }

    const requestId = ++classRequestIdRef.current;
    const request = Promise.all([
      classService.getByStudent(userId, 'active'),
      classService.getByStudent(userId, 'hidden'),
    ]);

    void Promise.resolve().then(() => {
      if (requestId === classRequestIdRef.current) setClassStatus('loading');
    });
    void request
      .then(([visibleResponse, hiddenResponse]) => {
        if (requestId !== classRequestIdRef.current) return;
        const classMap = new Map<string, ClassItem>();
        for (const classItem of [
          ...(visibleResponse.data || []),
          ...(hiddenResponse.data || []),
        ]) {
          classMap.set(classItem.id, classItem);
        }
        setClasses(Array.from(classMap.values()).filter((classItem) => classItem.isActive));
        setClassStatus('ready');
      })
      .catch(() => {
        if (requestId !== classRequestIdRef.current) return;
        setClassStatus('error');
      });
  }, [userId]);

  useEffect(() => {
    void fetchClasses();
    return () => {
      classRequestIdRef.current += 1;
    };
  }, [fetchClasses]);

  useEffect(() => {
    const nextOptions = buildSchoolYearList(classes, schoolEvents);
    if (selectedSchoolYear && nextOptions.includes(selectedSchoolYear)) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) {
        setSelectedSchoolYear(
          classes[0]?.schoolYear || nextOptions[0] || getCurrentSchoolYearReference(),
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [classes, schoolEvents, selectedSchoolYear]);

  useEffect(() => {
    const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);
    if (!selectedClass) return;
    if (selectedClass.schoolYear === selectedSchoolYear) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) setSelectedClassId('all');
    });
    return () => {
      cancelled = true;
    };
  }, [classes, selectedClassId, selectedSchoolYear]);

  useEffect(() => {
    if (!requestedDateParam || !/^\d{4}-\d{2}-\d{2}$/.test(requestedDateParam)) return;
    const parsed = new Date(`${requestedDateParam}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return;
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (cancelled) return;
      setSelectedDateKey(requestedDateParam);
      setCalendarMonth(new Date(parsed.getFullYear(), parsed.getMonth(), 1));
    });
    return () => {
      cancelled = true;
    };
  }, [requestedDateParam]);

  const loadCalendarFeed = useCallback(
    (retryKeys?: string[]) => {
      if (classStatus !== 'ready') {
        return;
      }

      const isRetry = Array.isArray(retryKeys);
      const scopedClasses = classes.filter((classItem) => classItem.isActive);
      const schoolYears = Array.from(
        new Set(scopedClasses.map((classItem) => classItem.schoolYear).filter(Boolean)),
      );
      const allFeedKeys = [
        ...scopedClasses.map((classItem) => `assessment:${classItem.id}`),
        ...scopedClasses.map((classItem) => `announcement:${classItem.id}`),
        ...schoolYears.map((schoolYear) => `${SCHOOL_EVENTS_FEED_KEY_PREFIX}${schoolYear}`),
      ];
      const targetKeys = retryKeys ?? allFeedKeys;
      const requestId = ++feedRequestIdRef.current;

      if (!isRetry) {
        feedHasFulfilledSourceRef.current = false;
      }
      void Promise.resolve().then(() => {
        if (requestId === feedRequestIdRef.current) setFeedStatus('loading');
      });

      void Promise.allSettled(
        targetKeys.map(async (key): Promise<CalendarFeedPayload> => {
          if (key.startsWith(SCHOOL_EVENTS_FEED_KEY_PREFIX)) {
            const schoolYear = key.slice(SCHOOL_EVENTS_FEED_KEY_PREFIX.length);
            const response = await schoolEventService.getAll({
              schoolYear,
            });
            return { kind: 'school-events', schoolYear, data: response.data || [] };
          }

          const [kind, classId] = key.split(':');
          if (kind === 'assessment') {
            const response = await assessmentService.getByClass(classId, {
              status: 'all',
              limit: 120,
            });
            return { kind, classId, data: response.data || [] };
          }

          const response = await announcementService.getByClass(classId, {
            limit: 60,
          });
          return { kind: 'announcement', classId, data: response.data || [] };
        }),
      ).then((results) => {
        if (requestId !== feedRequestIdRef.current) return;

        const failedKeys = targetKeys.filter(
          (_, index) => results[index]?.status === 'rejected',
        );
        const fulfilledPayloads = results.flatMap((result) =>
          result.status === 'fulfilled' ? [result.value] : [],
        );

        if (isRetry) {
          for (const payload of fulfilledPayloads) {
            if (payload.kind === 'assessment') {
              setAssessmentsByClass((current) => ({
                ...current,
                [payload.classId]: payload.data,
              }));
            } else if (payload.kind === 'announcement') {
              setAnnouncementsByClass((current) => ({
                ...current,
                [payload.classId]: payload.data,
              }));
            } else {
              setSchoolEvents((current) => [
                ...current.filter((event) => event.schoolYear !== payload.schoolYear),
                ...payload.data,
              ]);
            }
          }
        } else {
          const nextAssessments: Record<string, Assessment[]> = {};
          const nextAnnouncements: Record<string, Announcement[]> = {};
          const nextSchoolEvents: SchoolEvent[] = [];

          for (const payload of fulfilledPayloads) {
            if (payload.kind === 'assessment') {
              nextAssessments[payload.classId] = payload.data;
            } else if (payload.kind === 'announcement') {
              nextAnnouncements[payload.classId] = payload.data;
            } else {
              nextSchoolEvents.push(...payload.data);
            }
          }

          setAssessmentsByClass(nextAssessments);
          setAnnouncementsByClass(nextAnnouncements);
          setSchoolEvents(nextSchoolEvents);
        }

        if (fulfilledPayloads.length > 0) {
          feedHasFulfilledSourceRef.current = true;
        }
        setFailedFeedKeys(failedKeys);
        setFeedStatus(
          failedKeys.length === 0
            ? 'ready'
            : feedHasFulfilledSourceRef.current
              ? 'partial'
              : 'error',
        );
      });
    },
    [classes, classStatus],
  );

  useEffect(() => {
    void loadCalendarFeed();
    return () => {
      feedRequestIdRef.current += 1;
    };
  }, [loadCalendarFeed]);

  const schoolYearOptions = useMemo(
    () => buildSchoolYearList(classes, schoolEvents),
    [classes, schoolEvents],
  );

  const classOptions = useMemo(
    () => classes.filter((classItem) => classItem.schoolYear === selectedSchoolYear),
    [classes, selectedSchoolYear],
  );

  const mergedFeedItems = useMemo(
    () =>
      normalizeCalendarFeed({
        classes,
        schoolEvents,
        assessmentsByClass,
        announcementsByClass,
        selectedSchoolYear,
        selectedClassId,
        month: calendarMonth,
      }),
    [
      announcementsByClass,
      assessmentsByClass,
      calendarMonth,
      classes,
      schoolEvents,
      selectedClassId,
      selectedSchoolYear,
    ],
  );

  const dayIndex = useMemo(() => buildCalendarDayIndex(mergedFeedItems), [mergedFeedItems]);
  const monthCells = useMemo(() => buildMonthCells(calendarMonth), [calendarMonth]);
  const todayKey = useMemo(() => toDateKey(new Date()), []);
  const selectedDayItems = dayIndex[selectedDateKey] || [];
  const selectedDateLabel = useMemo(() => formatDateLabel(selectedDateKey), [selectedDateKey]);

  const eventTagsByDate = useMemo(() => {
    const map = new Map<string, StudentEventTag[]>();

    for (const [dateKey, items] of Object.entries(dayIndex)) {
      const tags = getMarkerKindsForDay(items)
        .map(toStudentEventTag)
        .filter((tag): tag is StudentEventTag => Boolean(tag));

      if (tags.length > 0) {
        map.set(dateKey, Array.from(new Set(tags)));
      }
    }

    return map;
  }, [dayIndex]);

  const upcomingEvents = useMemo(
    () => buildStudentUpcomingEvents({ classes, assessmentsByClass, schoolEvents }),
    [assessmentsByClass, classes, schoolEvents],
  );
  const requestedUpcomingPage = Number.parseInt(searchParams.get('page') ?? '1', 10);
  const upcomingPageCount = Math.max(1, Math.ceil(upcomingEvents.length / UPCOMING_PAGE_SIZE));
  const upcomingPage = Math.min(
    Math.max(Number.isFinite(requestedUpcomingPage) ? requestedUpcomingPage : 1, 1),
    upcomingPageCount,
  );
  const paginatedUpcomingEvents = upcomingEvents.slice(
    (upcomingPage - 1) * UPCOMING_PAGE_SIZE,
    upcomingPage * UPCOMING_PAGE_SIZE,
  );

  if (classStatus === 'loading' && classes.length === 0) {
    return (
      <div className="flex min-h-[24rem] flex-col gap-4 rounded-[1.5rem] p-2 md:p-3">
        <Skeleton className="h-28 rounded-[1.2rem]" />
        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-full rounded-[1.4rem]" />
          <Skeleton className="h-full rounded-[1.4rem]" />
        </div>
      </div>
    );
  }

  if (classStatus === 'error' && classes.length === 0) {
    return (
      <DashboardStatePanel
        kind="error"
        title="Calendar couldn't be loaded"
        description="Your enrolled classes are temporarily unavailable. Try loading the calendar again."
        primaryAction={{ label: 'Try again', onClick: () => void fetchClasses() }}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-[1520px] flex-col gap-3 rounded-[1.3rem] p-2 sm:rounded-[1.6rem]">
      <header className="z-20 rounded-[1.1rem] border border-[var(--student-navy-soft)] bg-[linear-gradient(180deg,var(--student-navy)_0%,var(--student-navy-soft)_58%,var(--student-navy-soft)_100%)] px-3 py-3 text-white shadow-[0_18px_32px_-24px_color-mix(in_srgb,var(--student-navy)_75%,transparent)] sm:px-4">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1.5">
            <Link
              href="/dashboard/student/courses"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--student-outline)] transition hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Courses
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[0.9rem] bg-[var(--student-accent)] shadow-[0_18px_24px_-18px_color-mix(in_srgb,var(--student-red)_90%,transparent)]">
                <CalendarDays className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[1.6rem] font-black leading-none tracking-tight md:text-[1.8rem]">
                  Calendar
                </h1>
                <p className="mt-0.5 text-[13px] font-semibold text-[var(--student-outline)]">
                  Click a date to inspect every item scheduled for that day.
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 xl:min-w-[24rem]">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-outline)]">
                School Year
              </span>
              <select
                value={selectedSchoolYear}
                onChange={(event) => setSelectedSchoolYear(event.target.value)}
                aria-label="Filter calendar by school year"
                className="h-10 w-full rounded-[0.85rem] border border-[var(--student-navy-soft)] bg-[var(--student-navy-soft)] px-3 text-sm font-semibold text-white outline-none transition focus:border-[var(--student-outline)]"
              >
                {schoolYearOptions.map((schoolYear) => (
                  <option key={schoolYear} value={schoolYear}>
                    {schoolYear}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-outline)]">
                Class
              </span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                aria-label="Filter calendar by class"
                className="h-10 w-full rounded-[0.85rem] border border-[var(--student-navy-soft)] bg-[var(--student-navy-soft)] px-3 text-sm font-semibold text-white outline-none transition focus:border-[var(--student-outline)]"
              >
                <option value="all">All classes</option>
                {classOptions.map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.subjectName}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <nav
        aria-label="Calendar views"
        className="inline-flex w-fit rounded-full border border-[var(--student-outline)] bg-white p-1 shadow-sm"
      >
        <Link
          href="/dashboard/student/calendar"
          aria-current={isUpcomingView ? undefined : 'page'}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-bold transition',
            isUpcomingView
              ? 'text-[var(--student-text-muted)] hover:bg-[var(--student-surface-soft)]'
              : 'bg-[var(--student-navy)] text-white',
          )}
        >
          Month view
        </Link>
        <Link
          href="/dashboard/student/calendar?view=upcoming"
          aria-current={isUpcomingView ? 'page' : undefined}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-bold transition',
            isUpcomingView
              ? 'bg-[var(--student-accent)] text-white'
              : 'text-[var(--student-text-muted)] hover:bg-[var(--student-surface-soft)]',
          )}
        >
          Upcoming
        </Link>
      </nav>

      {classStatus === 'error' ? (
        <DashboardStatePanel
          kind="unavailable"
          title="Class list refresh failed"
          description="The last loaded class list remains available while you retry."
          primaryAction={{ label: 'Retry classes', onClick: () => void fetchClasses() }}
        />
      ) : null}

      {feedStatus === 'partial' ? (
        <DashboardStatePanel
          kind="unavailable"
          title="Some calendar items couldn't be loaded"
          description="Available schedules and events remain visible while you retry the missing sources."
          primaryAction={{
            label: 'Retry calendar items',
            onClick: () => void loadCalendarFeed(failedFeedKeys),
          }}
        />
      ) : feedStatus === 'error' ? (
        <DashboardStatePanel
          kind="error"
          title="Calendar items couldn't be loaded"
          description="Scheduled class meetings remain visible, but calendar feeds are unavailable."
          primaryAction={{
            label: 'Retry calendar items',
            onClick: () => void loadCalendarFeed(failedFeedKeys),
          }}
        />
      ) : null}

      {isUpcomingView ? (
        <section className="rounded-[1.2rem] border border-[var(--student-surface-soft)] bg-white p-4 shadow-[0_22px_38px_-30px_color-mix(in_srgb,var(--student-navy)_34%,transparent)] md:p-5">
          <div className="flex flex-col gap-2 border-b border-[var(--student-surface-soft)] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                Full agenda
              </p>
              <h2 className="mt-1 text-[1.4rem] font-black tracking-tight text-[var(--student-navy)]">
                Upcoming
              </h2>
              <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                Unfinished deadlines and current or future school events from all active classes.
              </p>
            </div>
            <p className="text-sm font-semibold text-[var(--student-text-muted)]">
              {upcomingEvents.length} upcoming item{upcomingEvents.length === 1 ? '' : 's'}
            </p>
          </div>

          {feedStatus === 'loading' ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }, (_, index) => (
                <Skeleton key={index} className="h-24 rounded-[1rem]" />
              ))}
            </div>
          ) : paginatedUpcomingEvents.length === 0 ? (
            <div className="mt-4 rounded-[1rem] border border-dashed border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-10 text-center">
              <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                No upcoming events.
              </p>
              <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                You have no unfinished deadlines or current school events right now.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {paginatedUpcomingEvents.map((event) => (
                <Link
                  key={event.id}
                  href={event.href}
                  className="flex items-center gap-4 rounded-[1rem] border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] p-4 transition hover:border-[var(--student-outline)] hover:bg-white"
                >
                  <div className="grid h-14 w-14 flex-none place-items-center rounded-[0.9rem] bg-[var(--student-navy)] text-center text-white">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                      {event.monthLabel}
                    </span>
                    <strong className="text-lg leading-none">{event.dayLabel}</strong>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[var(--student-accent)]">
                      {event.tag === 'assessment'
                        ? 'Assessment'
                        : event.tag === 'holiday'
                          ? 'Holiday'
                          : 'School event'}
                    </p>
                    <h3 className="truncate text-base font-black text-[var(--student-navy)]">{event.title}</h3>
                    <p className="truncate text-sm text-[var(--student-text-muted)]">{event.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-[var(--student-surface-soft)] pt-4">
            {upcomingPage > 1 ? (
              <Link
                href={`/dashboard/student/calendar?view=upcoming&page=${upcomingPage - 1}`}
                className="rounded-full border border-[var(--student-outline)] px-4 py-2 text-sm font-bold text-[var(--student-navy-soft)] transition hover:border-[var(--student-text-muted)]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-full border border-[var(--student-surface-soft)] px-4 py-2 text-sm font-bold text-[var(--student-text-muted)]">
                Previous
              </span>
            )}
            <span className="text-sm font-semibold text-[var(--student-text-muted)]">
              Page {upcomingPage} of {upcomingPageCount}
            </span>
            {upcomingPage < upcomingPageCount ? (
              <Link
                href={`/dashboard/student/calendar?view=upcoming&page=${upcomingPage + 1}`}
                className="rounded-full border border-[var(--student-outline)] px-4 py-2 text-sm font-bold text-[var(--student-navy-soft)] transition hover:border-[var(--student-text-muted)]"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-full border border-[var(--student-surface-soft)] px-4 py-2 text-sm font-bold text-[var(--student-text-muted)]">
                Next
              </span>
            )}
          </div>
        </section>
      ) : (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <section className="flex flex-col rounded-[1.2rem] border border-[var(--student-outline)] bg-[var(--student-white)] p-2.5 shadow-[0_22px_38px_-30px_color-mix(in_srgb,var(--student-navy)_38%,transparent)] md:p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
                Month View
              </p>
              <h2 className="text-[1.28rem] font-black tracking-tight text-[var(--student-navy)] md:text-[1.4rem]">
                {formatMonthLabel(calendarMonth)}
              </h2>
            </div>

            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                className="grid h-9 w-9 place-items-center rounded-[0.85rem] border border-[var(--student-outline)] bg-white text-[var(--student-navy-soft)] transition hover:border-[var(--student-outline)] hover:text-[var(--student-navy)]"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                className="grid h-9 w-9 place-items-center rounded-[0.85rem] border border-[var(--student-outline)] bg-white text-[var(--student-navy-soft)] transition hover:border-[var(--student-outline)] hover:text-[var(--student-navy)]"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1 md:gap-1.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="rounded-[0.75rem] px-1 py-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[var(--student-text-muted)] md:text-[10px]"
              >
                {label}
              </div>
            ))}
          </div>

          <div className="grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-1 md:gap-1.5">
            {monthCells.map((cell) => {
              const tags = eventTagsByDate.get(cell.dateKey) ?? [];
              const isSelected = cell.dateKey === selectedDateKey;
              const dayItems = dayIndex[cell.dateKey] ?? [];

              return (
                <button
                  key={cell.dateKey}
                  type="button"
                  onClick={() => setSelectedDateKey(cell.dateKey)}
                  className={cn(
                    'flex h-full min-h-0 flex-col justify-between rounded-[0.85rem] border px-1.5 py-1.5 text-left transition',
                    isSelected
                      ? 'border-[var(--student-accent)] bg-[var(--student-accent)] text-white shadow-[0_18px_28px_-22px_color-mix(in_srgb,var(--student-red)_85%,transparent)]'
                      : 'border-[var(--student-outline)] bg-white text-[var(--student-navy-soft)] hover:border-[var(--student-text-muted)] hover:bg-[var(--student-surface-soft)]',
                    !cell.inMonth && !isSelected && 'bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]',
                    cell.dateKey === todayKey && !isSelected && 'border-[var(--student-outline)] bg-[var(--student-surface-soft)]',
                  )}
                  >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[0.95rem] font-black leading-none md:text-[1rem]">
                      {cell.date.getDate()}
                    </span>
                    {dayItems.length > 0 ? (
                      <span
                        className={cn(
                          'rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.04em]',
                          isSelected
                            ? 'bg-white/18 text-white'
                            : 'bg-[var(--student-surface-soft)] text-[var(--student-text-muted)]',
                        )}
                      >
                        {dayItems.length}
                      </span>
                    ) : null}
                  </div>

                  <div className="space-y-1.5">
                    {tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 3).map((tag) => (
                          <span
                            key={`${cell.dateKey}-${tag}`}
                            className={cn(
                              'inline-flex h-2.5 w-2.5 rounded-full',
                              isSelected ? 'bg-white' : MARKER_DOT_CLASS[tag],
                            )}
                          />
                        ))}
                      </div>
                    ) : (
                      <span className="block h-2.5" />
                    )}

                    <span
                      className={cn(
                        'block text-[8px] font-medium leading-3 md:text-[9px]',
                        isSelected ? 'text-white/88' : 'text-[var(--student-text-muted)]',
                      )}
                    >
                      {dayItems.length > 0 ? 'Tap to inspect events' : 'No items'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="flex min-h-0 flex-col rounded-[1.2rem] border border-[var(--student-surface-soft)] bg-white p-2.5 shadow-[0_22px_38px_-30px_color-mix(in_srgb,var(--student-navy)_34%,transparent)] md:p-3">
          <div className="border-b border-[var(--student-surface-soft)] pb-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--student-text-muted)]">
              Selected Date
            </p>
            <h2 className="mt-1 text-[1.1rem] font-black leading-tight tracking-tight text-[var(--student-navy)] md:text-[1.2rem]">
              {selectedDateLabel}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[var(--student-text-muted)]">
              {selectedDayItems.length === 0
                ? 'Nothing is scheduled for this day.'
                : selectedDayItems.length === 1
                  ? '1 item scheduled for this day.'
                  : `${selectedDayItems.length} items scheduled for this day.`}
            </p>
          </div>

          <div className="mt-2.5 min-h-0 space-y-2.5 overflow-y-auto pr-1">
            {feedStatus === 'loading' ? (
              <>
                <Skeleton className="h-28 rounded-[1.35rem]" />
                <Skeleton className="h-28 rounded-[1.35rem]" />
                <Skeleton className="h-28 rounded-[1.35rem]" />
              </>
            ) : feedStatus === 'ready' && selectedDayItems.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-[var(--student-outline)] bg-[var(--student-surface-soft)] px-4 py-8 text-center">
                <p className="text-sm font-semibold text-[var(--student-text-strong)]">
                  No events yet.
                </p>
                <p className="mt-1 text-sm text-[var(--student-text-muted)]">
                  Pick another date to view class schedules, assessments, announcements, and school events.
                </p>
              </div>
            ) : selectedDayItems.length > 0 ? (
              selectedDayItems.map((item) => {
                const href = getFeedItemHref(item);

                return (
                  <article
                    key={item.id}
                    className="rounded-[1rem] border border-[var(--student-surface-soft)] bg-[var(--student-surface-soft)] p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em]',
                          DETAIL_KIND_ACCENT[item.kind],
                        )}
                      >
                        {CALENDAR_KIND_LABEL[item.kind]}
                      </span>
                      <span className="text-xs font-medium text-[var(--student-text-muted)]">
                        {formatTimeWindow(item)}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      <h3 className="text-base font-black tracking-tight text-[var(--student-navy)]">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-5 text-[var(--student-text-muted)]">
                        {getSupportingCopy(item)}
                      </p>
                    </div>

                    {(item.classLabel || item.location) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.classLabel ? (
                          <span className="rounded-full bg-[var(--student-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--student-accent)]">
                            {item.classLabel}
                          </span>
                        ) : null}
                        {item.location ? (
                          <span className="rounded-full bg-[var(--student-surface-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--student-text-muted)]">
                            {item.location}
                          </span>
                        ) : null}
                      </div>
                    )}

                    {href ? (
                      <div className="mt-4">
                        <Link
                          href={href}
                          className="inline-flex items-center rounded-full border border-[var(--student-outline)] px-3 py-2 text-sm font-semibold text-[var(--student-text-strong)] transition hover:border-[var(--student-accent)] hover:text-[var(--student-accent)]"
                        >
                          Open related page
                        </Link>
                      </div>
                    ) : null}
                  </article>
                );
              })
            ) : null}
          </div>
        </aside>
      </div>
      )}
    </div>
  );
}
