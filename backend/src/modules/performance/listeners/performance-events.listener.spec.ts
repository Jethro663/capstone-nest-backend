import { PerformanceEventsListener } from './performance-events.listener';
import {
  AssessmentSubmittedEvent,
  ClassRecordScoresUpdatedEvent,
} from '../../../common/events';

describe('PerformanceEventsListener', () => {
  it('should trigger recompute from assessment.submitted', async () => {
    const recomputeQueue = {
      enqueueAssessmentSubmission: jest.fn().mockResolvedValue(undefined),
      enqueueClassRecordScores: jest.fn().mockResolvedValue(undefined),
    } as any;

    const listener = new PerformanceEventsListener(recomputeQueue);

    await listener.handleAssessmentSubmitted(
      new AssessmentSubmittedEvent({
        assessmentId: 'assessment-1',
        studentId: 'student-1',
        rawScore: 7,
        totalPoints: 10,
      }),
    );

    expect(recomputeQueue.enqueueAssessmentSubmission).toHaveBeenCalledWith(
      'assessment-1',
      'student-1',
    );
  });

  it('should trigger recompute from class-record.scores.updated', async () => {
    const recomputeQueue = {
      enqueueAssessmentSubmission: jest.fn().mockResolvedValue(undefined),
      enqueueClassRecordScores: jest.fn().mockResolvedValue(undefined),
    } as any;

    const listener = new PerformanceEventsListener(recomputeQueue);

    await listener.handleClassRecordScoresUpdated(
      new ClassRecordScoresUpdatedEvent({
        classId: 'class-1',
        studentIds: ['student-1', 'student-2'],
        triggerSource: 'manual_bulk',
      }),
    );

    expect(recomputeQueue.enqueueClassRecordScores).toHaveBeenCalledWith(
      'class-1',
      ['student-1', 'student-2'],
      'manual_bulk',
    );
  });
});
