import { getQueueToken } from '@nestjs/bullmq';
import { Test, TestingModule } from '@nestjs/testing';
import { AssessmentNotificationDispatchService } from './assessment-notification-dispatch.service';

describe('AssessmentNotificationDispatchService', () => {
  let service: AssessmentNotificationDispatchService;
  let queue: { add: jest.Mock; getJob: jest.Mock };

  beforeEach(async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-16T00:00:00.000Z'));
    queue = {
      add: jest.fn().mockResolvedValue(undefined),
      getJob: jest.fn().mockResolvedValue(null),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentNotificationDispatchService,
        { provide: getQueueToken('notifications'), useValue: queue },
      ],
    }).compile();

    service = module.get(AssessmentNotificationDispatchService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enqueues the assignment fan-out with a stable job id', async () => {
    await service.enqueueAssessmentAssigned({
      id: 'assessment-1',
      classId: 'class-1',
      title: 'Algebra Quiz',
      dueDate: new Date('2026-06-18T00:00:00.000Z'),
    });

    expect(queue.add).toHaveBeenCalledWith(
      'assessment-assigned',
      expect.objectContaining({ assessmentId: 'assessment-1' }),
      expect.objectContaining({ jobId: 'assessment-assigned:assessment-1' }),
    );
  });

  it('schedules the due reminder one day before due date', async () => {
    await service.rescheduleAssessmentDueReminder({
      id: 'assessment-1',
      classId: 'class-1',
      title: 'Algebra Quiz',
      dueDate: new Date('2026-06-18T00:00:00.000Z'),
      isPublished: true,
    });

    expect(queue.add).toHaveBeenCalledWith(
      'assessment-due-reminder',
      expect.objectContaining({ assessmentId: 'assessment-1' }),
      expect.objectContaining({
        jobId: 'assessment-due-reminder:assessment-1',
        delay: 86_400_000,
      }),
    );
  });
});
