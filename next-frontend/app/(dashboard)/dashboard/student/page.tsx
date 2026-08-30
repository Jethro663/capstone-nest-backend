'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { schoolEventService } from '@/services/school-event-service';
import { StudentCalendarCard } from '@/components/student/my-classes/StudentCalendarCard';
import { StudentUpcomingEventsCard } from '@/components/student/my-classes/StudentUpcomingEventsCard';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardStatePanel } from '@/components/layout/DashboardStatePanel';
import { StudentAnnouncementBoardDialog } from '@/components/student/StudentAnnouncementBoardDialog';
import type { Assessment, AssessmentAttempt } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { StudentRecentLesson } from '@/types/lesson';
import type { SchoolEvent } from '@/types/school-event';
import {
  getCurrentSchoolYearReference,
  shiftMonth,
} from '@/utils/calendar-feed';
import { getStudentAssessmentHref, getSubmittedAttempts } from '@/utils/student-assessment-routing';
import { buildStudentUpcomingEvents } from '@/utils/student-upcoming-events';
import { getTeacherName } from '@/utils/helpers';
import { toDateKey, type StudentEventTag } from '@/components/student/my-classes/types';

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

type StudentPageStatus = 'loading' | 'ready' | 'error' | 'partial';
type StudentDashboardFeedKind =
  | 'lessons'
  | 'assessments'
  | 'school-events'
  | 'attempts';
type StudentDashboardGuideScreen =
  | 'hero'
  | 'tasks'
  | 'lessons'
  | 'schedule'
  | 'calendar'
  | 'reminders';

const studentDashboardGuidePages: Array<{
  title: string;
  description: string;
  screen: StudentDashboardGuideScreen;
  reminder: string;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'caution';
  }>;
}> = [
  {
    title: 'Start here on your main dashboard',
    description:
      'This page is your quick home base. It shows what needs your attention first before you open other pages.',
    screen: 'hero',
    reminder: 'Quick rule: if you are unsure where to begin, use Continue Learning first.',
    steps: [
      {
        action: 'Read',
        body: 'Check the big welcome message first so you know how many tasks are waiting today.',
      },
      {
        action: 'Continue',
        body: 'Tap Continue Learning to go back to the class you are most likely to need next.',
      },
      {
        action: 'Browse',
        body: 'Use My Courses when you want to see all of your classes in one place.',
      },
      {
        action: 'Open help',
        body: 'Tap the question mark button any time you want this guide again.',
      },
    ],
  },
  {
    title: 'Check pending tasks before anything else',
    description:
      'The Pending Tasks card helps you catch quizzes, assignments, and other work that still needs to be done.',
    screen: 'tasks',
    reminder: 'Best habit: do the task with the nearest due date first.',
    steps: [
      {
        action: 'Scan',
        body: 'Read the small subject tag so you know what kind of task you are opening.',
      },
      {
        action: 'Check',
        body: 'Look at the task title and due date before you press Start.',
      },
      {
        action: 'Start',
        body: 'Use the Start button when you are ready to open that task right away.',
      },
      {
        action: 'Watch out',
        body: 'If a due date is close, finish that task first so you do not miss it.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Use recent lessons for quick review',
    description:
      'Recent Lessons gives you a fast way to reopen lessons and review before a task, quiz, or class.',
    screen: 'lessons',
    reminder: 'If you feel stuck on a task, open the lesson first and review the basics.',
    steps: [
      {
        action: 'Look',
        body: 'Each lesson card shows the lesson title and its number in the recent list.',
      },
      {
        action: 'Open',
        body: 'Tap Open to read the lesson again without searching through your class page.',
      },
      {
        action: 'Review',
        body: 'Use recent lessons when you want a quick refresher before answering an assessment.',
      },
      {
        action: 'Wait',
        body: 'If the list is empty, your teacher may not have posted a new lesson yet.',
      },
    ],
  },
  {
    title: 'Read your day schedule for today only',
    description:
      'The Day Schedule card shows the classes that are lined up for today, with time, subject, and teacher.',
    screen: 'schedule',
    reminder: 'This card is only for today, so check My Courses if you need the full class view.',
    steps: [
      {
        action: 'Read time',
        body: 'Start with the time so you know which class comes first today.',
      },
      {
        action: 'Match',
        body: 'Check the subject name and teacher name so you open the right class later.',
      },
      {
        action: 'Relax',
        body: 'If the card says there are no classes today, it only means your schedule is clear for now.',
      },
    ],
  },
  {
    title: 'Use the calendar and event list together',
    description:
      'The calendar and the Upcoming Events card work as a pair, so you can spot important dates and read what is happening.',
    screen: 'calendar',
    reminder: 'Tap a date first, then read the event list on the right side.',
    steps: [
      {
        action: 'Move',
        body: 'Use the small arrows to switch months when you want to check future dates.',
      },
      {
        action: 'Tap',
        body: 'Choose a date on the calendar to focus the event list on that day.',
      },
      {
        action: 'Read dots',
        body: 'Colored dots show that the day has a class update, school event, or break notice.',
      },
      {
        action: 'Open more',
        body: 'Use See All when you want the full upcoming calendar with more deadlines and events.',
      },
    ],
  },
  {
    title: 'Do not skip reminders and school notices',
    description:
      'JA may greet you with a reminder popup when the dashboard opens. It is there to help you notice school updates and important days.',
    screen: 'reminders',
    reminder: 'Simple rule: if JA shows a notice, read it before closing it.',
    steps: [
      {
        action: 'Read',
        body: 'Look over the reminder popup when it appears so you do not miss a school notice.',
      },
      {
        action: 'Check',
        body: 'Use the guide or event buttons inside the popup to move through each notice.',
      },
      {
        action: 'Close',
        body: 'Close the popup after reading, then keep using the dashboard as normal.',
      },
      {
        action: 'Remember',
        body: 'You can still find many updates later in your class announcements and event lists.',
      },
    ],
  },
];

function StudentDashboardGuideBuddy({
  src,
  alt,
  label,
  tip,
}: {
  src: string;
  alt: string;
  label: string;
  tip: string;
}) {
  return (
    <div className="student-dashboard-guide-shell__ja-tip">
      <div className="student-dashboard-guide-shell__ja-image">
        <Image src={src} alt={alt} fill sizes="72px" className="object-contain" />
      </div>
      <div className="student-dashboard-guide-shell__ja-copy">
        <small>{label}</small>
        <strong>{tip}</strong>
      </div>
    </div>
  );
}

function StudentDashboardGuideScreenshot({ screen }: { screen: StudentDashboardGuideScreen }) {
  if (screen === 'hero') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-dashboard-guide-shot">
        <div className="student-dashboard-guide-shell">
          <div className="student-dashboard-guide-shell__hero">
            <div className="student-dashboard-guide-shell__hero-copy">
              <small>Main dashboard</small>
              <strong>Your Learning Hub</strong>
              <p>2 pending tasks today</p>
            </div>
            <div className="student-dashboard-guide-shell__hero-actions">
              <span className="is-solid">Continue Learning</span>
              <span>My Courses</span>
              <b>?</b>
            </div>
          </div>

          <div className="student-dashboard-guide-shell__summary-row">
            <article>
              <small>First stop</small>
              <strong>Pending Tasks</strong>
              <p>Open due work fast.</p>
            </article>
            <article>
              <small>Quick review</small>
              <strong>Recent Lessons</strong>
              <p>Reopen your last lessons.</p>
            </article>
          </div>

          <StudentDashboardGuideBuddy
            src="/images/JA/ja_wave.png"
            alt="JA waving beside the student dashboard guide"
            label="JA says"
            tip="This page helps you decide your next step in just a few seconds."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-actions">
          Dashboard buttons
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-help">
          Help button
        </em>
      </div>
    );
  }

  if (screen === 'tasks') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-dashboard-guide-shot">
        <div className="student-dashboard-guide-shell">
          <div className="student-dashboard-guide-shell__card-grid">
            <article className="student-dashboard-guide-shell__card">
              <header>
                <small>Pending Tasks</small>
                <strong>Algebra Quiz</strong>
                <p>Assignment</p>
              </header>
              <div className="student-dashboard-guide-shell__task-meta">
                <span>Due Jun 18</span>
                <b>Start</b>
              </div>
            </article>

            <article className="student-dashboard-guide-shell__card is-soft">
              <header>
                <small>Pending Tasks</small>
                <strong>Lab Reflection</strong>
                <p>Quiz</p>
              </header>
              <div className="student-dashboard-guide-shell__task-meta">
                <span>Due Jun 19</span>
                <b>Start</b>
              </div>
            </article>
          </div>

          <StudentDashboardGuideBuddy
            src="/images/JA/ja_thinking.png"
            alt="JA thinking beside pending tasks"
            label="Quick tip"
            tip="Read the due date before you choose which task to start."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-task-card">
          Task card
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-task-start">
          Start button
        </em>
      </div>
    );
  }

  if (screen === 'lessons') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-dashboard-guide-shot">
        <div className="student-dashboard-guide-shell">
          <div className="student-dashboard-guide-shell__lesson-list">
            <article>
              <div>
                <span>1</span>
                <div>
                  <strong>Linear Equations</strong>
                  <p>Lesson 1</p>
                </div>
              </div>
              <b>Open</b>
            </article>
            <article>
              <div>
                <span>2</span>
                <div>
                  <strong>Science Notes</strong>
                  <p>Lesson 2</p>
                </div>
              </div>
              <b>Open</b>
            </article>
          </div>

          <StudentDashboardGuideBuddy
            src="/images/JA/ja_cheer.png"
            alt="JA cheering beside recent lessons"
            label="JA says"
            tip="Open a lesson again if you want a fast review before doing a task."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-lesson-list">
          Lesson list
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-lesson-open">
          Open lesson
        </em>
      </div>
    );
  }

  if (screen === 'schedule') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-dashboard-guide-shot">
        <div className="student-dashboard-guide-shell">
          <article className="student-dashboard-guide-shell__schedule-card">
            <header>
              <small>Day Schedule</small>
              <strong>Today&apos;s classes</strong>
            </header>
            <div className="student-dashboard-guide-shell__schedule-list">
              <div>
                <p>8:00 AM - 9:00 AM</p>
                <strong>Mathematics</strong>
                <span>Mrs. Santos</span>
              </div>
              <div>
                <p>10:00 AM - 11:00 AM</p>
                <strong>Science</strong>
                <span>Mr. Cruz</span>
              </div>
            </div>
          </article>

          <StudentDashboardGuideBuddy
            src="/images/JA/ja_wave.png"
            alt="JA waving beside the day schedule"
            label="Friendly note"
            tip="This card only shows today, so it is great for a quick check."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-schedule-time">
          Time block
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-schedule-class">
          Class details
        </em>
      </div>
    );
  }

  if (screen === 'calendar') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-dashboard-guide-shot">
        <div className="student-dashboard-guide-shell">
          <div className="student-dashboard-guide-shell__calendar-layout">
            <article className="student-dashboard-guide-shell__calendar-card">
              <header>
                <strong>May 2026</strong>
                <span>&lt; &gt;</span>
              </header>
              <div className="student-dashboard-guide-shell__weekdays">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
                  <small key={`${label}-${index}`}>{label}</small>
                ))}
              </div>
              <div className="student-dashboard-guide-shell__days">
                {['12', '13', '14', '15', '16', '17', '18'].map((day) => (
                  <span key={day} data-selected={day === '15'}>
                    <i />
                    {day}
                  </span>
                ))}
              </div>
            </article>

            <article className="student-dashboard-guide-shell__events-card">
              <header>
                <div>
                  <small>Upcoming Events</small>
                  <strong>Selected day</strong>
                </div>
                <b>See All</b>
              </header>
              <div>
                <span>May 15</span>
                <div>
                  <strong>Class Announcement</strong>
                  <p>Science room update</p>
                </div>
              </div>
              <div>
                <span>May 15</span>
                <div>
                  <strong>Holiday Break</strong>
                  <p>No classes tomorrow</p>
                </div>
              </div>
            </article>
          </div>

          <StudentDashboardGuideBuddy
            src="/images/JA/ja_cheer.png"
            alt="JA cheering beside the calendar"
            label="JA says"
            tip="Pick a day first so the event list knows what to show."
          />
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-calendar">
          Calendar
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-events">
          Event list
        </em>
      </div>
    );
  }

  return (
    <div className="teacher-intervention-workspace__manual-shot student-dashboard-guide-shot">
      <div className="student-dashboard-guide-shell">
        <article className="student-dashboard-guide-shell__notice-card">
          <header>
            <div>
              <small>Student reminder popup</small>
              <strong>LMS reminders</strong>
              <p>Read updates before you continue.</p>
            </div>
            <b>Guide</b>
          </header>

          <div className="student-dashboard-guide-shell__notice-list">
            <div>
              <span>01</span>
              <p>Check due dates before starting assessments.</p>
            </div>
            <div>
              <span>02</span>
              <p>Use announcements for official teacher and school updates.</p>
            </div>
          </div>

          <div className="student-dashboard-guide-shell__notice-footer">
            <div>
              <small>School event</small>
              <strong>Science Fair</strong>
            </div>
            <span>Event 1</span>
          </div>
        </article>

        <StudentDashboardGuideBuddy
          src="/images/JA/ja_wave.png"
          alt="JA waving beside student reminders"
          label="Remember"
          tip="These reminders are short, so reading them now can save you from missing updates later."
        />
      </div>

      <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-reminder">
        Reminder popup
      </em>
      <em className="teacher-intervention-workspace__manual-pin student-dashboard-guide-pin is-student-dashboard-guide-notice">
        School notice
      </em>
    </div>
  );
}

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

export default function StudentDashboardPage() {
  const { user } = useAuth();

  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [recentLessons, setRecentLessons] = useState<StudentRecentLesson[]>([]);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentAttempts, setAssessmentAttempts] = useState<Record<string, AssessmentAttempt[]>>({});
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [status, setStatus] = useState<StudentPageStatus>('loading');
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [failedFeedKinds, setFailedFeedKinds] = useState<
    StudentDashboardFeedKind[]
  >([]);
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const fetchData = useCallback(async () => {
    if (!user?.id) {
      setStatus('error');
      setHasLoadedOnce(true);
      return;
    }

    setStatus('loading');

    try {
      const [visibleClassRes, hiddenClassRes] = await Promise.all([
        classService.getByStudent(user.id, 'active'),
        classService.getByStudent(user.id, 'hidden'),
      ]);
      const enrolledClassMap = new Map<string, ClassItem>();
      for (const classItem of [...(visibleClassRes.data || []), ...(hiddenClassRes.data || [])]) {
        enrolledClassMap.set(classItem.id, classItem);
      }
      const enrolledClasses = Array.from(enrolledClassMap.values()).filter(
        (classItem) => classItem.isActive,
      );
      setClasses(enrolledClasses);

      const classIds = enrolledClasses.map((classItem) => classItem.id);
      const schoolYears = Array.from(
        new Set(
          enrolledClasses
            .map((classItem) => classItem.schoolYear)
            .filter((schoolYear): schoolYear is string => Boolean(schoolYear)),
        ),
      );
      if (schoolYears.length === 0) {
        schoolYears.push(getCurrentSchoolYearReference());
      }
      const [lessonResults, assessmentResults, schoolEventResults] =
        await Promise.all([
          Promise.allSettled([lessonService.getRecent(4)]),
          Promise.allSettled(
            classIds.map((classId) => assessmentService.getByClass(classId)),
          ),
          Promise.allSettled(
            schoolYears.map((schoolYear) => schoolEventService.getAll({ schoolYear })),
          ),
        ]);

      const failedKinds = new Set<StudentDashboardFeedKind>();
      const nextLessons =
        lessonResults[0]?.status === 'fulfilled'
          ? lessonResults[0].value.data || []
          : [];
      const nextAssessments = assessmentResults.flatMap((result) =>
        result.status === 'fulfilled' ? result.value.data || [] : [],
      );
      if (lessonResults.some((result) => result.status === 'rejected')) {
        failedKinds.add('lessons');
      }
      if (assessmentResults.some((result) => result.status === 'rejected')) {
        failedKinds.add('assessments');
      }
      if (schoolEventResults.some((result) => result.status === 'rejected')) {
        failedKinds.add('school-events');
      }

      const publishedAssessments = nextAssessments.filter((assessment) => assessment.isPublished);
      const attemptResults = await Promise.allSettled(
        publishedAssessments.map(async (assessment) => {
          const attemptsRes = await assessmentService.getStudentAttempts(assessment.id);
          return [assessment.id, attemptsRes.data || []] as const;
        }),
      );
      const attemptEntries = attemptResults.flatMap((result) =>
        result.status === 'fulfilled' ? [result.value] : [],
      );

      if (attemptResults.some((result) => result.status === 'rejected')) {
        failedKinds.add('attempts');
      }

      if (nextLessons.length > 0 || !failedKinds.has('lessons')) {
        setRecentLessons(nextLessons);
      }
      setAssessments(nextAssessments);
      if (attemptResults.length === 0 || attemptEntries.length > 0 || !failedKinds.has('attempts')) {
        setAssessmentAttempts(Object.fromEntries(attemptEntries));
      }
      setSchoolEvents(
        schoolEventResults.flatMap((result) =>
          result.status === 'fulfilled' ? result.value.data || [] : [],
        ),
      );

      setFailedFeedKinds(Array.from(failedKinds));
      setStatus(failedKinds.size > 0 ? 'partial' : 'ready');
    } catch {
      setStatus('error');
    } finally {
      setHasLoadedOnce(true);
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
    () =>
      publishedAssessments
        .filter((assessment) => {
          const maxAttempts = assessment.maxAttempts ?? 1;
          const submittedAttempts = getSubmittedAttempts(assessmentAttempts[assessment.id] || []);
          return submittedAttempts.length < maxAttempts;
        })
        .slice(0, 4),
    [assessmentAttempts, publishedAssessments],
  );
  const todaySchedule = useMemo(() => getScheduleItemsForToday(classes), [classes]);
  const pendingTasksUnavailable =
    failedFeedKinds.includes('assessments') ||
    failedFeedKinds.includes('attempts');
  const lessonsUnavailable = failedFeedKinds.includes('lessons');
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

  const assessmentsByClass = useMemo(
    () =>
      assessments.reduce<Record<string, Assessment[]>>((grouped, assessment) => {
        (grouped[assessment.classId] ??= []).push(assessment);
        return grouped;
      }, {}),
    [assessments],
  );
  const dashboardCalendarEvents = useMemo(
    () => buildStudentUpcomingEvents({ classes, assessmentsByClass, schoolEvents }),
    [assessmentsByClass, classes, schoolEvents],
  );
  const activeGuidePage = studentDashboardGuidePages[helpPage] ?? studentDashboardGuidePages[0];
  const eventTagsByDate = useMemo(() => {
    const map = new Map<string, StudentEventTag[]>();

    for (const event of dashboardCalendarEvents) {
      const tags = map.get(event.dateKey) ?? [];
      if (!tags.includes(event.tag)) {
        tags.push(event.tag);
      }
      map.set(event.dateKey, tags);
    }

    return map;
  }, [dashboardCalendarEvents]);

  if (status === 'loading' && !hasLoadedOnce) {
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

  if (status === 'error' && classes.length === 0) {
    return (
      <DashboardStatePanel
        kind="error"
        title="Dashboard couldn't be loaded"
        description="Your enrolled classes are temporarily unavailable. Try loading the dashboard again."
        primaryAction={{ label: 'Try again', onClick: () => void fetchData() }}
      />
    );
  }

  return (
    <>
      <StudentAnnouncementBoardDialog events={schoolEvents} />
      <motion.div className="student-v2-dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
      {status === 'partial' ? (
        <DashboardStatePanel
          kind="unavailable"
          title="Some dashboard items couldn't be loaded"
          description="Available classes and learning items remain visible while you retry the missing feeds."
          primaryAction={{
            label: 'Retry dashboard feeds',
            onClick: () => void fetchData(),
          }}
        />
      ) : status === 'error' ? (
        <DashboardStatePanel
          kind="unavailable"
          title="Dashboard refresh failed"
          description="Your last complete dashboard remains visible while you retry."
          primaryAction={{
            label: 'Retry dashboard',
            onClick: () => void fetchData(),
          }}
        />
      ) : null}
      <div className="student-v2-main">
        <div className="student-v2-column">
          <section className="student-v2-hero">
            <div>
              <p className="student-v2-hero__eyebrow">Good morning!</p>
              <h1>Your Learning Hub</h1>
              <p>
                {pendingTasksUnavailable
                  ? 'Some task data is temporarily unavailable'
                  : `You have ${pendingAssessments.length} pending task${pendingAssessments.length === 1 ? '' : 's'} today`}
              </p>
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
              <Button
                type="button"
                variant="outline"
                className="student-dashboard-help-button"
                aria-label="Dashboard help"
                onClick={() => {
                  setHelpPage(0);
                  setHelpOpen(true);
                }}
              >
                <CircleHelp className="h-4 w-4" />
              </Button>
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
                )) : pendingTasksUnavailable ? (
                  <p className="student-v2-empty">Pending tasks are temporarily unavailable.</p>
                ) : (
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
                    <Link
                      href={`/dashboard/student/classes/${lesson.classId}/modules/${lesson.moduleId}?lessonId=${lesson.id}`}
                    >
                      <Button variant="outline" className="student-v2-lesson-item__button">Open</Button>
                    </Link>
                  </article>
                )) : lessonsUnavailable ? (
                  <p className="student-v2-empty">Recent lessons are temporarily unavailable.</p>
                ) : (
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
            />
          </div>
        </aside>
      </div>
      </motion.div>

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog student-dashboard-guide-dialog">
          <DialogHeader>
            <DialogTitle>Student guide: Main Dashboard</DialogTitle>
            <DialogDescription>
              This guide explains the whole dashboard in simple pages, with examples that match what students see.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-label="Main Dashboard guide pages">
            <span>{`Page ${helpPage + 1} of ${studentDashboardGuidePages.length}`}</span>
            <div className="teacher-intervention-workspace__manual-dots">
              {studentDashboardGuidePages.map((page, index) => (
                <button
                  key={page.title}
                  type="button"
                  className={index === helpPage ? 'is-active' : undefined}
                  onClick={() => setHelpPage(index)}
                  aria-label={`Open guide page ${index + 1}`}
                />
              ))}
            </div>
          </div>

          <div className="teacher-intervention-workspace__manual-layout">
            <div className="teacher-intervention-workspace__manual-copy">
              <span className="teacher-intervention-workspace__manual-kicker">Main Dashboard tour</span>
              <h3>{activeGuidePage.title}</h3>
              <p>{activeGuidePage.description}</p>

              <div className="route-guide-steps">
                {activeGuidePage.steps.map((step, index) => (
                  <div
                    key={`${activeGuidePage.title}-${step.action}-${index}`}
                    className={`route-guide-step${step.tone ? ` is-${step.tone}` : ''}`}
                  >
                    <span className="route-guide-step__index">{index + 1}</span>
                    <div>
                      <strong>{step.action}</strong>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="teacher-intervention-workspace__manual-reminder">{activeGuidePage.reminder}</div>
            </div>

            <StudentDashboardGuideScreenshot screen={activeGuidePage.screen} />
          </div>

          <DialogFooter className="teacher-intervention-workspace__manual-footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => setHelpPage((current) => Math.max(0, current - 1))}
              disabled={helpPage === 0}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous page
            </Button>
            <Button type="button" variant="ghost" aria-label="Close guide" onClick={() => setHelpOpen(false)}>
              Close guide
            </Button>
            <Button
              type="button"
              onClick={() =>
                setHelpPage((current) => Math.min(studentDashboardGuidePages.length - 1, current + 1))
              }
              disabled={helpPage === studentDashboardGuidePages.length - 1}
            >
              Next page
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
