'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Grid2X2,
  LayoutPanelTop,
  RefreshCcw,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { classService } from '@/services/class-service';
import { moduleService } from '@/services/module-service';
import { lessonService } from '@/services/lesson-service';
import { assessmentService } from '@/services/assessment-service';
import { announcementService } from '@/services/announcement-service';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  STUDENT_COURSE_PRESENTATION_OPTIONS,
  resolveStudentCoursePresentation,
  toStudentHeroStyle,
} from '@/components/class/student-course-presentation';
import type {
  ClassItem,
  StudentClassPresentationMode,
  StudentClassPresentationPreference,
  StudentCourseViewMode,
} from '@/types/class';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/utils/cn';
import {
  StudentClassCard,
} from '@/components/student/my-classes/StudentClassCard';
import {
  StudentCalendarCard,
} from '@/components/student/my-classes/StudentCalendarCard';
import {
  StudentUpcomingEventsCard,
} from '@/components/student/my-classes/StudentUpcomingEventsCard';
import {
  type StudentEventTag,
  type StudentUpcomingEvent,
  toDateKey,
} from '@/components/student/my-classes/types';
import { deriveStudentCourseMetrics } from '@/lib/student-course-metrics';

interface ClassWithProgress extends ClassItem {
  progress: number;
  completedCount: number;
  totalLessons: number;
  totalAssessments: number;
  classmatesCount: number;
  pendingCount: number;
}

type PrimaryTab = 'all' | 'in_progress' | 'completed';
type StudentCoursesGuideScreen = 'overview' | 'card' | 'actions' | 'organize' | 'calendar';

const PRIMARY_TABS: Array<{ value: PrimaryTab; label: string }> = [
  { value: 'all', label: 'All Classes' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const studentCoursesGuidePages: Array<{
  title: string;
  description: string;
  reminder: string;
  screen: StudentCoursesGuideScreen;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'default' | 'caution';
  }>;
}> = [
  {
    title: 'Start here and find the class you need',
    description:
      'This page keeps your classes in one place so you can search, filter, refresh, and open the right subject quickly.',
    reminder:
      'Simple rule: if you are looking for one class, start with the search box or the class status tabs.',
    screen: 'overview',
    steps: [
      {
        action: 'Search',
        body: 'Type a class name, section, or subject code in the search box to narrow the list.',
      },
      {
        action: 'Switch',
        body: 'Use All Classes, In Progress, or Completed to show only the class group you want to see.',
      },
      {
        action: 'Check',
        body: 'Open Hidden when you want to see classes that you tucked away from the main list.',
      },
      {
        action: 'Refresh',
        body: 'Tap Refresh if you want the newest class details from the system.',
      },
    ],
  },
  {
    title: 'Read the class card before you open it',
    description:
      'Each card tells you the subject, section, teacher, quick class numbers, and how far you already are.',
    reminder:
      'Look at the top badge and the progress bar first so you can tell if the class is ready, in progress, or done.',
    screen: 'card',
    steps: [
      {
        action: 'Notice',
        body: 'Read the class title, grade, section, and teacher name to make sure this is the right subject.',
      },
      {
        action: 'Check',
        body: 'Use the Students, Lessons, and Pending boxes for a fast summary of what is inside the class.',
      },
      {
        action: 'Track',
        body: 'Watch the Learning progress bar to see how much of the class work you have already finished.',
      },
    ],
  },
  {
    title: 'Use the class buttons for the next step',
    description:
      'Every card has buttons that help you jump straight to tasks, the class page, or the schedule without extra taps.',
    reminder:
      'Use View Tasks when you need work right now. Use Open Class or Continue Learning when you want the full class page.',
    screen: 'actions',
    steps: [
      {
        action: 'View',
        body: 'Tap View Tasks to go straight to the assignments and activities for that class.',
      },
      {
        action: 'Open',
        body: 'Tap Open Class or Continue Learning to enter the class page and continue where you left off.',
      },
      {
        action: 'Schedule',
        body: 'Tap View Schedule when you want to check class timing, dates, or the class calendar view.',
      },
      {
        action: 'Menu',
        body: 'Open the small menu on the card if you want extra class options.',
      },
    ],
  },
  {
    title: 'Arrange the page the way you like it',
    description:
      'You can switch card styles, change the card look, and hide or restore classes without deleting anything.',
    reminder:
      'Hidden classes are only moved out of the main list. You can always bring them back later from Hidden.',
    screen: 'organize',
    steps: [
      {
        action: 'Switch',
        body: 'Use the card and wide layout buttons to choose the class view that is easier for you to read.',
      },
      {
        action: 'Customize',
        body: 'Pick Customize class from the card menu if you want a different class card theme.',
      },
      {
        action: 'Hide',
        body: 'Use Hide class when you want a cleaner main list for now.',
      },
      {
        action: 'Restore',
        body: 'Open Hidden and choose Restore class when you want that class back in your main list.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Use the calendar and event list on the side',
    description:
      'The right side helps you spot deadlines, announcements, and school events so you know what is coming up next.',
    reminder:
      'Tap a date with colored dots to show the events for that day first, then use See All if you want the full list.',
    screen: 'calendar',
    steps: [
      {
        action: 'Move',
        body: 'Use the month arrows to look at earlier or later dates on the class calendar.',
      },
      {
        action: 'Choose',
        body: 'Tap a calendar date to focus the event list on that day.',
      },
      {
        action: 'Read',
        body: 'Open an event card to jump to the related class announcement or task page.',
      },
      {
        action: 'See All',
        body: 'Tap See All when you want the larger announcements page with more updates.',
      },
    ],
  },
];

function toPreferenceMap(preferences: StudentClassPresentationPreference[] | undefined) {
  if (!preferences?.length) return {} as Record<string, StudentClassPresentationPreference>;
  return Object.fromEntries(preferences.map((entry) => [entry.classId, entry]));
}

function parseDate(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function resolveAnnouncementTag(title: string, content: string): StudentEventTag {
  const text = `${title} ${content}`.toLowerCase();
  if (text.includes('quiz') || text.includes('exam') || text.includes('assessment')) {
    return 'assessment';
  }
  if (text.includes('holiday') || text.includes('break')) {
    return 'holiday';
  }
  if (text.includes('announcement')) {
    return 'announcement';
  }
  return 'event';
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
}

function formatTimeLabel(date: Date) {
  const hasTime = date.getHours() !== 0 || date.getMinutes() !== 0;
  if (!hasTime) return 'All Day';
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function shiftMonth(baseDate: Date, monthDelta: number) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + monthDelta, 1);
}

function StudentCoursesGuideScreenshot({ screen }: { screen: StudentCoursesGuideScreen }) {
  if (screen === 'overview') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-courses-guide-shot">
        <div className="student-courses-guide-shell">
          <div className="student-courses-guide-shell__toolbar">
            <span className="is-search">Search class</span>
            <b>All</b>
            <span>In Progress</span>
            <span>Done</span>
            <i>Hidden 2</i>
            <span className="is-icon">Card</span>
            <span className="is-icon">Wide</span>
            <i className="is-strong">Refresh</i>
            <strong>?</strong>
          </div>

          <div className="student-courses-guide-shell__course-grid">
            <article>
              <header>
                <small>In Progress</small>
                <strong>Mathematics 7</strong>
                <p>Grade 7 - Section A</p>
              </header>
              <div className="student-courses-guide-shell__tiny-metrics">
                <span>32 Students</span>
                <span>8 Lessons</span>
                <span>2 Pending</span>
              </div>
            </article>
            <div className="student-courses-guide-shell__ja-tip">
              <div className="student-courses-guide-shell__ja-image">
                <Image src="/images/JA/ja_wave.png" alt="JA waving" fill sizes="72px" className="object-contain" />
              </div>
              <div className="student-courses-guide-shell__ja-copy">
                <small>JA says</small>
                <strong>Search first if you have many classes.</strong>
              </div>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-tools">
          Page tools
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-help">
          Help button
        </em>
      </div>
    );
  }

  if (screen === 'card') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-courses-guide-shot">
        <div className="student-courses-guide-shell">
          <article className="student-courses-guide-shell__card">
            <header>
              <small>In Progress</small>
              <b>...</b>
              <strong>Mathematics 7</strong>
              <p>Grade 7 - Section A</p>
              <p>with Mrs. Cruz</p>
            </header>

            <div className="student-courses-guide-shell__stats">
              <span>
                <strong>32</strong>
                <small>Students</small>
              </span>
              <span>
                <strong>8</strong>
                <small>Lessons</small>
              </span>
              <span>
                <strong>2</strong>
                <small>Pending</small>
              </span>
            </div>

            <div className="student-courses-guide-shell__progress">
              <div>
                <small>Learning progress</small>
                <strong>68%</strong>
              </div>
              <p />
            </div>
          </article>

          <div className="student-courses-guide-shell__ja-tip">
            <div className="student-courses-guide-shell__ja-image">
              <Image src="/images/JA/ja_cheer.png" alt="JA cheering" fill sizes="72px" className="object-contain" />
            </div>
            <div className="student-courses-guide-shell__ja-copy">
              <small>Quick tip</small>
              <strong>Watch the progress bar and the pending count.</strong>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-badge">
          Status badge
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-progress">
          Learning progress
        </em>
      </div>
    );
  }

  if (screen === 'actions') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-courses-guide-shot">
        <div className="student-courses-guide-shell">
          <article className="student-courses-guide-shell__card is-compact">
            <div className="student-courses-guide-shell__pills">
              <span>3 tasks</span>
              <span>Section A</span>
            </div>

            <div className="student-courses-guide-shell__buttons">
              <b>View Tasks</b>
              <b className="is-solid">Continue Learning</b>
            </div>

            <div className="student-courses-guide-shell__schedule">View Schedule</div>

            <div className="student-courses-guide-shell__menu">
              <span>Customize class</span>
              <span>Hide class</span>
            </div>
          </article>

          <div className="student-courses-guide-shell__ja-tip">
            <div className="student-courses-guide-shell__ja-image">
              <Image
                src="/images/JA/ja_thinking.png"
                alt="JA thinking beside class actions"
                fill
                sizes="72px"
                className="object-contain"
              />
            </div>
            <div className="student-courses-guide-shell__ja-copy">
              <small>JA says</small>
              <strong>Pick the button that matches what you want to do next.</strong>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-tasks">
          View Tasks
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-open">
          Continue Learning
        </em>
      </div>
    );
  }

  if (screen === 'organize') {
    return (
      <div className="teacher-intervention-workspace__manual-shot student-courses-guide-shot">
        <div className="student-courses-guide-shell">
          <div className="student-courses-guide-shell__toolbar is-short">
            <i>Hidden 1</i>
            <span className="is-icon">Card</span>
            <span className="is-icon is-active">Wide</span>
          </div>

          <div className="student-courses-guide-shell__organize-grid">
            <article className="student-courses-guide-shell__menu-card">
              <small>Class menu</small>
              <span>Customize class</span>
              <span>Hide class</span>
            </article>

            <article className="student-courses-guide-shell__preview-card">
              <small>Theme preview</small>
              <div />
              <b>Save Theme</b>
            </article>
          </div>

          <div className="student-courses-guide-shell__ja-tip">
            <div className="student-courses-guide-shell__ja-image">
              <Image src="/images/JA/ja_wave.png" alt="JA waving with class settings" fill sizes="72px" className="object-contain" />
            </div>
            <div className="student-courses-guide-shell__ja-copy">
              <small>Friendly reminder</small>
              <strong>Hidden classes can still come back later.</strong>
            </div>
          </div>
        </div>

        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-hidden">
          Hidden list
        </em>
        <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-customize">
          Customize class
        </em>
      </div>
    );
  }

  return (
    <div className="teacher-intervention-workspace__manual-shot student-courses-guide-shot">
      <div className="student-courses-guide-shell">
        <div className="student-courses-guide-shell__calendar-layout">
          <article className="student-courses-guide-shell__calendar-card">
            <header>
              <strong>May 2026</strong>
              <span>‹ ›</span>
            </header>
            <div className="student-courses-guide-shell__weekdays">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => (
                <small key={`${label}-${index}`}>{label}</small>
              ))}
            </div>
            <div className="student-courses-guide-shell__days">
              {['12', '13', '14', '15', '16', '17', '18'].map((day) => (
                <span key={day} data-selected={day === '15'}>
                  {day}
                </span>
              ))}
            </div>
          </article>

          <article className="student-courses-guide-shell__events-card">
            <header>
              <div className="student-courses-guide-shell__events-head">
                <small>Upcoming</small>
                <strong>Events on selected day</strong>
              </div>
              <b>See All</b>
            </header>
            <div className="student-courses-guide-shell__event-row">
              <span>May 15</span>
              <div>
                <strong>Algebra Quiz</strong>
                <p>Due 8:00 AM</p>
              </div>
            </div>
            <div className="student-courses-guide-shell__event-row">
              <span>May 15</span>
              <div>
                <strong>Class Announcement</strong>
                <p>Science room update</p>
              </div>
            </div>
          </article>
        </div>

        <div className="student-courses-guide-shell__ja-tip">
          <div className="student-courses-guide-shell__ja-image">
            <Image src="/images/JA/ja_cheer.png" alt="JA cheering beside the calendar" fill sizes="72px" className="object-contain" />
          </div>
          <div className="student-courses-guide-shell__ja-copy">
            <small>JA says</small>
            <strong>Tap the date first to focus the event list.</strong>
          </div>
        </div>
      </div>

      <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-calendar">
        Calendar
      </em>
      <em className="teacher-intervention-workspace__manual-pin student-courses-guide-pin is-student-courses-guide-events">
        Event list
      </em>
    </div>
  );
}

export default function StudentCoursesPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [courses, setCourses] = useState<ClassWithProgress[]>([]);
  const [hiddenCourses, setHiddenCourses] = useState<ClassWithProgress[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<StudentUpcomingEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<PrimaryTab>('all');
  const [viewMode, setViewMode] = useState<StudentCourseViewMode>('card');
  const [searchQuery, setSearchQuery] = useState('');
  const [presentationByClass, setPresentationByClass] = useState<
    Record<string, StudentClassPresentationPreference>
  >({});
  const [showHiddenOnly, setShowHiddenOnly] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [customizingCourse, setCustomizingCourse] = useState<ClassWithProgress | null>(null);
  const [customizingIndex, setCustomizingIndex] = useState(0);
  const [draftStyleMode, setDraftStyleMode] = useState<StudentClassPresentationMode>('gradient');
  const [draftStyleToken, setDraftStyleToken] = useState('gradient-blue');
  const [savingCustomization, setSavingCustomization] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDateKey, setSelectedDateKey] = useState(() => toDateKey(new Date()));
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  const activeGuidePage = studentCoursesGuidePages[helpPage];

  const fetchData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);
      const [visibleRes, hiddenRes, presentationRes, viewRes] = await Promise.all([
        classService.getByStudent(user.id, 'all').catch(() => ({ data: [] as ClassItem[] })),
        classService.getByStudent(user.id, 'hidden').catch(() => ({ data: [] as ClassItem[] })),
        classService
          .getStudentPresentationPreferences(user.id)
          .catch(() => ({ data: [] as StudentClassPresentationPreference[] })),
        classService
          .getStudentCourseViewPreference(user.id)
          .catch(() => ({ data: { viewMode: 'card' as StudentCourseViewMode } })),
      ]);

      const merged = new Map<string, ClassItem>();
      for (const cls of visibleRes.data || []) {
        merged.set(cls.id, { ...cls, isHidden: false });
      }
      for (const cls of hiddenRes.data || []) {
        merged.set(cls.id, { ...cls, isHidden: true });
      }

      const classRows = await Promise.all(
        Array.from(merged.values()).map(async (cls) => {
          try {
            const [modulesRes, completedRes, assessmentsRes, announcementsRes] = await Promise.all([
              moduleService.getByClass(cls.id).catch(() => ({ data: [] })),
              lessonService.getCompletedByClass(cls.id),
              assessmentService.getByClass(cls.id),
              announcementService.getByClass(cls.id, { limit: 6 }).catch(() => ({ data: [] })),
            ]);

            const {
              totalLessons,
              completedCount,
              totalAssessments,
              pendingCount,
              progress,
            } = deriveStudentCourseMetrics({
              modules: modulesRes.data ?? [],
              assessments: assessmentsRes.data ?? [],
              completedLessonIds: (completedRes.data ?? [])
                .filter((entry) => entry.completed)
                .map((entry) => entry.lessonId),
            });
            const classmatesCount = Math.max(0, (cls.enrollments?.length ?? 0) - 1);

            const classLabel = cls.subjectName || cls.className || cls.name || 'Class';
            const sectionLabel = cls.section?.name ? `Section ${cls.section.name}` : 'Class';

            const assessmentEvents: StudentUpcomingEvent[] = (assessmentsRes.data ?? [])
              .flatMap((assessment) => {
                const dueDate = parseDate(assessment.dueDate);
                if (!dueDate) return [];
                return [
                  {
                    id: `assessment-${assessment.id}`,
                    classId: cls.id,
                    title: assessment.title,
                    subtitle: `${classLabel} • Due ${formatTimeLabel(dueDate)}`,
                    tag: 'assessment' as const,
                    href: `/dashboard/student/classes/${cls.id}?view=assignments`,
                    timestamp: dueDate.getTime(),
                    dateKey: toDateKey(dueDate),
                    dayLabel: String(dueDate.getDate()).padStart(2, '0'),
                    monthLabel: monthLabel(dueDate),
                  },
                ];
              });

            const announcementEvents: StudentUpcomingEvent[] = (announcementsRes.data ?? [])
              .flatMap((announcement) => {
                const announcementDate = parseDate(announcement.scheduledAt || announcement.createdAt);
                if (!announcementDate) return [];
                return [
                  {
                    id: `announcement-${announcement.id}`,
                    classId: cls.id,
                    title: announcement.title,
                    subtitle: `${sectionLabel} • ${formatTimeLabel(announcementDate)}`,
                    tag: resolveAnnouncementTag(announcement.title, announcement.content),
                    href: `/dashboard/student/classes/${cls.id}?view=announcements`,
                    timestamp: announcementDate.getTime(),
                    dateKey: toDateKey(announcementDate),
                    dayLabel: String(announcementDate.getDate()).padStart(2, '0'),
                    monthLabel: monthLabel(announcementDate),
                  },
                ];
              });

            const classWithProgress = {
              ...cls,
              totalLessons,
              completedCount,
              totalAssessments,
              classmatesCount,
              pendingCount,
              progress,
            } satisfies ClassWithProgress;

            return {
              course: classWithProgress,
              events: [...assessmentEvents, ...announcementEvents],
            };
          } catch {
            return {
              course: {
                ...cls,
                totalLessons: 0,
                completedCount: 0,
                totalAssessments: 0,
                classmatesCount: Math.max(0, (cls.enrollments?.length ?? 0) - 1),
                pendingCount: 0,
                progress: 0,
              } satisfies ClassWithProgress,
              events: [] as StudentUpcomingEvent[],
            };
          }
        }),
      );

      const allEvents = classRows
        .flatMap((entry) => entry.events)
        .sort((left, right) => left.timestamp - right.timestamp);
      const uniqueEvents = Array.from(
        allEvents.reduce<Map<string, StudentUpcomingEvent>>((map, event) => {
          map.set(event.id, event);
          return map;
        }, new Map()).values(),
      );

      setCourses(classRows.map((entry) => entry.course).filter((entry) => !entry.isHidden));
      setHiddenCourses(classRows.map((entry) => entry.course).filter((entry) => entry.isHidden));
      setUpcomingEvents(uniqueEvents);
      setPresentationByClass(toPreferenceMap(presentationRes.data));
      setViewMode(viewRes.data?.viewMode === 'wide' ? 'wide' : 'card');
    } catch {
      setError('We could not load your classes right now. Please try again.');
      setCourses([]);
      setHiddenCourses([]);
      setUpcomingEvents([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!customizingCourse) return;
    const options = STUDENT_COURSE_PRESENTATION_OPTIONS[draftStyleMode];
    if (!options.some((option) => option.token === draftStyleToken)) {
      setDraftStyleToken(options[0].token);
    }
  }, [customizingCourse, draftStyleMode, draftStyleToken]);

  useEffect(() => {
    if (!openMenuId || typeof document === 'undefined') return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Element)) return;
      if (event.target.closest('[data-class-card-menu]')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [openMenuId]);

  const scopedCourses = showHiddenOnly ? hiddenCourses : courses;

  const filteredCourses = useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const tabFiltered = scopedCourses.filter((course) => {
      if (tab === 'in_progress') return course.progress > 0 && course.progress < 100;
      if (tab === 'completed') return course.progress >= 100;
      return true;
    });

    if (!trimmedQuery) return tabFiltered;

    return tabFiltered.filter((course) => {
      const searchableValues = [
        course.subjectName,
        course.subjectCode,
        course.section?.name,
        course.section?.gradeLevel,
      ].filter((value): value is string => Boolean(value));
      return searchableValues.some((value) => value.toLowerCase().includes(trimmedQuery));
    });
  }, [scopedCourses, searchQuery, tab]);

  const activeCourseIds = useMemo(
    () => new Set(scopedCourses.map((course) => course.id)),
    [scopedCourses],
  );

  const sidebarEvents = useMemo(() => {
    const now = new Date();
    const nowTs = now.getTime();
    const scopedEvents = upcomingEvents.filter((event) => activeCourseIds.has(event.classId));
    const sorted = [...scopedEvents].sort((left, right) => left.timestamp - right.timestamp);
    const upcomingOnly = sorted.filter((event) => event.timestamp >= nowTs);
    return (upcomingOnly.length > 0 ? upcomingOnly : sorted).slice(0, 14);
  }, [activeCourseIds, upcomingEvents]);

  const eventTagsByDate = useMemo(() => {
    const map = new Map<string, StudentEventTag[]>();
    for (const event of sidebarEvents) {
      const tags = map.get(event.dateKey) ?? [];
      if (!tags.includes(event.tag)) {
        tags.push(event.tag);
      }
      map.set(event.dateKey, tags);
    }
    return map;
  }, [sidebarEvents]);

  const setAndPersistViewMode = useCallback(
    async (nextViewMode: StudentCourseViewMode) => {
      if (viewMode === nextViewMode || !user?.id) return;
      setViewMode(nextViewMode);
      try {
        await classService.setStudentCourseViewPreference(user.id, nextViewMode);
      } catch {
        setViewMode((current) => (current === 'wide' ? 'card' : 'wide'));
      }
    },
    [user?.id, viewMode],
  );

  const handleOpenClass = useCallback(
    (classId: string) => {
      router.push(`/dashboard/student/classes/${classId}`);
    },
    [router],
  );

  const openCustomize = useCallback(
    (course: ClassWithProgress, index: number) => {
      const existing = presentationByClass[course.id];
      const selected = resolveStudentCoursePresentation(
        existing?.styleMode,
        existing?.styleToken,
        index,
      );
      setCustomizingCourse(course);
      setCustomizingIndex(index);
      setDraftStyleMode(selected.mode);
      setDraftStyleToken(selected.token);
      setOpenMenuId(null);
    },
    [presentationByClass],
  );

  const saveCustomization = useCallback(async () => {
    if (!customizingCourse) return;
    setSavingCustomization(true);
    try {
      const response = await classService.updateStudentPresentation(
        customizingCourse.id,
        {
          styleMode: draftStyleMode,
          styleToken: draftStyleToken,
        },
      );

      setPresentationByClass((current) => ({
        ...current,
        [customizingCourse.id]: response.data,
      }));
      setCustomizingCourse(null);
    } finally {
      setSavingCustomization(false);
    }
  }, [customizingCourse, draftStyleMode, draftStyleToken]);

  const toggleHidden = useCallback(async (course: ClassWithProgress) => {
    setTogglingId(course.id);
    setOpenMenuId(null);
    try {
      if (course.isHidden) {
        await classService.unhide(course.id);
        setHiddenCourses((current) =>
          current.filter((entry) => entry.id !== course.id),
        );
        setCourses((current) => [...current, { ...course, isHidden: false }]);
      } else {
        await classService.hide(course.id);
        setCourses((current) => current.filter((entry) => entry.id !== course.id));
        setHiddenCourses((current) => [...current, { ...course, isHidden: true }]);
      }
    } finally {
      setTogglingId(null);
    }
  }, []);

  const customizationOptions = STUDENT_COURSE_PRESENTATION_OPTIONS[draftStyleMode];

  if (loading) {
    return (
      <div className="space-y-5 p-4 md:p-6">
        <Skeleton className="h-36 rounded-[1.6rem]" />
        <Skeleton className="h-14 rounded-2xl" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-[31rem] rounded-[1.5rem]" />
            ))}
          </div>
          <div className="space-y-4">
            <Skeleton className="h-[24rem] rounded-[1.4rem]" />
            <Skeleton className="h-[23rem] rounded-[1.4rem]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 bg-[var(--student-elevated)] p-4 md:p-6">
      <section className="rounded-[1.35rem] border border-[#e1deea] bg-white p-3.5 shadow-[0_18px_32px_-30px_rgba(22,32,58,0.5)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7e88a1]" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search class, section, or subject code"
              className="h-11 rounded-xl border-[#ddd8e9] bg-[#faf8fd] pl-9 text-[#27304a] placeholder:text-[#8a93ad] focus-visible:ring-[#d81b50]/35"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[#e4e0ee] bg-[#f7f5fb] px-3 text-xs font-semibold uppercase tracking-[0.08em] text-[#6f7892]">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
            </span>

            <div className="inline-flex rounded-full border border-[#e2deea] bg-[#f7f5fb] p-1">
              {PRIMARY_TABS.map((entry) => (
                <button
                  key={entry.value}
                  type="button"
                  data-active={!showHiddenOnly && tab === entry.value}
                  onClick={() => {
                    setShowHiddenOnly(false);
                    setTab(entry.value);
                  }}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-sm font-semibold transition',
                    !showHiddenOnly && tab === entry.value
                      ? 'bg-white text-[#11192f] shadow-[0_10px_20px_-16px_rgba(22,32,58,0.5)]'
                      : 'text-[#5c6782] hover:text-[#11192f]',
                  )}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              className={cn(
                'rounded-full border px-3.5 py-2 text-sm font-semibold transition',
                showHiddenOnly
                  ? 'border-[#d81b50] bg-[#d81b50] text-white'
                  : 'border-[#ddd8e8] bg-white text-[#495875] hover:bg-[#f7f5fb]',
              )}
              onClick={() => setShowHiddenOnly((current) => !current)}
            >
              Hidden ({hiddenCourses.length})
            </button>

            <div className="inline-flex rounded-full border border-[#ddd8e8] bg-[#f7f5fb] p-1">
              <button
                type="button"
                data-active={viewMode === 'card'}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-[#55617c] transition',
                  viewMode === 'card' && 'bg-white text-[#11192f]',
                )}
                onClick={() => void setAndPersistViewMode('card')}
                aria-label="Card layout"
              >
                <Grid2X2 className="h-4 w-4" />
              </button>
              <button
                type="button"
                data-active={viewMode === 'wide'}
                className={cn(
                  'grid h-8 w-8 place-items-center rounded-full text-[#55617c] transition',
                  viewMode === 'wide' && 'bg-white text-[#11192f]',
                )}
                onClick={() => void setAndPersistViewMode('wide')}
                aria-label="Wide layout"
              >
                <LayoutPanelTop className="h-4 w-4" />
              </button>
            </div>

            <Button
              type="button"
              className="h-10 rounded-xl bg-[#d81b50] px-4 text-sm font-semibold text-white hover:bg-[#c51647]"
              onClick={() => void fetchData()}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>

            <Button
              type="button"
              variant="outline"
              className="student-courses-help-button"
              aria-label="My Classes help"
              onClick={() => {
                setHelpPage(0);
                setHelpOpen(true);
              }}
            >
              <CircleHelp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {error ? (
        <section className="rounded-[1.25rem] border border-[#f5c8d6] bg-[#fff1f6] p-4">
          <p className="text-sm font-semibold text-[#9f1c44]">{error}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 border-[#e9a9be] text-[#9f1c44] hover:bg-[#ffe8ef]"
            onClick={() => void fetchData()}
          >
            Try Again
          </Button>
        </section>
      ) : (
        <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
          <div>
            {filteredCourses.length === 0 ? (
              <div className="grid min-h-[18rem] place-items-center rounded-[1.45rem] border border-dashed border-[#d5d1e2] bg-white p-6 text-center">
                <div>
                  <p className="text-xl font-semibold text-[#1e2944]">No classes match this filter.</p>
                  <p className="mt-1 text-sm text-[#667390]">
                    Try another search term or switch to a different class status.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-4 border-[#ddd8e8] bg-[#faf8fd] text-[#3b4865] hover:bg-[#f4f0fa]"
                    onClick={() => {
                      setSearchQuery('');
                      setTab('all');
                      setShowHiddenOnly(false);
                    }}
                  >
                    Reset Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={cn(
                  'grid gap-4',
                  viewMode === 'wide' ? 'grid-cols-1' : 'sm:grid-cols-2',
                )}
              >
                {filteredCourses.map((course, index) => {
                  const preference = presentationByClass[course.id];
                  const choice = resolveStudentCoursePresentation(
                    preference?.styleMode,
                    preference?.styleToken,
                    index,
                  );
                  const isMenuOpen = openMenuId === course.id;

                  return (
                    <StudentClassCard
                      key={course.id}
                      course={course}
                      heroStyle={toStudentHeroStyle(choice)}
                      buttonTint={choice.buttonTint}
                      menuOpen={isMenuOpen}
                      toggling={togglingId === course.id}
                      viewAssignmentsHref={`/dashboard/student/classes/${course.id}?view=assignments`}
                      viewScheduleHref={`/dashboard/student/classes/${course.id}?view=calendar`}
                      onOpenClass={handleOpenClass}
                      onToggleMenu={() =>
                        setOpenMenuId((current) => (current === course.id ? null : course.id))
                      }
                      onOpenCustomize={() => openCustomize(course, index)}
                      onToggleHidden={() => void toggleHidden(course)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
            <StudentCalendarCard
              month={calendarMonth}
              selectedDateKey={selectedDateKey}
              eventTagsByDate={eventTagsByDate}
              onSelectDate={setSelectedDateKey}
              onPrevMonth={() => setCalendarMonth((current) => shiftMonth(current, -1))}
              onNextMonth={() => setCalendarMonth((current) => shiftMonth(current, 1))}
            />
            <StudentUpcomingEventsCard
              events={sidebarEvents}
              selectedDateKey={selectedDateKey}
            />
          </aside>
        </section>
      )}

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (!open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog student-courses-guide-dialog">
          <DialogHeader>
            <DialogTitle>Student guide: My Classes</DialogTitle>
            <DialogDescription>
              This guide explains each part of the page in simple steps so you can find classes, open work, and check upcoming dates more easily.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-label="My Classes guide pages">
            <span>{`Page ${helpPage + 1} of ${studentCoursesGuidePages.length}`}</span>
            <div className="teacher-intervention-workspace__manual-dots">
              {studentCoursesGuidePages.map((page, index) => (
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
              <span className="teacher-intervention-workspace__manual-kicker">My Classes tour</span>
              <h3>{activeGuidePage.title}</h3>
              <p>{activeGuidePage.description}</p>

              <div className="route-guide-steps">
                {activeGuidePage.steps.map((step, index) => (
                  <div
                    key={`${activeGuidePage.title}-${step.action}`}
                    className={cn('route-guide-step', step.tone ? `is-${step.tone}` : undefined)}
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

            <StudentCoursesGuideScreenshot screen={activeGuidePage.screen} />
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
                setHelpPage((current) => Math.min(studentCoursesGuidePages.length - 1, current + 1))
              }
              disabled={helpPage === studentCoursesGuidePages.length - 1}
            >
              Next page
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(customizingCourse)}
        onOpenChange={(open) => {
          if (!open) setCustomizingCourse(null);
        }}
      >
        <DialogContent className="student-course-customize-dialog">
          <DialogHeader>
            <DialogTitle>Customize Class Card</DialogTitle>
            <DialogDescription>
              This style is saved only for your student account.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-customize-dialog__section">
            <p>Style Mode</p>
            <div className="teacher-customize-dialog__mode">
              {(['solid', 'gradient', 'preset'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  data-active={draftStyleMode === mode}
                  onClick={() => setDraftStyleMode(mode)}
                >
                  {mode === 'solid' ? 'Solid Color' : mode === 'gradient' ? 'Gradient' : 'Preset Design'}
                </button>
              ))}
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <p>Choose 1 of 3</p>
            <div className="teacher-customize-dialog__gradients">
              {customizationOptions.map((option) => (
                <button
                  key={option.token}
                  type="button"
                  data-active={draftStyleToken === option.token}
                  onClick={() => setDraftStyleToken(option.token)}
                >
                  <span style={{ background: option.background }} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="student-course-customize-preview">
            <p>Preview</p>
            <div
              className="student-course-customize-preview__card"
              style={toStudentHeroStyle(
                resolveStudentCoursePresentation(
                  draftStyleMode,
                  draftStyleToken,
                  customizingIndex,
                ),
              )}
            />
          </div>

          <DialogFooter className="teacher-customize-dialog__footer">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCustomizingCourse(null)}
              disabled={savingCustomization}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="teacher-home-refresh"
              onClick={() => void saveCustomization()}
              disabled={savingCustomization}
            >
              {savingCustomization ? 'Saving...' : 'Save Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
