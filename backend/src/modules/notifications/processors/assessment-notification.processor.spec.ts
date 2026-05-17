import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bullmq';
import { AssessmentNotificationProcessor } from './assessment-notification.processor';
import { DatabaseService } from '../../../database/database.service';
import { NotificationsGateway } from '../notifications.gateway';
import { NotificationsService } from '../notifications.service';

const CLASS_ID = 'class-uuid-1';
const ASSESSMENT_ID = 'assessment-uuid-1';

const makeJob = (name: string): Job<any> =>
  ({
    id: 'job-1',
    name,
    data: {
      assessmentId: ASSESSMENT_ID,
      classId: CLASS_ID,
      title: 'Algebra Quiz',
      dueDate: '2026-06-18T00:00:00.000Z',
    },
  }) as any;

describe('AssessmentNotificationProcessor', () => {
  let processor: AssessmentNotificationProcessor;
  let mockDb: any;
  let notificationsService: { createBulkDeduped: jest.Mock };
  let gateway: { emitToUser: jest.Mock };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockDb = {
      query: {
        classes: { findFirst: jest.fn() },
        enrollments: { findMany: jest.fn() },
        assessmentAttempts: { findMany: jest.fn() },
      },
    };
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: CLASS_ID,
      isActive: true,
      section: { id: 'section-1', isActive: true },
    });
    notificationsService = {
      createBulkDeduped: jest.fn((inputs) => Promise.resolve(inputs)),
    };
    gateway = { emitToUser: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssessmentNotificationProcessor,
        { provide: DatabaseService, useValue: { db: mockDb } },
        { provide: NotificationsService, useValue: notificationsService },
        { provide: NotificationsGateway, useValue: gateway },
      ],
    }).compile();

    processor = module.get(AssessmentNotificationProcessor);
  });

  it('sends an assessment_assigned notification to every enrolled student', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);

    await processor.process(makeJob('assessment-assigned'));

    expect(notificationsService.createBulkDeduped).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'student-1',
        type: 'assessment_assigned',
        referenceId: ASSESSMENT_ID,
      }),
      expect.objectContaining({
        userId: 'student-2',
        type: 'assessment_assigned',
        referenceId: ASSESSMENT_ID,
      }),
    ]);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(2);
  });

  it('skips assessment notifications when the class is archived', async () => {
    mockDb.query.classes.findFirst.mockResolvedValue({
      id: CLASS_ID,
      isActive: false,
      section: { id: 'section-1', isActive: true },
    });

    await processor.process(makeJob('assessment-assigned'));

    expect(mockDb.query.enrollments.findMany).not.toHaveBeenCalled();
    expect(notificationsService.createBulkDeduped).not.toHaveBeenCalled();
    expect(gateway.emitToUser).not.toHaveBeenCalled();
  });

  it('sends due reminders only to enrolled students without submitted attempts', async () => {
    mockDb.query.enrollments.findMany.mockResolvedValue([
      { studentId: 'student-1' },
      { studentId: 'student-2' },
    ]);
    mockDb.query.assessmentAttempts.findMany.mockResolvedValue([
      { studentId: 'student-1' },
    ]);

    await processor.process(makeJob('assessment-due-reminder'));

    expect(notificationsService.createBulkDeduped).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: 'student-2',
        type: 'assessment_due',
        referenceId: ASSESSMENT_ID,
      }),
    ]);
    expect(gateway.emitToUser).toHaveBeenCalledTimes(1);
    expect(gateway.emitToUser).toHaveBeenCalledWith(
      'student-2',
      expect.objectContaining({ type: 'assessment_due' }),
    );
  });
});
