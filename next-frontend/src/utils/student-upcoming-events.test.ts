import type { Assessment } from '@/types/assessment';
import type { ClassItem } from '@/types/class';
import type { SchoolEvent } from '@/types/school-event';
import { buildStudentUpcomingEvents } from './student-upcoming-events';

const NOW = new Date('2026-08-30T04:00:00.000Z');

function makeClass(overrides: Partial<ClassItem> = {}): ClassItem {
  return {
    id: 'class-1',
    subjectName: 'Mathematics',
    subjectCode: 'MATH-7',
    sectionId: 'section-1',
    section: { id: 'section-1', name: 'Bonifacio', gradeLevel: '7' },
    teacherId: 'teacher-1',
    schoolYear: '2026-2027',
    isActive: true,
    ...overrides,
  };
}

function makeAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    classId: 'class-1',
    title: 'Algebra Quiz',
    type: 'quiz',
    dueDate: '2026-09-02T08:00:00.000Z',
    isPublished: true,
    studentActivity: {
      hasSubmittedAttempt: false,
      submittedAttemptCount: 0,
      ongoingAttemptId: null,
    },
    ...overrides,
  };
}

function makeSchoolEvent(overrides: Partial<SchoolEvent> = {}): SchoolEvent {
  return {
    id: 'event-1',
    eventType: 'school_event',
    schoolYear: '2026-2027',
    title: 'Foundation Day',
    startsAt: '2026-09-01T00:00:00.000Z',
    endsAt: '2026-09-01T09:00:00.000Z',
    allDay: true,
    ...overrides,
  };
}

describe('buildStudentUpcomingEvents', () => {
  it('includes unfinished and ongoing future assessments from every active enrolled class', () => {
    const events = buildStudentUpcomingEvents({
      classes: [makeClass({ isHidden: true })],
      assessmentsByClass: {
        'class-1': [
          makeAssessment(),
          makeAssessment({
            id: 'assessment-ongoing',
            title: 'Geometry Quiz',
            dueDate: '2026-09-03T08:00:00.000Z',
            studentActivity: {
              hasSubmittedAttempt: false,
              submittedAttemptCount: 0,
              ongoingAttemptId: 'attempt-ongoing',
            },
          }),
        ],
      },
      schoolEvents: [],
      now: NOW,
    });

    expect(events.map((event) => event.id)).toEqual([
      'assessment-assessment-1',
      'assessment-assessment-ongoing',
    ]);
    expect(events[1]).toMatchObject({
      href: '/dashboard/student/assessments/assessment-ongoing',
      subtitle: expect.stringContaining('Continue assessment'),
    });
  });

  it('excludes past, undated, submitted, unpublished, lifecycle-unknown, and inactive-class assessments', () => {
    const events = buildStudentUpcomingEvents({
      classes: [makeClass(), makeClass({ id: 'class-inactive', isActive: false })],
      assessmentsByClass: {
        'class-1': [
          makeAssessment({ id: 'past', dueDate: '2026-08-29T08:00:00.000Z' }),
          makeAssessment({ id: 'undated', dueDate: undefined }),
          makeAssessment({
            id: 'submitted',
            studentActivity: {
              hasSubmittedAttempt: true,
              submittedAttemptCount: 1,
              ongoingAttemptId: null,
            },
          }),
          makeAssessment({ id: 'unpublished', isPublished: false }),
          makeAssessment({ id: 'unknown', studentActivity: undefined }),
        ],
        'class-inactive': [makeAssessment({ id: 'inactive', classId: 'class-inactive' })],
      },
      schoolEvents: [],
      now: NOW,
    });

    expect(events).toEqual([]);
  });

  it('includes ongoing and future school events while excluding ended or unrelated-school-year events', () => {
    const events = buildStudentUpcomingEvents({
      classes: [makeClass()],
      assessmentsByClass: {},
      schoolEvents: [
        makeSchoolEvent({
          id: 'ongoing',
          startsAt: '2026-08-30T00:00:00.000Z',
          endsAt: '2026-08-30T08:00:00.000Z',
        }),
        makeSchoolEvent({ id: 'future' }),
        makeSchoolEvent({
          id: 'ended',
          startsAt: '2026-08-29T00:00:00.000Z',
          endsAt: '2026-08-29T08:00:00.000Z',
        }),
        makeSchoolEvent({ id: 'other-year', schoolYear: '2025-2026' }),
      ],
      now: NOW,
    });

    expect(events.map((event) => event.id)).toEqual(['school-ongoing', 'school-future']);
    expect(events[0].href).toBe('/dashboard/student/calendar?date=2026-08-30');
  });

  it('deduplicates resources and sorts them by effective event time', () => {
    const assessment = makeAssessment({ dueDate: '2026-09-02T08:00:00.000Z' });
    const events = buildStudentUpcomingEvents({
      classes: [makeClass()],
      assessmentsByClass: { 'class-1': [assessment, assessment] },
      schoolEvents: [makeSchoolEvent()],
      now: NOW,
    });

    expect(events.map((event) => event.id)).toEqual([
      'school-event-1',
      'assessment-assessment-1',
    ]);
  });
});
