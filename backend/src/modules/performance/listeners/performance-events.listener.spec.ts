import { PerformanceEventsListener } from './performance-events.listener';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../../common/events';

describe('PerformanceEventsListener', () => {
  it('should trigger recompute from assessment.submitted', async () => {
    const performanceService = {
      recomputeFromAssessmentSubmission: jest.fn().mockResolvedValue(undefined),
      recomputeStudentsForClass: jest.fn().mockResolvedValue(undefined),
    } as any;

    const listener = new PerformanceEventsListener(performanceService);

    await listener.handleAssessmentSubmitted(
      new AssessmentSubmittedEvent({
        assessmentId: 'assessment-1',
        studentId: 'student-1',
        rawScore: 7,
        totalPoints: 10,
      }),
    );

    expect(performanceService.recomputeFromAssessmentSubmission).toHaveBeenCalledWith(
      'assessment-1',
      'student-1',
    );
  });

  it('should trigger recompute from class-record.scores.updated', async () => {
    const performanceService = {
      recomputeFromAssessmentSubmission: jest.fn().mockResolvedValue(undefined),
      recomputeStudentsForClass: jest.fn().mockResolvedValue(undefined),
    } as any;

    const listener = new PerformanceEventsListener(performanceService);

    await listener.handleClassRecordScoresUpdated(
      new ClassRecordScoresUpdatedEvent({
        classId: 'class-1',
        studentIds: ['student-1', 'student-2'],
        triggerSource: 'manual_bulk',
      }),
    );

    expect(performanceService.recomputeStudentsForClass).toHaveBeenCalledWith(
      'class-1',
      ['student-1', 'student-2'],
      'manual_bulk',
    );
  });
});
