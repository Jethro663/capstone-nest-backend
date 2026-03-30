import type { Announcement } from '@/types/announcement';
import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { SchoolEvent } from '@/types/school-event';
import {
  buildCalendarDayIndex,
  getUpcomingFeedItems,
  normalizeCalendarFeed,
  resolveCalendarDaySelection,
  resolveInitialClassFilter,
} from './calendar-feed';

const makeClass = (overrides: Partial<ClassItem> = {}): ClassItem => ({
  id: 'class-a',
  subjectName: 'Mathematics',
  subjectCode: 'MATH-10',
  sectionId: 'section-a',
  teacherId: 'teacher-a',
  schoolYear: '2026-2027',
  isActive: true,
  section: { id: 'section-a', name: 'Einstein', gradeLevel: '10' },
  schedules: [
    {
      id: 'sched-a',
      days: ['M', 'W'],
      startTime: '08:00',
      endTime: '09:00',
    },
  ],
  ...overrides,
});

const makeAssessment = (overrides: Partial<Assessment> = {}): Assessment => ({
  id: 'assessment-a',
  title: 'Quarterly Exam',
  classId: 'class-a',
  type: 'exam',
  isPublished: true,
  dueDate: '2026-09-11T08:30:00.000Z',
  ...overrides,
});

const makeAnnouncement = (overrides: Partial<Announcement> = {}): Announcement => ({
  id: 'announcement-a',
  classId: 'class-a',
  title: 'Exam Reminder',
  content: 'Bring your permit.',
  isPinned: false,
  isArchived: false,
  createdAt: '2026-09-10T01:00:00.000Z',
  ...overrides,
});

const makeSchoolEvent = (overrides: Partial<SchoolEvent> = {}): SchoolEvent => ({
  id: 'event-a',
  eventType: 'school_event',
  schoolYear: '2026-2027',
  title: 'Foundation Day',
  startsAt: '2026-09-09T00:00:00.000Z',
  endsAt: '2026-09-10T23:59:59.999Z',
  allDay: true,
  ...overrides,
});

describe('calendar-feed normalization', () => {
  it('uses scheduledAt first, then createdAt for announcements', () => {
    const classes = [makeClass()];
    const items = normalizeCalendarFeed({
      classes,
      schoolEvents: [],
      assessmentsByClass: {},
      announcementsByClass: {
        'class-a': [
          makeAnnouncement({
            scheduledAt: '2026-09-13T08:00:00.000Z',
            createdAt: '2026-09-10T01:00:00.000Z',
          }),
        ],
      },
      selectedSchoolYear: '2026-2027',
      selectedClassId: 'all',
      month: new Date('2026-09-01T00:00:00.000Z'),
    });

    const announcement = items.find((item) => item.kind === 'announcement');
    expect(announcement?.startsAt).toBe('2026-09-13T08:00:00.000Z');
  });

  it('filters feed by school year and class prefilter', () => {
    const classes = [
      makeClass(),
      makeClass({
        id: 'class-b',
        schoolYear: '2025-2026',
        section: { id: 'section-b', name: 'Curie', gradeLevel: '10' },
      }),
    ];

    const items = normalizeCalendarFeed({
      classes,
      schoolEvents: [
        makeSchoolEvent({ schoolYear: '2026-2027', id: 'event-keep' }),
        makeSchoolEvent({ schoolYear: '2025-2026', id: 'event-drop' }),
      ],
      assessmentsByClass: {
        'class-a': [makeAssessment({ id: 'assessment-keep' })],
        'class-b': [makeAssessment({ id: 'assessment-drop', classId: 'class-b' })],
      },
      announcementsByClass: {
        'class-a': [makeAnnouncement({ id: 'announcement-keep' })],
        'class-b': [makeAnnouncement({ id: 'announcement-drop', classId: 'class-b' })],
      },
      selectedSchoolYear: '2026-2027',
      selectedClassId: 'class-a',
      month: new Date('2026-09-01T00:00:00.000Z'),
    });

    expect(items.some((item) => item.id === 'assessment-assessment-drop')).toBe(false);
    expect(items.some((item) => item.id === 'announcement-announcement-drop')).toBe(false);
    expect(items.some((item) => item.id === 'school-event-drop')).toBe(false);
    expect(items.some((item) => item.id === 'assessment-assessment-keep')).toBe(true);
    expect(items.some((item) => item.id === 'announcement-announcement-keep')).toBe(true);
    expect(items.some((item) => item.id === 'school-event-keep')).toBe(true);
  });

  it('builds day indexes for multi-day school events and day events', () => {
    const items = normalizeCalendarFeed({
      classes: [makeClass()],
      schoolEvents: [makeSchoolEvent()],
      assessmentsByClass: {
        'class-a': [makeAssessment()],
      },
      announcementsByClass: {},
      selectedSchoolYear: '2026-2027',
      selectedClassId: 'all',
      month: new Date('2026-09-01T00:00:00.000Z'),
    });

    const dayIndex = buildCalendarDayIndex(items);
    expect(dayIndex['2026-09-09']?.some((item) => item.kind === 'school_event')).toBe(true);
    expect(dayIndex['2026-09-10']?.some((item) => item.kind === 'school_event')).toBe(true);
    expect(dayIndex['2026-09-11']?.some((item) => item.kind === 'assessment')).toBe(true);
  });

  it('sorts upcoming feed items by nearest datetime first', () => {
    const items = normalizeCalendarFeed({
      classes: [makeClass()],
      schoolEvents: [
        makeSchoolEvent({
          id: 'event-later',
          startsAt: '2026-09-14T00:00:00.000Z',
          endsAt: '2026-09-14T23:59:59.999Z',
        }),
      ],
      assessmentsByClass: {
        'class-a': [makeAssessment({ dueDate: '2026-09-12T08:30:00.000Z' })],
      },
      announcementsByClass: {
        'class-a': [makeAnnouncement({ scheduledAt: '2026-09-11T06:00:00.000Z' })],
      },
      selectedSchoolYear: '2026-2027',
      selectedClassId: 'all',
      month: new Date('2026-09-01T00:00:00.000Z'),
    });

    const upcoming = getUpcomingFeedItems(items, new Date('2026-09-10T00:00:00.000Z'));
    expect(upcoming[0]?.kind).toBe('announcement');
    expect(upcoming[1]?.kind).toBe('assessment');
    expect(upcoming[2]?.kind).toBe('school_event');
  });

  it('resolves class query prefilter and day selection states', () => {
    const classes = [makeClass(), makeClass({ id: 'class-z' })];
    expect(resolveInitialClassFilter('class-z', classes)).toBe('class-z');
    expect(resolveInitialClassFilter('missing', classes)).toBe('all');

    expect(
      resolveCalendarDaySelection({
        selectedDateKey: '2026-09-12',
        hoveredDateKey: '2026-09-11',
        todayKey: '2026-09-10',
      }),
    ).toBe('2026-09-12');

    expect(
      resolveCalendarDaySelection({
        selectedDateKey: null,
        hoveredDateKey: '2026-09-11',
        todayKey: '2026-09-10',
      }),
    ).toBe('2026-09-11');
  });
});

