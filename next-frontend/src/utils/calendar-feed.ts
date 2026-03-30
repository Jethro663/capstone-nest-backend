import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { SchoolEvent } from '@/types/school-event';

export type CalendarFeedKind =
  | 'assessment'
  | 'school_event'
  | 'holiday_break'
  | 'announcement'
  | 'class_schedule';

export interface CalendarFeedItem {
  id: string;
  kind: CalendarFeedKind;
  title: string;
  description?: string;
  startsAt: string;
  endsAt: string;
  allDay: boolean;
  schoolYear: string;
  classId?: string;
  classLabel?: string;
  location?: string;
}

export interface NormalizeCalendarFeedOptions {
  classes: ClassItem[];
  schoolEvents: SchoolEvent[];
  assessmentsByClass: Record<string, Assessment[]>;
  announcementsByClass: Record<string, Announcement[]>;
  selectedSchoolYear: string;
  selectedClassId: string;
  month: Date;
}

const SCHEDULE_WEEKDAY_TO_DAY_INDEX: Record<string, number> = {
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

const MULTI_DAY_EVENT_KINDS: CalendarFeedKind[] = ['school_event', 'holiday_break'];

export const CALENDAR_KIND_LABEL: Record<CalendarFeedKind, string> = {
  assessment: 'Assessment',
  school_event: 'School Event',
  holiday_break: 'Holiday / Break',
  announcement: 'Announcement',
  class_schedule: 'Class Schedule',
};

function parseDateOrNull(raw?: string | null): Date | null {
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function normalizeScheduleDay(day: string): string {
  return day.trim().toUpperCase();
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function toDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function getCurrentSchoolYearReference(now = new Date()): string {
  const month = now.getMonth();
  const startYear = month >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  return `${startYear}-${startYear + 1}`;
}

export function buildSchoolYearList(
  classes: ClassItem[],
  schoolEvents: SchoolEvent[],
  now = new Date(),
): string[] {
  const set = new Set<string>([getCurrentSchoolYearReference(now)]);

  for (const classItem of classes) {
    if (classItem.schoolYear) set.add(classItem.schoolYear);
  }
  for (const schoolEvent of schoolEvents) {
    if (schoolEvent.schoolYear) set.add(schoolEvent.schoolYear);
  }

  return [...set].sort((left, right) => right.localeCompare(left));
}

export function resolveInitialClassFilter(queryClassId: string | null, classes: ClassItem[]): string {
  if (!queryClassId) return 'all';
  const exists = classes.some((classItem) => classItem.id === queryClassId);
  return exists ? queryClassId : 'all';
}

export function resolveCalendarDaySelection(params: {
  selectedDateKey?: string | null;
  hoveredDateKey?: string | null;
  todayKey: string;
}): string {
  return params.selectedDateKey || params.hoveredDateKey || params.todayKey;
}

export function expandClassSchedulesForMonth(
  classes: ClassItem[],
  month: Date,
  selectedSchoolYear: string,
): CalendarFeedItem[] {
  const result: CalendarFeedItem[] = [];
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);

  for (const classItem of classes) {
    if (classItem.schoolYear !== selectedSchoolYear) continue;
    const classLabel = `${classItem.subjectName} - ${classItem.section?.name ?? 'Section'}`;

    for (const schedule of classItem.schedules ?? []) {
      const dayIndexes = (schedule.days ?? [])
        .map((day) => SCHEDULE_WEEKDAY_TO_DAY_INDEX[normalizeScheduleDay(day)])
        .filter((dayIndex): dayIndex is number => Number.isInteger(dayIndex));

      if (dayIndexes.length === 0) continue;

      const [startHour = 0, startMinute = 0] = schedule.startTime
        .split(':')
        .map((value) => Number.parseInt(value, 10));
      const [endHour = 0, endMinute = 0] = schedule.endTime
        .split(':')
        .map((value) => Number.parseInt(value, 10));

      for (
        let cursor = new Date(monthStart);
        cursor.getTime() <= monthEnd.getTime();
        cursor.setDate(cursor.getDate() + 1)
      ) {
        if (!dayIndexes.includes(cursor.getDay())) continue;

        const startDate = new Date(cursor);
        startDate.setHours(startHour, startMinute, 0, 0);
        const endDate = new Date(cursor);
        endDate.setHours(endHour, endMinute, 0, 0);

        result.push({
          id: `${classItem.id}-${schedule.id}-${toDateKey(cursor)}`,
          kind: 'class_schedule',
          title: classItem.subjectName,
          description: `${schedule.days.join('/')} - ${schedule.startTime}-${schedule.endTime}`,
          startsAt: startDate.toISOString(),
          endsAt: endDate.toISOString(),
          allDay: false,
          schoolYear: classItem.schoolYear,
          classId: classItem.id,
          classLabel,
          location: classItem.room ?? undefined,
        });
      }
    }
  }

  return result;
}

export function normalizeCalendarFeed({
  classes,
  schoolEvents,
  assessmentsByClass,
  announcementsByClass,
  selectedSchoolYear,
  selectedClassId,
  month,
}: NormalizeCalendarFeedOptions): CalendarFeedItem[] {
  const isAllClasses = selectedClassId === 'all';
  const classMap = new Map(classes.map((classItem) => [classItem.id, classItem]));

  const filteredClasses = classes.filter((classItem) => {
    if (classItem.schoolYear !== selectedSchoolYear) return false;
    return isAllClasses ? true : classItem.id === selectedClassId;
  });

  const items: CalendarFeedItem[] = [];

  for (const event of schoolEvents) {
    if (event.schoolYear !== selectedSchoolYear) continue;
    const startsAt = parseDateOrNull(event.startsAt);
    const endsAt = parseDateOrNull(event.endsAt);
    if (!startsAt || !endsAt) continue;

    items.push({
      id: `school-${event.id}`,
      kind: event.eventType,
      title: event.title,
      description: event.description ?? undefined,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      allDay: event.allDay,
      schoolYear: event.schoolYear,
      location: event.location ?? undefined,
    });
  }

  for (const classItem of filteredClasses) {
    const classLabel = `${classItem.subjectName} - ${classItem.section?.name ?? 'Section'}`;

    for (const assessment of assessmentsByClass[classItem.id] ?? []) {
      const dueDate = parseDateOrNull(assessment.dueDate);
      if (!dueDate) continue;

      items.push({
        id: `assessment-${assessment.id}`,
        kind: 'assessment',
        title: assessment.title,
        description: assessment.description ?? undefined,
        startsAt: dueDate.toISOString(),
        endsAt: dueDate.toISOString(),
        allDay: false,
        schoolYear: classItem.schoolYear,
        classId: classItem.id,
        classLabel,
      });
    }
  }

  for (const [classId, announcements] of Object.entries(announcementsByClass)) {
    const classItem = classMap.get(classId);
    if (!classItem) continue;
    if (classItem.schoolYear !== selectedSchoolYear) continue;
    if (!isAllClasses && classId !== selectedClassId) continue;

    const classLabel = `${classItem.subjectName} - ${classItem.section?.name ?? 'Section'}`;

    for (const announcement of announcements) {
      const announcementDate =
        parseDateOrNull(announcement.scheduledAt) || parseDateOrNull(announcement.createdAt);
      if (!announcementDate) continue;

      items.push({
        id: `announcement-${announcement.id}`,
        kind: 'announcement',
        title: announcement.title,
        description: announcement.content,
        startsAt: announcementDate.toISOString(),
        endsAt: announcementDate.toISOString(),
        allDay: false,
        schoolYear: classItem.schoolYear,
        classId,
        classLabel,
      });
    }
  }

  items.push(
    ...expandClassSchedulesForMonth(
      filteredClasses,
      month,
      selectedSchoolYear,
    ),
  );

  return items.sort(
    (left, right) =>
      new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

export function buildCalendarDayIndex(items: CalendarFeedItem[]): Record<string, CalendarFeedItem[]> {
  const dayMap: Record<string, CalendarFeedItem[]> = {};

  for (const item of items) {
    const startDate = parseDateOrNull(item.startsAt);
    const endDate = parseDateOrNull(item.endsAt) ?? startDate;
    if (!startDate || !endDate) continue;

    if (MULTI_DAY_EVENT_KINDS.includes(item.kind)) {
      const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const endCursor = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
      while (cursor.getTime() <= endCursor.getTime()) {
        const key = toDateKey(cursor);
        dayMap[key] = dayMap[key] ?? [];
        dayMap[key].push(item);
        cursor.setDate(cursor.getDate() + 1);
      }
      continue;
    }

    const key = toDateKey(startDate);
    dayMap[key] = dayMap[key] ?? [];
    dayMap[key].push(item);
  }

  for (const key of Object.keys(dayMap)) {
    dayMap[key] = dayMap[key].sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    );
  }

  return dayMap;
}

export function getUpcomingFeedItems(
  items: CalendarFeedItem[],
  now = new Date(),
  limit = 50,
): CalendarFeedItem[] {
  return items
    .filter((item) => item.kind !== 'class_schedule')
    .filter((item) => {
      const endsAt = parseDateOrNull(item.endsAt);
      return endsAt ? endsAt.getTime() >= now.getTime() : false;
    })
    .sort(
      (left, right) =>
        new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
    )
    .slice(0, limit);
}

export function getMarkerKindsForDay(items: CalendarFeedItem[]): CalendarFeedKind[] {
  return [...new Set(items.map((item) => item.kind))];
}

export function buildMonthCells(month: Date): Array<{ date: Date; dateKey: string; inMonth: boolean }> {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const firstCell = new Date(monthStart);
  firstCell.setDate(monthStart.getDate() - monthStart.getDay());

  const totalCells = Math.ceil((monthStart.getDay() + monthEnd.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_unused, index) => {
    const date = new Date(firstCell);
    date.setDate(firstCell.getDate() + index);
    return {
      date,
      dateKey: toDateKey(date),
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
}

export function shiftMonth(baseDate: Date, delta: number): Date {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() + delta, 1);
}

export function formatMonthLabel(value: Date): string {
  return value.toLocaleString('en-US', { month: 'long', year: 'numeric' });
}

export function formatFeedDate(value: string): string {
  const parsed = parseDateOrNull(value);
  if (!parsed) return 'Date unavailable';
  return parsed.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
