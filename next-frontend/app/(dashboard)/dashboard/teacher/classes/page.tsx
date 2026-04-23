'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem, ClassVisibilityStatus } from '@/types/class';
import {
  CalendarCard,
  toDateKey,
  type CalendarEventTag,
} from '@/components/teacher/my-classes/CalendarCard';
import {
  ClassCard,
  type ClassCardMetrics,
} from '@/components/teacher/my-classes/ClassCard';
import {
  UpcomingEventsCard,
  type UpcomingEventItem,
} from '@/components/teacher/my-classes/UpcomingEventsCard';

interface AssessmentDueRecord {
  id: string;
  classId: string;
  title: string;
  dateKey: string;
  dayLabel: string;
  monthLabel: string;
  meta: string;
  href: string;
  timestamp: number;
}

const STATUS_FILTERS: Array<{ value: ClassVisibilityStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'archived', label: 'Archived' },
  { value: 'hidden', label: 'Hidden' },
];

const EMPTY_METRICS: ClassCardMetrics = {
  lessonsCount: 0,
  assessmentsCount: 0,
  pendingCount: 0,
  progressPercent: 0,
};

function parseDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function shiftMonth(baseDate: Date, delta: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + delta, 1);
}

function formatDueTime(date: Date) {
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!hasTime) return 'all day';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function getAnnouncementDate(announcement: Announcement) {
  return parseDate(announcement.scheduledAt || announcement.createdAt);
}

function getAnnouncementTag(announcement: Announcement): CalendarEventTag {
  const text = `${announcement.title} ${announcement.content}`.toLowerCase();
  if (text.includes('quiz') || text.includes('exam') || text.includes('assessment')) {
    return 'assessment';
  }
  if (text.includes('holiday') || text.includes('break')) {
    return 'holiday';
  }
  return 'event';
}

function buildAssessmentDue(
  classItem: ClassItem,
  assessment: Assessment,
): AssessmentDueRecord | null {
  if (!assessment.isPublished) return null;
  const dueDate = parseDate(assessment.dueDate);
  if (!dueDate) return null;

  const classLabel = classItem.subjectName || classItem.className || classItem.name || 'Class';

  return {
    id: `assessment-${assessment.id}`,
    classId: classItem.id,
    title: assessment.title,
    dateKey: toDateKey(dueDate),
    dayLabel: String(dueDate.getDate()).padStart(2, '0'),
    monthLabel: monthLabel(dueDate),
    meta: `${classLabel} | Due ${formatDueTime(dueDate)}`,
    href: `/dashboard/teacher/classes/${classItem.id}?view=assignments`,
    timestamp: dueDate.getTime(),
  };
}

function dedupeById<T extends { id: string }>(records: T[]) {
  const map = new Map<string, T>();
  for (const record of records) {
    map.set(record.id, record);
  }
  return Array.from(map.values());
}

export default function TeacherClassesPage() {
  const { user } = useAuth();
  const latestFetchRef = useRef(0);

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [metricsByClass, setMetricsByClass] = useState<Record<string, ClassCardMetrics>>({});
  const [assessmentDues, setAssessmentDues] = useState<AssessmentDueRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<ClassVisibilityStatus>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));

  const hydrateClassMetrics = useCallback(async (classList: ClassItem[], fetchNonce: number) => {
    if (!classList.length) {
      if (latestFetchRef.current === fetchNonce) {
        setMetricsByClass({});
        setAssessmentDues([]);
      }
      return;
    }

    const classRows = await Promise.all(
      classList.map(async (classItem) => {
        const [lessonsRes, assessmentsRes] = await Promise.all([
          lessonService.getByClass(classItem.id).catch(() => null),
          assessmentService.getByClass(classItem.id).catch(() => null),
        ]);

        const lessons = lessonsRes?.data ?? [];
        const assessments = assessmentsRes?.data ?? [];

        const lessonsCount = lessons.length;
        const assessmentsCount = assessments.length;
        const publishedLessons = lessons.filter((lesson) => !lesson.isDraft).length;
        const publishedAssessments = assessments.filter((assessment) => assessment.isPublished).length;
        const completed = publishedLessons + publishedAssessments;
        const total = lessonsCount + assessmentsCount;

        const metrics: ClassCardMetrics = {
          lessonsCount,
          assessmentsCount,
          pendingCount: Math.max(total - completed, 0),
          progressPercent: total > 0 ? Math.round((completed / total) * 100) : 0,
        };

        const dues = assessments
          .map((assessment) => buildAssessmentDue(classItem, assessment))
          .filter((entry): entry is AssessmentDueRecord => entry !== null);

        return {
          classId: classItem.id,
          metrics,
          dues,
        };
      }),
    );

    if (latestFetchRef.current !== fetchNonce) return;

    setMetricsByClass(
      Object.fromEntries(classRows.map((row) => [row.classId, row.metrics])),
    );

    setAssessmentDues(
      dedupeById(classRows.flatMap((row) => row.dues)).sort((left, right) => left.timestamp - right.timestamp),
    );
  }, []);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    const fetchNonce = latestFetchRef.current + 1;
    latestFetchRef.current = fetchNonce;

    try {
      setLoading(true);
      setError(null);

      const classesRes = await classService.getByTeacher(user.id, status);
      const classList = classesRes.data ?? [];
      if (latestFetchRef.current !== fetchNonce) return;

      setClasses(classList);
      setMetricsByClass(
        Object.fromEntries(classList.map((classItem) => [classItem.id, EMPTY_METRICS])),
      );
      setAssessmentDues([]);

      void hydrateClassMetrics(classList, fetchNonce);

      const announcementResponses = await Promise.all(
        classList.slice(0, 12).map((classItem) =>
          announcementService.getByClass(classItem.id, { limit: 4 }).catch(() => ({
            data: [] as Announcement[],
          })),
        ),
      );

      if (latestFetchRef.current !== fetchNonce) return;

      const mergedAnnouncements = announcementResponses
        .flatMap((response) => response.data ?? [])
        .reduce<Map<string, Announcement>>((accumulator, announcement) => {
          accumulator.set(announcement.id, announcement);
          return accumulator;
        }, new Map());

      const sortedAnnouncements = Array.from(mergedAnnouncements.values()).sort((left, right) => {
        const leftTimestamp = getAnnouncementDate(left)?.getTime() ?? 0;
        const rightTimestamp = getAnnouncementDate(right)?.getTime() ?? 0;
        return leftTimestamp - rightTimestamp;
      });

      setAnnouncements(sortedAnnouncements);
    } catch {
      if (latestFetchRef.current !== fetchNonce) return;
      setClasses([]);
      setAnnouncements([]);
      setMetricsByClass({});
      setAssessmentDues([]);
      setError('Unable to load your classes right now. Please try again.');
    } finally {
      if (latestFetchRef.current === fetchNonce) {
        setLoading(false);
      }
    }
  }, [hydrateClassMetrics, status, user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const filteredClasses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) return classes;

    return classes.filter((classItem) => {
      const haystack = [
        classItem.subjectName,
        classItem.subjectCode,
        classItem.section?.name,
        classItem.section?.gradeLevel,
      ].filter((value): value is string => Boolean(value));

      return haystack.some((value) => value.toLowerCase().includes(normalizedQuery));
    });
  }, [classes, searchQuery]);

  const totalPending = useMemo(
    () =>
      filteredClasses.reduce(
        (total, classItem) => total + (metricsByClass[classItem.id]?.pendingCount ?? 0),
        0,
      ),
    [filteredClasses, metricsByClass],
  );

  const upcomingEvents = useMemo<UpcomingEventItem[]>(() => {
    const classById = new Map(classes.map((classItem) => [classItem.id, classItem]));
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const assessmentEvents: Array<UpcomingEventItem & { timestamp: number }> = assessmentDues.map((due) => ({
      id: due.id,
      classId: due.classId,
      title: due.title,
      tag: 'assessment',
      dateKey: due.dateKey,
      dayLabel: due.dayLabel,
      monthLabel: due.monthLabel,
      meta: due.meta,
      href: due.href,
      timestamp: due.timestamp,
    }));

    const announcementEvents: Array<UpcomingEventItem & { timestamp: number }> = announcements.flatMap((announcement) => {
      const date = getAnnouncementDate(announcement);
      if (!date) return [];

      const classItem = classById.get(announcement.classId);
      return [
        {
          id: `announcement-${announcement.id}`,
          classId: announcement.classId,
          title: announcement.title,
          tag: getAnnouncementTag(announcement),
          dateKey: toDateKey(date),
          dayLabel: String(date.getDate()).padStart(2, '0'),
          monthLabel: monthLabel(date),
          meta: [
            classItem?.subjectName,
            classItem?.section?.name ? `Section ${classItem.section.name}` : undefined,
          ]
            .filter((value): value is string => Boolean(value))
            .join(' | ') || 'Class update',
          href: classItem
            ? `/dashboard/teacher/classes/${classItem.id}?view=announcements`
            : '/dashboard/teacher/announcements',
          timestamp: date.getTime(),
        },
      ];
    });

    const merged = dedupeById([...assessmentEvents, ...announcementEvents]).sort((left, right) => left.timestamp - right.timestamp);
    const upcomingOnly = merged.filter((entry) => entry.timestamp >= today.getTime());
    const visible = (upcomingOnly.length > 0 ? upcomingOnly : merged).slice(0, 12);

    return visible.map(({ timestamp, ...event }) => {
      void timestamp;
      return event;
    });
  }, [announcements, assessmentDues, classes]);

  const eventTagsByDate = useMemo(() => {
    const tagMap = new Map<string, CalendarEventTag[]>();

    for (const event of upcomingEvents) {
      const existing = tagMap.get(event.dateKey) ?? [];
      if (!existing.includes(event.tag)) {
        existing.push(event.tag);
      }
      tagMap.set(event.dateKey, existing);
    }

    return tagMap;
  }, [upcomingEvents]);

  if (loading) {
    return (
      <div className="space-y-5 p-1">
        <Skeleton className="h-36 rounded-3xl" />
        <Skeleton className="h-16 rounded-2xl" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-[22rem] rounded-3xl" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[21rem] rounded-3xl" />
            <Skeleton className="h-[24rem] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 bg-[#f7f7fb] p-1">
      <header className="rounded-[1.6rem] border border-[#dbe1ec] bg-white p-5 shadow-[0_18px_36px_-30px_rgba(11,23,54,0.45)] sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[#6d7f9f]">Teacher Workspace</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0b1736]">My Classes</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#536587]">
              Jump into class management fast, track pending work, and keep lessons, assessments, and announcements moving.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="rounded-2xl border border-[#e2e7f2] bg-[#f7f9fd] px-3 py-2 text-xs text-[#4f6183]">
              <p className="font-medium">Active Classes</p>
              <p className="text-lg font-semibold leading-tight text-[#0f172a]">{filteredClasses.length}</p>
            </div>
            <div className="rounded-2xl border border-[#fbd3dd] bg-[#fff2f5] px-3 py-2 text-xs text-[#8d2643]">
              <p className="font-medium">Pending Work</p>
              <p className="text-lg font-semibold leading-tight">{totalPending}</p>
            </div>
            <Button
              type="button"
              className="h-auto min-h-[3.2rem] rounded-2xl bg-[#f43f5e] px-4 text-sm font-semibold text-white shadow-[0_18px_30px_-22px_rgba(244,63,94,0.8)] hover:bg-[#e11d48]"
              onClick={() => void fetchData()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </header>

      <section className="rounded-[1.25rem] border border-[#dde4ef] bg-white p-3.5 shadow-[0_16px_30px_-30px_rgba(11,23,54,0.5)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7b8eb0]" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search class, code, or section"
              className="h-11 rounded-xl border-[#d7deec] bg-[#f7f9fd] pl-9 text-sm text-[#1e293b] placeholder:text-[#8394b2] focus-visible:ring-[#f43f5e]/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e0e6f1] bg-[#f8fafd] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#5f7192]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filter
            </span>
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setStatus(filter.value)}
                className={cn(
                  'h-9 rounded-full border px-3.5 text-sm font-semibold transition',
                  status === filter.value
                    ? 'border-[#f43f5e] bg-[#f43f5e] text-white shadow-[0_12px_24px_-20px_rgba(244,63,94,0.9)]'
                    : 'border-[#d8deeb] bg-white text-[#425473] hover:border-[#c8d1e5] hover:bg-[#f6f8fd]',
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[1.25rem] border border-[#fecdd8] bg-[#fff2f5] p-5 text-[#9f1239]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
            <Button
              type="button"
              variant="outline"
              className="border-[#f9a8bc] bg-white text-[#9f1239] hover:bg-[#ffe4eb]"
              onClick={() => void fetchData()}
            >
              Try Again
            </Button>
          </div>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
          <div>
            {filteredClasses.length === 0 ? (
              <div className="grid min-h-[18rem] place-items-center rounded-[1.35rem] border border-dashed border-[#ccd6e8] bg-[#f8fafe] p-6 text-center">
                <div>
                  <p className="text-lg font-semibold text-[#1e2c48]">No classes match your filter.</p>
                  <p className="mt-1 text-sm text-[#65789b]">
                    Try another search term or switch the status filter.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-[#cfd8e9] bg-white text-[#2f4a75] hover:bg-[#f1f5fb]"
                    onClick={() => {
                      setSearchQuery('');
                      setStatus('active');
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-3">
                {filteredClasses.map((classItem, index) => (
                  <ClassCard
                    key={classItem.id}
                    classItem={classItem}
                    metrics={metricsByClass[classItem.id] ?? EMPTY_METRICS}
                    accentIndex={index}
                    classHref={`/dashboard/teacher/classes/${classItem.id}`}
                    lessonsHref={`/dashboard/teacher/classes/${classItem.id}?view=modules`}
                  />
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <CalendarCard
              month={calendarMonth}
              selectedDateKey={selectedDateKey}
              eventTagsByDate={eventTagsByDate}
              onSelectDate={setSelectedDateKey}
              onPrevMonth={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              onNextMonth={() => setCalendarMonth((current) => shiftMonth(current, 1))}
            />
            <UpcomingEventsCard events={upcomingEvents} selectedDateKey={selectedDateKey} />
          </aside>
        </section>
      )}
    </div>
  );
}
