'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { AlertCircle, CircleHelp, RefreshCcw, Search, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { classService } from '@/services/class-service';
import { lessonService } from '@/services/lesson-service';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/utils/cn';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem, ClassVisibilityStatus } from '@/types/class';
import { getApiErrorMessage } from '@/lib/api-error';
import {
  GRADIENT_OPTIONS,
  createDefaultCustomization,
  getFallbackGradient,
  getHeroStyle,
  normalizeCustomization,
  type CardViewMode,
  type ClassCardCustomization,
} from '@/components/class/class-card-theme';
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

const classesGuideDialogStyle = {
  '--intervention-border': '#dbe2ec',
  '--intervention-border-soft': '#edf1f6',
  '--intervention-muted': '#637083',
  '--intervention-strong': '#111827',
  '--intervention-red': '#a32d2d',
  '--intervention-red-soft': '#fcebeb',
} as CSSProperties;

type ClassesGuideScreen = 'header' | 'filters' | 'cards' | 'calendar';
type GuidePinProps = {
  children: string;
  lineSide: 'left' | 'right';
  lineWidth: string;
  style: CSSProperties;
};

const classesGuidePages: Array<{
  title: string;
  description: string;
  screen: ClassesGuideScreen;
  steps: Array<{
    action: string;
    body: string;
    tone?: 'default' | 'caution';
  }>;
}> = [
  {
    title: 'Start with the header',
    description:
      'Use the top summary to check whether your class list is loaded and whether work still needs attention.',
    screen: 'header',
    steps: [
      {
        action: 'Check',
        body: 'Read Active Classes to confirm how many classes match the current view.',
      },
      {
        action: 'Review',
        body: 'Use Pending Work to see if lessons or assessments still need publishing or follow-up.',
      },
      {
        action: 'Refresh',
        body: 'Click Refresh after creating content elsewhere or when the list looks out of date.',
      },
    ],
  },
  {
    title: 'Find the right class',
    description:
      'Search and status filters narrow the class list before you open a class workspace.',
    screen: 'filters',
    steps: [
      {
        action: 'Search',
        body: 'Type a subject, code, grade, or section name to reduce the class cards shown below.',
      },
      {
        action: 'Filter',
        body: 'Choose Active, All, Archived, or Hidden depending on which class set you need.',
      },
      {
        action: 'Reset',
        body: 'If the list becomes empty, clear the search or switch back to Active.',
        tone: 'caution',
      },
    ],
  },
  {
    title: 'Open class work',
    description:
      'Each class card is the main entry point for managing lessons, modules, assessments, students, and announcements.',
    screen: 'cards',
    steps: [
      {
        action: 'Open',
        body: 'Click the class card or Open Class to enter the full class workspace.',
      },
      {
        action: 'View',
        body: 'Click View Lessons when you need to jump directly into the module list.',
      },
      {
        action: 'Compare',
        body: 'Use the small progress and pending counts to decide which class needs attention first.',
      },
    ],
  },
  {
    title: 'Use the calendar rail',
    description:
      'The right rail helps you spot due dates and announcements without opening every class.',
    screen: 'calendar',
    steps: [
      {
        action: 'Choose',
        body: 'Click a date on the calendar to focus the upcoming events list.',
      },
      {
        action: 'Open',
        body: 'Select an event to go straight to the related class assignment or announcement area.',
      },
      {
        action: 'Plan',
        body: 'Use the month controls when you need to check work beyond the current week.',
      },
    ],
  },
];

function GuidePin({ children, lineSide, lineWidth, style }: GuidePinProps) {
  return (
    <em
      className="pointer-events-none absolute z-10 inline-flex items-center gap-1.5 rounded-full border border-[#7f1d1d] bg-white px-2.5 py-1 text-[0.62rem] font-black not-italic leading-none text-[#7f1d1d] shadow-[0_0.5rem_1rem_rgba(127,29,29,0.1)]"
      style={style}
    >
      <span className="h-[0.42rem] w-[0.42rem] rounded-full bg-[#a32d2d]" />
      <span>{children}</span>
      <span
        className="absolute top-1/2 h-px -translate-y-1/2 bg-[#a32d2d]"
        style={
          lineSide === 'right'
            ? { left: 'calc(100% - 0.05rem)', width: lineWidth }
            : { right: 'calc(100% - 0.05rem)', width: lineWidth }
        }
      />
    </em>
  );
}

function ClassesGuideScreenshot({ screen }: { screen: ClassesGuideScreen }) {
  return (
    <div
      className={`teacher-intervention-workspace__manual-shot teacher-classes-page__manual-shot is-${screen} relative grid min-h-[25rem] content-start gap-3 overflow-hidden rounded-xl border border-[#dbe2ec] bg-[#f8fafc] px-4 pb-4 pt-12 shadow-inner`}
      aria-label={`${screen} classes example screenshot`}
    >
      <div className="teacher-intervention-workspace__manual-window absolute inset-x-0 top-0 flex h-8 items-center gap-1 border-b border-[#edf1f6] bg-white px-3">
        <span className="h-2 w-2 rounded-full bg-[#f87171]" />
        <span className="h-2 w-2 rounded-full bg-[#fbbf24]" />
        <span className="h-2 w-2 rounded-full bg-[#34d399]" />
      </div>

      {screen === 'header' ? (
        <>
          <div className="teacher-classes-page__manual-header-shot grid gap-3 rounded-xl border border-[#edf1f6] bg-white p-4 shadow-sm">
            <div className="min-w-0">
              <small className="block text-[0.62rem] font-black uppercase tracking-[0.08em] text-[#637083]">
                Teacher Workspace
              </small>
              <strong className="mt-1 block text-xl font-black leading-tight text-[#111827]">My Classes</strong>
              <p className="mt-2 h-2 w-2/3 rounded-full bg-[#e7edf5]" />
            </div>
            <div className="teacher-classes-page__manual-header-tools grid grid-cols-3 gap-2">
              <span className="grid min-w-0 gap-1 rounded-lg border border-[#edf1f6] bg-[#f8fafc] p-3">
                <small className="text-[0.56rem] font-black uppercase tracking-[0.05em] text-[#637083]">
                  Active Classes
                </small>
                <b className="text-lg font-black text-[#111827]">6</b>
              </span>
              <span className="is-pending grid min-w-0 gap-1 rounded-lg border border-[#fbd3dd] bg-[#fff2f5] p-3">
                <small className="text-[0.56rem] font-black uppercase tracking-[0.05em] text-[#8d2643]">
                  Pending Work
                </small>
                <b className="text-lg font-black text-[#8d2643]">3</b>
              </span>
              <span className="is-refresh grid min-w-0 place-items-center rounded-lg border border-[#a32d2d] bg-[#a32d2d] p-3 text-[0.72rem] font-black uppercase text-white">
                Refresh
              </span>
            </div>
          </div>
          <GuidePin lineSide="right" lineWidth="6rem" style={{ left: '1rem', top: '5.25rem' }}>
            Header summary
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="5.5rem" style={{ right: '1rem', top: '10.5rem' }}>
            Refresh button
          </GuidePin>
        </>
      ) : null}

      {screen === 'filters' ? (
        <>
          <div className="teacher-classes-page__manual-filter-shot grid gap-3 rounded-xl border border-[#edf1f6] bg-white p-4 shadow-sm">
            <div className="teacher-classes-page__manual-search-shot rounded-lg border border-[#d7deec] bg-[#f7f9fd] px-3 py-2 text-sm font-semibold text-[#64748b]">
              Search class, code, or section
            </div>
            <div className="teacher-classes-page__manual-filter-pills flex flex-wrap gap-2">
              <span className="rounded-full border border-[#d8deeb] bg-white px-3 py-1 text-xs font-black uppercase text-[#425473]">
                Filter
              </span>
              <b className="rounded-full border border-[#a32d2d] bg-[#a32d2d] px-3 py-1 text-xs font-black text-white">
                Active
              </b>
              <span className="rounded-full border border-[#d8deeb] bg-white px-3 py-1 text-xs font-black text-[#425473]">
                All
              </span>
              <span className="rounded-full border border-[#d8deeb] bg-white px-3 py-1 text-xs font-black text-[#425473]">
                Archived
              </span>
              <span className="rounded-full border border-[#d8deeb] bg-white px-3 py-1 text-xs font-black text-[#425473]">
                Hidden
              </span>
            </div>
          </div>
          <div className="teacher-classes-page__manual-card-grid grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <span
                key={index}
                className="min-h-32 rounded-xl border border-[#edf1f6] bg-[linear-gradient(#f43f5e_0_2.5rem,transparent_2.5rem),linear-gradient(#e7edf5_0.5rem,transparent_0.5rem),linear-gradient(#e7edf5_0.5rem,transparent_0.5rem),#ffffff] bg-[length:100%_100%,68%_1rem,82%_1rem] bg-[position:0_0,0.7rem_3.35rem,0.7rem_4.85rem] bg-no-repeat shadow-sm"
              />
            ))}
          </div>
          <GuidePin lineSide="right" lineWidth="4.6rem" style={{ left: '1rem', top: '5.3rem' }}>
            Search box
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="5.2rem" style={{ right: '1rem', top: '8.6rem' }}>
            Status filter
          </GuidePin>
        </>
      ) : null}

      {screen === 'cards' ? (
        <>
          <div className="teacher-classes-page__manual-class-card overflow-hidden rounded-xl border border-[#dbe2ec] bg-white shadow-sm">
            <div className="teacher-classes-page__manual-class-banner grid gap-1 bg-[linear-gradient(145deg,#f43f5e,#be123c)] p-4 text-white">
              <small className="text-[0.58rem] font-black uppercase tracking-[0.08em]">MATH-07A</small>
              <strong className="text-xl font-black leading-tight">Mathematics</strong>
              <span className="text-xs font-bold text-white/90">Section A</span>
            </div>
            <div className="teacher-classes-page__manual-card-stats grid grid-cols-3 border-b border-[#edf1f6]">
              <span className="grid gap-1 border-r border-[#edf1f6] p-3">
                <small className="text-[0.56rem] font-black uppercase text-[#637083]">Lessons</small>
                <b className="text-base font-black text-[#111827]">12</b>
              </span>
              <span className="grid gap-1 border-r border-[#edf1f6] p-3">
                <small className="text-[0.56rem] font-black uppercase text-[#637083]">Assessments</small>
                <b className="text-base font-black text-[#111827]">4</b>
              </span>
              <span className="grid gap-1 p-3">
                <small className="text-[0.56rem] font-black uppercase text-[#637083]">Pending</small>
                <b className="text-base font-black text-[#111827]">2</b>
              </span>
            </div>
            <div className="teacher-classes-page__manual-card-actions flex justify-end gap-2 p-3">
              <span className="rounded-lg border border-[#d5deef] bg-[#f5f8ff] px-3 py-2 text-xs font-black text-[#2f466f]">
                View Lessons
              </span>
              <span className="rounded-lg border border-[#a32d2d] bg-[#a32d2d] px-3 py-2 text-xs font-black text-white">
                Open Class
              </span>
            </div>
          </div>
          <GuidePin lineSide="right" lineWidth="4.5rem" style={{ left: '1rem', top: '6.8rem' }}>
            Class card
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="5.2rem" style={{ right: '1rem', bottom: '3rem' }}>
            Class actions
          </GuidePin>
        </>
      ) : null}

      {screen === 'calendar' ? (
        <>
          <div className="teacher-classes-page__manual-calendar-shot rounded-xl border border-[#edf1f6] bg-white p-4 shadow-sm">
            <div className="teacher-classes-page__manual-calendar-head flex justify-between text-sm font-black text-[#111827] [&_b]:hidden">
              <span>April 2026</span>
              <span>Prev / Next</span>
            </div>
            <div className="teacher-classes-page__manual-calendar-grid mt-3 grid grid-cols-7 gap-1">
              {Array.from({ length: 21 }).map((_, index) => (
                <span
                  key={index}
                  className={`grid min-h-8 place-items-center rounded-lg border text-xs font-black ${
                    index === 10
                      ? 'border-[#a32d2d] bg-[#a32d2d] text-white'
                      : 'border-[#e2e8f0] bg-white text-[#64748b]'
                  }`}
                >
                  {index + 8}
                </span>
              ))}
            </div>
          </div>
          <div className="teacher-classes-page__manual-events-shot grid gap-2 rounded-xl border border-[#edf1f6] bg-white p-4 shadow-sm">
            <strong className="text-sm font-black text-[#111827]">Upcoming Events</strong>
            <span className="rounded-lg border border-[#e3e8f4] bg-[#f8f9fd] px-3 py-2 text-xs font-black text-[#40516f]">
              APR 25 Quiz 1
            </span>
            <span className="rounded-lg border border-[#e3e8f4] bg-[#f8f9fd] px-3 py-2 text-xs font-black text-[#40516f]">
              APR 28 Class update
            </span>
          </div>
          <GuidePin lineSide="right" lineWidth="4.1rem" style={{ left: '1rem', top: '6.1rem' }}>
            Calendar
          </GuidePin>
          <GuidePin lineSide="left" lineWidth="6.5rem" style={{ right: '1rem', bottom: '5rem' }}>
            Upcoming events
          </GuidePin>
        </>
      ) : null}
    </div>
  );
}

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
  const [helpOpen, setHelpOpen] = useState(false);
  const [helpPage, setHelpPage] = useState(0);

  // Theme Customization State
  const [customizingClass, setCustomizingClass] = useState<ClassItem | null>(null);
  const [uploadingThemeImage, setUploadingThemeImage] = useState(false);
  const [savingThemeCustomization, setSavingThemeCustomization] = useState(false);
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [draftCustomization, setDraftCustomization] = useState<ClassCardCustomization>(
    createDefaultCustomization('oceanic-blue'),
  );

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

  const startCustomization = (classItem: ClassItem, index: number) => {
    setOpenCardMenuId(null);
    const fallback = getFallbackGradient(index);
    const fromBanner = classItem.cardBannerUrl
      ? { themeKind: 'image' as const, imageUrl: classItem.cardBannerUrl }
      : null;
    const fromPreset = classItem.cardPreset
      ? { themeKind: 'gradient' as const, gradientId: classItem.cardPreset as any }
      : null;

    setDraftCustomization(
      normalizeCustomization(fromBanner ?? fromPreset ?? fallback, 'oceanic-blue')
    );
    setCustomizingClass(classItem);
  };

  const saveCustomization = async () => {
    if (!customizingClass) return;
    const classId = customizingClass.id;
    const nextCustomization = draftCustomization;
    setCustomizingClass(null);

    try {
      setSavingThemeCustomization(true);
      const payload: { cardPreset?: string | null; cardBannerUrl?: string | null } = {};
      if (nextCustomization.themeKind === 'image' && nextCustomization.imageUrl) {
        payload.cardBannerUrl = nextCustomization.imageUrl;
        payload.cardPreset = null;
      } else if (nextCustomization.themeKind === 'gradient' && nextCustomization.gradientId) {
        payload.cardPreset = nextCustomization.gradientId;
        payload.cardBannerUrl = null;
      }
      
      const response = await classService.updatePresentation(classId, payload);
      setClasses((current) =>
        current.map((c) => (c.id === classId ? response.data : c)),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to save card theme.'));
    } finally {
      setSavingThemeCustomization(false);
    }
  };

  const resetCustomization = async () => {
    if (!customizingClass) return;
    const classId = customizingClass.id;
    setCustomizingClass(null);

    try {
      setSavingThemeCustomization(true);
      const response = await classService.updatePresentation(classId, {
        cardPreset: 'aurora',
        cardBannerUrl: null,
      });
      setClasses((current) =>
        current.map((c) => (c.id === classId ? response.data : c)),
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Unable to reset card theme.'));
    } finally {
      setSavingThemeCustomization(false);
    }
  };

  const handleThemeImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !customizingClass) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file.');
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      toast.error('Image is too large. Please upload a file smaller than 12MB.');
      return;
    }

    try {
      setUploadingThemeImage(true);
      const response = await classService.uploadBanner(customizingClass.id, file);
      const uploadedUrl = response.data.cardBannerUrl;
      setDraftCustomization((current) => ({ ...current, themeKind: 'image', imageUrl: uploadedUrl }));
      setClasses((current) =>
        current.map((c) => (c.id === customizingClass.id ? response.data.class : c)),
      );
      toast.success('Class banner updated.');
    } catch (error) {
      toast.error('Upload failed. Please use an image smaller than 12MB.');
    } finally {
      setUploadingThemeImage(false);
    }
  };

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
            <button
              type="button"
              className="grid min-h-[3.2rem] w-[3.2rem] place-items-center rounded-2xl border border-[#fbd3dd] bg-white text-[#be123c] shadow-[0_18px_30px_-24px_rgba(190,18,60,0.7)] transition hover:border-[#f43f5e] hover:bg-[#fff1f4] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f43f5e]/45"
              onClick={() => {
                setHelpPage(0);
                setHelpOpen(true);
              }}
              aria-label="Module help"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
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
                {filteredClasses.map((classItem, index) => {
                  const fallback = getFallbackGradient(index);
                  const theme = classItem.cardBannerUrl
                    ? { themeKind: 'image' as const, imageUrl: classItem.cardBannerUrl }
                    : classItem.cardPreset
                      ? { themeKind: 'gradient' as const, gradientId: classItem.cardPreset as any }
                      : fallback;
                  const normalizedTheme = normalizeCustomization(theme, 'oceanic-blue');
                  const isMenuOpen = openCardMenuId === classItem.id;

                  return (
                    <ClassCard
                      key={classItem.id}
                      classItem={classItem}
                      metrics={metricsByClass[classItem.id] ?? EMPTY_METRICS}
                      accentIndex={index}
                      classHref={`/dashboard/teacher/classes/${classItem.id}`}
                      lessonsHref={`/dashboard/teacher/classes/${classItem.id}?view=lessons`}
                      theme={normalizedTheme}
                      menuOpen={isMenuOpen}
                      onToggleMenu={() => setOpenCardMenuId((current) => (current === classItem.id ? null : classItem.id))}
                      onCustomize={() => startCustomization(classItem, index)}
                    />
                  );
                })}
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

      <Dialog
        open={helpOpen}
        onOpenChange={(open) => {
          setHelpOpen(open);
          if (open) setHelpPage(0);
        }}
      >
        <DialogContent className="teacher-intervention-workspace__manual-dialog" style={classesGuideDialogStyle}>
          <DialogHeader>
            <DialogTitle>Teacher guide: My Classes</DialogTitle>
            <DialogDescription>
              Read this one page at a time. Each example points to the part of My Classes being explained.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-intervention-workspace__manual-progress" aria-live="polite">
            <span>Page {helpPage + 1} of {classesGuidePages.length}</span>
            <div>
              {classesGuidePages.map((page, index) => (
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
            <ClassesGuideScreenshot screen={classesGuidePages[helpPage].screen} />
            <section className="teacher-intervention-workspace__manual-copy">
              <p className="teacher-intervention-workspace__manual-kicker">Teacher instruction manual</p>
              <h3>{classesGuidePages[helpPage].title}</h3>
              <p>{classesGuidePages[helpPage].description}</p>
              <div className="route-guide-steps grid gap-3">
                {classesGuidePages[helpPage].steps.map((step, index) => (
                  <div
                    key={`${step.action}-${step.body}`}
                    className={`route-guide-step grid grid-cols-[1.9rem_minmax(0,1fr)] items-start gap-3 rounded-lg border border-[#edf1f6] border-l-[3px] bg-white p-3 shadow-sm ${
                      step.tone === 'caution'
                        ? 'border-l-[#b7791f] bg-[#fffaf0]'
                        : 'border-l-[#a32d2d]'
                    }`}
                  >
                    <span
                      className={`route-guide-step__index inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-black text-white ${
                        step.tone === 'caution' ? 'bg-[#b7791f]' : 'bg-[#a32d2d]'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <strong className="block text-sm font-black text-[#111827]">{step.action}</strong>
                      <p className="mt-1 text-sm leading-relaxed text-[#637083]">{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="teacher-intervention-workspace__manual-reminder">
                Simple rule: find the right class first, open the class workspace, then use the calendar rail for due-date checks.
              </p>
            </section>
          </div>

          <DialogFooter>
            <div className="teacher-intervention-workspace__manual-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => setHelpPage((current) => Math.max(current - 1, 0))}
                disabled={helpPage === 0}
              >
                Previous page
              </Button>
              {helpPage < classesGuidePages.length - 1 ? (
                <Button
                  type="button"
                  onClick={() =>
                    setHelpPage((current) => Math.min(current + 1, classesGuidePages.length - 1))
                  }
                >
                  Next page
                </Button>
              ) : (
                <Button type="button" onClick={() => setHelpOpen(false)}>
                  Close guide
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(customizingClass)} onOpenChange={(open) => !open && setCustomizingClass(null)}>
        <DialogContent className="teacher-customize-dialog">
          <DialogHeader>
            <DialogTitle>Customize Class Card Theme</DialogTitle>
            <DialogDescription>
              Choose a gradient or upload an image and reposition it like a class cover.
            </DialogDescription>
          </DialogHeader>

          <div className="teacher-customize-dialog__section">
            <p>Theme Type</p>
            <div className="teacher-customize-dialog__mode">
              <button
                type="button"
                data-active={draftCustomization.themeKind === 'gradient'}
                onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'gradient' }))}
              >
                Gradient
              </button>
              <button
                type="button"
                data-active={draftCustomization.themeKind === 'image'}
                onClick={() =>
                  setDraftCustomization((current) => ({
                    ...current,
                    themeKind: current.imageUrl ? 'image' : 'gradient',
                  }))
                }
                disabled={!draftCustomization.imageUrl}
              >
                Image
              </button>
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <p>Gradient Palette</p>
            <div className="teacher-customize-dialog__gradients">
              {GRADIENT_OPTIONS.map((gradient) => (
                <button
                  key={gradient.id}
                  type="button"
                  data-active={draftCustomization.gradientId === gradient.id}
                  onClick={() =>
                    setDraftCustomization((current) => ({
                      ...current,
                      themeKind: 'gradient',
                      gradientId: gradient.id as any,
                    }))
                  }
                >
                  <span style={{ background: gradient.background }} />
                  {gradient.label}
                </button>
              ))}
            </div>
          </div>

          <div className="teacher-customize-dialog__section">
            <div className="teacher-customize-dialog__image-head">
              <p>Image Theme</p>
              <label className="teacher-customize-dialog__upload">
                {uploadingThemeImage ? 'Uploading...' : 'Upload Image'}
                <input type="file" accept="image/*" onChange={(event) => void handleThemeImageUpload(event)} />
              </label>
            </div>

            {draftCustomization.imageUrl ? (
              <div className="teacher-customize-dialog__image-tools">
                <div
                  className="teacher-customize-dialog__image-preview"
                  style={getHeroStyle({ ...draftCustomization, themeKind: 'image' })}
                />
                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-position-x">Horizontal</label>
                  <input
                    id="theme-image-position-x"
                    type="range"
                    min={0}
                    max={100}
                    value={draftCustomization.imagePositionX}
                    onChange={(event) =>
                      setDraftCustomization((current) => ({
                        ...current,
                        imagePositionX: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-position-y">Vertical</label>
                  <input
                    id="theme-image-position-y"
                    type="range"
                    min={0}
                    max={100}
                    value={draftCustomization.imagePositionY}
                    onChange={(event) =>
                      setDraftCustomization((current) => ({
                        ...current,
                        imagePositionY: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="teacher-customize-dialog__slider">
                  <label htmlFor="theme-image-scale">Zoom</label>
                  <input
                    id="theme-image-scale"
                    type="range"
                    min={100}
                    max={220}
                    value={draftCustomization.imageScale}
                    onChange={(event) =>
                      setDraftCustomization((current) => ({
                        ...current,
                        imageScale: Number(event.target.value),
                      }))
                    }
                  />
                </div>
                <div className="teacher-customize-dialog__image-actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setDraftCustomization((current) => ({
                        ...current,
                        themeKind: 'gradient',
                        imageUrl: null,
                      }))
                    }
                  >
                    Remove Image
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDraftCustomization((current) => ({ ...current, themeKind: 'image' }))}
                  >
                    Use Image Theme
                  </Button>
                </div>
              </div>
            ) : (
              <p className="teacher-customize-dialog__empty">No image uploaded yet.</p>
            )}
          </div>

          <DialogFooter className="teacher-customize-dialog__footer">
            <Button type="button" variant="outline" onClick={resetCustomization} disabled={savingThemeCustomization}>
              Reset
            </Button>
            <Button
              type="button"
              className="teacher-home-refresh"
              onClick={() => void saveCustomization()}
              disabled={savingThemeCustomization}
            >
              {savingThemeCustomization ? 'Saving...' : 'Save Theme'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
