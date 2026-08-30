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
  assessment: 'border-[#fecdd3] bg-[#fff1f2] text-[#be123c]',
  announcement: 'border-[#fed7aa] bg-[#fff7ed] text-[#c2410c]',
  school_event: 'border-[#bfdbfe] bg-[#eff6ff] text-[#1d4ed8]',
  holiday_break: 'border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]',
  class_schedule: 'border-[#ddd6fe] bg-[#f5f3ff] text-[#6d28d9]',
};

const MARKER_DOT_CLASS: Record<StudentEventTag, string> = {
  assessment: 'bg-[#d81b50]',
  announcement: 'bg-[#f97316]',
  event: 'bg-[#0284c7]',
  holiday: 'bg-[#059669]',
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
      <header className="z-20 rounded-[1.1rem] border border-[#223459] bg-[linear-gradient(180deg,#16284a_0%,#182b50_58%,#1d3158_100%)] px-3 py-3 text-white shadow-[0_18px_32px_-24px_rgba(8,16,36,0.75)] sm:px-4">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 space-y-1.5">
            <Link
              href="/dashboard/student/courses"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#cbd7f0] transition hover:text-white"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Back to Courses
            </Link>

            <div className="flex items-center gap-2.5">
              <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-[0.9rem] bg-[#ff001f] shadow-[0_18px_24px_-18px_rgba(255,0,31,0.9)]">
                <CalendarDays className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-[1.6rem] font-black leading-none tracking-tight md:text-[1.8rem]">
                  Calendar
                </h1>
                <p className="mt-0.5 text-[13px] font-semibold text-[#8fb0eb]">
                  Click a date to inspect every item scheduled for that day.
                </p>
              </div>
            </div>
          </div>

          <div className="grid w-full gap-2 sm:grid-cols-2 xl:min-w-[24rem]">
            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#90a9d6]">
                School Year
              </span>
              <select
                value={selectedSchoolYear}
                onChange={(event) => setSelectedSchoolYear(event.target.value)}
                aria-label="Filter calendar by school year"
                className="h-10 w-full rounded-[0.85rem] border border-[#304872] bg-[#21375d] px-3 text-sm font-semibold text-white outline-none transition focus:border-[#88a9e8]"
              >
                {schoolYearOptions.map((schoolYear) => (
                  <option key={schoolYear} value={schoolYear}>
                    {schoolYear}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#90a9d6]">
                Class
              </span>
              <select
                value={selectedClassId}
                onChange={(event) => setSelectedClassId(event.target.value)}
                aria-label="Filter calendar by class"
                className="h-10 w-full rounded-[0.85rem] border border-[#304872] bg-[#21375d] px-3 text-sm font-semibold text-white outline-none transition focus:border-[#88a9e8]"
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
        className="inline-flex w-fit rounded-full border border-[#d7dfec] bg-white p-1 shadow-sm"
      >
        <Link
          href="/dashboard/student/calendar"
          aria-current={isUpcomingView ? undefined : 'page'}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-bold transition',
            isUpcomingView
              ? 'text-[#5f708d] hover:bg-[#f2f5fa]'
              : 'bg-[#172b4f] text-white',
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
              ? 'bg-[#ff001f] text-white'
              : 'text-[#5f708d] hover:bg-[#f2f5fa]',
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
        <section className="rounded-[1.2rem] border border-[#dde3ef] bg-white p-4 shadow-[0_22px_38px_-30px_rgba(29,41,82,0.34)] md:p-5">
          <div className="flex flex-col gap-2 border-b border-[#e4eaf4] pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7e8dab]">
                Full agenda
              </p>
              <h2 className="mt-1 text-[1.4rem] font-black tracking-tight text-[#12274a]">
                Upcoming
              </h2>
              <p className="mt-1 text-sm text-[#6d7f9d]">
                Unfinished deadlines and current or future school events from all active classes.
              </p>
            </div>
            <p className="text-sm font-semibold text-[#5f708d]">
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
            <div className="mt-4 rounded-[1rem] border border-dashed border-[#d8e1ef] bg-[#f8fafc] px-4 py-10 text-center">
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
                  className="flex items-center gap-4 rounded-[1rem] border border-[#dde4ef] bg-[#fbfcfe] p-4 transition hover:border-[#9fb0cc] hover:bg-white"
                >
                  <div className="grid h-14 w-14 flex-none place-items-center rounded-[0.9rem] bg-[#172b4f] text-center text-white">
                    <span className="text-[10px] font-black uppercase tracking-[0.12em]">
                      {event.monthLabel}
                    </span>
                    <strong className="text-lg leading-none">{event.dayLabel}</strong>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-[#d81b50]">
                      {event.tag === 'assessment'
                        ? 'Assessment'
                        : event.tag === 'holiday'
                          ? 'Holiday'
                          : 'School event'}
                    </p>
                    <h3 className="truncate text-base font-black text-[#13284a]">{event.title}</h3>
                    <p className="truncate text-sm text-[#6d7f9d]">{event.subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-[#e4eaf4] pt-4">
            {upcomingPage > 1 ? (
              <Link
                href={`/dashboard/student/calendar?view=upcoming&page=${upcomingPage - 1}`}
                className="rounded-full border border-[#cfd8e7] px-4 py-2 text-sm font-bold text-[#294467] transition hover:border-[#8fa7cb]"
              >
                Previous
              </Link>
            ) : (
              <span className="rounded-full border border-[#e5e9f0] px-4 py-2 text-sm font-bold text-[#a5afbf]">
                Previous
              </span>
            )}
            <span className="text-sm font-semibold text-[#5f708d]">
              Page {upcomingPage} of {upcomingPageCount}
            </span>
            {upcomingPage < upcomingPageCount ? (
              <Link
                href={`/dashboard/student/calendar?view=upcoming&page=${upcomingPage + 1}`}
                className="rounded-full border border-[#cfd8e7] px-4 py-2 text-sm font-bold text-[#294467] transition hover:border-[#8fa7cb]"
              >
                Next
              </Link>
            ) : (
              <span className="rounded-full border border-[#e5e9f0] px-4 py-2 text-sm font-bold text-[#a5afbf]">
                Next
              </span>
            )}
          </div>
        </section>
      ) : (
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_21rem] 2xl:grid-cols-[minmax(0,1fr)_22.5rem]">
        <section className="flex flex-col rounded-[1.2rem] border border-[#dde3ef] bg-[linear-gradient(180deg,#ffffff_0%,#f4f6fb_100%)] p-2.5 shadow-[0_22px_38px_-30px_rgba(29,41,82,0.38)] md:p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7e8dab]">
                Month View
              </p>
              <h2 className="text-[1.28rem] font-black tracking-tight text-[#12274a] md:text-[1.4rem]">
                {formatMonthLabel(calendarMonth)}
              </h2>
            </div>

            <div className="inline-flex items-center gap-2">
              <button
                type="button"
                aria-label="Previous month"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                className="grid h-9 w-9 place-items-center rounded-[0.85rem] border border-[#d5deec] bg-white text-[#284267] transition hover:border-[#9ab0d6] hover:text-[#11284c]"
              >
                <ChevronLeft className="h-4.5 w-4.5" />
              </button>
              <button
                type="button"
                aria-label="Next month"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                className="grid h-9 w-9 place-items-center rounded-[0.85rem] border border-[#d5deec] bg-white text-[#284267] transition hover:border-[#9ab0d6] hover:text-[#11284c]"
              >
                <ChevronRight className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>

          <div className="mb-1.5 grid grid-cols-7 gap-1 md:gap-1.5">
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="rounded-[0.75rem] px-1 py-1 text-center text-[9px] font-black uppercase tracking-[0.12em] text-[#7f8fad] md:text-[10px]"
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
                      ? 'border-[#e11d2d] bg-[#ff001f] text-white shadow-[0_18px_28px_-22px_rgba(255,0,31,0.85)]'
                      : 'border-[#d9e1ef] bg-white text-[#163153] hover:border-[#8ea8d2] hover:bg-[#f7f9fd]',
                    !cell.inMonth && !isSelected && 'bg-[#f2f5fa] text-[#a0abbe]',
                    cell.dateKey === todayKey && !isSelected && 'border-[#9eb8e2] bg-[#edf3ff]',
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
                            : 'bg-[#eef3fb] text-[#6a7d9d]',
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

        <aside className="flex min-h-0 flex-col rounded-[1.2rem] border border-[#dde3ef] bg-white p-2.5 shadow-[0_22px_38px_-30px_rgba(29,41,82,0.34)] md:p-3">
          <div className="border-b border-[#e4eaf4] pb-2.5">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7e8dab]">
              Selected Date
            </p>
            <h2 className="mt-1 text-[1.1rem] font-black leading-tight tracking-tight text-[#12274a] md:text-[1.2rem]">
              {selectedDateLabel}
            </h2>
            <p className="mt-1 text-[13px] leading-5 text-[#6d7f9d]">
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
              <div className="rounded-[1rem] border border-dashed border-[#d8e1ef] bg-[#f8fafc] px-4 py-8 text-center">
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
                    className="rounded-[1rem] border border-[#dde4ef] bg-[#fbfcfe] p-3.5"
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
                      <h3 className="text-base font-black tracking-tight text-[#13284a]">
                        {item.title}
                      </h3>
                      <p className="text-sm leading-5 text-[#6d7f9d]">
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
                          <span className="rounded-full bg-[#eef6ff] px-2.5 py-1 text-xs font-semibold text-[#1d4ed8]">
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
