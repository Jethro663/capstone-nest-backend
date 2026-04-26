'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CalendarClock,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { schoolEventService } from '@/services/school-event-service';
import { StudentCalendarCard } from '@/components/student/my-classes/StudentCalendarCard';
import { StudentUpcomingEventsCard } from '@/components/student/my-classes/StudentUpcomingEventsCard';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentAnnouncementBoardDialog } from '@/components/student/StudentAnnouncementBoardDialog';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { Announcement } from '@/types/announcement';
import type { ClassItem } from '@/types/class';
import type { Lesson } from '@/types/lesson';
import type { SchoolEvent } from '@/types/school-event';
import {
  buildCalendarDayIndex,
  getCurrentSchoolYearReference,
  getMarkerKindsForDay,
  getUpcomingFeedItems,
  normalizeCalendarFeed,
  shiftMonth,
  type CalendarFeedItem,
} from '@/utils/calendar-feed';
import { getStudentAssessmentHref } from '@/utils/student-assessment-routing';
import { getTeacherName } from '@/utils/helpers';
import { toDateKey, type StudentEventTag, type StudentUpcomingEvent } from '@/components/student/my-classes/types';

const DAY_TO_INDEX: Record<string, number> = {
  SU: 0,
  SUN: 0,
  M: 1,
  MON: 1,
  T: 2,
  TU: 2,
  TUE: 2,
  W: 3,
  WED: 3,
  TH: 4,
  THU: 4,
  F: 5,
  FRI: 5,
  SA: 6,
  SAT: 6,
};

const MARKER_ORDER = ['announcement', 'school_event', 'holiday_break'] as const;

function formatShortDate(value?: string) {
  if (!value) return 'No due date';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function toMinutes(value: string) {
  const [rawHours = '0', rawMinutes = '0'] = value.split(':');
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes, 10);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return 0;
  return hours * 60 + minutes;
}

function formatTime(value: string) {
  const [rawHours = '0', rawMinutes = '0'] = value.split(':');
  const hours = Number.parseInt(rawHours, 10);
  const minutes = Number.parseInt(rawMinutes, 10);

  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return value;

  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeAssessmentType(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function getScheduleItemsForToday(classes: ClassItem[], now = new Date()) {
  const todayIndex = now.getDay();
  const rows = classes.flatMap((classItem) =>
    (classItem.schedules ?? [])
      .filter((schedule) =>
        (schedule.days ?? [])
          .map((day) => DAY_TO_INDEX[day.trim().toUpperCase()])
          .some((index) => index === todayIndex))
      .map((schedule) => ({
        id: `${classItem.id}-${schedule.id}`,
        classId: classItem.id,
        className: classItem.subjectName || classItem.className || classItem.name || 'Class',
        teacherName: getTeacherName(classItem.teacher),
        sectionLabel: classItem.section?.name ?? 'Section',
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        startMinutes: toMinutes(schedule.startTime),
      })),
  );

  return rows.sort((left, right) => left.startMinutes - right.startMinutes).slice(0, 4);
}

function toStudentEventTag(item: CalendarFeedItem): StudentEventTag | null {
  if (item.kind === 'announcement') return 'announcement';
  if (item.kind === 'school_event') return 'event';
  if (item.kind === 'holiday_break') return 'holiday';
  return null;
}

function getDashboardCalendarHref(item: CalendarFeedItem) {
  if (item.kind === 'announcement' && item.classId) {
    return `/dashboard/student/classes/${item.classId}?view=announcements`;
  }
  return '/dashboard/student/announcements';
}

function toDashboardCalendarEvent(item: CalendarFeedItem): StudentUpcomingEvent | null {
  const tag = toStudentEventTag(item);
  if (!tag) return null;

  const itemDate = new Date(item.startsAt);
  return {
    id: item.id,
    classId: item.classId ?? 'all',
    title: item.title,
    subtitle: item.description ?? '',
    tag,
    href: getDashboardCalendarHref(item),
    timestamp: itemDate.getTime(),
    dateKey: toDateKey(itemDate),
    dayLabel: String(itemDate.getDate()).padStart(2, '0'),
    monthLabel: itemDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase(),
  };
}

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentAttempts, setAssessmentAttempts] = useState<Record<string, AssessmentAttempt[]>>({});
  const [announcementsByClass, setAnnouncementsByClass] = useState<Record<string, Announcement[]>>({});
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const classRes = await classService.getByStudent(user.id);
      const enrolledClasses = classRes.data || [];
      setClasses(enrolledClasses);

      const classIds = enrolledClasses.map((classItem) => classItem.id);

      const [lessonResults, assessmentResults, announcementResults] = await Promise.all([
        Promise.all(
          classIds.slice(0, 10).map((classId) =>
            lessonService.getByClass(classId).catch(() => ({ data: [] as Lesson[] })),
          ),
        ),
        Promise.all(
          classIds.slice(0, 10).map((classId) =>
            assessmentService.getByClass(classId).catch(() => ({ data: [] as Assessment[] })),
          ),
        ),
        Promise.all(
          classIds.slice(0, 10).map(async (classId) => {
            const result = await announcementService.getByClass(classId, { limit: 8 }).catch(() => ({
              success: true,
              message: '',
              data: [] as Announcement[],
            }));
            return [classId, result.data || []] as const;
          }),
        ),
      ]);

      const nextLessons = lessonResults.flatMap((result) => result.data || []);
      const nextAssessments = assessmentResults.flatMap((result) => result.data || []);
      const announcementMap = Object.fromEntries(announcementResults);

      const currentSchoolYear = enrolledClasses[0]?.schoolYear || getCurrentSchoolYearReference();
      const schoolEventsRes = await schoolEventService.getAll({ schoolYear: currentSchoolYear }).catch(() => ({
        success: true,
        message: '',
        data: [] as SchoolEvent[],
      }));

      const pendingFileUploadAssessments = nextAssessments
        .filter((assessment) => assessment.isPublished && assessment.type === 'file_upload')
        .slice(0, 4);
      const attemptEntries = await Promise.all(
        pendingFileUploadAssessments.map(async (assessment) => {
          try {
            const attemptsRes = await assessmentService.getStudentAttempts(assessment.id);
            return [assessment.id, attemptsRes.data || []] as const;
          } catch {
            return [assessment.id, []] as const;
          }
        }),
      );

      setLessons(nextLessons);
      setAssessments(nextAssessments);
      setAssessmentAttempts(Object.fromEntries(attemptEntries));
      setAnnouncementsByClass(announcementMap);
      setSchoolEvents(schoolEventsRes.data || []);
    } catch {
      setClasses([]);
      setLessons([]);
      setAssessments([]);
      setAssessmentAttempts({});
      setAnnouncementsByClass({});
      setSchoolEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const publishedAssessments = useMemo(
    () => assessments.filter((assessment) => assessment.isPublished),
    [assessments],
  );
  const pendingAssessments = useMemo(
    () => publishedAssessments.slice(0, 4),
    [publishedAssessments],
  );
  const recentLessons = useMemo(() => lessons.slice(0, 4), [lessons]);
  const todaySchedule = useMemo(() => getScheduleItemsForToday(classes), [classes]);
  const continueHref = classes[0] ? `/dashboard/student/classes/${classes[0].id}` : '/dashboard/student/courses';
  const assessmentHrefMap = useMemo(
    () =>
      Object.fromEntries(
        pendingAssessments.map((assessment) => [
          assessment.id,
          getStudentAssessmentHref(assessment, assessmentAttempts[assessment.id] || []),
        ]),
      ),
    [assessmentAttempts, pendingAssessments],
  );

  const selectedSchoolYear = useMemo(
    () => classes[0]?.schoolYear || schoolEvents[0]?.schoolYear || getCurrentSchoolYearReference(),
    [classes, schoolEvents],
  );

  const calendarFeed = useMemo(
    () =>
      normalizeCalendarFeed({
        classes,
        schoolEvents,
        assessmentsByClass: {},
        announcementsByClass,
        selectedSchoolYear,
        selectedClassId: 'all',
        month: calendarMonth,
      }),
    [announcementsByClass, calendarMonth, classes, schoolEvents, selectedSchoolYear],
  );
  const calendarDayIndex = useMemo(() => buildCalendarDayIndex(calendarFeed), [calendarFeed]);
  const dashboardCalendarEvents = useMemo(
    () =>
      getUpcomingFeedItems(calendarFeed)
        .filter((item) => MARKER_ORDER.includes(item.kind as (typeof MARKER_ORDER)[number]))
        .map(toDashboardCalendarEvent)
        .filter((item): item is StudentUpcomingEvent => Boolean(item)),
    [calendarFeed],
  );
  const eventTagsByDate = useMemo(() => {
    const map = new Map<string, StudentEventTag[]>();

    for (const [dateKey, dayItems] of Object.entries(calendarDayIndex)) {
      const tags = getMarkerKindsForDay(dayItems)
        .map((kind) => toStudentEventTag(dayItems.find((item) => item.kind === kind) ?? dayItems[0]))
        .filter((tag): tag is StudentEventTag => Boolean(tag));

      if (tags.length > 0) {
        map.set(dateKey, Array.from(new Set(tags)));
      }
    }

    return map;
  }, [calendarDayIndex]);

  if (loading) {
    return (
      <div className="student-v2-dashboard">
        <div className="student-v2-main">
          <div className="student-v2-column">
            <Skeleton className="h-36 rounded-xl" />
            <div className="grid gap-4 xl:grid-cols-2">
              {[1, 2].map((id) => (
                <Skeleton key={id} className="h-28 rounded-xl" />
              ))}
            </div>
          </div>
          <div className="student-v2-rail">
            <Skeleton className="h-56 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <StudentAnnouncementBoardDialog events={schoolEvents} />
      <motion.div className="student-v2-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      <div className="student-v2-main">
        <div className="student-v2-column">
          <section className="student-v2-hero">
            <div>
              <p className="student-v2-hero__eyebrow">Good morning!</p>
              <h1>Your Learning Hub</h1>
              <p>You have {pendingAssessments.length} pending task{pendingAssessments.length === 1 ? '' : 's'} today</p>
            </div>
            <div className="student-v2-hero__actions">
              <Link href={continueHref}>
                <Button className="student-v2-primary-btn">
                  Continue Learning
                </Button>
              </Link>
              <Link href="/dashboard/student/courses">
                <Button variant="outline" className="student-v2-secondary-btn">
                  My Courses
                </Button>
              </Link>
            </div>
          </section>

          <section className="student-v2-grid">
            <article className="student-v2-section">
              <header className="student-v2-section__header">
                <h2>Pending Tasks</h2>
              </header>
              <div className="student-v2-list">
                {pendingAssessments.length > 0 ? pendingAssessments.map((assessment) => (
                  <article key={assessment.id} className="student-v2-task-item">
                    <div className="student-v2-task-item__top">
                      <span>{normalizeAssessmentType(assessment.type)}</span>
                      <Link href={assessmentHrefMap[assessment.id] || `/dashboard/student/assessments/${assessment.id}`}>
                        <Button className="student-v2-task-item__button">Start</Button>
                      </Link>
                    </div>
                    <h3>{assessment.title}</h3>
                    <p>
                      <CalendarClock className="h-3.5 w-3.5" />
                      {formatShortDate(assessment.dueDate)}
                    </p>
                  </article>
                )) : (
                  <p className="student-v2-empty">You&apos;re all caught up right now.</p>
                )}
              </div>
            </article>

            <article className="student-v2-section">
              <header className="student-v2-section__header">
                <h2>Recent Lessons</h2>
              </header>
              <div className="student-v2-list">
                {recentLessons.length > 0 ? recentLessons.map((lesson, index) => (
                  <article key={lesson.id} className="student-v2-lesson-item">
                    <div>
                      <span>{index + 1}</span>
                      <div>
                        <h3>{lesson.title}</h3>
                        <p>Lesson {index + 1}</p>
                      </div>
                    </div>
                    <Link href={`/dashboard/student/lessons/${lesson.id}`}>
                      <Button variant="outline" className="student-v2-lesson-item__button">Open</Button>
                    </Link>
                  </article>
                )) : (
                  <p className="student-v2-empty">No recent lessons yet.</p>
                )}
              </div>
            </article>
          </section>
        </div>

        <aside className="student-v2-rail">
          <section className="student-v2-rail-card">
            <header>
              <h3>Day Schedule</h3>
            </header>
            <div className="student-v2-day-list">
              {todaySchedule.length > 0 ? todaySchedule.map((entry) => (
                <article key={`rail-${entry.id}`} className="student-v2-day-item">
                  <p>{formatTime(entry.startTime)} - {formatTime(entry.endTime)}</p>
                  <strong>{entry.className}</strong>
                  <span>{entry.teacherName}</span>
                </article>
              )) : (
                <p className="student-v2-empty">No classes scheduled for today.</p>
              )}
            </div>
          </section>

          <div className="space-y-4">
            <StudentCalendarCard
              month={calendarMonth}
              selectedDateKey={selectedDateKey}
              eventTagsByDate={eventTagsByDate}
              onSelectDate={setSelectedDateKey}
              onPrevMonth={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              onNextMonth={() => setCalendarMonth((current) => shiftMonth(current, 1))}
            />
            <StudentUpcomingEventsCard
              events={dashboardCalendarEvents}
              selectedDateKey={selectedDateKey}
              seeAllHref="/dashboard/student/announcements"
            />
          </div>
        </aside>
      </div>
      </motion.div>
    </>
  );
}
