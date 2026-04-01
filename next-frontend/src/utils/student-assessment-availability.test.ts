import {
  getStudentAssessmentAvailability,
  mapAssessmentStartError,
} from './student-assessment-availability';
import type { Assessment } from '@/types/assessment';
import type { ModuleItem } from '@/types/module';

function createAssessment(overrides: Partial<Assessment> = {}): Assessment {
  return {
    id: 'assessment-1',
    title: 'Quiz 1',
    classId: 'class-1',
    type: 'written_work' as Assessment['type'],
    isPublished: true,
    maxAttempts: 2,
    closeWhenDue: true,
    ...overrides,
  };
}

function createItem(overrides: Partial<ModuleItem> = {}): ModuleItem {
  return {
    id: 'item-1',
    moduleSectionId: 'section-1',
    itemType: 'assessment',
    assessmentId: 'assessment-1',
    order: 1,
    isVisible: true,
    isRequired: true,
    isGiven: true,
    accessible: true,
    ...overrides,
  };
}

describe('student assessment availability', () => {
  it('blocks start when due date has passed', () => {
    const availability = getStudentAssessmentAvailability({
      assessment: createAssessment({ dueDate: '2025-01-01T00:00:00.000Z' }),
      item: createItem(),
      submittedAttemptCount: 0,
      now: new Date('2025-01-02T00:00:00.000Z'),
    });

    expect(availability.canStart).toBe(false);
    expect(availability.isPastDue).toBe(true);
    expect(availability.blockedReason).toContain('closed');
  });

  it('blocks start when attempts are exhausted', () => {
    const availability = getStudentAssessmentAvailability({
      assessment: createAssessment({ maxAttempts: 1 }),
      item: createItem(),
      submittedAttemptCount: 1,
      now: new Date('2025-01-01T00:00:00.000Z'),
    });

    expect(availability.canStart).toBe(false);
    expect(availability.hasAttemptsRemaining).toBe(false);
    expect(availability.blockedReason).toContain('Maximum attempts reached');
  });

  it('maps due-date API errors to a specific toast message', () => {
    const message = mapAssessmentStartError({
      response: {
        data: {
          message: 'This assessment is closed (due date passed)',
        },
      },
    });
    expect(message).toBe(
      'This assessment is closed because the due date has passed.',
    );
  });
});
