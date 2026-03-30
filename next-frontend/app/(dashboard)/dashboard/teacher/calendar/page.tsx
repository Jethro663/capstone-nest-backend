'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Filter,
  List,
  PanelsTopLeft,
} from 'lucide-react';
import { classService } from '@/services/class-service';
import { announcementService } from '@/services/announcement-service';
import { assessmentService } from '@/services/assessment-service';
import { schoolEventService } from '@/services/school-event-service';
import { useAuth } from '@/providers/AuthProvider';
import { Skeleton } from '@/components/ui/skeleton';
import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { SchoolEvent } from '@/types/school-event';
import {
  buildCalendarDayIndex,
  buildMonthCells,
  buildSchoolYearList,
  CALENDAR_KIND_LABEL,
  formatFeedDate,
  formatMonthLabel,
  getMarkerKindsForDay,
  getUpcomingFeedItems,
  normalizeCalendarFeed,
  resolveCalendarDaySelection,
  resolveInitialClassFilter,
  shiftMonth,
  toDateKey,
  type CalendarFeedKind,
} from '@/utils/calendar-feed';
import styles from './teacher-calendar.module.css';

type TeacherCalendarMode = 'calendar' | 'upcoming';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MARKER_ORDER: CalendarFeedKind[] = [
  'assessment',
  'school_event',
  'holiday_break',
  'announcement',
  'class_schedule',
];

function stripHtml(raw?: string): string {
  if (!raw) return '';
  return raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getKindClass(kind: CalendarFeedKind): string {
  if (kind === 'assessment') return styles.kindAssessment;
  if (kind === 'school_event') return styles.kindSchoolEvent;
  if (kind === 'holiday_break') return styles.kindHoliday;
  if (kind === 'announcement') return styles.kindAnnouncement;
  return styles.kindSchedule;
}

function getYearButtonLabel(schoolYear: string): string {
  const [startYear] = schoolYear.split('-');
  return `SY ${startYear}`;
}

export default function TeacherCalendarPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const classPrefilterAppliedRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [schoolEvents, setSchoolEvents] = useState<SchoolEvent[]>([]);
  const [assessmentsByClass, setAssessmentsByClass] = useState<Record<string, Assessment[]>>({});
  const [announcementsByClass, setAnnouncementsByClass] = useState<Record<string, Announcement[]>>({});
  const [mode, setMode] = useState<TeacherCalendarMode>('calendar');
  const [selectedSchoolYear, setSelectedSchoolYear] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [hoveredDateKey, setHoveredDateKey] = useState<string | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;

    let isActive = true;

    const fetchClasses = async () => {
      try {
        setLoading(true);
        const response = await classService.getByTeacher(user.id, 'active');
        if (!isActive) return;
        setClasses(response.data || []);
      } catch {
        if (!isActive) return;
        setClasses([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void fetchClasses();
    return () => {
      isActive = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (classes.length === 0) return;
    if (classPrefilterAppliedRef.current) return;
    const queryClassId = searchParams.get('classId');
    setSelectedClassId(resolveInitialClassFilter(queryClassId, classes));
    classPrefilterAppliedRef.current = true;
  }, [classes, searchParams]);

  useEffect(() => {
    if (classes.length === 0) {
      setSelectedSchoolYear('');
      return;
    }

    const currentYears = buildSchoolYearList(classes, schoolEvents);
    if (selectedSchoolYear && currentYears.includes(selectedSchoolYear)) return;

    const queryClassId = searchParams.get('classId');
    const prefilterClass = queryClassId
      ? classes.find((classItem) => classItem.id === queryClassId)
      : null;
    setSelectedSchoolYear(prefilterClass?.schoolYear ?? currentYears[0] ?? '');
  }, [classes, schoolEvents, searchParams, selectedSchoolYear]);

  useEffect(() => {
    const selectedClass = classes.find((classItem) => classItem.id === selectedClassId);
    if (!selectedClass || !selectedSchoolYear) return;
    if (selectedClass.schoolYear === selectedSchoolYear) return;
    setSelectedClassId('all');
  }, [classes, selectedClassId, selectedSchoolYear]);

  useEffect(() => {
    if (!selectedSchoolYear) return;

    let isActive = true;

    const fetchCalendarData = async () => {
      try {
        setLoading(true);
        const scopedClasses = classes.filter(
          (classItem) => classItem.schoolYear === selectedSchoolYear,
        );

        const assessmentPairs = await Promise.all(
          scopedClasses.map(async (classItem) => {
            try {
              const response = await assessmentService.getByClass(classItem.id, {
                status: 'all',
                limit: 120,
              });
              return [classItem.id, response.data || []] as const;
            } catch {
              return [classItem.id, []] as const;
            }
          }),
        );

        const announcementPairs = await Promise.all(
          scopedClasses.map(async (classItem) => {
            try {
              const response = await announcementService.getByClass(classItem.id, {
                limit: 60,
              });
              return [classItem.id, response.data || []] as const;
            } catch {
              return [classItem.id, []] as const;
            }
          }),
        );

        const schoolEventsResponse = await schoolEventService.getAll({
          schoolYear: selectedSchoolYear,
        });

        if (!isActive) return;

        setAssessmentsByClass(Object.fromEntries(assessmentPairs));
        setAnnouncementsByClass(Object.fromEntries(announcementPairs));
        setSchoolEvents(schoolEventsResponse.data || []);
      } catch {
        if (!isActive) return;
        setAssessmentsByClass({});
        setAnnouncementsByClass({});
        setSchoolEvents([]);
      } finally {
        if (isActive) setLoading(false);
      }
    };

    void fetchCalendarData();
    return () => {
      isActive = false;
    };
  }, [classes, selectedSchoolYear]);

  const schoolYearOptions = useMemo(
    () => buildSchoolYearList(classes, schoolEvents),
    [classes, schoolEvents],
  );

  const yearIndex = schoolYearOptions.indexOf(selectedSchoolYear);
  const selectedClass = classes.find((classItem) => classItem.id === selectedClassId) ?? null;

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
      assessmentsByClass,
      announcementsByClass,
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

  const activeDayKey = useMemo(
    () =>
      resolveCalendarDaySelection({
        selectedDateKey,
        hoveredDateKey,
        todayKey,
      }),
    [selectedDateKey, hoveredDateKey, todayKey],
  );

  const activeDayItems = dayIndex[activeDayKey] ?? [];
  const upcomingItems = useMemo(() => getUpcomingFeedItems(mergedFeedItems), [mergedFeedItems]);

  const changeYear = (step: -1 | 1) => {
    if (yearIndex < 0) return;
    const targetYear = schoolYearOptions[yearIndex + step];
    if (!targetYear) return;
    setSelectedSchoolYear(targetYear);
  };

  if (loading && classes.length === 0) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-[34rem] rounded-2xl" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIcon}>
          <CalendarCheck2 className="h-6 w-6" />
        </div>
        <div>
          <p className={styles.heroEyebrow}>Teacher Calendar</p>
          <h1 className={styles.heroTitle}>Calendar, events, announcements</h1>
          <p className={styles.heroText}>
            Unified feed from admin school events, assessments, and class announcements.
          </p>
        </div>
      </section>

      <section className={styles.toolbar}>
        <div className={styles.modeSwitch}>
          <button
            type="button"
            data-active={mode === 'calendar'}
            onClick={() => setMode('calendar')}
          >
            <PanelsTopLeft className="h-4 w-4" />
            Calendar
          </button>
          <button
            type="button"
            data-active={mode === 'upcoming'}
            onClick={() => setMode('upcoming')}
          >
            <List className="h-4 w-4" />
            Upcoming
          </button>
        </div>

        <div className={styles.filters}>
          <div className={styles.yearSwitcher}>
            <button
              type="button"
              onClick={() => changeYear(1)}
              disabled={yearIndex <= 0}
              aria-label="Switch to newer school year"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <select
              value={selectedSchoolYear}
              onChange={(event) => setSelectedSchoolYear(event.target.value)}
              aria-label="School year filter"
            >
              {schoolYearOptions.map((schoolYear) => (
                <option key={schoolYear} value={schoolYear}>
                  {getYearButtonLabel(schoolYear)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => changeYear(-1)}
              disabled={yearIndex === schoolYearOptions.length - 1 || yearIndex < 0}
              aria-label="Switch to older school year"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <label className={styles.classFilter}>
            <Filter className="h-4 w-4" />
            <select
              value={selectedClassId}
              onChange={(event) => setSelectedClassId(event.target.value)}
              aria-label="Class context filter"
            >
              <option value="all">All classes</option>
              {classes
                .filter((classItem) => classItem.schoolYear === selectedSchoolYear)
                .map((classItem) => (
                  <option key={classItem.id} value={classItem.id}>
                    {classItem.subjectName} - {classItem.section?.name ?? 'Section'}
                  </option>
                ))}
            </select>
          </label>
        </div>
      </section>

      {mode === 'calendar' ? (
        <section className={styles.calendarLayout}>
          <article className={styles.calendarPanel}>
            <header className={styles.calendarHead}>
              <button
                type="button"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, -1))}
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h2>{formatMonthLabel(calendarMonth)}</h2>
              <button
                type="button"
                onClick={() => setCalendarMonth((current) => shiftMonth(current, 1))}
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </header>

            <div className={styles.weekdays}>
              {WEEKDAY_LABELS.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>

            <div className={styles.monthGrid}>
              {monthCells.map((cell) => {
                const items = dayIndex[cell.dateKey] ?? [];
                const markerKinds = MARKER_ORDER.filter((kind) =>
                  getMarkerKindsForDay(items).includes(kind),
                );
                const isSelected = activeDayKey === cell.dateKey;
                const isToday = cell.dateKey === todayKey;

                return (
                  <button
                    key={cell.dateKey}
                    type="button"
                    className={styles.dayCell}
                    data-in-month={cell.inMonth}
                    data-selected={isSelected}
                    data-today={isToday}
                    onMouseEnter={() => setHoveredDateKey(cell.dateKey)}
                    onMouseLeave={() => setHoveredDateKey(null)}
                    onFocus={() => setHoveredDateKey(cell.dateKey)}
                    onBlur={() => setHoveredDateKey(null)}
                    onClick={() => setSelectedDateKey(cell.dateKey)}
                  >
                    <span className={styles.dayNumber}>{cell.date.getDate()}</span>
                    <span className={styles.dayCount}>
                      {items.length > 0 ? `${items.length} item${items.length > 1 ? 's' : ''}` : ''}
                    </span>
                    <span className={styles.markers}>
                      {markerKinds.map((kind) => (
                        <i key={`${cell.dateKey}-${kind}`} className={getKindClass(kind)} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </div>
          </article>

          <aside className={styles.detailRail}>
            <div className={styles.dayDetailHeader}>
              <h3>{new Date(activeDayKey).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</h3>
              {selectedClass ? (
                <p className={styles.contextLabel}>
                  {selectedClass.subjectName} - {selectedClass.section?.name ?? 'Section'}
                </p>
              ) : (
                <p className={styles.contextLabel}>All classes - {selectedSchoolYear}</p>
              )}
            </div>

            <div className={styles.dayDetailBody}>
              {activeDayItems.length === 0 ? (
                <p className={styles.emptyText}>No items scheduled for this day.</p>
              ) : (
                activeDayItems.map((item) => (
                  <article key={`${activeDayKey}-${item.id}`} className={styles.dayItem}>
                    <span className={`${styles.kindChip} ${getKindClass(item.kind)}`}>
                      {CALENDAR_KIND_LABEL[item.kind]}
                    </span>
                    <h4>{item.title}</h4>
                    <p className={styles.dayItemMeta}>
                      <Clock3 className="h-3.5 w-3.5" />
                      {formatFeedDate(item.startsAt)}
                      {item.classLabel ? ` - ${item.classLabel}` : ''}
                    </p>
                    {item.location ? <p className={styles.dayItemLocation}>{item.location}</p> : null}
                    {item.description ? (
                      <p className={styles.dayItemDescription}>{stripHtml(item.description)}</p>
                    ) : null}
                  </article>
                ))
              )}
            </div>
          </aside>
        </section>
      ) : (
        <section className={styles.upcomingLayout}>
          {upcomingItems.length === 0 ? (
            <article className={styles.emptyUpcoming}>
              <h3>No upcoming items</h3>
              <p>Upcoming assessments, announcements, and school events will appear here.</p>
            </article>
          ) : (
            upcomingItems.map((item, index) => (
              <article
                key={item.id}
                className={styles.upcomingCard}
                style={{ animationDelay: `${Math.min(index, 10) * 45}ms` }}
              >
                <div className={styles.upcomingCardHead}>
                  <span className={`${styles.kindChip} ${getKindClass(item.kind)}`}>
                    {CALENDAR_KIND_LABEL[item.kind]}
                  </span>
                  <span className={styles.upcomingDate}>{formatFeedDate(item.startsAt)}</span>
                </div>
                <h3>{item.title}</h3>
                <p className={styles.upcomingMeta}>
                  {item.classLabel ? item.classLabel : 'School-wide'} - {item.schoolYear}
                </p>
                {item.location ? <p className={styles.upcomingLocation}>{item.location}</p> : null}
                {item.description ? (
                  <p className={styles.upcomingDescription}>{stripHtml(item.description)}</p>
                ) : null}
              </article>
            ))
          )}
        </section>
      )}
    </div>
  );
}
